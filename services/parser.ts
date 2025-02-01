import * as puppeteer from "puppeteer";
import logger from "../logger";

async function scrapeTable(page: puppeteer.Page) {
    return await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll("table.globalResult.searchResultsSecondStep tbody tr"));
        return rows
            .map(row => {
                const cols = row.querySelectorAll("td");
                return {
                    brand: cols[2]?.innerText.trim(),
                    availability: cols[3]?.innerText.trim(),
                    partType: cols[4]?.innerText.trim(),
                    quantity: cols[5]?.innerText.trim(),
                    deliveryTime: cols[7]?.innerText.trim(),
                    price: cols[8]?.innerText.trim()
                };
            })
            .filter(item => item.brand && item.price); // Оставляем только строки с брендом и ценой
    });
}

export async function parseZap82(partNumber: string) {
    let url = `https://zap82.ru/search?pcode=${partNumber}`;
    logger.info(`🔍 Запускаем парсер для: ${url}`);

    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: "domcontentloaded" });

        // Проверяем наличие бренда
        const brandElement = await page.$("a.brandInfoLink");
        let brandName = null;

        if (brandElement) {
            brandName = await page.evaluate((el: { innerText: string; }) => el.innerText.trim(), brandElement);
            logger.info(`📌 Найден бренд: ${brandName}`);

            // Генерируем новый URL для поиска по бренду
            const encodedBrand = encodeURIComponent(brandName);
            url = `https://zap82.ru/search/${encodedBrand}/${partNumber}`;
            logger.info(`🔍 Новый URL для поиска: ${url}`);

            await page.goto(url, { waitUntil: "domcontentloaded" });
        }

        // Проверяем наличие таблицы
        const hasResults = await page.$("table.globalResult.searchResultsSecondStep");

        if (!hasResults) {
            logger.warn(`❌ Парсер: не найдено результатов для ${partNumber}`);
            await browser.close();
            return null;
        }

        // Парсим таблицу
        const results = await scrapeTable(page);
        await browser.close();

        return { partNumber, brandName, url, results };
    } catch (error) {
        logger.error(`❌ Ошибка при парсинге ${url}: ${error}`);
        return null;
    }
}
