import { test, expect } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "https://pla.creator.lefil.com.br";
const USER = process.env.E2E_USER_EMAIL;
const PASS = process.env.E2E_USER_PASSWORD;

test.describe("auth: login happy path", () => {
  test.skip(!USER || !PASS, "E2E_USER_EMAIL/PASSWORD não configurados");

  test("usuário faz login e chega ao dashboard", async ({ page }) => {
    await page.goto(`${BASE_URL}/auth`);
    await page.locator('input[type="email"]').first().fill(USER!);
    await page.locator('input[type="password"]').first().fill(PASS!);
    await page.getByRole("button", { name: /entrar|login/i }).first().click();

    await page.waitForURL(/\/(dashboard|home|$)/, { timeout: 20_000 });
    await expect(page).not.toHaveURL(/\/auth/);
  });
});
