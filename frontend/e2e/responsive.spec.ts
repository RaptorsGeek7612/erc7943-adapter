import { expect, test } from "@playwright/test";
import { gotoAndWaitReady } from "./fixtures";

test.describe("Rendu responsive", () => {
  test("aucun defilement horizontal", async ({ page }) => {
    await gotoAndWaitReady(page);

    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);
  });

  test("le bouton Connect Wallet tient sur une seule ligne", async ({ page }) => {
    // Regression : sur les ecrans etroits (~390px et moins), le bouton se
    // coupait en deux lignes a cote du logo avant que l'en-tete ne passe en
    // colonne sur mobile.
    await gotoAndWaitReady(page);

    const button = page.getByRole("button", { name: "Connect Wallet" });
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeLessThan(50);
  });

  test("l'adresse du token sous-jacent ne deborde pas de sa carte", async ({ page }) => {
    // Regression : ce texte mono debordait de sa carte et provoquait un
    // scroll horizontal de toute la page sur les ecrans les plus etroits
    // (iPhone SE, 320px) avant l'ajout de break-all.
    await gotoAndWaitReady(page);
    await page
      .getByLabel("Adresse du contrat de l'adaptateur")
      .fill("0x6D2063A5a570fEEd7ef9abC301B8f3274Eef9052");
    await page.waitForTimeout(2_000);

    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);
  });
});
