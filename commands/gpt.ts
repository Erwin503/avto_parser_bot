import { Telegraf } from "telegraf";
import logger from "../logger";
import { getArticleFromChatGPT } from "../services/chatgptApi";

// Объект для хранения состояния диалога по userId
const userState: { [userId: number]: { model?: string; year?: string; description?: string } } = {};

export function gptCommand(bot: Telegraf) {
  // Команда /gpt инициирует сбор информации
  bot.command("gpt", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.reply("❌ Не удалось определить пользователя.");
      return;
    }
    // Инициализируем состояние для данного пользователя
    userState[userId] = {};
    await ctx.reply("Введите модель машины:");
    // logger.info(`${tgName} запросил список заказов`);
  });

  // Обработка текстовых сообщений, ожидающих данные для формирования запроса
  bot.on("text", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    
    // Если для пользователя состояние не инициализировано, игнорируем сообщение
    if (!userState[userId]) {
      return;
    }
    
    const text = ctx.message?.text.trim();
    if (!text) return;

    const state = userState[userId];

    // Если не введена модель, сохраняем введённое значение и запрашиваем год выпуска
    if (!state.model) {
      state.model = text;
      await ctx.reply("Введите год выпуска:");
      return;
    }
    // Если не введён год, сохраняем его и запрашиваем описание детали
    if (!state.year) {
      state.year = text;
      await ctx.reply("Введите описание детали:");
      return;
    }
    // Если модель и год уже сохранены, то текущий ввод воспринимаем как описание детали
    if (!state.description) {
      state.description = text;
      
      // Формируем объект с собранными данными
      const inputData = {
        model: state.model,
        year: state.year,
        description: state.description,
      };
      
      // Очистим состояние для данного пользователя
      delete userState[userId];
      
      // Вызываем функцию ChatGPT и отправляем ответ пользователю
      let response = await getArticleFromChatGPT(inputData);
      if (!response) {
        response = "Ошибка подключения к нейросети";
      }
      await ctx.reply(response);
    }
  });
}
