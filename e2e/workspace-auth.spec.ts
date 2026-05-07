import { test, expect } from "../playwright-fixture";

/**
 * Fluxos autenticados de Workspace.
 * Por padrão SKIPPED — defina E2E_EMAIL e E2E_PASSWORD (de um usuário em
 * ambiente de Test, nunca Live) para habilitar.
 */
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
const enabled = !!(EMAIL && PASSWORD);

test.describe("Workspace (autenticado)", () => {
  test.skip(!enabled, "Defina E2E_EMAIL/E2E_PASSWORD para rodar");

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"]').first().fill(EMAIL!);
    await page.locator('input[type="password"]').first().fill(PASSWORD!);
    await page.getByRole("button", { name: /entrar|login/i }).first().click();
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
  });

  test("abre página Workspace e mostra seções", async ({ page }) => {
    await page.goto("/workspace");
    await expect(page.getByText(/Visão geral/i)).toBeVisible();
    await expect(page.getByText(/Membros/i)).toBeVisible();
    await expect(page.getByText(/Créditos/i).first()).toBeVisible();
  });

  test("navega para Identidade", async ({ page }) => {
    await page.goto("/workspace");
    await page.getByRole("button", { name: /Identidade/i }).first().click();
    await expect(page.getByLabel(/nome/i).first()).toBeVisible();
  });

  test("dashboard mostra créditos", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText(/créditos?/i).first()).toBeVisible();
  });
});
