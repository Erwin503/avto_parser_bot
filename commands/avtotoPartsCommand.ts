import { Context, Telegraf } from "telegraf";
import { searchStart, searchGetParts } from "../services/avtotoRequests";
import { getUserByTgName } from "../services/userService";
import { searchInventoryByPartCode } from "../services/excelService";
import logger from "../logger";
import { searchResultsCache, userCache } from "./cashes";

export const setupAvtotoPartsCommand = (bot: Telegraf) => {
  // Команда /avtoto_parts — проверка регистрации и запрос артикула
  bot.command("avtoto_parts", async (ctx: Context) => {
    try {
      const tgName = ctx.from?.username || ctx.from?.first_name;
      const user = await getUserByTgName(tgName!);
      if (!user) {
        await ctx.reply("❌ Вы не зарегистрированы в системе.");
        return;
      }
      // Сохраняем данные о пользователе в кэше для последующего использования при создании заказа
      if (ctx.from?.id) userCache.set(ctx.from.id, user);
      await ctx.reply("❗ Пожалуйста, отправьте артикул, по которому хотите выполнить поиск.");
    } catch (error: any) {
      logger.error(`Ошибка при обработке команды /avtoto_parts: ${error.message}`);
      await ctx.reply("❌ Произошла ошибка при обработке команды.");
    }
  });

  // Обработка текстовых сообщений — ввод артикула
  bot.on("text", async (ctx) => {
    try {
      const searchCode = ctx.message?.text.trim();
      if (!searchCode) {
        await ctx.reply("❌ Вы не прислали артикул. Пожалуйста, отправьте артикул для поиска.");
        return;
      }

      await ctx.reply(`🔍 Запускаю поиск для артикул: ${searchCode}...`);

      // Получаем process_id через метод searchStart
      const startResult = await searchStart(searchCode);
      if (!startResult || !startResult.ProcessSearchId) {
        await ctx.reply("❌ Ошибка при получении ProcessSearchId.");
        return;
      }
      logger.info(`Получен ProcessSearchId: ${startResult.ProcessSearchId}`);
      await ctx.reply(`🔄 Ожидаю результатов для ProcessSearchId: ${startResult.ProcessSearchId}...`);

      const partsResult = await searchGetParts(startResult.ProcessSearchId);
      if (!partsResult || !partsResult.Parts || partsResult.Parts.length === 0) {
        logger.debug("Запчасти Автото не найдены");
      }

      const inventoryParts = await searchInventoryByPartCode(searchCode);
      logger.debug(`inventoryParts: ${inventoryParts}`);

      // Объединяем массивы: сначала данные с вашего склада, затем данные из внешнего сервиса
      const allParts = [
        ...partsResult.Parts.map((part: { Delivery: string; Manuf: string; Name: string; Price: number; }) => ({
          Delivery: part.Delivery,
          Manuf: part.Manuf,
          Name: part.Name,
          Price: part.Price,
        })),
        ...inventoryParts.map((part) => ({
          ...part,
          Delivery: "0", // Для товаров со склада время доставки = 0
        })),
      ];

      // Сохраняем результаты поиска в кэше по ID пользователя
      if (ctx.from?.id) {
        searchResultsCache.set(ctx.from.id, allParts);
      }

      // Формируем список производителей с диапазоном цен для выбора
      const manufacturers = new Set(allParts.map((part: any) => part.Manuf));
      const buttons = Array.from(manufacturers).map((manuf) => {
        const parts = allParts.filter((part: any) => part.Manuf === manuf);
        const priceRange = `${Math.min(...parts.map((part: any) => part.Price))} - ${Math.max(...parts.map((part: any) => part.Price))}`;
        return {
          text: `${manuf} (${priceRange})`,
          callback_data: `manuf:${manuf}`,
        };
      });
      await ctx.reply("Выберите производителя и диапазон цен:", {
        reply_markup: { inline_keyboard: buttons.map((btn) => [btn]) },
      });
    } catch (error: any) {
      logger.error(`Ошибка при обработке артикула: ${error}`);
      await ctx.reply("❌ Произошла ошибка при обработке артикула.");
    }
  });
};
