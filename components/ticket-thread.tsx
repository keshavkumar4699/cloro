import { formatDateTime } from "@/lib/format";

type Msg = {
  id: string;
  body: string;
  internal: boolean;
  attachments: string[];
  createdAt: Date;
  author: { id: string; name: string | null; role: string };
};

export function TicketThread({ messages, viewerId, showInternal }: { messages: Msg[]; viewerId: string; showInternal: boolean }) {
  return (
    <ol className="space-y-4">
      {messages
        .filter((m) => showInternal || !m.internal)
        .map((m) => {
          const staff = m.author.role !== "USER";
          return (
            <li key={m.id} className={`p-5 ${m.internal ? "bg-amber-50 border border-amber-200" : staff ? "bg-ivory" : "card"}`}>
              <p className="text-xs text-muted">
                {m.author.id === viewerId ? "You" : staff ? `Cloro Support · ${m.author.name ?? ""}` : m.author.name ?? "Member"} · {formatDateTime(m.createdAt)}
                {m.internal && " · internal note"}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-[0.95rem]">{m.body}</p>
              {m.attachments.length > 0 && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  {m.attachments.map((a) => (
                    <a key={a} href={a} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={a} alt="Attachment" className="w-24 h-24 object-cover border border-line" />
                    </a>
                  ))}
                </div>
              )}
            </li>
          );
        })}
    </ol>
  );
}
