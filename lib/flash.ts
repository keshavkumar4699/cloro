import { cookies } from "next/headers";

export const FLASH_COOKIE = "cloro_flash";

/**
 * Queues a success toast for the next render and returns the action state.
 * Toasts survive forms that disappear after a successful action.
 */
export async function ok(message: string) {
  (await cookies()).set(FLASH_COOKIE, JSON.stringify({ m: message, t: Date.now() }), {
    path: "/",
    maxAge: 30,
    sameSite: "lax",
  });
  return { ok: message };
}

export function parseFlash(raw: string | undefined): { m: string; t: number } | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return typeof v?.m === "string" && typeof v?.t === "number" ? v : null;
  } catch {
    return null;
  }
}
