import Link from "next/link";
import { ProsePage } from "@/components/prose-page";
import { BUSINESS_NAME, CONTACT_EMAIL, GRIEVANCE_OFFICER } from "@/lib/site";

export const metadata = {
  title: "Privacy policy",
  description: "What personal data Cloro collects, why, how long we keep it, and your rights under India's DPDP Act.",
  alternates: { canonical: "/legal/privacy" },
};

export default function PrivacyPage() {
  return (
    <ProsePage title="Privacy policy" intro={`This policy explains what personal data ${BUSINESS_NAME} ("Cloro") collects, why, and the choices you have. We follow India's Digital Personal Data Protection Act, 2023.`}>
      <h2>What we collect</h2>
      <ul>
        <li><strong>From Google sign-in:</strong> your name, email address and profile photo. We don&apos;t store your Google password or access tokens.</li>
        <li><strong>From you:</strong> date of birth, city and pincode, listings and photos, bids, questions, chat messages, ratings and support tickets.</li>
        <li>
          <strong>From your Aadhaar QR code</strong> (only if you verify): your name, date of birth, the last 4 digits of your Aadhaar, and a one-way
          fingerprint used only to stop duplicate accounts. The card photo is read on your own device and is never uploaded. We never store your
          full Aadhaar number, address or card image.
        </li>
        <li><strong>Guardian approvals:</strong> the guardian&apos;s Google name and email, and their stated relationship.</li>
        <li><strong>Payments for the listing pass:</strong> handled by Razorpay. We keep the order and payment IDs and amounts, not your card or UPI details.</li>
        <li><strong>Technical:</strong> a sign-in cookie and a short-lived cookie for on-screen messages. We don&apos;t use advertising or tracking cookies.</li>
      </ul>

      <h2>Why we use it</h2>
      <ul>
        <li>To run your account, auctions, deals, chat and alerts.</li>
        <li>To verify age and identity, keep one account per person, and protect members — especially those under 18.</li>
        <li>To handle support tickets, reports, strikes and appeals, and to prevent fraud.</li>
        <li>To meet legal obligations, including requests from law enforcement.</li>
      </ul>
      <p>We don&apos;t sell your data or show you targeted ads. For members under 18 we do no tracking or profiling.</p>

      <h2>Who can see what</h2>
      <ul>
        <li>Other members see your name, photo, city, ratings, listings and public Q&amp;A. Chats are visible only to the two people in them.</li>
        <li>Our support team can read a chat only when it&apos;s part of a report or ticket; every such view is logged.</li>
        <li>Service providers that host the site, store photos and process payments handle data only to provide their service.</li>
      </ul>

      <h2>Children&apos;s data</h2>
      <p>
        Members aged 13–17 need verifiable consent from a parent or legal guardian before they can trade. Guardians can contact us at any time
        about their child&apos;s account or ask us to delete it.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Account data stays while your account is open. Read alerts are deleted after 60 days.</li>
        <li>When you delete your account we erase your name, email, photo, date of birth, location and Aadhaar details straight away. Messages and ratings you gave others remain, shown as &quot;Deleted member&quot;.</li>
        <li>If you had confirmed strikes, we keep only the one-way Aadhaar fingerprint so a ban can&apos;t be avoided by deleting.</li>
        <li>Support records, audit logs and payment records may be kept longer where needed for safety, disputes or the law.</li>
      </ul>

      <h2>Your rights</h2>
      <p>
        You can access and correct your information, withdraw consent, and delete your account from <Link href="/dashboard">My Cloro → Privacy &amp; account</Link>.
        You can also nominate someone to exercise your rights, and complain to us or to the Data Protection Board of India.
      </p>

      <h2>Grievance officer</h2>
      <p>
        {GRIEVANCE_OFFICER ? `${GRIEVANCE_OFFICER} — ` : ""}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We acknowledge complaints within 48 hours and aim to resolve them within 30 days.
      </p>
    </ProsePage>
  );
}
