import { Telegraf, Context } from "telegraf";
import { createOrder } from "../../services/orderService";
import logger from "../../logger";
import { userCache, selectedDetailCache, searchResultsCache } from "./cashes";

export const setupOrderCreation = (bot: Telegraf) => {
  bot.action(/create_order:(.+):(.+)/, async (ctx: Context) => {
    const userId = ctx.from?.id;
    try {
      if (!userId) {
        await ctx.reply("❌ Не удалось определить пользователя.");
        return;
      }
      // Скрываем кнопку создания заказа (редактирование сообщения с кнопками)
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
      
      // Извлекаем выбранную деталь из кэша
      const selectedPart = selectedDetailCache.get(userId);
      if (!selectedPart) {
        await ctx.reply("❌ Деталь не выбрана. Пожалуйста, выберите деталь и попробуйте снова.");
        return;
      }
      const detailArticule = selectedPart.Articule || selectedPart.Name;
      
      const user = userCache.get(userId);
      if (!user) {
        await ctx.reply("❌ Вы не зарегистрированы в системе.");
        return;
      }
      
      // Создаем заказ через сервис
      const orderId = await createOrder(detailArticule, user.id);
      if (orderId) {
        await ctx.reply(`✅ Заказ 🆔 ${orderId} успешно создан!`);
      } else {
        await ctx.reply("❌ Ошибка при создании заказа.");
      }
    } catch (error: any) {
      logger.error(`Ошибка при создании заказа: ${error.message}`);
      await ctx.reply("❌ Произошла ошибка при создании заказа.");
    } finally {
      // Очищаем кэш пользователя независимо от успешности создания заказа
      if (userId) {
        searchResultsCache.delete(userId);
        selectedDetailCache.delete(userId);
      }
      await ctx.answerCbQuery();
    }
  });
};
