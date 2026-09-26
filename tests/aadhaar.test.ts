import { describe, expect, it } from "vitest";
import { createSign, generateKeyPairSync } from "node:crypto";
import { gzipSync } from "node:zlib";
import { AadhaarQrError, identityFingerprint, namesMatch, parseSecureQr } from "@/lib/aadhaar";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const other = generateKeyPairSync("rsa", { modulusLength: 2048 });

function makeQr(opts: { version?: boolean; dob?: string; name?: string; tamper?: boolean; key?: typeof privateKey } = {}) {
  const fields = [
    ...(opts.version === false ? [] : ["V2"]),
    "3",
    "4821" + "20260926101010123",
    opts.name ?? "Aarav Sharma",
    opts.dob ?? "15-08-2006",
    "M",
    "S/O Rakesh Sharma",
    "Pune",
    "Near Park",
    "12",
    "Kothrud",
    "411038",
    "Kothrud",
    "Maharashtra",
    "MG Road",
    "Pune City",
    "Pune",
  ];
  const text = Buffer.from(fields.join("\xff") + "\xff", "latin1");
  const photo = Buffer.from([0xff, 0x4f, 0xff, 0x51, 1, 2, 3, 0xff]); // photo bytes may contain 0xFF
  const signed = Buffer.concat([text, photo]);
  const signature = createSign("RSA-SHA256").update(signed).sign(opts.key ?? privateKey);
  const payload = Buffer.concat([signed, signature]);
  if (opts.tamper) payload[20] ^= 1;
  return BigInt("0x" + gzipSync(payload).toString("hex")).toString(10);
}

describe("Aadhaar Secure QR", () => {
  it("parses and verifies a signed V2 code", () => {
    const id = parseSecureQr(makeQr(), publicKey);
    expect(id).toMatchObject({ name: "Aarav Sharma", gender: "M", last4: "4821", pincode: "411038", signatureVerified: true });
    expect(id.dob.toISOString().slice(0, 10)).toBe("2006-08-15");
  });

  it("parses the older signed layout without a version field", () => {
    expect(parseSecureQr(makeQr({ version: false }), publicKey).name).toBe("Aarav Sharma");
  });

  it("rejects edited data", () => {
    expect(() => parseSecureQr(makeQr({ tamper: true }), publicKey)).toThrow(AadhaarQrError);
  });

  it("rejects codes signed by anyone other than UIDAI", () => {
    expect(() => parseSecureQr(makeQr({ key: other.privateKey }), publicKey)).toThrow(/signature/);
  });

  it("rejects the old unsigned XML QR", () => {
    expect(() => parseSecureQr('<?xml version="1.0"?><PrintLetterBarcodeData uid="1234"/>')).toThrow(/older Aadhaar/);
  });

  it("rejects garbage", () => {
    expect(() => parseSecureQr("hello")).toThrow(AadhaarQrError);
    expect(() => parseSecureQr("123456789")).toThrow(AadhaarQrError);
  });

  it("accepts year-only dates of birth", () => {
    expect(parseSecureQr(makeQr({ dob: "2004" }), publicKey).dob.toISOString().slice(0, 10)).toBe("2004-01-01");
  });

  it("fingerprints identities stably regardless of name formatting", () => {
    const a = parseSecureQr(makeQr(), publicKey);
    const b = parseSecureQr(makeQr({ name: "AARAV  SHARMA" }), publicKey);
    expect(identityFingerprint(a, "s")).toBe(identityFingerprint(b, "s"));
    expect(identityFingerprint(a, "s")).not.toBe(identityFingerprint(a, "t"));
  });

  it("matches names loosely", () => {
    expect(namesMatch("Aarav Sharma", "aarav s")).toBe(true);
    expect(namesMatch("Aarav Sharma", "Priya Patel")).toBe(false);
    expect(namesMatch("Aarav Sharma", null)).toBe(false);
  });
});
