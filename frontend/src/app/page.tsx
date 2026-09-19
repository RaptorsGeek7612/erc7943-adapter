"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";

import { AddressField } from "@/components/AddressField";
import { AdapterOverview } from "@/components/AdapterOverview";
import { AgentActions } from "@/components/AgentActions";
import { ReadChecks } from "@/components/ReadChecks";

const STORAGE_KEY = "erc7943-adapter-address";

export default function Home() {
  const [adapterAddress, setAdapterAddress] = useState("");

  // localStorage n'existe pas cote serveur : la valeur ne peut etre lue qu'apres le
  // montage, d'ou l'ecart volontaire avec le rendu SSR (chaine vide) le temps d'un effet.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAdapterAddress(stored);
        return;
      }
    } catch {
      // stockage indisponible (navigation privee) : on continue sans valeur persistee.
    }
    const fallback = process.env.NEXT_PUBLIC_DEFAULT_ADAPTER_ADDRESS;
    if (fallback) setAdapterAddress(fallback);
  }, []);

  useEffect(() => {
    try {
      if (adapterAddress) window.localStorage.setItem(STORAGE_KEY, adapterAddress);
    } catch {
      // idem
    }
  }, [adapterAddress]);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Adaptateur ERC-7943</h1>
          <p className="text-xs text-zinc-500">Console d&apos;inspection pour un token ERC-3643 expose via ERC-7943</p>
        </div>
        <ConnectButton />
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-8">
        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Adaptateur cible</h2>
          <AddressField
            label="Adresse du contrat de l'adaptateur"
            value={adapterAddress}
            onChange={setAdapterAddress}
          />
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Vue d&apos;ensemble</h2>
          <AdapterOverview adapterAddress={adapterAddress} />
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Verifications de conformite (lecture)
          </h2>
          <ReadChecks adapterAddress={adapterAddress} />
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Actions d&apos;agent (ecriture)</h2>
          <p className="mb-3 text-xs text-zinc-500">
            Necessitent que ce contrat adaptateur porte le role d&apos;agent sur le token ERC-3643.
          </p>
          <AgentActions adapterAddress={adapterAddress} />
        </section>
      </main>

      <footer className="border-t border-zinc-200 px-6 py-4 text-center text-xs text-zinc-500 dark:border-zinc-800">
        ERC-7943 est un brouillon au stade Review. Verifie l&apos;identifiant d&apos;interface affiche contre{" "}
        <a
          className="underline"
          href="https://eips.ethereum.org/EIPS/eip-7943"
          target="_blank"
          rel="noreferrer"
        >
          eip-7943
        </a>
        .
      </footer>
    </div>
  );
}
