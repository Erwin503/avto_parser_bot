import { Telegraf, Context } from "telegraf";
import logger from "../logger";
import { searchResultsCache } from "./cashes";

interface InlineButton {
  text: string;
  callback_data: string;
}

export const setupManufacturerSelection = (bot: Telegraf) => {
  bot.action(/manuf:(.+)/, async (ctx) => {
    try {
      const selectedManuf = ctx.match[1];
      const normalizedSelectedManuf = selectedManuf.trim().toLowerCase();
      const userId = ctx.from?.id;
      if (!userId) {
        await ctx.reply("❌ Не удалось определить пользователя.");
        return;
      }
      const partsResult = searchResultsCache.get(userId);
      if (!partsResult) {
        await ctx.reply("❌ Результаты поиска не найдены. Попробуйте снова выполнить поиск.");
        return;
      }

      // Скрываем кнопки выбора производителя
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

      const selectedParts = partsResult
        .filter((part: any) => {
          const partManufNormalized = part.Manuf ? part.Manuf.trim().toLowerCase() : "";
          return partManufNormalized === normalizedSelectedManuf;
        })
        .sort((a: any, b: any) => parseInt(a.Delivery) - parseInt(b.Delivery))
        .slice(0, 5);

      if (selectedParts.length === 0) {
        await ctx.reply("❌ Запчасти для выбранного производителя не найдены.");
        return;
      }
      const detailButtons: InlineButton[] = selectedParts.map((part: any, index: number) => ({
        text: `${part.Name} - ${part.Price} ₽, ${part.Delivery} д.`,
        callback_data: `detail:${normalizedSelectedManuf}:${index}`,
      }));
      await ctx.reply(`Выберите деталь для ${selectedManuf}:`, {
        reply_markup: { inline_keyboard: detailButtons.map((btn: InlineButton) => [btn]) },
      });
      await ctx.answerCbQuery();
    } catch (error: any) {
      logger.error(`Ошибка при обработке выбора производителя: ${error.message}`);
      await ctx.reply("❌ Произошла ошибка при обработке вашего выбора.");
    }
  });
};
