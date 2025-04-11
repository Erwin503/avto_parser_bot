import { Telegraf } from "telegraf";
import { getUserByTgName } from "../services/userService";
import { getOrderHistory } from "../services/orderHistoryService";
import logger from "../logger";

export function setupOrderHistoryCommand(bot: Telegraf) {
    bot.action(/history_(\d+)/, async (ctx) => {
      const orderId = Number(ctx.match[1]);
      logger.debug(`order_id - ${orderId}`)
      const tgName = ctx.from.username || ctx.from.first_name;
      const user = await getUserByTgName(tgName);
  
      if (!user) {
        return ctx.reply("❌ Вы не зарегистрированы в системе.");
      }
  
      const history = await getOrderHistory(orderId);
  
      if (history.length === 0) {
        return ctx.reply(`📜 История заказа 🆔 ${orderId} пуста.`);
      }
  
      // Формируем заголовок и блоки для каждой записи истории
      let response = `📜 *История заказа 🆔 ${orderId}:*\n\n`;
      response += history
        .map((record, idx) => {
          return `*Запись ${idx + 1}:*\n` +
                 `• *Действие:* ${record.action}\n` +
                 `• *Пользователь:* ${record.user}\n` +
                 `• *Дата:* ${record.created_at}\n`;
        })
        .join("\n─────────────\n");
  
      ctx.reply(response, { parse_mode: "Markdown" });
      logger.info(`${tgName} запросил историю заказа ${orderId}`);
    });
  }
  