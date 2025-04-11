import { Telegraf, Context } from "telegraf";
import { createOrder } from "../services/orderService";
import logger from "../logger";
import { userCache, selectedDetailCache } from "./cashes";

export const setupOrderCreation = (bot: Telegraf) => {
  bot.action(/create_order:(.+):(.+)/, async (ctx: Context) => {
    try {
      const userId = ctx.from?.id;
      if (!userId) {
        await ctx.reply("❌ Не удалось определить пользователя.");
        return;
      }
      // Извлекаем выбранную ранее деталь из кэша
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
      await ctx.answerCbQuery();
    } catch (error: any) {
      logger.error(`Ошибка при создании заказа: ${error.message}`);
      await ctx.reply("❌ Произошла ошибка при создании заказа.");
    }
  });
};
