import { Context, Telegraf } from "telegraf";
import { searchStart, searchGetParts } from "../services/avtotoRequests";
import { createOrder } from "../services/orderService";
import { getUserByTgName } from "../services/userService";
import logger from "../logger";
import { searchInventoryByPartCode } from "../services/excelService";

// Глобальный кэш для хранения результатов поиска по ID пользователя
const searchResultsCache = new Map<number, any>();
// Глобальный кэш для хранения зарегистрированных пользователей по Telegram ID
const userCache = new Map<number, any>();

// Интерфейс для кнопок inline keyboard
interface InlineButton {
  text: string;
  callback_data: string;
}

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
      if (ctx.from?.id) {
        userCache.set(ctx.from.id, user);
      }
      await ctx.reply(
        "❗ Пожалуйста, отправьте артикул, по которому хотите выполнить поиск."
      );
    } catch (error: any) {
      logger.error(
        `Ошибка при обработке команды /avtoto_parts: ${error.message}`
      );
      await ctx.reply("❌ Произошла ошибка при обработке команды.");
    }
  });

  // Обработка текстовых сообщений — ввод артикула
  bot.on("text", async (ctx) => {
    try {
      const searchCode = ctx.message?.text.trim();
      if (!searchCode) {
        await ctx.reply(
          "❌ Вы не прислали артикул. Пожалуйста, отправьте артикул для поиска."
        );
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

      await ctx.reply(
        `🔄 Ожидаю результатов для ProcessSearchId: ${startResult.ProcessSearchId}...`
      );
      const partsResult = await searchGetParts(startResult.ProcessSearchId);
      if (
        !partsResult ||
        !partsResult.Parts ||
        partsResult.Parts.length === 0
      ) {
        await ctx.reply("❌ Запчасти не найдены.");
        return;
      }

      logger.debug(`partsResult.Parts[1]: ${JSON.stringify(partsResult.Parts[1])}`)

      const inventoryParts = await searchInventoryByPartCode(searchCode);
      logger.debug(`inventoryParts: ${inventoryParts}`)

      // Объединяем массивы: сначала данные с вашего склада, затем данные из внешнего сервиса
      const allParts = partsResult.Parts
      // const allParts = [
      //   ...partsResult.Parts,
      //   ...inventoryParts.map((part) => ({
      //     ...part,
      //     Delivery: "0", // Для товаров с вашего склада время доставки = 0
      //     price: part.price || 0, // Заполняем цену, если она есть
      //     storage: part.storage || "Не указано", // Заполняем склад, если указано
      //   })),
      // ];

      // Сохраняем результаты поиска в кэше по ID пользователя
      if (ctx.from?.id) {
        searchResultsCache.set(ctx.from.id, partsResult);
      }

      // Формируем список производителей с диапазоном цен для выбора
      const manufacturers = new Set(
        partsResult.Parts.map((part: any) => part.Manuf)
      );
      const buttons = Array.from(manufacturers).map((manuf) => {
        const parts = partsResult.Parts.filter(
          (part: any) => part.Manuf === manuf
        );
        const priceRange = `${Math.min(
          ...parts.map((part: any) => part.Price)
        )} - ${Math.max(...parts.map((part: any) => part.Price))}`;
        return {
          text: `${manuf} (${priceRange})`,
          callback_data: `manuf:${manuf}`,
        };
      });

      await ctx.reply("Выберите производителя и диапазон цен:", {
        reply_markup: {
          inline_keyboard: buttons.map((btn) => [btn]),
        },
      });
    } catch (error: any) {
      logger.error(`Ошибка при обработке артикула: ${error}`);
      await ctx.reply("❌ Произошла ошибка при обработке артикула.");
    }
  });

  // Обработка выбора производителя — формирование кнопок с вариантами деталей
  bot.action(/manuf:(.+)/, async (ctx) => {
    try {
      const selectedManuf = ctx.match[1];
      const userId = ctx.from?.id;
      if (!userId) {
        await ctx.reply("❌ Не удалось определить пользователя.");
        return;
      }
      const partsResult = searchResultsCache.get(userId);
      if (!partsResult) {
        await ctx.reply(
          "❌ Результаты поиска не найдены. Попробуйте снова выполнить поиск."
        );
        return;
      }
      // Фильтруем запчасти по выбранному производителю, сортируем по сроку доставки и берём первые 5 вариантов
      const selectedParts = partsResult.Parts.filter(
        (part: any) => part.Manuf === selectedManuf
      )
        .sort((a: any, b: any) => parseInt(a.Delivery) - parseInt(b.Delivery))
        .slice(0, 5);
      if (selectedParts.length === 0) {
        await ctx.reply("❌ Запчасти для выбранного производителя не найдены.");
        return;
      }
      // Формируем кнопки для выбора конкретной детали
      const detailButtons: InlineButton[] = selectedParts.map(
        (part: any, index: number) => {
          const buttonText = `${part.Name} - ${part.Price} ₽, ${part.Delivery} д.`;
          return {
            text: buttonText,
            callback_data: `detail:${selectedManuf}:${index}`,
          };
        }
      );
      await ctx.reply(`Выберите деталь для ${selectedManuf}:`, {
        reply_markup: {
          inline_keyboard: detailButtons.map((btn: InlineButton) => [btn]),
        },
      });
      await ctx.answerCbQuery();
    } catch (error: any) {
      logger.error(
        `Ошибка при обработке выбора производителя: ${error.message}`
      );
      await ctx.reply("❌ Произошла ошибка при обработке вашего выбора.");
    }
  });

  // Обработка выбора детали — вывод информации и кнопки для создания заказа
  bot.action(/detail:(.+):(.+)/, async (ctx) => {
    try {
      const selectedManuf = ctx.match[1];
      const indexStr = ctx.match[2];
      const index = parseInt(indexStr);
      if (isNaN(index)) {
        await ctx.reply("❌ Некорректный выбор детали.");
        return;
      }
      const userId = ctx.from?.id;
      if (!userId) {
        await ctx.reply("❌ Не удалось определить пользователя.");
        return;
      }
      const partsResult = searchResultsCache.get(userId);
      if (!partsResult) {
        await ctx.reply(
          "❌ Результаты поиска не найдены. Попробуйте снова выполнить поиск."
        );
        return;
      }
      // Фильтруем детали для выбранного производителя
      const selectedParts = partsResult.Parts.filter(
        (part: any) => part.Manuf === selectedManuf
      )
        .sort((a: any, b: any) => parseInt(a.Delivery) - parseInt(b.Delivery))
        .slice(0, 5);
      if (selectedParts.length <= index) {
        await ctx.reply("❌ Деталь не найдена.");
        return;
      }
      const part = selectedParts[index];
      const messageText = `Вы выбрали деталь:\nНазвание: ${part.Name}\nЦена: ${part.Price} ₽\nСрок доставки: ${part.Delivery} дней\nСклад: ${part.Storage}`;
      // Выводим информацию о детали и добавляем кнопку для создания заказа
      await ctx.reply(messageText, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "✅ Создать заказ",
                callback_data: `create_order:${selectedManuf}:${index}`,
              },
            ],
          ],
        },
      });
      await ctx.answerCbQuery();
    } catch (error: any) {
      logger.error(`Ошибка при обработке выбора детали: ${error.message}`);
      await ctx.reply("❌ Произошла ошибка при обработке вашего выбора.");
    }
  });

  // Обработка создания заказа при нажатии кнопки "Создать заказ"
  bot.action(/create_order:(.+):(.+)/, async (ctx) => {
    try {
      const selectedManuf = ctx.match[1];
      const indexStr = ctx.match[2];
      const index = parseInt(indexStr);
      if (isNaN(index)) {
        await ctx.reply("❌ Некорректный выбор детали для создания заказа.");
        return;
      }
      const userId = ctx.from?.id;
      if (!userId) {
        await ctx.reply("❌ Не удалось определить пользователя.");
        return;
      }
      const partsResult = searchResultsCache.get(userId);
      if (!partsResult) {
        await ctx.reply(
          "❌ Результаты поиска не найдены. Попробуйте снова выполнить поиск."
        );
        return;
      }
      // Фильтруем детали для выбранного производителя
      const selectedParts = partsResult.Parts.filter(
        (part: any) => part.Manuf === selectedManuf
      )
        .sort((a: any, b: any) => parseInt(a.Delivery) - parseInt(b.Delivery))
        .slice(0, 5);
      if (selectedParts.length <= index) {
        await ctx.reply("❌ Деталь не найдена для создания заказа.");
        return;
      }
      const part = selectedParts[index];
      const detailArticule = part.Articule || part.Name;

      // Получаем зарегистрированного пользователя из кэша
      const user = userCache.get(userId);
      if (!user) {
        await ctx.reply("❌ Вы не зарегистрированы в системе.");
        return;
      }

      // Создаем заказ через сервис
      const orderId = await createOrder(detailArticule, user.id);
      if (orderId) {
        await ctx.reply(`✅ Заказ 🆔 ${orderId} успешно создан!`);
      } else {
        await ctx.reply("❌ Ошибка при создании заказа.");
      }
      await ctx.answerCbQuery();
    } catch (error: any) {
      logger.error(`Ошибка при создании заказа: ${error.message}`);
      await ctx.reply("❌ Произошла ошибка при создании заказа.");
    }
  });
};
