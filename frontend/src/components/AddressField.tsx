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
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value.trim())}
        placeholder={placeholder}
        spellCheck={false}
        className={`rounded-md border bg-white px-3 py-2 font-mono text-xs outline-none transition-colors dark:bg-zinc-900 ${
          touched && !valid
            ? "border-red-400 focus:border-red-500"
            : "border-zinc-300 focus:border-sky-500 dark:border-zinc-700"
        }`}
      />
      {touched && !valid ? (
        <span className="text-xs text-red-500">Adresse Ethereum invalide.</span>
      ) : null}
    </label>
  );
}
