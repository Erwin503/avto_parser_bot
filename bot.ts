import { Telegraf, session, Scenes } from "telegraf";
import dotenv from "dotenv";
import { setupStartCommand } from "./commands/start";
import { setupOrdersCommand } from "./commands/orders";
import { setupSetStatusCommand } from "./commands/setStatus";
import { setupManufacturerSelection } from "./commands/search/manufacturerSelection";
import { setupDetailSelection } from "./commands/search/detailSelection";
import { setupOrderCreation } from "./commands/search/orderCreation";

import logger from "./logger";
import { gptCommand } from "./commands/gpt";
import { setupAvtotoPartsCommand } from "./commands/search/avtotoPartsCommand";
import { setupOrderHistoryCommand } from "./commands/orderHistory";
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


// gptCommand(bot)

bot.launch().then(() => logger.info("🤖 Бот запущен!"));
