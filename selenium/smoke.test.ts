import { expect } from "chai";
import { until, By } from "selenium-webdriver";
import { buildDriver, BASE_URL } from "./config";
import type { WebDriver } from "selenium-webdriver";

describe("Selenium smoke", function () {
  this.timeout(60_000);
  let driver: WebDriver;

  before(async () => {
    driver = await buildDriver();
  });

  after(async () => {
    if (driver) await driver.quit();
  });

  it("carrega a home e tem título", async () => {
    await driver.get(BASE_URL);
    await driver.wait(until.titleMatches(/.+/), 15_000);
    const title = await driver.getTitle();
    expect(title.length).to.be.greaterThan(0);
  });

  it("rota /auth mostra campos de email e senha", async () => {
    await driver.get(`${BASE_URL}/auth`);
    const email = await driver.wait(
      until.elementLocated(By.css('input[type="email"]')),
      15_000,
    );
    const pwd = await driver.findElement(By.css('input[type="password"]'));
    expect(await email.isDisplayed()).to.equal(true);
    expect(await pwd.isDisplayed()).to.equal(true);
  });
});
