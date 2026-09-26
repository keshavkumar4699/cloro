export type ActionState = { error?: string; ok?: string } | undefined;

import { ActionError } from "@/lib/session";
import { UploadError } from "@/lib/storage";
import { AadhaarQrError } from "@/lib/aadhaar";

/** Converts expected errors into a user-facing message; rethrows anything else (including redirects). */
export function toActionState(e: unknown): ActionState {
  if (e instanceof ActionError || e instanceof UploadError || e instanceof AadhaarQrError) return { error: e.message };
  throw e;
}
