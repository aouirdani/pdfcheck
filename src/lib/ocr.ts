/**
 * OCR.space free API client
 * Free tier: 500 requests/day, up to 1MB per file
 * API key: https://ocr.space/ocrapi/freekey
 */

const OCR_API = "https://api.ocr.space/parse/image";
const DEFAULT_KEY = import.meta.env.VITE_OCR_SPACE_API_KEY ?? "helloworld"; // free demo key

export interface OcrResult {
  text: string;
  pages: number;
  isSearchable: boolean;
}

export async function ocrFile(
  file: File,
  language = "eng",
  onProgress?: (pct: number) => void
): Promise<OcrResult> {
  onProgress?.(10);
  const formData = new FormData();
  formData.append("apikey", DEFAULT_KEY);
  formData.append("language", language);
  formData.append("isOverlayRequired", "false");
  formData.append("detectOrientation", "true");
  formData.append("scale", "true");
  formData.append("OCREngine", "2");
  formData.append("file", file);

  onProgress?.(30);
  const res = await fetch(OCR_API, { method: "POST", body: formData });
  const data = await res.json();
  onProgress?.(85);

  if (data.IsErroredOnProcessing) {
    throw new Error(data.ErrorMessage?.[0] ?? "OCR failed");
  }

  const text = data.ParsedResults?.map((r: { ParsedText: string }) => r.ParsedText).join("\n\n") ?? "";
  onProgress?.(100);
  return { text, pages: data.ParsedResults?.length ?? 0, isSearchable: true };
}

export function ocrResultToTxtBlob(result: OcrResult): Blob {
  return new Blob([result.text], { type: "text/plain;charset=utf-8" });
}
