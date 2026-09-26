"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { sendMessage } from "@/app/actions/chat";

type Msg = { id: string; senderId: string; body: string; flagged: boolean; createdAt: string };

export function ChatBox({
  conversationId,
  me,
  initial,
  initialCanSend,
  initialReason,
}: {
  conversationId: string;
  me: string;
  initial: Msg[];
  initialCanSend: boolean;
  initialReason: string | null;
}) {
  const [messages, setMessages] = useState(initial);
  const [canSend, setCanSend] = useState(initialCanSend);
  const [reason, setReason] = useState(initialReason);
  const formRef = useRef<HTMLFormElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastRef = useRef(initial.at(-1)?.createdAt);

  const poll = useCallback(async () => {
    const last = lastRef.current;
    try {
      const res = await fetch(`/api/conversations/${conversationId}${last ? `?after=${encodeURIComponent(last)}` : ""}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { messages: Msg[]; canSend: boolean; reason: string | null };
      if (data.messages.length) {
        lastRef.current = data.messages.at(-1)!.createdAt;
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          return [...prev, ...data.messages.filter((m) => !seen.has(m.id))];
        });
      }
      setCanSend(data.canSend);
      setReason(data.reason);
    } catch {
      /* ignore */
    }
  }, [conversationId]);

  const [state, action, pending] = useActionState(async (prev: Parameters<typeof sendMessage>[0], fd: FormData) => {
    const result = await sendMessage(prev, fd);
    if (result && !result.error) {
      formRef.current?.reset();
      await poll();
    }
    return result;
  }, undefined);

  useEffect(() => {
    const t = setInterval(poll, 4000);
    return () => clearInterval(t);
  }, [poll]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  return (
    <div className="card flex flex-col h-[60vh]">
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {messages.length === 0 && <p className="text-center text-sm text-muted mt-10">Say hello. Ask for extra photos or set up a video call.</p>}
        {messages.map((m) => {
          const mine = m.senderId === me;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-4 py-2 text-sm whitespace-pre-wrap ${mine ? "bg-ink text-ivory" : "bg-ivory"}`}>
                {m.body}
                {m.flagged && (
                  <p className={`mt-1 text-[0.7rem] ${mine ? "text-gold-soft" : "text-gold"}`}>
                    ⚠ Keep deals on Cloro. Never share OTPs or scan a QR code to receive money.
                  </p>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {canSend ? (
        <form ref={formRef} action={action} className="border-t border-line p-3 flex gap-2">
          <input type="hidden" name="conversationId" value={conversationId} />
          <input name="body" className="input" placeholder="Be kind and respectful…" maxLength={2000} autoComplete="off" required />
          <button className="btn btn-primary" disabled={pending}>Send</button>
        </form>
      ) : (
        <p className="border-t border-line p-4 text-sm text-muted">{reason}</p>
      )}
      {state?.error && <p className="px-4 pb-3 text-sm text-red-700">{state.error}</p>}
      {state?.ok && <p className="px-4 pb-3 text-sm text-gold">{state.ok}</p>}
    </div>
  );
}
