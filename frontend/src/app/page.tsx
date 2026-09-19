"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";

import { AddressField } from "@/components/AddressField";
import { AdapterOverview } from "@/components/AdapterOverview";
import { AgentActions } from "@/components/AgentActions";
import { Logo } from "@/components/Logo";
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
    <div className="flex flex-1 flex-col">
      <header className="flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <Logo />
        <div className="sm:shrink-0">
          <ConnectButton />
        </div>
      </header>

      <p className="font-display px-6 pb-3 text-base italic tracking-wide text-parchment sm:px-10">
        Console d&apos;inspection pour un token ERC-3643 exposé via ERC-7943
      </p>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
        <section className="plaque animate-card-rise p-6" style={{ animationDelay: "0ms" }}>
          <h2 className="font-display mb-3 text-lg font-semibold text-ivory">Adaptateur cible</h2>
          <AddressField
            label="Adresse du contrat de l'adaptateur"
            value={adapterAddress}
            onChange={setAdapterAddress}
          />
        </section>

        <section className="plaque animate-card-rise p-6" style={{ animationDelay: "80ms" }}>
          <h2 className="font-display mb-4 text-lg font-semibold text-ivory">Vue d&apos;ensemble</h2>
          <AdapterOverview adapterAddress={adapterAddress} />
        </section>

        <section className="plaque animate-card-rise p-6" style={{ animationDelay: "160ms" }}>
          <h2 className="font-display mb-4 text-lg font-semibold text-ivory">
            Vérifications de conformité
          </h2>
          <ReadChecks adapterAddress={adapterAddress} />
        </section>

        <section className="plaque animate-card-rise p-6" style={{ animationDelay: "240ms" }}>
          <h2 className="font-display text-lg font-semibold text-ivory">Actions d&apos;agent</h2>
          <p className="mb-4 text-xs text-parchment">
            Nécessitent que ce contrat adaptateur porte le rôle d&apos;agent sur le token ERC-3643.
          </p>
          <AgentActions adapterAddress={adapterAddress} />
        </section>
      </main>

      <footer className="px-6 py-8 text-center text-xs text-parchment sm:px-10">
        ERC-7943 est un brouillon au stade Review. Vérifie l&apos;identifiant d&apos;interface affiché contre{" "}
        <a
          className="text-gold underline decoration-gold/40 underline-offset-2 transition-colors hover:text-gold-bright"
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
