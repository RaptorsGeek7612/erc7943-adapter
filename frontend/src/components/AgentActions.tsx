"use client";

import { useState } from "react";
import { isAddress, type Address } from "viem";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import { erc7943AdapterAbi } from "@/lib/erc7943AdapterAbi";
import { AddressField } from "./AddressField";
import { extractErrorMessage } from "./ReadChecks";

function parseAmount(raw: string): bigint | undefined {
  if (!/^\d+$/.test(raw)) return undefined;
  try {
    return BigInt(raw);
  } catch {
    return undefined;
  }
}

export function AgentActions({ adapterAddress }: { adapterAddress: string }) {
  const { isConnected } = useAccount();
  const adapterEnabled = isAddress(adapterAddress);

  if (!adapterEnabled) {
    return <p className="text-sm text-parchment">Renseigne d&apos;abord une adresse d&apos;adaptateur valide.</p>;
  }

  if (!isConnected) {
    return (
      <p className="text-sm text-parchment">
        Connecte un portefeuille pour executer une ecriture. Ces fonctions revert tant que
        l&apos;adaptateur n&apos;a pas recu le role d&apos;agent sur le token.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <SetFrozenTokensForm adapterAddress={adapterAddress as Address} />
      <ForcedTransferForm adapterAddress={adapterAddress as Address} />
    </div>
  );
}

function TxStatus({
  isPending,
  isConfirming,
  isSuccess,
  error,
  hash,
}: {
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  error: unknown;
  hash: `0x${string}` | undefined;
}) {
  if (isPending) return <p className="text-xs text-parchment">Confirmation dans le portefeuille…</p>;
  if (isConfirming) return <p className="text-xs text-gold-bright">Transaction envoyée, en attente de confirmation…</p>;
  if (isSuccess) return <p className="truncate text-xs text-emerald">Confirmée : {hash}</p>;
  if (error) return <p className="text-xs text-crimson">{extractErrorMessage(error)}</p>;
  return null;
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-fit rounded-md bg-gradient-to-b from-gold-bright to-gold px-5 py-2 text-sm font-semibold text-ink transition-all hover:brightness-110 disabled:opacity-30 disabled:hover:brightness-100"
    >
      Envoyer
    </button>
  );
}

function SetFrozenTokensForm({ adapterAddress }: { adapterAddress: Address }) {
  const [user, setUser] = useState("");
  const [amountRaw, setAmountRaw] = useState("");
  const amount = parseAmount(amountRaw);
  const userValid = isAddress(user);

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return (
    <form
      className="flex flex-col gap-3 rounded-xl border border-ivory/10 bg-ink/40 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!userValid || amount === undefined) return;
        reset();
        writeContract({
          address: adapterAddress,
          abi: erc7943AdapterAbi,
          functionName: "setFrozenTokens",
          args: [user as Address, BigInt(0), amount],
        });
      }}
    >
      <h3 className="font-display text-base font-semibold text-ivory">Geler une quantité de tokens</h3>
      <p className="text-xs text-parchment">
        Fixe la quantite gelee cible (ecrase). L&apos;adaptateur traduit en gel/degel incremental cote
        token.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <AddressField label="Utilisateur" value={user} onChange={setUser} />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-xs font-medium uppercase tracking-wider text-parchment">Quantité gelée cible</span>
          <input
            type="text"
            inputMode="numeric"
            value={amountRaw}
            onChange={(event) => setAmountRaw(event.target.value.trim())}
            className="field px-3 py-2 font-mono text-xs"
          />
        </label>
      </div>
      <SubmitButton disabled={!userValid || amount === undefined || isPending || isConfirming} />
      <TxStatus isPending={isPending} isConfirming={isConfirming} isSuccess={isSuccess} error={error} hash={hash} />
    </form>
  );
}

function ForcedTransferForm({ adapterAddress }: { adapterAddress: Address }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [amountRaw, setAmountRaw] = useState("");
  const amount = parseAmount(amountRaw);
  const fromValid = isAddress(from);
  const toValid = isAddress(to);

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return (
    <form
      className="flex flex-col gap-3 rounded-xl border border-ivory/10 bg-ink/40 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!fromValid || !toValid || amount === undefined) return;
        reset();
        writeContract({
          address: adapterAddress,
          abi: erc7943AdapterAbi,
          functionName: "forcedTransfer",
          args: [from as Address, to as Address, BigInt(0), amount],
        });
      }}
    >
      <h3 className="font-display text-base font-semibold text-ivory">Forcer un transfert</h3>
      <p className="text-xs text-parchment">
        Transfert execute sans le consentement du porteur. Reserve a une autorite habilitee.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <AddressField label="Depuis" value={from} onChange={setFrom} />
        <AddressField label="Vers" value={to} onChange={setTo} />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-xs font-medium uppercase tracking-wider text-parchment">Montant</span>
          <input
            type="text"
            inputMode="numeric"
            value={amountRaw}
            onChange={(event) => setAmountRaw(event.target.value.trim())}
            className="field px-3 py-2 font-mono text-xs"
          />
        </label>
      </div>
      <SubmitButton disabled={!fromValid || !toValid || amount === undefined || isPending || isConfirming} />
      <TxStatus isPending={isPending} isConfirming={isConfirming} isSuccess={isSuccess} error={error} hash={hash} />
    </form>
  );
}
