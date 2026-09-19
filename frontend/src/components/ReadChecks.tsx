"use client";

import { useState } from "react";
import { isAddress, type Address } from "viem";
import { useReadContract } from "wagmi";

import { erc7943AdapterAbi } from "@/lib/erc7943AdapterAbi";
import { AddressField } from "./AddressField";

export function extractErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const withMessages = error as { shortMessage?: string; message?: string };
    return withMessages.shortMessage ?? withMessages.message ?? "erreur";
  }
  return "erreur";
}

function parseAmount(raw: string): bigint | undefined {
  if (!/^\d+$/.test(raw)) return undefined;
  try {
    return BigInt(raw);
  } catch {
    return undefined;
  }
}

export function ReadChecks({ adapterAddress }: { adapterAddress: string }) {
  const adapterEnabled = isAddress(adapterAddress);
  const address = adapterEnabled ? (adapterAddress as Address) : undefined;

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [amountRaw, setAmountRaw] = useState("1");
  const amount = parseAmount(amountRaw);

  const fromValid = isAddress(from);
  const toValid = isAddress(to);

  const canSend = useReadContract({
    address,
    abi: erc7943AdapterAbi,
    functionName: "canSend",
    args: fromValid && amount !== undefined ? [from as Address, BigInt(0), amount] : undefined,
    query: { enabled: adapterEnabled && fromValid && amount !== undefined },
  });

  const canReceive = useReadContract({
    address,
    abi: erc7943AdapterAbi,
    functionName: "canReceive",
    args: toValid && amount !== undefined ? [to as Address, BigInt(0), amount] : undefined,
    query: { enabled: adapterEnabled && toValid && amount !== undefined },
  });

  const canTransfer = useReadContract({
    address,
    abi: erc7943AdapterAbi,
    functionName: "canTransfer",
    args:
      fromValid && toValid && amount !== undefined
        ? [from as Address, to as Address, BigInt(0), amount]
        : undefined,
    query: { enabled: adapterEnabled && fromValid && toValid && amount !== undefined },
  });

  const frozenFrom = useReadContract({
    address,
    abi: erc7943AdapterAbi,
    functionName: "getFrozenTokens",
    args: fromValid ? [from as Address, BigInt(0)] : undefined,
    query: { enabled: adapterEnabled && fromValid },
  });

  if (!adapterEnabled) {
    return <p className="text-sm text-parchment">Renseigne d&apos;abord une adresse d&apos;adaptateur valide.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <AddressField label="Émetteur" value={from} onChange={setFrom} />
        <AddressField label="Destinataire" value={to} onChange={setTo} />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-xs font-medium uppercase tracking-wider text-parchment">Montant</span>
          <input
            type="text"
            inputMode="numeric"
            value={amountRaw}
            onChange={(event) => setAmountRaw(event.target.value.trim())}
            className="field px-3 py-2 font-mono text-xs"
          />
          {amountRaw && amount === undefined ? (
            <span className="text-xs text-crimson">Entier positif attendu.</span>
          ) : null}
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ResultCard title="L'émetteur peut-il envoyer ce montant ?" state={canSend} />
        <ResultCard title="Le destinataire peut-il le recevoir ?" state={canReceive} />
        <ResultCard title="Le transfert complet est-il autorisé ?" state={canTransfer} />
        <ResultCard
          title="Quantité gelée chez l'émetteur"
          state={frozenFrom}
          format={(value) => value?.toString() ?? ""}
        />
      </div>
    </div>
  );
}

function ResultCard<T>({
  title,
  state,
  format,
}: {
  title: string;
  state: { data: T | undefined; isFetching: boolean; isError: boolean; error: unknown };
  format?: (value: T | undefined) => string;
}) {
  let body: string;
  let tone = "text-parchment";

  if (state.isFetching) {
    body = "chargement…";
  } else if (state.isError) {
    body = extractErrorMessage(state.error);
    tone = "text-crimson";
  } else if (state.data === undefined) {
    body = "renseigne les champs ci-dessus";
  } else if (format) {
    body = format(state.data);
    tone = "text-ivory";
  } else {
    body = String(state.data);
    tone = state.data === true ? "text-emerald" : "text-crimson";
  }

  return (
    <div className="rounded-lg border border-ivory/10 bg-ink/40 p-3">
      <p className="text-sm font-medium text-ivory/90">{title}</p>
      <p className={`mt-1.5 truncate text-sm font-semibold ${tone}`}>{body}</p>
    </div>
  );
}
