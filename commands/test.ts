import { Context, Telegraf } from 'telegraf';
import { searchStart, searchGetParts } from '../services/avtotoRequests'; // подключаем сервисы для запросов
import { searchInventoryByPartCode } from '../services/excelService'; // импортируем функцию для поиска на складе
import logger from '../logger';

export const setupAvtotoPartsCommand = (bot: Telegraf) => {
  bot.command("avtoto_parts", async (ctx) => {
    try {
      // Проверка на наличие текста сообщения и извлечение артикул
      const messageText = ctx.message?.text;
      if (!messageText) {
        await ctx.reply("❌ Не удалось извлечь текст сообщения.");
        return;
      }

      const args = messageText.split(" ");
      if (args.length < 2) {
        await ctx.reply("❌ Использование: /avtoto_parts <артикул>");
        return;
      }

      const searchCode = args[1].trim(); // артикул

      await ctx.reply(`🔍 Запускаю поиск для артикул: ${searchCode}...`);

      // Получаем process_id с помощью метода SearchStart
      const startResult = await searchStart(searchCode);
      if (!startResult || !startResult.process_id) {
        await ctx.reply("❌ Ошибка при получении process_id.");
        return;
      }

      logger.info(`Получен process_id: ${startResult.process_id}`);

      // Переходим к запросу SearchGetParts
      await ctx.reply(`🔄 Ожидаю результатов для process_id: ${startResult.process_id}...`);

      const partsResult = await searchGetParts(startResult.process_id);

      if (!partsResult || !partsResult.Parts || partsResult.Parts.length === 0) {
        await ctx.reply("❌ Запчасти не найдены.");
        return;
      }

      // Теперь вызываем searchInventoryByPartCode для поиска на складе
      const inventoryParts = await searchInventoryByPartCode(searchCode);

      // Объединяем массивы: сначала данные с вашего склада, затем данные из внешнего сервиса
      const allParts = [...partsResult.Parts, ...inventoryParts.map(part => ({
        ...part,
        Delivery: '0', // Для товаров с вашего склада время доставки = 0
        price: part.price || 0, // Заполняем цену, если она есть
        storage: part.storage || 'Не указано', // Заполняем склад, если указано
      }))];

      // Здесь сохраняем объединенный результат в кэш
      ctx.session.parts = allParts;

      // Формируем список производителей с диапазоном цен для выбора
      let manufacturers = new Set(allParts.map((part: any) => part.Manuf)); // уникальные производители
      let buttons = Array.from(manufacturers).map((manuf) => {
        const parts = allParts.filter((part: any) => part.Manuf === manuf);
        const priceRange = `${Math.min(...parts.map((part: any) => part.price))} - ${Math.max(...parts.map((part: any) => part.price))}`;
        return { text: `${manuf} (${priceRange})`, callback_data: `manuf:${manuf}` };
      });

      await ctx.reply(
        "Выберите производителя и диапазон цен:",
        {
          reply_markup: {
            inline_keyboard: buttons.map((btn) => [btn]),
          },
        }
      );
    } catch (error) {
      logger.error(`Ошибка при обработке запроса: ${error.message}`);
      await ctx.reply("❌ Произошла ошибка при обработке запроса.");
    }
  });

  // Обработка выбора производителя
  bot.on("callback_query", async (ctx: Context) => {
    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery || !callbackQuery.data) {
      await ctx.reply("❌ Не удалось обработать ваш выбор.");
      return;
    }

    const selectedManuf = callbackQuery.data.split(":")[1];
    const searchCode = callbackQuery.message?.text.match(/артикул: (\S+)/)?.[1]; // Получаем артикул из текста сообщения

    if (!searchCode) {
      await ctx.reply("❌ Не удалось извлечь артикул.");
      return;
    }

    await ctx.answerCbQuery();
    await ctx.reply(`Вы выбрали: ${selectedManuf}, продолжаю поиск...`);

    const startResult = await searchStart(searchCode);
    const partsResult = await searchGetParts(startResult.process_id);

    if (!partsResult || !partsResult.Parts || partsResult.Parts.length === 0) {
      await ctx.reply("❌ Запчасти не найдены.");
      return;
    }

    const selectedParts = partsResult.Parts.filter((part: any) => part.Manuf === selectedManuf)
      .sort((a: any, b: any) => parseInt(a.Delivery) - parseInt(b.Delivery))
      .slice(0, 5);

    const detailsMessage = selectedParts.map((part: any) => 
      `${part.Name} - ${part.price} ₽, ${part.Delivery} дней, Склад: ${part.storage}`).join("\n");

    await ctx.reply(`🔍 Найдено 5 запчастей для ${selectedManuf}:\n${detailsMessage}`);
  });
};
