// commands/excelSearch.ts
import { searchInventoryByPartCode } from '../services/excelService';

async function run() {
  const partCode = process.argv[2];
  if (!partCode) {
    console.error('Пожалуйста, укажите артикул для поиска.');
    process.exit(1);
  }
  
  try {
    const results = await searchInventoryByPartCode(partCode);
    console.log(JSON.stringify(results, null, 2));
  } catch (error) {
    console.error('Ошибка поиска:', error);
  }
}

run();
