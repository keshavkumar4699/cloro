"use client";

import { useState } from "react";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Approve my Cloro account", url });
        return;
      } catch {
        /* fall back to copy */
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
  };
  return (
    <div className="card p-4 flex flex-col sm:flex-row gap-3 items-stretch">
      <input readOnly value={url} className="input text-xs" onFocus={(e) => e.target.select()} />
      <button type="button" onClick={share} className="btn btn-gold whitespace-nowrap">
        {copied ? "Copied" : "Share link"}
      </button>
    </div>
  );
}
