"use client";

import { useState } from "react";

type Props = {
  value: string | null;
  label?: string;
  className?: string;
};

export default function CopyButton({ value, label = "Copy", className }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        void handleCopy();
      }}
      disabled={!value}
      className={`admin-button-secondary px-2 py-1 text-[11px] disabled:cursor-not-allowed disabled:opacity-45 ${className ?? ""}`}
      aria-label={value ? `${label} value` : "No value to copy"}
      title={value ? `${label} value` : "No value to copy"}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
