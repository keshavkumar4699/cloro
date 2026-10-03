// Parser and verifier for UIDAI's Aadhaar Secure QR code.
//
// The QR text is a large decimal number. Converted to bytes it is a gzip stream;
// decompressed, it holds text fields separated by 0xFF, then the holder's photo,
// then a 256-byte RSA-SHA256 signature by UIDAI over everything before it.
// Old printed cards (before ~2019) carry an unsigned XML QR instead, which we reject.

import { createHmac, createPublicKey, createVerify, type KeyObject } from "node:crypto";
import { gunzipSync, inflateSync } from "node:zlib";

export interface AadhaarIdentity {
  name: string;
  dob: Date;
  gender: string;
  last4: string;
  pincode: string;
  signatureVerified: boolean;
}

export class AadhaarQrError extends Error {
  constructor(
    public code: "OLD_QR" | "UNREADABLE" | "BAD_SIGNATURE" | "BAD_DATA",
    message: string,
  ) {
    super(message);
  }
}

const SIGNATURE_LENGTH = 256;
const DELIMITER = 255;

export function decimalToBytes(decimal: string): Buffer {
  const clean = decimal.trim();
  if (!/^\d+$/.test(clean)) throw new AadhaarQrError("UNREADABLE", "This doesn't look like an Aadhaar Secure QR code.");
  let hex = BigInt(clean).toString(16);
  if (hex.length % 2) hex = "0" + hex;
  return Buffer.from(hex, "hex");
}

function decompress(bytes: Buffer): Buffer {
  try {
    return gunzipSync(bytes);
  } catch {
    try {
      return inflateSync(bytes);
    } catch {
      throw new AadhaarQrError("UNREADABLE", "Couldn't decode the QR code. Try a clearer photo.");
    }
  }
}

function parseDob(raw: string): Date {
  const s = raw.trim();
  let m = /^(\d{2})[-/](\d{2})[-/](\d{4})$/.exec(s);
  if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  m = /^(\d{4})[-/](\d{2})[-/](\d{2})$/.exec(s);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  m = /^(\d{4})$/.exec(s);
  if (m) return new Date(Date.UTC(+m[1], 0, 1)); // some cards only carry the year of birth
  throw new AadhaarQrError("BAD_DATA", "The date of birth on this card couldn't be read.");
}

/** Splits the leading text fields. Stops early because the photo bytes may contain 0xFF. */
function splitFields(data: Buffer, count: number): string[] {
  const fields: string[] = [];
  let start = 0;
  for (let i = 0; i < data.length && fields.length < count; i++) {
    if (data[i] === DELIMITER) {
      fields.push(data.subarray(start, i).toString("latin1"));
      start = i + 1;
    }
  }
  return fields;
}

export function parseSecureQr(qrText: string, publicKey?: KeyObject | null): AadhaarIdentity {
  const text = qrText.trim();
  if (text.startsWith("<")) {
    throw new AadhaarQrError(
      "OLD_QR",
      "This is an older Aadhaar QR code that can't be verified. Download your e-Aadhaar from the UIDAI website and use the QR code on it.",
    );
  }

  const bytes = decompress(decimalToBytes(text));
  if (bytes.length <= SIGNATURE_LENGTH + 20) throw new AadhaarQrError("BAD_DATA", "The QR code data is incomplete.");

  const signed = bytes.subarray(0, bytes.length - SIGNATURE_LENGTH);
  const signature = bytes.subarray(bytes.length - SIGNATURE_LENGTH);

  let signatureVerified = false;
  if (publicKey) {
    signatureVerified = createVerify("RSA-SHA256").update(signed).verify(publicKey, signature);
    if (!signatureVerified) {
      throw new AadhaarQrError("BAD_SIGNATURE", "This QR code failed UIDAI's signature check. It may have been edited.");
    }
  }

  const head = splitFields(signed, 3);
  const offset = head[0]?.startsWith("V") ? 1 : 0; // V2+ codes start with a version field
  const f = splitFields(signed, 12 + offset).slice(offset);
  // f: [indicator, referenceId, name, dob, gender, careOf, district, landmark, house, location, pincode, ...]
  if (f.length < 11) throw new AadhaarQrError("BAD_DATA", "The QR code data is incomplete.");

  const [, referenceId, name, dob, gender, , , , , , pincode] = f;
  const last4 = referenceId.slice(0, 4);
  if (!/^\d{4}$/.test(last4) || !name.trim()) throw new AadhaarQrError("BAD_DATA", "The QR code data is incomplete.");

  return {
    name: name.trim(),
    dob: parseDob(dob),
    gender: gender.trim(),
    last4,
    pincode: pincode.trim(),
    signatureVerified,
  };
}

export function loadUidaiPublicKey(pem: string | undefined): KeyObject | null {
  if (!pem) return null;
  return createPublicKey(pem.replace(/\\n/g, "\n"));
}

/**
 * Stable one-way fingerprint used only to stop one person holding several accounts.
 * The reference ID changes on every e-Aadhaar download, so it is not part of the fingerprint.
 */
export function identityFingerprint(id: Pick<AadhaarIdentity, "name" | "dob" | "gender" | "last4">, secret: string): string {
  const norm = [id.name.toLowerCase().replace(/[^a-z]/g, ""), id.dob.toISOString().slice(0, 10), id.gender.toUpperCase(), id.last4].join("|");
  return createHmac("sha256", secret).update(norm).digest("hex");
}

/** Loose name match between the Aadhaar name and the Google account name. */
export function namesMatch(aadhaarName: string, accountName: string | null | undefined): boolean {
  if (!accountName) return false;
  const tokens = (s: string) => s.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter((t) => t.length > 1);
  const a = new Set(tokens(aadhaarName));
  return tokens(accountName).some((t) => a.has(t));
}
