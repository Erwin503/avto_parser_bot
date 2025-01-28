import puppeteer from "puppeteer";

// Асинхронная функция для парсинга одной страницы
async function parsePage(pcode: string): Promise<void> {
    const browser = await puppeteer.launch({
        headless: true, // Запуск без интерфейса
        executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" // Указываем путь к Chrome
    });

    const page = await browser.newPage();

    // Устанавливаем User-Agent
    await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36"
    );

    const url = `https://zap82.ru/search?pcode=${pcode}`;
    console.log(`🔍 Открываем страницу: ${url}`);

    // Загружаем страницу и ждем загрузки
    await page.goto(url, { waitUntil: "networkidle2" });

    // Проверяем, есть ли элемент с классом "globalCase"
    const isGlobalCasePresent = await page.$(".globalCase") !== null;

    if (isGlobalCasePresent) {
        console.log("🔍 Найден элемент globalCase, извлекаем название бренда...");

        // Извлекаем ТОЛЬКО текст внутри <a> в .globalCase
        const brandName = await page.evaluate(() => {
            const anchor = document.querySelector(".globalCase .brandInfoLink");
            return anchor ? anchor.textContent?.trim() : null;
        });

        console.log("✅ Название бренда:", brandName);
    } else {
        console.log("🔍 Элемент globalCase НЕ найден, парсим таблицу...");

        // Ждем появления таблицы
        await page.waitForSelector("#searchResultsTable", { timeout: 10000 });

        // Извлекаем данные из таблицы
        const results = await page.evaluate(() => {
            const table = document.querySelector("#searchResultsTable");
            if (!table) return [];

            return Array.from(table.querySelectorAll("tr"))
                .map(row => {
                    const cells = Array.from(row.querySelectorAll("td"))
                        .map(td => td.textContent?.trim() || "");

                    // Фильтруем строки, оставляя только нужные данные
                    if (cells.length >= 10) {
                        return {
                            brand: cells[2],   // Марка авто (3-я ячейка)
                            date: cells[7],    // Дата доставки (8-я ячейка)
                            price: cells[8]    // Цена (9-я ячейка)
                        };
                    }
                    return null;
                })
                .filter(item => item !== null);
        });

        console.log("✅ Отфильтрованные данные:", results);
    }

    await browser.close();
}

// Функция для последовательного вызова парсинга для нескольких кодов
async function parseMultiplePages(pcodes: string[]): Promise<void> {
    for (const pcode of pcodes) {
        await parsePage(pcode); // Ожидаем завершения каждого вызова перед следующим
    }
}

// Вызов функции с несколькими кодами
parseMultiplePages(["9628822380", "9646996980"]);

