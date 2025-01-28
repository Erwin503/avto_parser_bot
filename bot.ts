import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import { setupStartCommand } from "./commands/start";
import { setupOrdersCommand } from "./commands/orders";
import { setupOrderHistoryCommand } from "./commands/orderHistory";
import { setupSetStatusCommand } from "./commands/setStatus";
import { setupCreateOrderCommand } from "./commands/createOrder";
import logger from "./logger";

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN as string);

setupStartCommand(bot);
setupOrdersCommand(bot);
setupOrderHistoryCommand(bot);
setupSetStatusCommand(bot);
setupCreateOrderCommand(bot);

bot.launch().then(() => logger.info("🤖 Бот запущен!"));

