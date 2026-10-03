"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { Loader2, SendHorizontal, ShieldAlert } from "lucide-react";
import { sendMessage } from "@/app/actions/chat";
import { FormError } from "@/components/action-form";

type Msg = { id: string; senderId: string; body: string; flagged: boolean; createdAt: string };

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

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
    if (document.hidden) return;
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
      /* offline — next tick */
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
    const onVisible = () => !document.hidden && poll();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [poll]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  return (
    <div className="flex flex-col h-[calc(100dvh-15rem)] md:h-[60vh] min-h-80 card overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-1.5 bg-paper/60">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted mt-10">
            <p className="text-3xl" aria-hidden>💬</p>
            <p className="mt-2">Say hi! Ask for extra photos or set up a quick video call.</p>
          </div>
        )}
        {messages.map((m, i) => {
          const mine = m.senderId === me;
          const newDay = i === 0 || day(messages[i - 1].createdAt) !== day(m.createdAt);
          return (
            <div key={m.id}>
              {newDay && <p className="text-center text-xs text-muted my-3">{day(m.createdAt)}</p>}
              <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-4 py-2 text-[0.95rem] whitespace-pre-wrap break-words rounded-2xl ${mine ? "bg-brand text-white rounded-br-md" : "bg-white border border-line rounded-bl-md"}`}>
                  {m.body}
                  <span className={`block text-[0.65rem] mt-0.5 text-right ${mine ? "text-white/60" : "text-muted"}`}>{time(m.createdAt)}</span>
                  {m.flagged && (
                    <span className={`mt-1 flex gap-1 text-[0.72rem] ${mine ? "text-gold-soft" : "text-gold-dark"}`}>
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0" aria-hidden /> Keep deals on Cloro. Never share OTPs or scan a QR to receive money.
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {canSend ? (
        <form ref={formRef} action={action} className="border-t border-line p-2.5 flex gap-2 bg-white">
          <input type="hidden" name="conversationId" value={conversationId} />
          <input name="body" className="input !rounded-full !min-h-11" placeholder="Write a message…" maxLength={2000} autoComplete="off" required aria-label="Message" />
          <button className="btn btn-primary !px-4 !min-h-11" disabled={pending} aria-label="Send">
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizontal className="w-4 h-4" />}
          </button>
        </form>
      ) : (
        <p className="border-t border-line p-4 text-sm text-muted bg-white">{reason}</p>
      )}
      {state?.error && <div className="px-4 pb-3 bg-white"><FormError message={state.error} /></div>}
    </div>
  );
}
