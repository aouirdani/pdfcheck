/**
 * Unified tool processor — orchestrates pdf-engine + cloudconvert + ocr
 * with optional Supabase Storage upload and job tracking
 */
import {
  mergePdfs,
  splitPdf,
  rotatePdf,
  reorderPdf,
  addPagesToPdf,
  watermarkPdf,
  protectPdf,
  unlockPdf,
  addPageNumbers,
  imagesToPdf,
  pdfToImages,
  signPdf,
  editPdf,
  compressPdfLocal,
  downloadResult,
  downloadResults,
  downloadImageResults,
  type WatermarkOptions,
  type ImageToPdfOptions,
  type PageNumberOptions,
  type SplitMode,
  type TextAnnotation,
} from "./pdf-engine";
import {
  convertPdfToWord,
  convertPdfToExcel,
  convertPdfToPpt,
  convertWordToPdf,
  convertExcelToPdf,
  convertPptToPdf,
  convertHtmlToPdf,
} from "./cloudconvert";
import { ocrFile, ocrResultToTxtBlob } from "./ocr";


export type ProgressCallback = (pct: number) => void;

export interface ProcessOptions {
  // Merge
  // Split
  splitMode?: SplitMode;
  // Rotate
  rotateAngle?: 90 | 180 | 270;
  rotatePageIndices?: number[];
  // Reorder
  newPageOrder?: number[];
  // Add pages
  insertAfterPage?: number;
  insertFiles?: File[];
  // Watermark
  watermarkOpts?: WatermarkOptions;
  // Protect
  userPassword?: string;
  ownerPassword?: string;
  // Unlock
  unlockPassword?: string;
  // Page numbers
  pageNumberOpts?: PageNumberOptions;
  // Image to PDF
  imageToPdfOpts?: ImageToPdfOptions;
  // PDF to image
  pdfToImageScale?: number;
  // Sign
  signatureDataUrl?: string;
  signPageIndex?: number;
  signX?: number;
  signY?: number;
  signWidth?: number;
  signHeight?: number;
  // Edit (annotations)
  annotations?: TextAnnotation[];
  // OCR language
  ocrLanguage?: string;
}

export interface ProcessResult {
  blob?: Blob;
  blobs?: Blob[];
  text?: string;
  filename: string;
  mimeType: string;
  isMultiple: boolean;
}

