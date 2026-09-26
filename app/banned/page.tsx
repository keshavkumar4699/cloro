import Link from "next/link";

export const metadata = { title: "Account banned" };

export default function Banned() {
  return (
    <div className="mx-auto max-w-lg px-4 md:px-6 py-16 text-center">
      <h1 className="text-4xl md:text-5xl">This account is banned</h1>
      <p className="mt-6 text-muted">
        After proven misconduct, this account can no longer trade on Cloro. If you believe this is wrong, you can appeal through support.
      </p>
      <Link href="/support" className="btn btn-ghost mt-10">Support</Link>
    </div>
  );
}
