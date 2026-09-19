import { expect, test } from "@playwright/test";
import { SEPOLIA, fillAdapterAddress, gotoAndWaitReady } from "./fixtures";

test.describe("Vue d'ensemble", () => {
  test("charge la page avec le logo et le titre", async ({ page }) => {
    await gotoAndWaitReady(page);
    // Le CSS affiche "Adaptateur" en majuscules (text-transform) mais le DOM
    // garde la casse d'origine : comparaison insensible a la casse.
    await expect(page.locator("header")).toContainText(/adaptateur/i);
    await expect(page.locator("header")).toContainText("7943");
    await expect(page.getByRole("button", { name: "Connect Wallet" })).toBeVisible();
  });

  test("resout un adaptateur valide contre le vrai reseau Sepolia", async ({ page }) => {
    await gotoAndWaitReady(page);
    await fillAdapterAddress(page, SEPOLIA.adapter);

    await expect(page.getByText(SEPOLIA.token)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("T-REX Sepolia Demo / TREXD / 0")).toBeVisible();
    await expect(page.getByText("0x5abd1f73")).toBeVisible();
    await expect(page.getByText("Compatibilité")).toBeVisible();
    await expect(page.getByText("ERC7943", { exact: true })).toBeVisible();
    await expect(page.getByText("ERC165", { exact: true })).toBeVisible();
  });

  test("affiche un message neutre pour une adresse qui n'est pas l'adaptateur", async ({ page }) => {
    await gotoAndWaitReady(page);
    await fillAdapterAddress(page, SEPOLIA.notAnAdapter);

    await expect(page.getByText("Aucun adaptateur détecté à cette adresse.")).toBeVisible({
      timeout: 15_000,
    });
    // Filet de securite : jamais de message technique brut a l'ecran.
    await expect(page.getByText(/reverted/i)).toHaveCount(0);
    await expect(page.getByText(/contract function/i)).toHaveCount(0);
  });

  test("refuse une adresse mal formee sans appeler le reseau", async ({ page }) => {
    await gotoAndWaitReady(page);
    await fillAdapterAddress(page, "0x123");

    await expect(page.getByText("Adresse Ethereum invalide.")).toBeVisible();
    await expect(
      page.getByText("Renseigne une adresse d'adaptateur valide pour voir ses informations."),
    ).toBeVisible();
  });
});
