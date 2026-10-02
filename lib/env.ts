// Fails fast at server start when production settings are missing, instead of breaking on a member's first click.

type Check = { name: string; ok: boolean; hint: string };

export function productionEnvProblems(env: NodeJS.ProcessEnv = process.env): Check[] {
  const has = (k: string) => !!env[k] && env[k]!.trim() !== "";
  const s3 = env.STORAGE_DRIVER === "s3";
  const checks: Check[] = [
    { name: "DATABASE_URL", ok: has("DATABASE_URL"), hint: "PostgreSQL connection string" },
    { name: "AUTH_SECRET", ok: has("AUTH_SECRET") && env.AUTH_SECRET!.length >= 32, hint: "at least 32 random characters (npx auth secret)" },
    { name: "SITE_URL", ok: has("SITE_URL") && env.SITE_URL!.startsWith("https://"), hint: "your public https:// address, e.g. https://cloro.in" },
    { name: "AUTH_GOOGLE_ID", ok: has("AUTH_GOOGLE_ID"), hint: "Google OAuth client ID" },
    { name: "AUTH_GOOGLE_SECRET", ok: has("AUTH_GOOGLE_SECRET"), hint: "Google OAuth client secret" },
    { name: "AADHAAR_HASH_SECRET", ok: has("AADHAAR_HASH_SECRET") && env.AADHAAR_HASH_SECRET!.length >= 32, hint: "at least 32 random characters; never change it later" },
    { name: "UIDAI_PUBLIC_KEY_PEM", ok: has("UIDAI_PUBLIC_KEY_PEM"), hint: "UIDAI Secure QR certificate (PEM)" },
    { name: "AADHAAR_ALLOW_UNSIGNED", ok: env.AADHAAR_ALLOW_UNSIGNED !== "true", hint: "must not be true in production" },
    { name: "DEV_LOGIN", ok: env.DEV_LOGIN !== "true", hint: "must not be true in production" },
    { name: "CRON_SECRET", ok: has("CRON_SECRET") && env.CRON_SECRET!.length >= 16, hint: "random string for the settle cron" },
  ];
  if (s3) {
    for (const k of ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_PUBLIC_URL"]) {
      checks.push({ name: k, ok: has(k), hint: "needed because STORAGE_DRIVER=s3" });
    }
  }
  if (has("RAZORPAY_KEY_ID") || has("RAZORPAY_KEY_SECRET")) {
    for (const k of ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"]) {
      checks.push({ name: k, ok: has(k), hint: "all three Razorpay values are needed together" });
    }
  }
  return checks.filter((c) => !c.ok);
}

export function assertProductionEnv() {
  if (process.env.NODE_ENV !== "production" || process.env.SKIP_ENV_CHECK === "true") return;
  const problems = productionEnvProblems();
  if (problems.length) {
    const list = problems.map((p) => `  - ${p.name}: ${p.hint}`).join("\n");
    throw new Error(`Cloro can't start — fix these settings:\n${list}`);
  }
}
