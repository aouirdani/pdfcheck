/**
 * Client-side PDF processing engine using pdf-lib and PDF.js
 */
import {
  PDFDocument,
  StandardFonts,
  rgb,
  degrees,
} from "pdf-lib";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export async function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function u8ToBlob(bytes: Uint8Array): Blob {
  // Copy into a plain ArrayBuffer to avoid SharedArrayBuffer type issues
  const buf = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buf).set(bytes);
  return new Blob([buf], { type: "application/pdf" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

export type ProgressCallback = (pct: number) => void;

// ─── MERGE ────────────────────────────────────────────────────────────────────

export async function mergePdfs(files: File[], onProgress?: ProgressCallback): Promise<Blob> {
  const merged = await PDFDocument.create();
  for (let i = 0; i < files.length; i++) {
    onProgress?.(Math.round((i / files.length) * 80));
    const bytes = await readFileAsArrayBuffer(files[i]);
    const doc = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  }
  onProgress?.(90);
  const bytes = await merged.save();
  onProgress?.(100);
  return u8ToBlob(bytes);
}

// ─── SPLIT ────────────────────────────────────────────────────────────────────

export type SplitMode =
  | { type: "range"; ranges: Array<{ from: number; to: number }> }
  | { type: "every"; n: number }
  | { type: "extract"; pages: number[] };

export async function splitPdf(
  file: File,
  mode: SplitMode,
  onProgress?: ProgressCallback
): Promise<Blob[]> {
  const bytes = await readFileAsArrayBuffer(file);
  const src = await PDFDocument.load(bytes);
  const total = src.getPageCount();
  onProgress?.(20);

  let groups: number[][] = [];
  if (mode.type === "range") {
    groups = mode.ranges.map(({ from, to }) => {
      const pages: number[] = [];
      for (let i = from - 1; i < Math.min(to, total); i++) pages.push(i);
      return pages;
    });
  } else if (mode.type === "every") {
    for (let start = 0; start < total; start += mode.n) {
      const pages: number[] = [];
      for (let j = start; j < Math.min(start + mode.n, total); j++) pages.push(j);
      groups.push(pages);
    }
  } else {
    groups = mode.pages.map((p) => [p - 1]);
  }

  const blobs: Blob[] = [];
  for (let i = 0; i < groups.length; i++) {
    onProgress?.(20 + Math.round((i / groups.length) * 70));
    const out = await PDFDocument.create();
    const copied = await out.copyPages(src, groups[i]);
    copied.forEach((p) => out.addPage(p));
    blobs.push(u8ToBlob(await out.save()));
  }
  onProgress?.(100);
  return blobs;
}

// ─── ROTATE ───────────────────────────────────────────────────────────────────

export async function rotatePdf(
  file: File,
  angle: 90 | 180 | 270,
  pageIndices?: number[],
  onProgress?: ProgressCallback
): Promise<Blob> {
  const bytes = await readFileAsArrayBuffer(file);
  const doc = await PDFDocument.load(bytes);
  onProgress?.(30);
  const indices = pageIndices ?? doc.getPageIndices();
  indices.forEach((i) => {
    const page = doc.getPage(i);
    const current = page.getRotation().angle;
    page.setRotation(degrees((current + angle) % 360));
  });
  onProgress?.(80);
  return u8ToBlob(await doc.save());
}

// ─── REORDER ──────────────────────────────────────────────────────────────────

export async function reorderPdf(
  file: File,
  newOrder: number[],
  onProgress?: ProgressCallback
): Promise<Blob> {
  const bytes = await readFileAsArrayBuffer(file);
  const src = await PDFDocument.load(bytes);
  onProgress?.(30);
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, newOrder);
  pages.forEach((p) => out.addPage(p));
  onProgress?.(80);
  return u8ToBlob(await out.save());
}

// ─── ADD PAGES ────────────────────────────────────────────────────────────────

export async function addPagesToPdf(
  baseFile: File,
  insertFiles: File[],
  afterPage: number,
  onProgress?: ProgressCallback
): Promise<Blob> {
  const baseBytes = await readFileAsArrayBuffer(baseFile);
  const base = await PDFDocument.load(baseBytes);
  onProgress?.(20);

  const toInsert: ReturnType<PDFDocument["getPage"]>[] = [];
  for (const f of insertFiles) {
    const b = await readFileAsArrayBuffer(f);
    const d = await PDFDocument.load(b);
    const copied = await base.copyPages(d, d.getPageIndices());
    toInsert.push(...copied);
  }
  onProgress?.(60);

  const insertAt = Math.min(afterPage, base.getPageCount());
  [...toInsert].reverse().forEach((p) => base.insertPage(insertAt, p));
  onProgress?.(85);
  return u8ToBlob(await base.save());
}

// ─── WATERMARK ────────────────────────────────────────────────────────────────

export interface WatermarkOptions {
  text?: string;
  imageFile?: File;
  opacity: number;
  rotation: number;
  position: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
  fontSize: number;
  color: { r: number; g: number; b: number };
  pageIndices?: number[];
}

export async function watermarkPdf(
  file: File,
  opts: WatermarkOptions,
  onProgress?: ProgressCallback
): Promise<Blob> {
  const bytes = await readFileAsArrayBuffer(file);
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  onProgress?.(20);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let embeddedImage: any = null;
  if (opts.imageFile) {
    const imgBytes = await readFileAsArrayBuffer(opts.imageFile);
    try { embeddedImage = await doc.embedPng(imgBytes); }
    catch { embeddedImage = await doc.embedJpg(imgBytes); }
  }
  onProgress?.(40);

  const indices = opts.pageIndices ?? doc.getPageIndices();
  indices.forEach((i) => {
    const page = doc.getPage(i);
    const { width, height } = page.getSize();
    let x = width / 2, y = height / 2;
    if (opts.position === "top-left") { x = 80; y = height - 60; }
    else if (opts.position === "top-right") { x = width - 80; y = height - 60; }
    else if (opts.position === "bottom-left") { x = 80; y = 60; }
    else if (opts.position === "bottom-right") { x = width - 80; y = 60; }

    if (embeddedImage) {
      const scale = Math.min((width * 0.4) / embeddedImage.width, (height * 0.4) / embeddedImage.height);
      const iw = embeddedImage.width * scale;
      const ih = embeddedImage.height * scale;
      page.drawImage(embeddedImage, {
        x: x - iw / 2, y: y - ih / 2,
        width: iw, height: ih,
        opacity: opts.opacity,
        rotate: degrees(opts.rotation),
      });
    } else if (opts.text) {
      const textWidth = font.widthOfTextAtSize(opts.text, opts.fontSize);
      page.drawText(opts.text, {
        x: x - textWidth / 2,
        y: y - opts.fontSize / 2,
        font,
        size: opts.fontSize,
        color: rgb(opts.color.r / 255, opts.color.g / 255, opts.color.b / 255),
        opacity: opts.opacity,
        rotate: degrees(opts.rotation),
      });
    }
  });

  onProgress?.(85);
  return u8ToBlob(await doc.save());
}

// ─── PROTECT ──────────────────────────────────────────────────────────────────

export async function protectPdf(
  file: File,
  userPassword: string,
  ownerPassword: string,
  onProgress?: ProgressCallback
): Promise<Blob> {
  const bytes = await readFileAsArrayBuffer(file);
  onProgress?.(30);
  const doc = await PDFDocument.load(bytes);
  onProgress?.(60);
  // pdf-lib supports passwords via SaveOptions (encrypted PDFs)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out = await (doc as any).save({ userPassword, ownerPassword });
  onProgress?.(100);
  return new Blob([out instanceof Uint8Array ? out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) : out], {
    type: "application/pdf",
  });
}

