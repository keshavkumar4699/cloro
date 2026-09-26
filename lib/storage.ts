// Photo storage. Local disk for development; any S3-compatible bucket (Cloudflare R2 has no egress fees) in production.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
export const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;

export const localUploadDir = () => path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR ?? "./uploads");

let s3: S3Client | null = null;
function s3Client() {
  s3 ??= new S3Client({
    region: process.env.S3_REGION ?? "auto",
    endpoint: process.env.S3_ENDPOINT,
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! },
  });
  return s3;
}

export class UploadError extends Error {}

/** Stores an image and returns its public URL. */
export async function saveImage(file: File, folder: string): Promise<string> {
  const ext = ALLOWED.get(file.type);
  if (!ext) throw new UploadError("Photos must be JPEG, PNG or WebP.");
  if (file.size > MAX_IMAGE_BYTES) throw new UploadError("Each photo must be under 1.5 MB.");
  const key = `${folder}/${randomUUID()}.${ext}`;
  const body = Buffer.from(await file.arrayBuffer());

  if (process.env.STORAGE_DRIVER === "s3") {
    await s3Client().send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key, Body: body, ContentType: file.type }));
    return `${process.env.S3_PUBLIC_URL!.replace(/\/$/, "")}/${key}`;
  }

  const target = path.join(localUploadDir(), key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(/*turbopackIgnore: true*/ target, body);
  return `/api/uploads/${key}`;
}

export async function readLocalUpload(key: string): Promise<{ body: Buffer; type: string } | null> {
  const root = localUploadDir();
  const target = path.resolve(root, key);
  if (!target.startsWith(root + path.sep)) return null;
  const ext = path.extname(target).slice(1);
  const type = [...ALLOWED].find(([, e]) => e === ext)?.[0];
  if (!type) return null;
  try {
    return { body: await readFile(/*turbopackIgnore: true*/ target), type };
  } catch {
    return null;
  }
}
