import { Telegraf, Context } from "telegraf";
import logger from "../../logger";
import { searchResultsCache, selectedDetailCache } from "./cashes";

export const setupDetailSelection = (bot: Telegraf) => {
  bot.action(/detail:(.+):(.+)/, async (ctx) => {
    try {
      const selectedManuf = ctx.match[1];
      const indexStr = ctx.match[2];
      const index = parseInt(indexStr);
      if (isNaN(index)) {
        await ctx.reply("❌ Некорректный выбор детали.");
        return;
      }
      const userId = ctx.from?.id;
      if (!userId) {
        await ctx.reply("❌ Не удалось определить пользователя.");
        return;
      }
      const partsResult = searchResultsCache.get(userId);
      if (!partsResult) {
        await ctx.reply(
          "❌ Результаты поиска не найдены. Попробуйте снова выполнить поиск."
        );
        return;
      }
      // Скрываем кнопки выбора детали
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

      const normalizedSelectedManuf = selectedManuf.trim().toLowerCase();
      const selectedParts = partsResult
        .filter((part: any) => {
          const partManufNormalized = part.Manuf
            ? part.Manuf.trim().toLowerCase()
            : "";
          return partManufNormalized === normalizedSelectedManuf;
        })
        .sort((a: any, b: any) => parseInt(a.Delivery) - parseInt(b.Delivery))
        .slice(0, 5);
      if (selectedParts.length <= index) {
        await ctx.reply("❌ Деталь не найдена.");
        return;
      }
      const part = selectedParts[index];

      // Сохраняем выбранную деталь в кэш (перезаписываем предыдущую)
      selectedDetailCache.set(userId, part);

      const messageText = `Вы выбрали деталь:\nНазвание: ${part.Name}\nЦена: ${part.Price} ₽\nСрок доставки: ${part.Delivery} дней\nСклад: ${part.Storage}`;
      await ctx.reply(messageText, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "✅ Создать заказ",
                callback_data: `create_order:${normalizedSelectedManuf}:${index}`,
              },
            ],
          ],
        },
      });
      await ctx.answerCbQuery();
    } catch (error: any) {
      logger.error(`Ошибка при обработке выбора детали: ${error.message}`);
      await ctx.reply("❌ Произошла ошибка при обработке вашего выбора.");
    }
  });
};