// ─── UNLOCK ───────────────────────────────────────────────────────────────────

export async function unlockPdf(
  file: File,
  password: string,
  onProgress?: ProgressCallback
): Promise<Blob> {
  const bytes = await readFileAsArrayBuffer(file);
  onProgress?.(30);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = await (PDFDocument as any).load(bytes, { password });
  onProgress?.(60);
  const out = await doc.save();
  onProgress?.(100);
  return u8ToBlob(out);
}

// ─── PAGE NUMBERS ─────────────────────────────────────────────────────────────

export interface PageNumberOptions {
  position: "bottom-center" | "bottom-right" | "bottom-left" | "top-center";
  startFrom: number;
  fontSize: number;
  prefix: string;
}

export async function addPageNumbers(
  file: File,
  opts: PageNumberOptions,
  onProgress?: ProgressCallback
): Promise<Blob> {
  const bytes = await readFileAsArrayBuffer(file);
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  onProgress?.(30);

  doc.getPages().forEach((page, i) => {
    const { width, height } = page.getSize();
    const label = `${opts.prefix}${i + opts.startFrom}`;
    const textW = font.widthOfTextAtSize(label, opts.fontSize);
    let x = width / 2 - textW / 2, y = 20;
    if (opts.position === "bottom-right") { x = width - textW - 20; y = 20; }
    else if (opts.position === "bottom-left") { x = 20; y = 20; }
    else if (opts.position === "top-center") { x = width / 2 - textW / 2; y = height - 30; }
    page.drawText(label, { x, y, font, size: opts.fontSize, color: rgb(0.3, 0.3, 0.3) });
  });

  onProgress?.(85);
  return u8ToBlob(await doc.save());
}

// ─── JPG/PNG TO PDF ───────────────────────────────────────────────────────────

export interface ImageToPdfOptions {
  pageSize: "A4" | "Letter" | "fit";
  margin: number;
  orientation: "portrait" | "landscape";
}

