import { test, expect } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "https://pla.creator.lefil.com.br";

test.describe("smoke: app pública", () => {
  test("home carrega sem erros críticos", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    const response = await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();
    await expect(page).toHaveTitle(/.+/);
    expect(errors, `Erros JS na home: ${errors.join("\n")}`).toEqual([]);
  });

  test("rota /auth renderiza formulário de login", async ({ page }) => {
    await page.goto(`${BASE_URL}/auth`, { waitUntil: "domcontentloaded" });
    // Email + senha devem existir em qualquer variação do formulário
    const emailField = page.locator('input[type="email"], input[name="email"]').first();
    const pwdField = page.locator('input[type="password"]').first();
    await expect(emailField).toBeVisible({ timeout: 15_000 });
    await expect(pwdField).toBeVisible({ timeout: 15_000 });
  });
});
