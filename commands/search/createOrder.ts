import { Telegraf } from "telegraf";
import { getUserByTgName } from "../../services/userService";
import { getArticleFromChatGPT } from "../../services/chatgptApi";
import { createOrder } from "../../services/orderService";
import logger from "../../logger";

export function setupCreateOrderCommand(bot: Telegraf) {
  const orderCreationState = new Map<
    number,
    { userId: number; description?: string; retries: number }
  >();

  bot.command("create_order", async (ctx) => {
    const tgName = ctx.from.username || ctx.from.first_name;
    const user = await getUserByTgName(tgName);

    if (!user) {
      await ctx.reply("❌ Вы не зарегистрированы в системе.");
      return;
    }

    orderCreationState.set(ctx.from.id, { userId: user.id, retries: 0 });
    await ctx.reply("📝 Опишите деталь, которую хотите заказать:");
  });

  bot.on("text", async (ctx) => {
    try {
      const state = orderCreationState.get(ctx.from.id);
      if (!state) return;

      if (!state.description) {
        state.description = ctx.message.text;
        await ctx.reply("🔍 Определяю артикул детали...");

        // const article = await getArticleFromChatGPT(state.description);
        const article = state.description;

        if (!article) {
          state.retries++;

          if (state.retries >= 2) {
            await ctx.reply(
              "❌ Мы не смогли определить артикул. Попробуйте описать деталь по-другому."
            );
            orderCreationState.delete(ctx.from.id);
            return;
          }

          await ctx.reply(
            "⚠ Недостаточно данных. Уточните описание: марку, модель, год выпуска."
          );
          return;
        }

        // Если OpenAI API недоступен (возвращает "❌ OpenAI API недоступен...")
        if (article.startsWith("❌ OpenAI API недоступен")) {
          await ctx.reply(
            "К сожалению, возникла проблема при подключении к серверу OpenAI"
          );
          orderCreationState.delete(ctx.from.id);
          return;
        }

        const orderId = await createOrder(article, state.userId);
        if (!orderId) {
          await ctx.reply("❌ Ошибка при создании заказа.");
          orderCreationState.delete(ctx.from.id);
          return;
        }

        await ctx.reply(
          `✅ Заказ создан!\n🆔 ID: ${orderId}\n🔧 Артикул: ${article}`
        );
        orderCreationState.delete(ctx.from.id);
        return;
      }
    } catch (error) {
      console.error("❌ Ошибка в обработчике текстовых сообщений:", error);
      await ctx.reply("❌ Произошла ошибка. Попробуйте снова.");
    }
  });
}
