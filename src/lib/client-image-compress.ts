"use client";

import imageCompression from "browser-image-compression";

const DEFAULT_MAX_SIDE = 1920;
const DEFAULT_MAX_MB = 1.85;

/**
 * Shrinks large camera JPEGs/PNG before admin upload so uploads stay fast and within API limits.
 * Server still re-encodes to WebP with sharp; this reduces bytes on the wire.
 */
export async function compressImageFileForUpload(
  file: File,
  opts?: { maxWidthOrHeight?: number; maxSizeMB?: number }
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const maxWidthOrHeight = opts?.maxWidthOrHeight ?? DEFAULT_MAX_SIDE;
  const maxSizeMB = opts?.maxSizeMB ?? DEFAULT_MAX_MB;

  return imageCompression(file, {
    maxWidthOrHeight,
    maxSizeMB,
    useWebWorker: true,
    fileType: "image/webp",
    initialQuality: 0.82
  });
}
