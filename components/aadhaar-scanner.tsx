"use client";

import { useState } from "react";
import jsQR from "jsqr";
import { Camera } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { verifyAadhaar } from "@/app/actions/account";

/** Reads the QR code from a photo of the card entirely in the browser. The photo is never uploaded. */
async function decodeQr(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  // Dense Secure QR codes read best at a few different scales.
  for (const maxSide of [1600, 2400, 1200, 900, 3200]) {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "attemptBoth" });
    if (code?.data) return code.data;
  }
  return null;
}

export function AadhaarScanner() {
  const [qr, setQr] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setStatus("Reading the QR code…");
    try {
      const data = await decodeQr(file);
      if (data) {
        setQr(data);
        setStatus("QR code read. Your photo stays on your device — only the QR data is checked.");
      } else {
        setQr(null);
        setStatus("We couldn't find the QR code. Take the photo in good light, straight on, with the QR code filling more of the frame.");
      }
    } catch {
      setStatus("That file couldn't be opened. Try a JPEG or PNG photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <label className="block rounded-3xl border-2 border-dashed border-line bg-white p-8 text-center cursor-pointer hover:border-brand transition-colors">
        <span className="mx-auto w-14 h-14 rounded-full bg-ivory flex items-center justify-center"><Camera className="w-6 h-6 text-brand" aria-hidden /></span>
        <span className="block font-semibold mt-3">{busy ? "Reading the QR code…" : qr ? "Scan a different photo" : "Take or upload a photo"}</span>
        <span className="block text-sm text-muted mt-1">Use the side with the big QR code, in good light.</span>
        <input type="file" accept="image/*" className="sr-only" onChange={onFile} disabled={busy} />
      </label>
      {status && <p className={`text-sm ${qr ? "text-emerald-800" : "text-muted"}`}>{status}</p>}
      {qr && (
        <ActionForm action={verifyAadhaar} submit="Verify me" full>
          <input type="hidden" name="qr" value={qr} />
        </ActionForm>
      )}
    </div>
  );
}
