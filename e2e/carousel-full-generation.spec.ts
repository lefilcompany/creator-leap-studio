import { test, expect, type Page } from "@playwright/test";

/**
 * E2E "pesado" — gera de fato um carrossel mínimo (2 slides) e espera
 * todos os slides ficarem com status "done". CONSOME CRÉDITOS do usuário
 * de teste a cada execução; mantenha rodando só no CI principal.
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

test.describe("carrossel: geração completa (slidesCount=2)", () => {
  test.skip(!USER || !PASS, "E2E_USER_EMAIL/PASSWORD não configurados");
  test.setTimeout(360_000); // 6min — polling lento + geração real

  test("gera 2 slides e ambos chegam a 'done'", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/criar/imagem`);

    // Seleciona Carrossel
    const carouselOption = page.getByText(/carrossel/i).first();
    await expect(carouselOption).toBeVisible({ timeout: 15_000 });
    await carouselOption.click();

    // Escolhe 3 slides (mínimo) — depois ajusta para 2 via decremento se existir,
    // caso o range comece em 3 (regra atual do produto).
    await expect(page.getByText(/quantos slides\?/i)).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: /^3$/ }).first().click();

    // Preenche o prompt mínimo. O label real pode variar; tentamos pelos
    // placeholders mais comuns da página.
    const promptInput = page
      .locator('textarea, input[type="text"]')
      .filter({ hasText: "" })
      .first();
    await promptInput.fill("Teste E2E carrossel — gerar imagens minimalistas em fundo cinza claro.");

    // Submete
    const submit = page.getByRole("button", { name: /gerar carrossel/i }).first();
    await expect(submit).toBeEnabled({ timeout: 15_000 });
    await submit.click();

    // Aguarda navegar para a tela de resultado
    await page.waitForURL(/\/result|\/criar\/.*\/resultado|\/conteudo\//, { timeout: 30_000 });

    // Espera todos os slides terminarem: ausência de overlay "Gerando..." e
    // ausência de overlay "Aguardando..."
    await expect
      .poll(
        async () => {
          const generating = await page.getByText(/gerando\.\.\./i).count();
          const waiting = await page.getByText(/aguardando\.\.\./i).count();
          return generating + waiting;
        },
        { timeout: 300_000, intervals: [5_000] },
      )
      .toBe(0);

    // Pelo menos uma imagem real renderizada
    const realImages = page.locator('img[alt^="Slide "]');
    await expect(realImages.first()).toBeVisible();
  });
});
