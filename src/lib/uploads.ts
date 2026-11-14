import "server-only";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { uploadsDir } from "./data/store";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MEDIA_NAME = /^[a-f0-9-]{36}\.webp$/;

export class UploadError extends Error {}

/**
 * Validates and stores an uploaded image.
 * The file is always decoded and re-encoded with sharp (never stored as sent),
 * which strips metadata and rejects anything that is not really an image.
 */
export async function saveImage(file: File): Promise<string> {
  if (file.size === 0) throw new UploadError("فایلی انتخاب نشده است");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("حجم تصویر باید کمتر از ۸ مگابایت باشد");

  let output: Buffer;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const image = sharp(input, { limitInputPixels: 60_000_000 });
    const meta = await image.metadata();
    if (!meta.format || !["jpeg", "png", "webp", "avif"].includes(meta.format))
      throw new UploadError("فقط تصاویر JPG، PNG، WebP یا AVIF پذیرفته می‌شود");
    output = await image
      .rotate()
      .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch (err) {
    if (err instanceof UploadError) throw err;
    throw new UploadError("فایل انتخاب‌شده تصویر معتبری نیست");
  }

  const name = `${randomUUID()}.webp`;
  await fs.mkdir(uploadsDir(), { recursive: true });
  await fs.writeFile(path.join(uploadsDir(), name), output);
  return `/media/${name}`;
}

/** Removes an uploaded file. Bundled `/images/...` assets are never touched. */
export async function deleteUpload(publicPath: string | null | undefined): Promise<void> {
  if (!publicPath?.startsWith("/media/")) return;
  const name = publicPath.slice("/media/".length);
  if (!MEDIA_NAME.test(name)) return;
  await fs.rm(path.join(uploadsDir(), name), { force: true });
}
