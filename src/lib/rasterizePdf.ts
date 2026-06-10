// Client-side PDF → PNG rasterization (first page).
// Returns the PNG blob plus dimensions used by the import pipeline.

export interface RasterizedPdf {
  pngBlob: Blob;
  pngBase64: string; // raw base64 (no data URI prefix)
  width: number;
  height: number;
  pageCount: number;
}

const MAX_DIM = 1080;

export async function rasterizePdf(file: File): Promise<RasterizedPdf> {
  if (file.type !== "application/pdf") {
    throw new Error("Arquivo não é PDF");
  }
  // Dynamic import keeps pdfjs out of the main bundle.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjs: any = await import("pdfjs-dist");
  // Use a worker that ships with pdfjs-dist v6.
  if (pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
  }

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const doc = await loadingTask.promise;
  const pageCount = doc.numPages;
  if (pageCount !== 1) {
    throw new Error("PDF deve conter exatamente 1 página");
  }

  const page = await doc.getPage(1);
  const baseViewport = page.getViewport({ scale: 1 });
  const maxSide = Math.max(baseViewport.width, baseViewport.height);
  const scale = Math.min(MAX_DIM / maxSide, 3);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: ctx, viewport }).promise;

  const pngBlob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob falhou"))), "image/png");
  });
  const pngBase64 = await blobToBase64(pngBlob);

  return {
    pngBlob,
    pngBase64,
    width: canvas.width,
    height: canvas.height,
    pageCount,
  };
}

export async function imageFileToPng(file: File): Promise<RasterizedPdf> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Arquivo não é imagem");
  }
  const dataUrl: string = await new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result as string);
    fr.onerror = () => rej(new Error("Erro lendo arquivo"));
    fr.readAsDataURL(file);
  });
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");
  ctx.drawImage(img, 0, 0);
  const pngBlob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob falhou"))), "image/png");
  });
  const pngBase64 = await blobToBase64(pngBlob);
  return {
    pngBlob,
    pngBase64,
    width: canvas.width,
    height: canvas.height,
    pageCount: 1,
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("Erro carregando imagem"));
    i.src = src;
  });
}

async function blobToBase64(blob: Blob): Promise<string> {
  const dataUrl: string = await new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result as string);
    fr.onerror = () => rej(new Error("Erro convertendo para base64"));
    fr.readAsDataURL(blob);
  });
  return dataUrl.split(",")[1] ?? "";
}
