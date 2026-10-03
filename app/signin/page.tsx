import { redirect } from "next/navigation";
import { BadgeCheck, HeartHandshake, Ruler } from "lucide-react";
import { signIn, devLoginEnabled } from "@/auth";
import { getCurrentUser, safeNext } from "@/lib/session";

export const metadata = { title: "Sign in" };

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export default async function SignInPage({ searchParams }: PageProps<"/signin">) {
  const redirectTo = safeNext((await searchParams).next);
  if (await getCurrentUser()) redirect(redirectTo);
  const googleConfigured = !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-6 py-10 md:py-16 grid md:grid-cols-2 gap-10 items-center">
      <div className="hidden md:block rounded-3xl bg-gradient-to-br from-blush to-gold-soft p-10 h-full">
        <p className="serif text-4xl leading-tight">Pre-loved pieces, <em className="text-gold-dark">fairly</em> won.</p>
        <ul className="mt-10 space-y-5">
          {[
            [BadgeCheck, "Real, verified people", "Everyone who trades is Aadhaar-verified."],
            [Ruler, "Honest sizing", "Real measurements, so it actually fits."],
            [HeartHandshake, "We've got your back", "Human support if a deal goes wrong."],
          ].map(([Icon, t, d]) => {
            const I = Icon as typeof BadgeCheck;
            return (
              <li key={t as string} className="flex gap-3">
                <span className="w-10 h-10 shrink-0 rounded-xl bg-white/70 text-brand flex items-center justify-center"><I className="w-5 h-5" aria-hidden /></span>
                <div>
                  <p className="font-semibold">{t as string}</p>
                  <p className="text-sm text-ink-soft">{d as string}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="max-w-sm w-full mx-auto fade-in">
        <h1 className="text-4xl">Welcome to cloro<span className="text-gold">.</span></h1>
        <p className="mt-3 text-ink-soft">Sign in to bid, sell and chat. Browsing is always free.</p>

        <form
          className="mt-8"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo });
          }}
        >
          <button className="btn btn-ghost w-full !min-h-12 shadow-soft" disabled={!googleConfigured}>
            <GoogleLogo /> Continue with Google
          </button>
          {!googleConfigured && <p className="hint text-center">Google sign-in isn&apos;t set up on this server yet.</p>}
        </form>

        <p className="mt-4 text-xs text-muted text-center leading-relaxed">
          No passwords, no phone number. You&apos;ll only verify with Aadhaar when you want to buy or sell.
        </p>

        {devLoginEnabled && (
          <form
            className="mt-8 rounded-2xl border border-dashed border-line p-5 space-y-3"
            action={async (fd: FormData) => {
              "use server";
              await signIn("dev", { email: fd.get("email"), name: fd.get("name"), redirectTo });
            }}
          >
            <p className="text-xs font-semibold text-muted uppercase tracking-wider">Developer login · local only</p>
            <input name="name" placeholder="Full name (e.g. Aarav Sharma)" className="input" required />
            <input name="email" type="email" placeholder="email@example.com" className="input" required />
            <button className="btn btn-ghost w-full">Sign in</button>
          </form>
        )}

        <p className="mt-8 text-xs text-muted text-center">By continuing you agree to be honest, be kind, and never cause harm to anyone.</p>
      </div>
    </div>
  );
}
