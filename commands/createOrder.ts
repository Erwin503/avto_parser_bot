import { Telegraf } from "telegraf";
import { getUserByTgName } from "../services/userService";
import { getArticleFromChatGPT } from "../services/chatgptApi";
import { createOrder } from "../services/orderService";
import logger from "../logger";

export function setupCreateOrderCommand(bot: Telegraf) {
    const orderCreationState = new Map<number, { userId: number; description?: string; retries: number }>();

    bot.command("create_order", async (ctx) => {
        const tgName = ctx.from.username || ctx.from.first_name;
        const user = await getUserByTgName(tgName);

        if (!user) {
            return ctx.reply("❌ Вы не зарегистрированы в системе.");
        }

        orderCreationState.set(ctx.from.id, { userId: user.id, retries: 0 });
        ctx.reply("📝 Опишите деталь, которую хотите заказать:");
    });

    bot.on("text", async (ctx) => {
        const state = orderCreationState.get(ctx.from.id);
        if (!state) return;

        if (!state.description) {
            state.description = ctx.message.text;
            ctx.reply("🔍 Определяю артикул детали...");

            const article = await getArticleFromChatGPT(state.description);
            if (!article) {
                state.retries++;

                if (state.retries >= 2) {
                    ctx.reply("❌ Мы не смогли определить артикул. Попробуйте описать деталь по-другому или свяжитесь с менеджером.");
                    orderCreationState.delete(ctx.from.id);
                    return;
                }

                ctx.reply("⚠ Недостаточно информации для определения артикула. Попробуйте описать деталь подробнее (например, укажите марку, модель, год выпуска).");
                return;
            }

            const orderId = await createOrder(article, state.userId);
            if (!orderId) {
                ctx.reply("❌ Ошибка при создании заказа.");
                orderCreationState.delete(ctx.from.id);
                return;
            }

            ctx.reply(`✅ Заказ создан!\n🆔 ID: ${orderId}\n🔧 Артикул: ${article}`);
            orderCreationState.delete(ctx.from.id);
            logger.info(`Пользователь ${ctx.from.username} создал заказ с артикулом ${article}`);
        }
    });
}
