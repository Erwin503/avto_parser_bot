import { Telegraf } from "telegraf";
import { getUserByTgName, createUser } from "../services/userService";
import logger from "../logger";

export function setupStartCommand(bot: Telegraf) {
    bot.start(async (ctx) => {
        const tgName = ctx.from.username || ctx.from.first_name;
        let user = await getUserByTgName(tgName);

        if (!user) {
            await createUser(tgName, "client");
            ctx.reply(`✅ Добро пожаловать, ${tgName}! Вы зарегистрированы как клиент.`);
        } else {
            ctx.reply(`👋 Привет, ${tgName}! Вы уже зарегистрированы как ${user.role}.`);
        }
        logger.info(`Пользователь ${tgName} вызвал /start`);
    });
}
