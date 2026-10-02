import Link from "next/link";
import { Mail, MapPin, MessageCircle } from "lucide-react";
import { ProsePage } from "@/components/prose-page";
import { BUSINESS_NAME, CONTACT_ADDRESS, CONTACT_EMAIL } from "@/lib/site";

export const metadata = {
  title: "Contact Cloro",
  description: "Get help with a deal, your account or verification, or reach the Cloro team by email.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <ProsePage title="Contact us" updated={false} intro="Real people reply, usually within 48 hours. Urgent safety reports are handled first.">
      <div className="not-prose grid gap-3 mt-6">
        <Link href="/support/new" className="card p-5 flex items-center gap-4 hover-lift">
          <MessageCircle className="w-6 h-6 text-brand" aria-hidden />
          <span><strong className="text-ink">Open a support ticket</strong><br />Best for problems with a deal, a member or your account — attach photos as evidence.</span>
        </Link>
        <a href={`mailto:${CONTACT_EMAIL}`} className="card p-5 flex items-center gap-4 hover-lift">
          <Mail className="w-6 h-6 text-brand" aria-hidden />
          <span><strong className="text-ink">Email</strong><br />{CONTACT_EMAIL}</span>
        </a>
        {CONTACT_ADDRESS && (
          <div className="card p-5 flex items-center gap-4">
            <MapPin className="w-6 h-6 text-brand" aria-hidden />
            <span><strong className="text-ink">{BUSINESS_NAME}</strong><br />{CONTACT_ADDRESS}</span>
          </div>
        )}
      </div>
      <p className="mt-8">If you feel unsafe, call 112. For online payment fraud, call 1930 or report at cybercrime.gov.in.</p>
    </ProsePage>
  );
}
