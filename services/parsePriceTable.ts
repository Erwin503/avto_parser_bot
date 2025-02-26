import * as puppeteer from "puppeteer";
import logger from "../logger";

export async function parsePriceTable(page: puppeteer.Page): Promise<{ brand: string; price: string; deliveryTime: string }[]> {
  return await page.evaluate(() => {
    // Находим все строки в таблице с идентификатором searchResultsTable
    const rows = Array.from(document.querySelectorAll("table#searchResultsTable tbody tr"));
    return rows.map(row => {
      // Извлекаем бренд из <td class="resultBrand">, внутри которого находится <a class="open-abcp-modal-info">
      const brandElement = row.querySelector("td.resultBrand a.open-abcp-modal-info");
      const brand = brandElement ? brandElement.textContent?.trim() || "" : "";
      // Извлекаем ожидаемый срок доставки из <td class="resultDeadline">
      const deliveryElement = row.querySelector("td.resultDeadline");
      const deliveryTime = deliveryElement ? deliveryElement.textContent?.trim() || "" : "";
      // Извлекаем цену из <td class="resultPrice"> (класс может содержать дополнительные классы, например, priceOutColumn)
      const priceElement = row.querySelector("td.resultPrice");
      const price = priceElement ? priceElement.textContent?.trim() || "" : "";
      return { brand, price, deliveryTime };
    }).filter(item => item.brand !== "" && item.price !== "" && item.deliveryTime !== "");
  });
}
