import { expect } from "chai";
import { By, until } from "selenium-webdriver";
import { buildDriver, BASE_URL, USER_EMAIL, USER_PASSWORD } from "./config";
import type { WebDriver } from "selenium-webdriver";

const SKIP = !USER_EMAIL || !USER_PASSWORD;

(SKIP ? describe.skip : describe)("Selenium: login happy path", function () {
  this.timeout(90_000);
  let driver: WebDriver;

  before(async () => {
    driver = await buildDriver();
  });

  after(async () => {
    if (driver) await driver.quit();
  });

  it("loga e sai da rota /auth", async () => {
    await driver.get(`${BASE_URL}/auth`);
    const email = await driver.wait(
      until.elementLocated(By.css('input[type="email"]')),
      15_000,
    );
    await email.sendKeys(USER_EMAIL!);
    await driver.findElement(By.css('input[type="password"]')).sendKeys(USER_PASSWORD!);

    const submit = await driver.findElement(By.css('button[type="submit"]'));
    await submit.click();

    await driver.wait(async () => {
      const url = await driver.getCurrentUrl();
      return !/\/auth(\b|\/|\?|$)/.test(url);
    }, 20_000);

    const finalUrl = await driver.getCurrentUrl();
    expect(finalUrl).to.not.match(/\/auth(\b|\/|\?|$)/);
  });
});
