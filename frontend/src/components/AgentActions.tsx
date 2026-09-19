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
    return <p className="text-sm text-zinc-500">Renseigne d&apos;abord une adresse d&apos;adaptateur valide.</p>;
  }

  if (!isConnected) {
    return (
      <p className="text-sm text-zinc-500">
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
  if (isPending) return <p className="text-xs text-zinc-500">Confirmation dans le portefeuille…</p>;
  if (isConfirming) return <p className="text-xs text-amber-600 dark:text-amber-400">Transaction envoyee, en attente de confirmation…</p>;
  if (isSuccess) return <p className="text-xs text-emerald-600 dark:text-emerald-400">Confirmee : {hash}</p>;
  if (error) return <p className="text-xs text-red-500">{extractErrorMessage(error)}</p>;
  return null;
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
      className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
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
      <h3 className="text-sm font-semibold">Geler une quantité de tokens</h3>
      <p className="font-mono text-[11px] text-zinc-400">setFrozenTokens(user, 0, amount)</p>
      <p className="text-xs text-zinc-500">
        Fixe la quantite gelee cible (ecrase). L&apos;adaptateur traduit en gel/degel incremental cote
        token.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <AddressField label="Utilisateur" value={user} onChange={setUser} />
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Quantite gelee cible</span>
          <input
            type="text"
            inputMode="numeric"
            value={amountRaw}
            onChange={(event) => setAmountRaw(event.target.value.trim())}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-sky-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={!userValid || amount === undefined || isPending || isConfirming}
        className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-40 dark:bg-white dark:text-zinc-900"
      >
        Envoyer
      </button>
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
      className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
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
      <h3 className="text-sm font-semibold">Forcer un transfert</h3>
      <p className="font-mono text-[11px] text-zinc-400">forcedTransfer(from, to, 0, amount)</p>
      <p className="text-xs text-zinc-500">
        Transfert execute sans le consentement du porteur. Reserve a une autorite habilitee.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <AddressField label="Depuis" value={from} onChange={setFrom} />
        <AddressField label="Vers" value={to} onChange={setTo} />
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Montant</span>
          <input
            type="text"
            inputMode="numeric"
            value={amountRaw}
            onChange={(event) => setAmountRaw(event.target.value.trim())}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-sky-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={!fromValid || !toValid || amount === undefined || isPending || isConfirming}
        className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-40 dark:bg-white dark:text-zinc-900"
      >
        Envoyer
      </button>
      <TxStatus isPending={isPending} isConfirming={isConfirming} isSuccess={isSuccess} error={error} hash={hash} />
    </form>
  );
}
