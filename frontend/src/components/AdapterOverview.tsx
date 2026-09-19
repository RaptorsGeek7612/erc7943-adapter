"use client";

import { isAddress, type Address } from "viem";
import { useReadContract, useReadContracts } from "wagmi";

import { erc20MetadataAbi } from "@/lib/erc20MetadataAbi";
import { erc7943AdapterAbi } from "@/lib/erc7943AdapterAbi";

const ERC165_INTERFACE_ID = "0x01ffc9a7";

export function AdapterOverview({ adapterAddress }: { adapterAddress: string }) {
  const enabled = isAddress(adapterAddress);
  const address = enabled ? (adapterAddress as Address) : undefined;

  const { data: interfaceId } = useReadContract({
    address,
    abi: erc7943AdapterAbi,
    functionName: "erc7943InterfaceId",
    query: { enabled },
  });

  const { data: tokenAddress } = useReadContract({
    address,
    abi: erc7943AdapterAbi,
    functionName: "token",
    query: { enabled },
  });

  const { data: supportsChecks } = useReadContracts({
    contracts: [
      {
        address,
        abi: erc7943AdapterAbi,
        functionName: "supportsInterface",
        args: interfaceId ? [interfaceId] : undefined,
      },
      {
        address,
        abi: erc7943AdapterAbi,
        functionName: "supportsInterface",
        args: [ERC165_INTERFACE_ID],
      },
    ],
    query: { enabled: enabled && Boolean(interfaceId) },
  });

  const tokenEnabled = Boolean(tokenAddress);
  const { data: tokenMeta } = useReadContracts({
    contracts: [
      { address: tokenAddress, abi: erc20MetadataAbi, functionName: "name" },
      { address: tokenAddress, abi: erc20MetadataAbi, functionName: "symbol" },
      { address: tokenAddress, abi: erc20MetadataAbi, functionName: "decimals" },
    ],
    query: { enabled: tokenEnabled },
  });

  if (!enabled) {
    return (
      <p className="text-sm text-zinc-500">
        Renseigne une adresse d&apos;adaptateur valide pour voir ses informations.
      </p>
    );
  }

  const supportsErc7943 = supportsChecks?.[0]?.result;
  const supportsErc165 = supportsChecks?.[1]?.result;
  const [name, symbol, decimals] = tokenMeta?.map((r) => r.result) ?? [];

  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      <Row label="Token ERC-3643 sous-jacent" value={tokenAddress ?? "…"} mono />
      <Row
        label="Token (nom / symbole / decimales)"
        value={
          tokenMeta
            ? `${String(name ?? "?")} / ${String(symbol ?? "?")} / ${String(decimals ?? "?")}`
            : "…"
        }
      />
      <Row label="Identifiant d'interface ERC-7943 (calculé)" value={interfaceId ?? "…"} mono />
      <Row
        label="Compatible ERC-7943"
        value={supportsErc7943 === undefined ? "…" : supportsErc7943 ? "true" : "false"}
        tone={supportsErc7943 === false ? "warn" : "ok"}
      />
      <Row
        label="Compatible ERC-165"
        value={supportsErc165 === undefined ? "…" : supportsErc165 ? "true" : "false"}
        tone={supportsErc165 === false ? "warn" : "ok"}
      />
    </dl>
  );
}

function Row({
  label,
  value,
  mono,
  tone,
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: "ok" | "warn";
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd
        className={`${mono ? "font-mono text-xs" : "text-sm"} ${
          tone === "warn" ? "text-amber-600 dark:text-amber-400" : tone === "ok" ? "text-emerald-600 dark:text-emerald-400" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
