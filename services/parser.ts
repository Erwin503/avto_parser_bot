import puppeteer from "puppeteer";
import logger from "../logger";
import { parsePriceTable } from "./parsePriceTable";

export async function parseZap82(partNumber: string) {
  const baseUrl = `https://zap82.ru/search?pcode=${partNumber}`;
  logger.info(`🔍 Запускаем парсер для: ${baseUrl}`);

  try {
    const browser = await puppeteer.launch({
      executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      headless: false
    });
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36");
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });

    // Предположим, что у нас есть таблица globalCase с ссылками для поиска
    const tableElement = await page.$("table.globalCase");
    if (!tableElement) {
      logger.warn(`❌ Таблица globalCase не найдена для артикула ${partNumber}`);
      await browser.close();
      return null;
    }

    // Извлекаем ссылки из столбца "Поиск"
    const links: string[] = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("table.globalCase tbody tr"))
        .map(row => {
          const linkElement = row.querySelector("td.caseUrl a.startSearching");
          return linkElement ? `https://zap82.ru${linkElement.getAttribute("href")}` : null;
        })
        .filter(link => link !== null) as string[];
    });

    // Для каждой ссылки запускаем парсинг таблицы с ценами и сроками доставки
    const detailsArray = await Promise.all(
      links.map(async (link) => {
        try {
          await page.goto(link, { waitUntil: "domcontentloaded" });
          // Если срабатывает защита от роботов, можно добавить проверку и повторные попытки (опционально)
          const details = await parsePriceTable(page);
          return details;
        } catch (error) {
          logger.error(`❌ Ошибка при парсинге ссылки ${link}: ${error}`);
          return [];
        }
      })
    );

    await browser.close();
    return { partNumber, links, details: detailsArray };
  } catch (error) {
    logger.error(`❌ Ошибка при парсинге ${baseUrl}: ${error}`);
    return null;
  }
}
