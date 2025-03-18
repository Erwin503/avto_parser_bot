import { Context } from 'telegraf';
import { searchStart } from '../../services/avtotoRequests';
import logger from '../../logger';

export const startSearch = async (ctx: Context, searchCode: string) => {
  try {
    await ctx.reply(`🔍 Запускаю поиск для артикул: ${searchCode}...`);

    const startResult = await searchStart(searchCode);
    if (!startResult || !startResult.ProcessSearchId) {
      await ctx.reply('❌ Ошибка при получении ProcessSearchId.');
      return;
    }

    logger.info(`Получен ProcessSearchId: ${startResult.ProcessSearchId}`);

    await ctx.reply(`🔄 Ожидаю результатов для ProcessSearchId: ${startResult.ProcessSearchId}...`);
    return startResult.ProcessSearchId;
  } catch (error: any) {
    logger.error(`Ошибка при запуске поиска: ${error.message}`);
    await ctx.reply('❌ Произошла ошибка при запуске поиска.');
    return null;
  }
};
