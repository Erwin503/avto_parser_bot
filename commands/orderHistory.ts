import { Telegraf } from "telegraf";
import { getUserByTgName } from "../services/userService";
import { getOrderHistory } from "../services/orderHistoryService";
import logger from "../logger";

export function setupOrderHistoryCommand(bot: Telegraf) {
    bot.action(/history_(\d+)/, async (ctx) => {
        const orderId = Number(ctx.match[1]);
        const tgName = ctx.from.username || ctx.from.first_name;
        const user = await getUserByTgName(tgName);

        if (!user) {
            return ctx.reply("❌ Вы не зарегистрированы в системе.");
        }

        const history = await getOrderHistory(orderId);

        if (history.length === 0) {
            return ctx.reply(`📜 История заказа 🆔 ${orderId} пуста.`);
        }

        let response = `📜 *История заказа 🆔 ${orderId}:*\n`;
        history.forEach((record) => {
            response += `📝 ${record.action} | 👤 ${record.user} | 🕒 ${record.created_at}\n`;
        });

        ctx.reply(response, { parse_mode: "Markdown" });
        logger.info(`${tgName} запросил историю заказа ${orderId}`);
    });
}
