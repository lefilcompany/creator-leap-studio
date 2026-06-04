import { expect } from "chai";
import { By, until } from "selenium-webdriver";
import { buildDriver, BASE_URL, USER_EMAIL, USER_PASSWORD } from "./config";
import type { WebDriver } from "selenium-webdriver";

const SKIP = !USER_EMAIL || !USER_PASSWORD;

(SKIP ? describe.skip : describe)(
  "Selenium: aviso de carrossel extenso (8–10 slides)",
  function () {
    this.timeout(120_000);
    let driver: WebDriver;

    before(async () => {
      driver = await buildDriver();
      await driver.get(`${BASE_URL}/auth`);
      const email = await driver.wait(
        until.elementLocated(By.css('input[type="email"]')),
        15_000,
      );
      await email.sendKeys(USER_EMAIL!);
      await driver.findElement(By.css('input[type="password"]')).sendKeys(USER_PASSWORD!);
      await driver.findElement(By.css('button[type="submit"]')).click();
      await driver.wait(async () => !/\/auth/.test(await driver.getCurrentUrl()), 20_000);
    });

    after(async () => {
      if (driver) await driver.quit();
    });

    async function pickCarouselAndCount(n: number) {
      await driver.get(`${BASE_URL}/criar/imagem`);
      const carouselOption = await driver.wait(
        until.elementLocated(
          By.xpath("//*[contains(translate(., 'CARROSSEL', 'carrossel'), 'carrossel')]"),
        ),
        15_000,
      );
      await carouselOption.click();
      const nButton = await driver.wait(
        until.elementLocated(
          By.xpath(`//button[normalize-space(text())='${n}']`),
        ),
        15_000,
      );
      await nButton.click();
    }

    it("mostra o aviso quando seleciona 8 slides", async () => {
      await pickCarouselAndCount(8);
      const warning = await driver.wait(
        until.elementLocated(By.css('[data-testid="carousel-slides-count-warning"]')),
        10_000,
      );
      expect(await warning.isDisplayed()).to.equal(true);
      expect(await warning.getText()).to.match(/carrossel extenso detectado/i);
    });

    it("não mostra o aviso quando seleciona 7 slides", async () => {
      await pickCarouselAndCount(7);
      const found = await driver.findElements(
        By.css('[data-testid="carousel-slides-count-warning"]'),
      );
      expect(found.length).to.equal(0);
    });
  },
);
