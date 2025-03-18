import { Context } from 'telegraf';
import { searchResultsCache } from './searchResultsCache';
import logger from '../../logger';

export const handleDetailChoice = async (ctx: Context, selectedManuf: string, index: number) => {
  try {
    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.reply('❌ Не удалось определить пользователя.');
      return;
    }

    const partsResult = searchResultsCache.get(userId);
    if (!partsResult) {
      await ctx.reply('❌ Результаты поиска не найдены. Попробуйте снова выполнить поиск.');
      return;
    }

    const selectedParts = partsResult.filter((part: any) => part.Manuf === selectedManuf)
      .sort((a: any, b: any) => parseInt(a.Delivery) - parseInt(b.Delivery))
      .slice(0, 5);

    if (selectedParts.length <= index) {
      await ctx.reply('❌ Деталь не найдена.');
      return;
    }

    const part = selectedParts[index];
    const messageText = `Вы выбрали деталь:\nНазвание: ${part.Name}\nЦена: ${part.Price} ₽\nСрок доставки: ${part.Delivery} дней\nСклад: ${part.Storage}`;

    await ctx.reply(messageText, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '✅ Создать заказ',
              callback_data: `create_order:${selectedManuf}:${index}`,
            },
          ],
        ],
      },
    });

    await ctx.answerCbQuery();
  } catch (error: any) {
    logger.error(`Ошибка при обработке выбора детали: ${error.message}`);
    await ctx.reply('❌ Произошла ошибка при обработке вашего выбора.');
  }
};
