import { Context } from 'telegraf';
import { searchGetParts } from '../../services/avtotoRequests';
import { searchInventoryByPartCode } from '../../services/excelService';
import logger from '../../logger';
import { searchResultsCache } from './searchResultsCache';

export const handleText = async (ctx: Context, processSearchId: string) => {
  try {
    const partsResult = await searchGetParts(processSearchId);
    if (!partsResult || !partsResult.Parts || partsResult.Parts.length === 0) {
      await ctx.reply('❌ Запчасти не найдены.');
      return;
    }

    const inventoryParts = await searchInventoryByPartCode(processSearchId);
    const allParts = [
      ...partsResult.Parts,
      ...inventoryParts.map((part) => ({
        ...part,
        Delivery: '0', // Для товаров с вашего склада время доставки = 0
        price: part.price || 0, // Заполняем цену, если она есть
        storage: part.storage || 'Не указано', // Заполняем склад, если указано
      })),
    ];

    if (ctx.from?.id) {
      searchResultsCache.set(ctx.from.id, allParts);
    }

    return allParts;
  } catch (error: any) {
    logger.error(`Ошибка при обработке артикула: ${error.message}`);
    await ctx.reply('❌ Произошла ошибка при обработке артикула.');
    return [];
  }
};
