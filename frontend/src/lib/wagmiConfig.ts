import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, sepolia } from "wagmi/chains";

const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

if (!walletConnectProjectId) {
  console.warn(
    "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID est vide : WalletConnect sera desactive. " +
      "Cree un projet sur https://cloud.reown.com et renseigne .env.local (voir .env.example).",
  );
}

export const wagmiConfig = getDefaultConfig({
  appName: "Adaptateur ERC-7943",
  projectId: walletConnectProjectId || "MISSING_WALLETCONNECT_PROJECT_ID",
  chains: [sepolia, mainnet],
  ssr: true,
});
