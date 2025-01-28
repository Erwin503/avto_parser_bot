import { Telegraf, Markup } from "telegraf";
import { getUserByTgName } from "../services/userService";
import { addOrderHistory } from "../services/orderHistoryService";
import db from "../knex";
import logger from "../logger";

export function setupSetStatusCommand(bot: Telegraf) {
    bot.action(/set_status_(\d+)/, async (ctx) => {
        const orderId = Number(ctx.match[1]);
        const tgName = ctx.from.username || ctx.from.first_name;
        const user = await getUserByTgName(tgName);

        if (!user) {
            return ctx.reply("❌ Вы не зарегистрированы в системе.");
        }
        if (user.role !== "admin") {
            return ctx.reply("❌ Только администраторы могут менять статус заказов.");
        }

        const order = await db("orders").where("id", orderId).first();
        if (!order) {
            return ctx.reply(`❌ Заказ 🆔 ${orderId} не найден.`);
        }

        // Доступные статусы
        const allStatuses = ["created", "processing", "complete"];
        const availableStatuses = allStatuses.filter(status => status !== order.status);

        ctx.reply(`✏ *Выберите новый статус для заказа 🆔 ${orderId}:*`, {
            ...Markup.inlineKeyboard(
                availableStatuses.map(status => [
                    Markup.button.callback(`🔄 ${status.charAt(0).toUpperCase() + status.slice(1)}`, `change_status_${orderId}_${status}`)
                ])
            ),
            parse_mode: "Markdown"
        });

        logger.info(`Админ ${tgName} запросил изменение статуса заказа ${orderId}`);
    });

    bot.action(/change_status_(\d+)_(.+)/, async (ctx) => {
        const orderId = Number(ctx.match[1]);
        const newStatus = ctx.match[2];
        const tgName = ctx.from.username || ctx.from.first_name;
        const user = await getUserByTgName(tgName);

        if (!user) {
            return ctx.reply("❌ Вы не зарегистрированы в системе.");
        }
        if (user.role !== "admin") {
            return ctx.reply("❌ Только администраторы могут менять статус заказов.");
        }

        const order = await db("orders").where("id", orderId).first();
        if (!order) {
            return ctx.reply(`❌ Заказ 🆔 ${orderId} не найден.`);
        }

        if (!["created", "processing", "complete"].includes(newStatus)) {
            return ctx.reply("❌ Неверный статус.");
        }

        await db("orders").where("id", orderId).update({ status: newStatus });
        await addOrderHistory(orderId, user.id, `set_status: ${newStatus}`);

        ctx.reply(`✅ Заказ 🆔 ${orderId} теперь имеет статус: *${newStatus}*`, { parse_mode: "Markdown" });
        logger.info(`Админ ${tgName} изменил статус заказа ${orderId} на ${newStatus}`);
    });
}
