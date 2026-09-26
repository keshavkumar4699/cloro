// Detects attempts to move a deal off Cloro (phone numbers, UPI IDs, emails, links, social handles).

const PATTERNS: { kind: string; re: RegExp }[] = [
  { kind: "phone number", re: /(?:\+?91[\s-]?)?(?<!\d)[6-9](?:[\s-]?\d){9}(?!\d)/ },
  { kind: "email address", re: /[\w.+-]+@[\w-]+\.[a-z]{2,}/i },
  { kind: "UPI ID", re: /\b[\w.-]{2,}@(?:ok\w+|ybl|ibl|axl|paytm|upi|apl|icici|sbi|hdfcbank|axisbank|kotak|yesbank|jupiteraxis|fbl|waaxis|wahdfcbank|wasbi)\b/i },
  { kind: "link", re: /\bhttps?:\/\/|\bwww\.|\b[\w-]+\.(?:com|in|net|org|me|ly|link)\b/i },
  { kind: "outside app", re: /\b(?:whats\s?app|wa\.me|telegram|insta(?:gram)?|snap(?:chat)?|dm me|call me)\b/i },
  { kind: "QR payment", re: /\bscan\b.*\bqr\b|\bqr\b.*\b(?:scan|receive|pay)\b/i },
];

export function detectOffPlatform(text: string): string[] {
  return PATTERNS.filter((p) => p.re.test(text)).map((p) => p.kind);
}
