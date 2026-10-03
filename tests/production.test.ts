import { describe, expect, it } from "vitest";
import { sniffImageType } from "@/lib/storage";
import { productionEnvProblems } from "@/lib/env";

describe("upload type sniffing", () => {
  it("recognises real JPEG, PNG and WebP bytes", () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(sniffImageType(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp");
  });
  it("rejects anything else, whatever the browser claimed", () => {
    expect(sniffImageType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(sniffImageType(new TextEncoder().encode("%PDF-1.7"))).toBeNull();
    expect(sniffImageType(new Uint8Array([]))).toBeNull();
  });
});

describe("production settings check", () => {
  const good = {
    DATABASE_URL: "postgresql://x",
    AUTH_SECRET: "a".repeat(40),
    SITE_URL: "https://cloro.in",
    AUTH_GOOGLE_ID: "id",
    AUTH_GOOGLE_SECRET: "secret",
    AADHAAR_HASH_SECRET: "b".repeat(40),
    UIDAI_PUBLIC_KEY_PEM: "-----BEGIN CERTIFICATE-----",
    CRON_SECRET: "c".repeat(20),
  } as unknown as NodeJS.ProcessEnv;

  it("passes a complete configuration", () => expect(productionEnvProblems(good)).toEqual([]));
  it("flags unsafe development switches", () => {
    const names = productionEnvProblems({ ...good, DEV_LOGIN: "true", AADHAAR_ALLOW_UNSIGNED: "true" }).map((p) => p.name);
    expect(names).toEqual(expect.arrayContaining(["DEV_LOGIN", "AADHAAR_ALLOW_UNSIGNED"]));
  });
  it("requires https and strong secrets", () => {
    const names = productionEnvProblems({ ...good, SITE_URL: "http://cloro.in", AUTH_SECRET: "short" }).map((p) => p.name);
    expect(names).toEqual(expect.arrayContaining(["SITE_URL", "AUTH_SECRET"]));
  });
  it("needs all S3 settings when S3 storage is chosen, and all Razorpay settings together", () => {
    const names = productionEnvProblems({ ...good, STORAGE_DRIVER: "s3", RAZORPAY_KEY_ID: "rzp" }).map((p) => p.name);
    expect(names).toEqual(expect.arrayContaining(["S3_BUCKET", "S3_PUBLIC_URL", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"]));
  });
});
