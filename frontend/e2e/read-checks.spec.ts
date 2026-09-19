import { expect, test } from "@playwright/test";
import { SEPOLIA, fillAdapterAddress, gotoAndWaitReady } from "./fixtures";

test.describe("Verifications de conformite (lecture)", () => {
  test("etat initial : invite a renseigner les champs", async ({ page }) => {
    await gotoAndWaitReady(page);
    await fillAdapterAddress(page, SEPOLIA.adapter);
    await page.waitForTimeout(500);

    await expect(page.getByText("renseigne les champs ci-dessus").first()).toBeVisible();
  });

  test("un porteur verifie et approvisionne peut envoyer/recevoir/transferer", async ({ page }) => {
    await gotoAndWaitReady(page);
    await fillAdapterAddress(page, SEPOLIA.adapter);
    await page.getByLabel("Émetteur").fill(SEPOLIA.verifiedHolder);
    await page.getByLabel("Destinataire").fill(SEPOLIA.verifiedHolder);

    // ".rounded-lg" cible precisement la carte ResultCard (pas les divs
    // ancetres plus larges, que "has" matcherait aussi) ; "exact" evite de
    // matcher "0" comme sous-chaine d'une autre adresse/valeur affichee.
    const sendCard = page.locator("div.rounded-lg", { has: page.getByText("L'émetteur peut-il envoyer ce montant ?") });
    const receiveCard = page.locator("div.rounded-lg", { has: page.getByText("Le destinataire peut-il le recevoir ?") });
    const transferCard = page.locator("div.rounded-lg", { has: page.getByText("Le transfert complet est-il autorisé ?") });
    const frozenCard = page.locator("div.rounded-lg", { has: page.getByText("Quantité gelée chez l'émetteur") });

    await expect(sendCard.getByText("Oui", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(receiveCard.getByText("Oui", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(transferCard.getByText("Oui", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(frozenCard.getByText("0", { exact: true })).toBeVisible({ timeout: 15_000 });
  });

  test("un montant non numerique est refuse avant tout appel reseau", async ({ page }) => {
    await gotoAndWaitReady(page);
    await fillAdapterAddress(page, SEPOLIA.adapter);

    const amountField = page.getByLabel("Montant");
    await amountField.fill("abc");

    await expect(page.getByText("Entier positif attendu.")).toBeVisible();
  });
});
