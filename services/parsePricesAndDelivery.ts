import puppeteer from "puppeteer-core";
import logger from "../logger";

export async function parsePricesAndDelivery(url: string): Promise<{ price: string; deliveryTime: string }[] | null> {
    try {
        // Укажите корректный путь к установленному браузеру (например, Google Chrome)
        const browser = await puppeteer.launch({
            executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            headless: true
        });
        const page = await browser.newPage();

        // Переходим по переданной ссылке
        await page.goto(url, { waitUntil: "domcontentloaded" });

        // Ждем загрузки таблицы с результатами (при необходимости можно указать другой селектор)
        await page.waitForSelector("table.globalResult.searchResultsSecondStep", { timeout: 10000 }).catch(() => {
            logger.warn(`⚠ Не удалось обнаружить таблицу с ценами на странице: ${url}`);
        });

        // Извлекаем из таблицы данные
        const results = await page.evaluate(() => {
            const table = document.querySelector("table.globalResult.searchResultsSecondStep");
            if (!table) return [];
            const rows = Array.from(table.querySelectorAll("tbody tr"));
            return rows.map(row => {
                const cols = row.querySelectorAll("td");
                return {
                    deliveryTime: cols[7] ? cols[7].textContent?.trim() || "" : "",
                    price: cols[8] ? cols[8].textContent?.trim() || "" : ""
                };
            });
        });

        await browser.close();
        return results;
    } catch (error) {
        logger.error(`❌ Ошибка при парсинге страницы ${url}: ${error}`);
        return null;
    }
}
