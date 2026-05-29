import { Builder, Browser } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome";

export const BASE_URL =
  process.env.E2E_BASE_URL ?? "https://pla.creator.lefil.com.br";

export const USER_EMAIL = process.env.E2E_USER_EMAIL;
export const USER_PASSWORD = process.env.E2E_USER_PASSWORD;

export const HEADLESS = process.env.SELENIUM_HEADLESS !== "false";

export async function buildDriver() {
  const options = new chrome.Options();
  if (HEADLESS) {
    options.addArguments("--headless=new");
  }
  options.addArguments(
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--window-size=1366,900",
  );

  return new Builder()
    .forBrowser(Browser.CHROME)
    .setChromeOptions(options)
    .build();
}
