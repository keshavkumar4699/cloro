import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { TICKET_CATEGORIES } from "@/lib/catalog";
import { ActionForm } from "@/components/action-form";
import { createTicket } from "@/app/actions/support";

export const metadata = { title: "New support ticket" };

export default async function NewTicketPage({ searchParams }: PageProps<"/support/new">) {
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const user = await getCurrentUser();
  if (!user) {
    const qs = new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => typeof e[1] === "string")).toString();
    redirect(`/signin?next=${encodeURIComponent(`/support/new${qs ? `?${qs}` : ""}`)}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 md:px-6 py-8 md:py-12">
      <p className="eyebrow">Support</p>
      <h1 className="text-4xl md:text-5xl mt-2">How can we help?</h1>
      <p className="notice mt-6 text-sm">
        If you feel unsafe, contact local police (112) first. For online payment fraud, call 1930 or report at cybercrime.gov.in — we&apos;ll
        help with evidence from Cloro.
      </p>

      <ActionForm action={createTicket} submit="Send to support" className="mt-10 space-y-6">
        <input type="hidden" name="dealId" value={get("dealId")} />
        <input type="hidden" name="listingId" value={get("listingId")} />
        <input type="hidden" name="conversationId" value={get("conversationId")} />
        <input type="hidden" name="againstId" value={get("againstId")} />
        {(get("dealId") || get("listingId") || get("conversationId")) && (
          <p className="text-sm text-muted">
            This ticket will be linked to the {get("dealId") ? "deal" : get("conversationId") ? "chat" : "listing"} you came from
            {get("conversationId") || get("dealId") ? ", and support will be able to read the related chat" : ""}.
          </p>
        )}
        <div>
          <label className="label" htmlFor="category">What&apos;s it about?</label>
          <select id="category" name="category" defaultValue={get("category")} className="input" required>
            <option value="" disabled>Choose…</option>
            {TICKET_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="subject">Subject</label>
          <input id="subject" name="subject" className="input" maxLength={120} required />
        </div>
        <div>
          <label className="label" htmlFor="body">What happened?</label>
          <textarea id="body" name="body" rows={6} className="input" required
            placeholder="Include dates, what was agreed, and what went wrong. For wrong or damaged items, mention if you have an unboxing video or call recording." />
        </div>
        <div>
          <label className="label" htmlFor="attachments">Evidence (up to 4 images, 1.5 MB each)</label>
          <input id="attachments" name="attachments" type="file" accept="image/jpeg,image/png,image/webp" multiple className="block w-full text-sm text-muted file:mr-3 file:rounded-full file:border file:border-line file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-ink hover:file:border-ink" />
          <p className="text-xs text-muted mt-1">Screenshots, photos of the item or parcel, courier receipts. Keep videos ready — we&apos;ll ask if we need them.</p>
        </div>
      </ActionForm>
      <p className="mt-8 text-sm text-muted">Looking for quick answers? <Link href="/help" className="link">Visit the help centre</Link>.</p>
    </div>
  );
}
