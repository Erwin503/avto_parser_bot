import { Telegraf, Markup } from "telegraf";
import { getUserByTgName } from "../services/userService";
import { getOrdersByClientId, getAllOrders } from "../services/orderService";
import db from "../knex";
import logger from "../logger";

export function setupOrdersCommand(bot: Telegraf) {
    bot.command("orders", async (ctx) => {
        const tgName = ctx.from.username || ctx.from.first_name;
        const user = await getUserByTgName(tgName);

        if (!user) {
            return ctx.reply("❌ Вы не зарегистрированы в системе.");
        }

        let orders;
        if (user.role === "client") {
            orders = await getOrdersByClientId(user.id);
        } else {
            orders = await getAllOrders();
        }

        if (orders.length === 0) {
            return ctx.reply("📦 У вас пока нет заказов.");
        }

        
        const buttons = orders.map((order) =>
            Markup.button.callback(`🆔 ${order.id} | 🔧 ${order.detail_articule} | 📍 ${order.status}`, `order_${order.id}`)
        );

        ctx.reply("📦 *Ваши заказы:*", { 
            ...Markup.inlineKeyboard(buttons, { columns: 1 }), 
            parse_mode: "Markdown"
        });
        logger.info(`${tgName} запросил список заказов`);
    });

    bot.action(/order_(\d+)/, async (ctx) => {
        const orderId = Number(ctx.match[1]);
        const tgName = ctx.from.username || ctx.from.first_name;
        const user = await getUserByTgName(tgName);
        const order = await db("orders").where("id", orderId).first();

        if (!user) {
            return ctx.reply("❌ Вы не зарегистрированы.");
        }

        if (!order) {
            return ctx.reply(`❌ Заказ 🆔 ${orderId} не найден.`);
        }

        const buttons = [
            Markup.button.callback("📜 История", `history_${orderId}`)
        ];

        if (user.role === "admin") {
            buttons.push(
                Markup.button.callback("✏ Изменить статус", `set_status_${orderId}`)
            );
        }

        ctx.reply(`🆔 *Заказ ${orderId}*`, { 
            ...Markup.inlineKeyboard(buttons), 
            parse_mode: "Markdown"
        });
    });
}
