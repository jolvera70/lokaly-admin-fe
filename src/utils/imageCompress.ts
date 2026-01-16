// src/utils/imageCompress.ts
export type CompressedImage = {
  file: File;
  previewUrl: string; // para mostrar en UI
  originalName: string;
  originalSize: number;
  newSize: number;
  width: number;
  height: number;
};

type Opts = {
  maxSide?: number;          // default 1600
  quality?: number;          // default 0.82
  mimeType?: "image/webp" | "image/jpeg"; // default webp
};

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob_failed"))),
      mime,
      quality
    );
  });
}

export async function compressImageFile(file: File, opts: Opts = {}): Promise<CompressedImage> {
  const maxSide = opts.maxSide ?? 1600;
  const quality = opts.quality ?? 0.82;
  const mimeType = opts.mimeType ?? "image/webp";

  // si no es imagen, regresa igual
  if (!file.type.startsWith("image/")) {
    return {
      file,
      previewUrl: URL.createObjectURL(file),
      originalName: file.name,
      originalSize: file.size,
      newSize: file.size,
      width: 0,
      height: 0,
    };
  }

  const img = await loadImageFromFile(file);

  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;

  // calcular escala manteniendo ratio
  const scale = Math.min(1, maxSide / Math.max(srcW, srcH));
  const outW = Math.max(1, Math.round(srcW * scale));
  const outH = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_ctx_missing");

  // dibuja (resize)
  ctx.drawImage(img, 0, 0, outW, outH);

  // generar blob comprimido
  const blob = await canvasToBlob(canvas, mimeType, quality);

  const ext = mimeType === "image/webp" ? "webp" : "jpg";
  const safeBaseName = (file.name || "image").replace(/\.[^/.]+$/, "");
  const newFileName = `${safeBaseName}.${ext}`;

  const newFile = new File([blob], newFileName, { type: mimeType });

  return {
    file: newFile,
    previewUrl: URL.createObjectURL(newFile),
    originalName: file.name,
    originalSize: file.size,
    newSize: newFile.size,
    width: outW,
    height: outH,
  };
}

export async function compressMany(files: File[], opts: Opts = {}) {
  const out: CompressedImage[] = [];
  for (const f of files) out.push(await compressImageFile(f, opts));
  return out;
}