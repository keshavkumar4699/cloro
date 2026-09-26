import Link from "next/link";

export const metadata = { title: "Not eligible" };

export default function NotEligible() {
  return (
    <div className="mx-auto max-w-lg px-6 py-24 text-center fade-in">
      <p className="eyebrow">Membership</p>
      <h1 className="text-5xl mt-4">Cloro is for ages 13 to 30</h1>
      <p className="mt-6 text-muted">
        Cloro is a community built for young people. Based on your date of birth, we can&apos;t open an account for you right now.
        If you think this is a mistake, please contact support.
      </p>
      <Link href="/support/new?category=ACCOUNT" className="btn btn-ghost mt-10">Contact support</Link>
    </div>
  );
}
