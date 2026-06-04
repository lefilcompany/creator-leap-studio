import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "https://pla.creator.lefil.com.br";
const USER = process.env.E2E_USER_EMAIL;
const PASS = process.env.E2E_USER_PASSWORD;

async function login(page: Page) {
  await page.goto(`${BASE_URL}/auth`);
  await page.locator('input[type="email"]').first().fill(USER!);
  await page.locator('input[type="password"]').first().fill(PASS!);
  await page.getByRole("button", { name: /entrar|login/i }).first().click();
  await page.waitForURL((url) => !/\/auth/.test(url.pathname), { timeout: 20_000 });
}

async function gotoCreateImageAndPickCarousel(page: Page) {
  await page.goto(`${BASE_URL}/criar/imagem`);
  const carouselOption = page.getByText(/carrossel/i).first();
  await expect(carouselOption).toBeVisible({ timeout: 15_000 });
  await carouselOption.click();
  // Garante que o seletor de slides apareceu
  await expect(page.getByText(/quantos slides\?/i)).toBeVisible({ timeout: 10_000 });
}

async function selectSlidesCount(page: Page, n: number) {
  // Os botões 3..10 são círculos com o número como label visível.
  await page
    .getByRole("button", { name: new RegExp(`^${n}$`) })
    .first()
    .click();
}

test.describe("carrossel: aviso de 8–10 slides", () => {
  test.skip(!USER || !PASS, "E2E_USER_EMAIL/PASSWORD não configurados");

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const n of [8, 9, 10]) {
    test(`mostra aviso amber quando slidesCount=${n}`, async ({ page }) => {
      await gotoCreateImageAndPickCarousel(page);
      await selectSlidesCount(page, n);
      const warning = page.getByTestId("carousel-slides-count-warning");
      await expect(warning).toBeVisible();
      await expect(warning).toContainText(/carrossel extenso detectado/i);
      await expect(warning).toContainText(
        /pode reduzir a qualidade final e aumentar o tempo de processamento/i,
      );
    });
  }

  test("não mostra aviso quando slidesCount=7", async ({ page }) => {
    await gotoCreateImageAndPickCarousel(page);
    await selectSlidesCount(page, 7);
    await expect(page.getByTestId("carousel-slides-count-warning")).toHaveCount(0);
  });
});
