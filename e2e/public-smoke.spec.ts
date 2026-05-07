import { test, expect } from "../playwright-fixture";

test.describe("Smoke público", () => {
  test("home carrega sem erros críticos", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await expect(page).toHaveTitle(/.+/);
    expect(errors).toEqual([]);
  });

  test("login renderiza formulário", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test("registro renderiza formulário", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
  });

  test("rotas protegidas redirecionam", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    // Deve redirecionar para home/login se não autenticado
    expect(page.url()).toMatch(/\/(login|register|)$/);
  });
});
