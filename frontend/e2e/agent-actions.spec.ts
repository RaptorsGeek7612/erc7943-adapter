import { expect, test } from "@playwright/test";
import { SEPOLIA, fillAdapterAddress, gotoAndWaitReady } from "./fixtures";

test.describe("Actions d'agent (ecriture)", () => {
  test("invite a connecter un portefeuille tant qu'aucun n'est connecte", async ({ page }) => {
    await gotoAndWaitReady(page);
    await fillAdapterAddress(page, SEPOLIA.adapter);

    await expect(
      page.getByText(
        "Connecte un portefeuille pour executer une ecriture. Ces fonctions revert tant que l'adaptateur n'a pas recu le role d'agent sur le token.",
      ),
    ).toBeVisible();

    // Les formulaires d'ecriture ne doivent pas apparaitre sans portefeuille.
    await expect(page.getByText("Geler une quantité de tokens")).toHaveCount(0);
    await expect(page.getByText("Forcer un transfert")).toHaveCount(0);
  });

  test("invite a renseigner l'adaptateur avant toute chose", async ({ page }) => {
    await gotoAndWaitReady(page);
    // L'app pre-remplit le champ depuis NEXT_PUBLIC_DEFAULT_ADAPTER_ADDRESS :
    // on vide explicitement pour tester l'etat "aucun adaptateur", plutot
    // que de compter sur un etat initial transitoire avant hydratation.
    await fillAdapterAddress(page, "");
    await expect(
      page.getByText("Renseigne d'abord une adresse d'adaptateur valide.").last(),
    ).toBeVisible();
  });
});
