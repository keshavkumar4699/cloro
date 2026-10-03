// Browser-side photo compression. Keeps uploads small (storage is the main running cost, and hosts cap request sizes)
// and re-encoding through a canvas drops EXIF data such as the GPS location of where a photo was taken.
const TARGET_BYTES = 600 * 1024;

export async function compressImage(file: File, maxSide = 1400): Promise<File> {
  const bitmap = await createImageBitmap(file);
  let side = maxSide;
  let quality = 0.82;
  for (let attempt = 0; attempt < 5; attempt++) {
    const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Compression failed"))), "image/jpeg", quality),
    );
    if (blob.size <= TARGET_BYTES || attempt === 4) {
      return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
    }
    quality -= 0.1;
    side = Math.round(side * 0.85);
  }
  throw new Error("Compression failed");
}
