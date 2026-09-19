import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Plafonne le parallelisme local : au-dela, la contention CPU ralentit
  // suffisamment l'hydratation React pour rendre flaky la course avec le
  // useEffect de pre-remplissage de page.tsx (cf. fillAdapterAddress).
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // devices["iPhone SE"] embarque WebKit par defaut ; on ne fait tourner
    // que Chromium dans cet environnement, donc on force le moteur tout en
    // gardant le viewport/touch/scale-factor du preset iPhone SE.
    {
      name: "mobile-iphone-se",
      use: { ...devices["iPhone SE"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command: "pnpm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
