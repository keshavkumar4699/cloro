import { redirect } from "next/navigation";
import { signIn, devLoginEnabled } from "@/auth";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/signin">) {
  const next = (await searchParams).next;
  const redirectTo = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/welcome";
  if (await getCurrentUser()) redirect(redirectTo);
  const googleConfigured = !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center fade-in">
      <p className="eyebrow">Members only</p>
      <h1 className="text-5xl mt-4">Welcome to Cloro</h1>
      <p className="mt-4 text-muted">Sign in with Google to browse. You&apos;ll verify with Aadhaar only when you want to buy or sell.</p>

      <form
        className="mt-10"
        action={async () => {
          "use server";
          await signIn("google", { redirectTo });
        }}
      >
        <button className="btn btn-primary w-full" disabled={!googleConfigured}>
          Continue with Google
        </button>
        {!googleConfigured && <p className="mt-2 text-xs text-muted">Google sign-in isn&apos;t configured on this server yet.</p>}
      </form>

      {devLoginEnabled && (
        <form
          className="mt-10 card p-6 text-left space-y-3"
          action={async (fd: FormData) => {
            "use server";
            await signIn("dev", { email: fd.get("email"), name: fd.get("name"), redirectTo });
          }}
        >
          <p className="eyebrow">Developer login (local only)</p>
          <input name="name" placeholder="Full name (e.g. Aarav Sharma)" className="input" required />
          <input name="email" type="email" placeholder="email@example.com" className="input" required />
          <button className="btn btn-ghost w-full">Sign in</button>
        </form>
      )}

      <p className="mt-10 text-xs text-muted">
        By continuing you agree to our community guidelines: be honest, be kind, and never cause harm to anyone.
      </p>
    </div>
  );
}
