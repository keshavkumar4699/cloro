import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertProductionEnv } = await import("@/lib/env");
    try {
      assertProductionEnv();
    } catch (e) {
      // Exit so the container restarts and the reason is the last thing in the logs.
      console.error((e as Error).message);
      process.exit(1);
    }
  }
}

/** One structured log line per server error, readable with `docker compose logs app`. */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const e = err as Error & { digest?: string };
  console.error(
    JSON.stringify({
      level: "error",
      at: new Date().toISOString(),
      message: e.message,
      digest: e.digest,
      path: request.path,
      method: request.method,
      route: context.routePath,
      kind: context.routeType,
    }),
  );
};
