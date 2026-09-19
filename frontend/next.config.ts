import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Le connecteur "Base Account" de wagmi charge @coinbase/cdp-sdk, qui fait des
  // import() dynamiques optionnels vers les packages @x402/* (protocole de paiement,
  // jamais invoque ici). Les externaliser evite au bundler de vouloir les resoudre
  // statiquement au build alors qu'ils ne sont pas installes.
  serverExternalPackages: ["@coinbase/cdp-sdk", "@base-org/account"],
};

export default nextConfig;