export async function processTool(
  toolId: string,
  files: File[],
  opts: ProcessOptions = {},
  onProgress?: ProgressCallback
): Promise<ProcessResult> {
  const file = files[0];
  const baseName = file?.name.replace(/\.[^/.]+$/, "") ?? "result";

  switch (toolId) {
    // ─── Organize ────────────────────────────────────────────────────────────

    case "merge": {
      const blob = await mergePdfs(files, onProgress);
      return { blob, filename: "merged.pdf", mimeType: "application/pdf", isMultiple: false };
    }

    case "split": {
      const mode = opts.splitMode ?? { type: "every", n: 1 };
      const blobs = await splitPdf(file, mode, onProgress);
      return { blobs, filename: baseName, mimeType: "application/pdf", isMultiple: true };
    }

    case "compress": {
      const blob = await compressPdfLocal(file, onProgress);
      return { blob, filename: `${baseName}_compressed.pdf`, mimeType: "application/pdf", isMultiple: false };
    }

    case "rotate": {
      const angle = opts.rotateAngle ?? 90;
      const blob = await rotatePdf(file, angle, opts.rotatePageIndices, onProgress);
      return { blob, filename: `${baseName}_rotated.pdf`, mimeType: "application/pdf", isMultiple: false };
    }

    case "reorder": {
      const order = opts.newPageOrder ?? [];
      const blob = await reorderPdf(file, order, onProgress);
      return { blob, filename: `${baseName}_reordered.pdf`, mimeType: "application/pdf", isMultiple: false };
    }

    case "add-pages": {
      const blob = await addPagesToPdf(
        file,
        opts.insertFiles ?? files.slice(1),
        opts.insertAfterPage ?? 0,
        onProgress
      );
      return { blob, filename: `${baseName}_extended.pdf`, mimeType: "application/pdf", isMultiple: false };
    }

    case "page-numbers": {
      const pnOpts: PageNumberOptions = opts.pageNumberOpts ?? {
        position: "bottom-center",
        startFrom: 1,
        fontSize: 11,
        prefix: "",
      };
      const blob = await addPageNumbers(file, pnOpts, onProgress);
      return { blob, filename: `${baseName}_numbered.pdf`, mimeType: "application/pdf", isMultiple: false };
    }

    // ─── Convert to PDF ───────────────────────────────────────────────────────

    case "jpg-to-pdf": {
      const imgOpts: ImageToPdfOptions = opts.imageToPdfOpts ?? {
        pageSize: "A4",
        margin: 20,
        orientation: "portrait",
      };
      const blob = await imagesToPdf(files, imgOpts, onProgress);
      return { blob, filename: "images.pdf", mimeType: "application/pdf", isMultiple: false };
    }

    case "word-to-pdf": {
      const blob = await convertWordToPdf(file, onProgress);
      return { blob, filename: `${baseName}.pdf`, mimeType: "application/pdf", isMultiple: false };
    }

    case "powerpoint-to-pdf": {
      const blob = await convertPptToPdf(file, onProgress);
      return { blob, filename: `${baseName}.pdf`, mimeType: "application/pdf", isMultiple: false };
    }

    case "excel-to-pdf": {
      const blob = await convertExcelToPdf(file, onProgress);
      return { blob, filename: `${baseName}.pdf`, mimeType: "application/pdf", isMultiple: false };
    }

    case "html-to-pdf": {
      const blob = await convertHtmlToPdf(file, onProgress);
      return { blob, filename: `${baseName}.pdf`, mimeType: "application/pdf", isMultiple: false };
    }

    // ─── Convert from PDF ─────────────────────────────────────────────────────

    case "pdf-to-jpg": {
      const scale = opts.pdfToImageScale ?? 2;
      const blobs = await pdfToImages(file, scale, onProgress);
      return { blobs, filename: baseName, mimeType: "image/jpeg", isMultiple: true };
    }

    case "pdf-to-word": {
      const blob = await convertPdfToWord(file, onProgress);
      return { blob, filename: `${baseName}.docx`, mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", isMultiple: false };
    }

    case "pdf-to-ppt": {
      const blob = await convertPdfToPpt(file, onProgress);
      return { blob, filename: `${baseName}.pptx`, mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", isMultiple: false };
    }

    case "pdf-to-excel": {
      const blob = await convertPdfToExcel(file, onProgress);
      return { blob, filename: `${baseName}.xlsx`, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", isMultiple: false };
    }

    // ─── Edit PDF ─────────────────────────────────────────────────────────────

    case "edit-pdf": {
      const anns = opts.annotations ?? [];
      const blob = await editPdf(file, anns, onProgress);
      return { blob, filename: `${baseName}_edited.pdf`, mimeType: "application/pdf", isMultiple: false };
    }

    case "watermark": {
      const wmOpts: WatermarkOptions = opts.watermarkOpts ?? {
        text: "CONFIDENTIAL",
        opacity: 0.3,
        rotation: -45,
        position: "center",
        fontSize: 60,
        color: { r: 128, g: 128, b: 128 },
      };
      const blob = await watermarkPdf(file, wmOpts, onProgress);
      return { blob, filename: `${baseName}_watermarked.pdf`, mimeType: "application/pdf", isMultiple: false };
    }

    case "sign": {
      if (!opts.signatureDataUrl) throw new Error("No signature provided");
      const blob = await signPdf(
        file,
        opts.signatureDataUrl,
        opts.signPageIndex ?? 0,
        opts.signX ?? 50,
        opts.signY ?? 50,
        opts.signWidth ?? 200,
        opts.signHeight ?? 80,
        onProgress
      );
      return { blob, filename: `${baseName}_signed.pdf`, mimeType: "application/pdf", isMultiple: false };
    }

    case "annotate": {
      const anns = opts.annotations ?? [];
      const blob = await editPdf(file, anns, onProgress);
      return { blob, filename: `${baseName}_annotated.pdf`, mimeType: "application/pdf", isMultiple: false };
    }

    // ─── Security ─────────────────────────────────────────────────────────────

    case "protect": {
      const up = opts.userPassword ?? "password";
      const op = opts.ownerPassword ?? opts.userPassword ?? "password";
      const blob = await protectPdf(file, up, op, onProgress);
      return { blob, filename: `${baseName}_protected.pdf`, mimeType: "application/pdf", isMultiple: false };
    }

    case "unlock": {
      const pass = opts.unlockPassword ?? "";
      const blob = await unlockPdf(file, pass, onProgress);
      return { blob, filename: `${baseName}_unlocked.pdf`, mimeType: "application/pdf", isMultiple: false };
    }

    // ─── OCR ─────────────────────────────────────────────────────────────────

    case "ocr": {
      const result = await ocrFile(file, opts.ocrLanguage ?? "eng", onProgress);
      const blob = ocrResultToTxtBlob(result);
      return { blob, text: result.text, filename: `${baseName}_ocr.txt`, mimeType: "text/plain", isMultiple: false };
    }

    default:
      throw new Error(`Unknown tool: ${toolId}`);
  }
}

export function triggerDownload(result: ProcessResult) {
  if (result.isMultiple && result.blobs) {
    if (result.mimeType === "image/jpeg" || result.mimeType === "image/png") {
      downloadImageResults(result.blobs, result.filename);
    } else {
      downloadResults(result.blobs, result.filename);
    }
  } else if (result.blob) {
    downloadResult(result.blob, result.filename);
  }
}
