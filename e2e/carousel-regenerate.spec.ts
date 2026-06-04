import { test, expect, type Page } from "@playwright/test";

/**
 * Cobre a abertura do modal de regeração via CarouselGallery.
 * NÃO submete a regeração (evita custo de crédito) — apenas valida
 * que o modal renderiza com os campos esperados e cancela.
 */

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

test.describe("carrossel: modal de regeração", () => {
  test.skip(!USER || !PASS, "E2E_USER_EMAIL/PASSWORD não configurados");

  test("histórico abre um carrossel pronto e o modal de regerar valida campos", async ({
    page,
  }) => {
    await login(page);

    // Vai ao histórico e tenta abrir o primeiro carrossel pronto
    await page.goto(`${BASE_URL}/historico`);
    const firstCarousel = page.getByRole("link", { name: /carrossel/i }).first();
    test.skip(
      (await firstCarousel.count()) === 0,
      "Sem carrosséis prontos no histórico do usuário de teste",
    );
    await firstCarousel.click();

    // A página de resultado renderiza o CarouselGallery
    const regenButton = page.getByRole("button", { name: /regerar este slide/i }).first();
    await expect(regenButton).toBeVisible({ timeout: 20_000 });
    await expect(regenButton).toBeEnabled();
    await regenButton.click();

    // Modal aparece com título "Regerar slide N"
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/o que ajustar nesta imagem/i)).toBeVisible();
    await expect(page.getByText(/imagens de referência/i)).toBeVisible();

    // Submit desabilitado enquanto vazio
    const submit = page.getByRole("button", { name: /^regerar/i });
    await expect(submit).toBeDisabled();

    // Cancela (não consome créditos)
    await page.getByRole("button", { name: /cancelar/i }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
  });
});
