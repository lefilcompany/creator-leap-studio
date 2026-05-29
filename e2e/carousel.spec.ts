import { test, expect } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "https://pla.creator.lefil.com.br";
const USER = process.env.E2E_USER_EMAIL;
const PASS = process.env.E2E_USER_PASSWORD;

test.describe("carrossel: criação", () => {
  test.skip(!USER || !PASS, "E2E_USER_EMAIL/PASSWORD não configurados");

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/auth`);
    await page.locator('input[type="email"]').first().fill(USER!);
    await page.locator('input[type="password"]').first().fill(PASS!);
    await page.getByRole("button", { name: /entrar|login/i }).first().click();
    await page.waitForURL((url) => !/\/auth/.test(url.pathname), { timeout: 20_000 });
  });

  test("opção 'Carrossel (4:5)' abre o painel de slides", async ({ page }) => {
    await page.goto(`${BASE_URL}/criar/imagem`);
    const carouselOption = page.getByText(/carrossel/i).first();
    await expect(carouselOption).toBeVisible({ timeout: 15_000 });
    await carouselOption.click();

    // O CarouselPanel renderiza ao menos 1 slide (default 4)
    await expect(page.getByText(/slide\s*1/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
