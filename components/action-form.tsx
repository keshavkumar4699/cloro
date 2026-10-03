"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2 } from "lucide-react";
import type { ActionState } from "@/lib/action-state";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

/** Form bound to a server action. Errors show inline; successes appear as a toast (lib/flash.ts). */
export function ActionForm({
  action,
  children,
  submit,
  className,
  variant = "primary",
  size,
  confirm,
  full,
}: {
  action: Action;
  children?: React.ReactNode;
  submit: React.ReactNode;
  className?: string;
  variant?: "primary" | "ghost" | "gold" | "danger";
  size?: "sm";
  confirm?: string;
  full?: boolean;
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      <SubmitButton label={submit} variant={variant} size={size} full={full} />
      <FormError message={state?.error} />
    </form>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-2 flex items-start gap-1.5 text-sm text-red-700" role="alert">
      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden /> {message}
    </p>
  );
}

export function SubmitButton({ label, variant = "primary", size, full }: { label: React.ReactNode; variant?: string; size?: "sm"; full?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`btn btn-${variant} ${size === "sm" ? "btn-sm" : ""} ${full ? "w-full" : ""}`}>
      {pending ? <Loader2 className="w-4 h-4 animate-spin" aria-label="Please wait" /> : label}
    </button>
  );
}
