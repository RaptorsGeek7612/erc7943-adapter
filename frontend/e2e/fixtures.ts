import type { Page } from "@playwright/test";

/**
 * Deploiement de reference Sepolia (voir backend/deployments/sepolia.json).
 * Ces tests appellent le vrai reseau Sepolia via le RPC public configure
 * dans l'app (lectures seules, gratuites, pas d'etat modifie) — c'est
 * deliberement une verification d'integration reelle, pas des mocks, dans
 * le meme esprit que les tests backend contre un vrai token T-REX.
 */
export const SEPOLIA = {
  adapter: "0x6D2063A5a570fEEd7ef9abC301B8f3274Eef9052",
  token: "0xe43ca4B4100f82DB567BBb771C5DD70f4150d7c1",
  verifiedHolder: "0x868669A43147CC407b208Dfa713CE9E927986eE2",
  /** Une adresse quelconque valide mais qui n'est pas un contrat adaptateur. */
  notAnAdapter: "0x6B3D16C808E8084bBC679292b3914385ef032Ceb",
} as const;

/**
 * Attend la fin de l'hydratation React avant d'interagir avec la page.
 * Remplir un champ trop tot (juste apres que le HTML soit visible mais
 * avant que React n'ait attache ses gestionnaires d'evenements) fait que
 * la saisie n'atteint jamais l'etat React — observe et documente pendant
 * le developpement de cette app, cf. l'historique du depot.
 */
export async function gotoAndWaitReady(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Console d'inspection", { timeout: 20_000 });
  await page.waitForTimeout(1_200);
}

/**
 * L'app pre-remplit le champ depuis le localStorage (ou, a defaut, depuis
 * NEXT_PUBLIC_DEFAULT_ADAPTER_ADDRESS) via un useEffect de montage. Sur une
 * page fraiche, cet effet peut se declencher juste APRES notre .fill(),
 * ecrasant silencieusement la valeur qu'on vient de saisir. On reessaie donc
 * jusqu'a ce que la valeur reste stable.
 */
export async function fillAdapterAddress(page: Page, address: string) {
  const field = page.getByLabel("Adresse du contrat de l'adaptateur");
  for (let attempt = 0; attempt < 5; attempt++) {
    await field.fill(address);
    await page.waitForTimeout(300);
    if ((await field.inputValue()) === address) return;
  }
  throw new Error(`fillAdapterAddress: la valeur n'est jamais restee stable ("${address}").`);
}
