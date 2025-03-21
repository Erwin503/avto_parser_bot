import { Telegraf, session, Scenes } from "telegraf";
import dotenv from "dotenv";
import { setupStartCommand } from "./commands/start";
import { setupOrdersCommand } from "./commands/orders";
import { setupOrderHistoryCommand } from "./commands/orderHistory";
import { setupSetStatusCommand } from "./commands/setStatus";
import { setupAvtotoPartsCommand } from "./commands/avtotoParts";

import logger from "./logger";
import { gptCommand } from "./commands/gpt";
dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN as string);

bot.use(session());

gptCommand(bot)
setupStartCommand(bot);
setupOrdersCommand(bot);
setupOrderHistoryCommand(bot);
setupSetStatusCommand(bot);
setupAvtotoPartsCommand(bot);


bot.launch().then(() => logger.info("🤖 Бот запущен!"));
