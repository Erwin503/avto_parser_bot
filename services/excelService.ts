import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { join } from 'path';

// Обновлённый путь к файлу
const INVENTORY_FILE_PATH = join(__dirname, '../data/Inventory_Shortened_2.xlsx');

interface PartInfo {
  Manuf: string;
  Name: string;
  Price: number;
}

// Функция нормализации имени столбца: удаляет пробелы и приводит к нижнему регистру
function normalizeKey(key: string): string {
  return key.trim().toLowerCase();
}

// Функция для извлечения нужных данных из строки с учетом нормализации
function extractPartInfo(row: any): PartInfo {
  const normalizedRow: { [key: string]: any } = {};
  Object.keys(row).forEach(key => {
    normalizedRow[normalizeKey(key)] = row[key];
  });

  const manuf = normalizedRow['бренд'] || '';
  const name = normalizedRow['item'] || '';
  let priceValue = normalizedRow['цена розница'];
  if (priceValue === undefined) {
    priceValue = normalizedRow['цена розница'];
  }
  const price = Number(priceValue) || 0;

  return { Manuf: manuf, Name: name, Price: price };
}

// Асинхронная функция для поиска деталей по артикулу и получения нужных полей из всех листов Excel
export async function searchInventoryByPartCode(partCode: string): Promise<PartInfo[]> {
  return new Promise((resolve, reject) => {
    fs.readFile(INVENTORY_FILE_PATH, (err, data) => {
      if (err) {
        return reject('Ошибка чтения файла Excel');
      }
      try {
        const workbook = XLSX.read(data, { type: 'buffer' });
        let allData: any[] = [];

        // Обрабатываем все листы книги
        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          const sheetData = XLSX.utils.sheet_to_json(sheet, { defval: null });
          allData = allData.concat(sheetData);
        });

        // Фильтруем данные по артикулу (нормализуем имена столбцов)
        const result: PartInfo[] = allData
          .filter(row => {
            const normalizedRow: { [key: string]: any } = {};
            Object.keys(row).forEach(key => {
              normalizedRow[normalizeKey(key)] = row[key];
            });
            return normalizedRow['артикул'] && normalizedRow['артикул'].toString() === partCode.toString();
          })
          .map(row => extractPartInfo(row));

        resolve(result);
      } catch (error) {
        reject('Ошибка обработки данных в Excel');
      }
    });
  });
}
