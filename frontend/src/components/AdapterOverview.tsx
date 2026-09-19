"use client";

import { isAddress, type Address } from "viem";
import { useReadContract, useReadContracts } from "wagmi";

import { erc20MetadataAbi } from "@/lib/erc20MetadataAbi";
import { erc7943AdapterAbi } from "@/lib/erc7943AdapterAbi";
import { extractErrorMessage } from "./ReadChecks";

const ERC165_INTERFACE_ID = "0x01ffc9a7";

export function AdapterOverview({ adapterAddress }: { adapterAddress: string }) {
  const enabled = isAddress(adapterAddress);
  const address = enabled ? (adapterAddress as Address) : undefined;

  const {
    data: interfaceId,
    isError: interfaceIdError,
    error: interfaceIdErrorDetail,
  } = useReadContract({
    address,
    abi: erc7943AdapterAbi,
    functionName: "erc7943InterfaceId",
    query: { enabled, retry: false },
  });

  const { data: tokenAddress, isError: tokenError } = useReadContract({
    address,
    abi: erc7943AdapterAbi,
    functionName: "token",
    query: { enabled, retry: false },
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
    query: { enabled: enabled && Boolean(interfaceId), retry: false },
  });

  const tokenEnabled = Boolean(tokenAddress);
  const { data: tokenMeta } = useReadContracts({
    contracts: [
      { address: tokenAddress, abi: erc20MetadataAbi, functionName: "name" },
      { address: tokenAddress, abi: erc20MetadataAbi, functionName: "symbol" },
      { address: tokenAddress, abi: erc20MetadataAbi, functionName: "decimals" },
    ],
    query: { enabled: tokenEnabled, retry: false },
  });

  if (!enabled) {
    return (
      <p className="text-sm text-parchment">
        Renseigne une adresse d&apos;adaptateur valide pour voir ses informations.
      </p>
    );
  }

  if (interfaceIdError || tokenError) {
    return (
      <p className="text-sm text-crimson">
        {extractErrorMessage(interfaceIdErrorDetail) || "Aucun adaptateur détecté à cette adresse."}
      </p>
    );
  }

  const supportsErc7943 = supportsChecks?.[0]?.result;
  const supportsErc165 = supportsChecks?.[1]?.result;
  const [name, symbol, decimals] = tokenMeta?.map((r) => r.result) ?? [];

  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      <Row label="Token ERC3643 sous-jacent" value={tokenAddress ?? "…"} mono />
      <Row
        label="Token (nom / symbole / decimales)"
        value={
          tokenMeta
            ? `${String(name ?? "?")} / ${String(symbol ?? "?")} / ${String(decimals ?? "?")}`
            : "…"
        }
      />
      <Row label="Identifiant d'interface ERC7943 (calculé)" value={interfaceId ?? "…"} mono />
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <dt className="text-xs uppercase tracking-wider text-parchment">Compatibilité</dt>
        <dd className="flex flex-wrap gap-2">
          <CompatibilityBadge label="ERC7943" supported={supportsErc7943} />
          <CompatibilityBadge label="ERC165" supported={supportsErc165} />
        </dd>
      </div>
    </dl>
  );
}

function CompatibilityBadge({ label, supported }: { label: string; supported: boolean | undefined }) {
  const state = supported === undefined ? "pending" : supported ? "ok" : "warn";
  const styles =
    state === "ok"
      ? "border-emerald/30 bg-emerald/10 text-emerald"
      : state === "warn"
        ? "border-crimson/30 bg-crimson/10 text-crimson"
        : "border-ivory/15 text-parchment";
  const dot = state === "ok" ? "bg-emerald" : state === "warn" ? "bg-crimson" : "bg-parchment/50";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${styles}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
      {label}
    </span>
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
      <dt className="text-xs uppercase tracking-wider text-parchment">{label}</dt>
      <dd
        className={`${mono ? "font-mono text-xs break-all" : "text-sm"} text-ivory ${
          tone === "warn" ? "!text-crimson" : tone === "ok" ? "!text-emerald" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
