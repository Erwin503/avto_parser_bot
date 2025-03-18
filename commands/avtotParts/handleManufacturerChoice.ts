import { Context } from 'telegraf';
import { InlineButton } from './types';
import { searchResultsCache } from './searchResultsCache';
import logger from '../../logger';

export const handleManufacturerChoice = async (ctx: Context, selectedManuf: string) => {
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
    if (selectedParts.length === 0) {
      await ctx.reply('❌ Запчасти для выбранного производителя не найдены.');
      return;
    }

    const detailButtons: InlineButton[] = selectedParts.map((part: any, index: number) => {
      const buttonText = `${part.Name} - ${part.Price} ₽, ${part.Delivery} д.`;
      return {
        text: buttonText,
        callback_data: `detail:${selectedManuf}:${index}`,
      };
    });

    await ctx.reply(`Выберите деталь для ${selectedManuf}:`, {
      reply_markup: {
        inline_keyboard: detailButtons.map((btn: InlineButton) => [btn]),
      },
    });
    await ctx.answerCbQuery();
  } catch (error: any) {
    logger.error(`Ошибка при обработке выбора производителя: ${error.message}`);
    await ctx.reply('❌ Произошла ошибка при обработке вашего выбора.');
  }
};
