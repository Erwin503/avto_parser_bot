import { Telegraf, session, Scenes } from "telegraf";
import dotenv from "dotenv";
import { setupStartCommand } from "./commands/start";
import { setupOrdersCommand } from "./commands/orders";
import { setupOrderHistoryCommand } from "./commands/orderHistory";
// import createOrderScene from "./scenes/createOrderScene";
import { setupSetStatusCommand } from "./commands/setStatus";
// import { setupAvtotoSearchCommand } from "./commands/avtotoSoapSearchCommand";
// import { setupAvtotoSoapSearchCommand } from "./commands/avtotoSearchJson";
import { setupAvtotoPartsCommand } from "./commands/avtotoParts";
// import { MyContext } from './types/MyContext';

import logger from "./logger";
dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN as string);

bot.use(session());
// const stage = new Scenes.Stage([createOrderScene]);
// bot.use(stage.middleware());

setupStartCommand(bot);
setupOrdersCommand(bot);
setupOrderHistoryCommand(bot);
setupSetStatusCommand(bot);
setupAvtotoPartsCommand(bot);
// bot.command("create_order", (ctx) => ctx.scene.enter("create_order_scene"));
// setupAvtotoSearchCommand(bot);
// setupAvtotoSoapSearchCommand(bot);

bot.launch().then(() => logger.info("🤖 Бот запущен!"));
