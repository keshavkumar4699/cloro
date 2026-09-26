"use client";

import { useState } from "react";
import jsQR from "jsqr";
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
      <label className="block card p-8 text-center cursor-pointer hover:border-gold transition-colors">
        <span className="serif text-2xl">{busy ? "Reading…" : qr ? "Scan again" : "Photograph or upload your Aadhaar"}</span>
        <span className="block text-sm text-muted mt-2">Front or back — whichever side has the large QR code. e-Aadhaar PDFs: use a screenshot of the QR.</span>
        <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={onFile} disabled={busy} />
      </label>
      {status && <p className={`text-sm ${qr ? "text-emerald-800" : "text-muted"}`}>{status}</p>}
      {qr && (
        <ActionForm action={verifyAadhaar} submit="Verify my identity" variant="gold">
          <input type="hidden" name="qr" value={qr} />
        </ActionForm>
      )}
    </div>
  );
}