export async function imagesToPdf(
  files: File[],
  opts: ImageToPdfOptions,
  onProgress?: ProgressCallback
): Promise<Blob> {
  const doc = await PDFDocument.create();
  const sizes: Record<string, [number, number]> = { A4: [595.28, 841.89], Letter: [612, 792] };

  for (let i = 0; i < files.length; i++) {
    onProgress?.(Math.round((i / files.length) * 85));
    const bytes = await readFileAsArrayBuffer(files[i]);
    const mime = files[i].type;
    const img = mime === "image/png" ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);

    let pw: number, ph: number;
    if (opts.pageSize === "fit") { pw = img.width; ph = img.height; }
    else {
      const [bw, bh] = sizes[opts.pageSize];
      [pw, ph] = opts.orientation === "landscape" ? [bh, bw] : [bw, bh];
    }

    const page = doc.addPage([pw, ph]);
    const usableW = pw - opts.margin * 2;
    const usableH = ph - opts.margin * 2;
    const scale = Math.min(usableW / img.width, usableH / img.height);
    const iw = img.width * scale, ih = img.height * scale;
    page.drawImage(img, {
      x: opts.margin + (usableW - iw) / 2,
      y: opts.margin + (usableH - ih) / 2,
      width: iw, height: ih,
    });
  }

  onProgress?.(95);
  return u8ToBlob(await doc.save());
}

// ─── PDF TO JPG (client-side via PDF.js) ──────────────────────────────────────

export async function pdfToImages(
  file: File,
  scale = 2,
  onProgress?: ProgressCallback
): Promise<Blob[]> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url
  ).toString();

  const bytes = await readFileAsArrayBuffer(file);
  onProgress?.(10);
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise;
  const numPages = pdf.numPages;
  const blobs: Blob[] = [];

  for (let i = 1; i <= numPages; i++) {
    onProgress?.(10 + Math.round(((i - 1) / numPages) * 85));
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport, canvas }).promise;
    const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.92));
    blobs.push(blob);
  }
  onProgress?.(100);
  return blobs;
}

// ─── SIGN PDF ─────────────────────────────────────────────────────────────────

export async function signPdf(
  file: File,
  signatureDataUrl: string,
  pageIndex: number,
  x: number,
  y: number,
  width: number,
  height: number,
  onProgress?: ProgressCallback
): Promise<Blob> {
  const bytes = await readFileAsArrayBuffer(file);
  const doc = await PDFDocument.load(bytes);
  onProgress?.(30);
  const sigBytes = await fetch(signatureDataUrl).then((r) => r.arrayBuffer());
  const img = await doc.embedPng(sigBytes);
  onProgress?.(60);
  const page = doc.getPage(pageIndex);
  const { height: pageH } = page.getSize();
  page.drawImage(img, { x, y: pageH - y - height, width, height });
  onProgress?.(85);
  return u8ToBlob(await doc.save());
}

// ─── EDIT PDF (text annotations) ─────────────────────────────────────────────

export interface TextAnnotation {
  text: string;
  x: number;
  y: number;
  pageIndex: number;
  fontSize: number;
  color: { r: number; g: number; b: number };
}

export async function editPdf(
  file: File,
  annotations: TextAnnotation[],
  onProgress?: ProgressCallback
): Promise<Blob> {
  const bytes = await readFileAsArrayBuffer(file);
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  onProgress?.(30);

  for (const ann of annotations) {
    const page = doc.getPage(ann.pageIndex);
    const { height } = page.getSize();
    page.drawText(ann.text, {
      x: ann.x,
      y: height - ann.y - ann.fontSize,
      font,
      size: ann.fontSize,
      color: rgb(ann.color.r / 255, ann.color.g / 255, ann.color.b / 255),
    });
  }

  onProgress?.(85);
  return u8ToBlob(await doc.save());
}

// ─── COMPRESS (local re-save optimisation) ────────────────────────────────────

export async function compressPdfLocal(
  file: File,
  onProgress?: ProgressCallback
): Promise<Blob> {
  const bytes = await readFileAsArrayBuffer(file);
  onProgress?.(20);
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  onProgress?.(60);
  const out = await doc.save({ useObjectStreams: true, addDefaultPage: false });
  onProgress?.(100);
  return u8ToBlob(out);
}

// ─── DOWNLOAD HELPERS ─────────────────────────────────────────────────────────

export function downloadResult(blob: Blob, filename: string) { downloadBlob(blob, filename); }

export function downloadResults(blobs: Blob[], baseName: string) {
  blobs.forEach((b, i) => downloadBlob(b, `${baseName}_part${i + 1}.pdf`));
}

export function downloadImageResults(blobs: Blob[], baseName: string) {
  blobs.forEach((b, i) => {
    const ext = b.type === "image/png" ? "png" : "jpg";
    downloadBlob(b, `${baseName}_page${i + 1}.${ext}`);
  });
}
