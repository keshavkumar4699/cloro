"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/action-state";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

export function ActionForm({
  action,
  children,
  submit,
  className,
  variant = "primary",
  confirm,
}: {
  action: Action;
  children?: React.ReactNode;
  submit: string;
  className?: string;
  variant?: "primary" | "ghost" | "gold" | "danger";
  confirm?: string;
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
      <SubmitButton label={submit} variant={variant} />
      {state?.error && <p className="mt-2 text-sm text-red-700" role="alert">{state.error}</p>}
      {state?.ok && <p className="mt-2 text-sm text-emerald-800" role="status">{state.ok}</p>}
    </form>
  );
}

export function SubmitButton({ label, variant = "primary" }: { label: string; variant?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`btn btn-${variant}`}>
      {pending ? "Please wait…" : label}
    </button>
  );
}
