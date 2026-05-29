import { expect } from "chai";
import { By, until } from "selenium-webdriver";
import { buildDriver, BASE_URL, USER_EMAIL, USER_PASSWORD } from "./config";
import type { WebDriver } from "selenium-webdriver";

const SKIP = !USER_EMAIL || !USER_PASSWORD;

(SKIP ? describe.skip : describe)("Selenium: carrossel em criar conteúdo", function () {
  this.timeout(120_000);
  let driver: WebDriver;

  before(async () => {
    driver = await buildDriver();
    // login
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

  it("seleciona 'Carrossel' e exibe painel de slides", async () => {
    await driver.get(`${BASE_URL}/criar/imagem`);
    const carouselOption = await driver.wait(
      until.elementLocated(
        By.xpath("//*[contains(translate(., 'CARROSSEL', 'carrossel'), 'carrossel')]"),
      ),
      15_000,
    );
    await carouselOption.click();

    const slide1 = await driver.wait(
      until.elementLocated(
        By.xpath("//*[contains(translate(., 'SLIDE', 'slide'), 'slide 1')]"),
      ),
      15_000,
    );
    expect(await slide1.isDisplayed()).to.equal(true);
  });
});
