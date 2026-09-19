"use client";

import { isAddress } from "viem";

export function AddressField({
  label,
  value,
  onChange,
  placeholder = "0x...",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const touched = value.length > 0;
  const valid = isAddress(value);

  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-xs font-medium uppercase tracking-wider text-parchment">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value.trim())}
        placeholder={placeholder}
        spellCheck={false}
        className={`field px-3 py-2 font-mono text-xs ${touched && !valid ? "field-invalid" : ""}`}
      />
      {touched && !valid ? <span className="text-xs text-crimson">Adresse Ethereum invalide.</span> : null}
    </label>
  );
}
