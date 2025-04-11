import { Telegraf, session, Scenes } from "telegraf";
import dotenv from "dotenv";
import { setupStartCommand } from "./commands/start";
import { setupOrdersCommand } from "./commands/orders";
import { setupOrderHistoryCommand } from "./commands/orderHistory";
import { setupSetStatusCommand } from "./commands/setStatus";
import { setupAvtotoPartsCommand } from "./commands/avtotoParts";
import { setupManufacturerSelection } from "./commands/manufacturerSelection";
import { setupDetailSelection } from "./commands/detailSelection";
import { setupOrderCreation } from "./commands/orderCreation";

import logger from "./logger";
import { gptCommand } from "./commands/gpt";
dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN as string);

bot.use(session());

setupStartCommand(bot);
setupOrdersCommand(bot);
setupOrderHistoryCommand(bot);
setupSetStatusCommand(bot);

setupAvtotoPartsCommand(bot);
setupManufacturerSelection(bot);
setupDetailSelection(bot);
setupOrderCreation(bot);

// setupAvtotoPartsCommand(bot);
// gptCommand(bot)


bot.launch().then(() => logger.info("🤖 Бот запущен!"));
