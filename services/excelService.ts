import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { join } from 'path';

// Обновлённый путь к файлу
const INVENTORY_FILE_PATH = join(__dirname, '../data/Inventory_Shortened_2.xlsx'); // Путь к вашему Excel файлу

// Интерфейс для возвращаемых данных
interface PartInfo {
  Manuf: string;
  Name: string;
  Price: number;
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

        // Перебор всех листов в книге
        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          // Преобразуем данные листа в массив объектов, используя первую строку как заголовки
          const sheetData = XLSX.utils.sheet_to_json(sheet, { defval: null });
          allData = allData.concat(sheetData);
        });

        // Фильтрация данных по артикулу (Excel-столбец "Артикул")
        const filtered = allData.filter(row => 
          row['Артикул'] && row['Артикул'].toString() === partCode.toString()
        );

        // Преобразование данных в требуемый формат: { Manuf: "БРЕНД", Name: "Item", Price: цена оптовая }
        const result: PartInfo[] = filtered.map(row => ({
          Manuf: row['БРЕНД'] || '',
          Name: row['Item'] || '',
          Price: Number(row['цена оптовая']) || 0
        }));

        resolve(result);
      } catch (error) {
        reject('Ошибка обработки данных в Excel');
      }
    });
  });
}

