import { Telegraf, Markup } from "telegraf";
import { getUserByTgName } from "../services/userService";
import { getOrdersByClientId, getAllOrders } from "../services/orderService";
import db from "../knex";
import logger from "../logger";

// Вспомогательная функция для формирования inline‑клавиатуры заказов с пагинацией
function buildOrdersKeyboard(orders: any[], page: number) {
  const ordersPerPage = 5;
  const totalPages = Math.ceil(orders.length / ordersPerPage);

  // Отбираем заказы для текущей страницы (последние заказы – первыми)
  const startIndex = (page - 1) * ordersPerPage;
  const pageOrders = orders.slice(startIndex, startIndex + ordersPerPage);

  // Формируем кнопку для каждого заказа
  const orderButtons = pageOrders.map(order =>
    Markup.button.callback(
      `🆔 ${order.id} | 🔧 ${order.detail_articule} | 📍 ${order.status}`,
      `order_${order.id}`
    )
  );

  // Формируем кнопки пагинации, если нужно
  const paginationButtons = [];
  if (page > 1) {
    paginationButtons.push(
      Markup.button.callback("⬅️ Предыдущая", `orders_page:${page - 1}`)
    );
  }
  if (page < totalPages) {
    paginationButtons.push(
      Markup.button.callback("Следующая ➡️", `orders_page:${page + 1}`)
    );
  }

  // Собираем клавиатуру: заказы в отдельных строках и, если есть, строка с кнопками пагинации
  const inlineKeyboard = orderButtons.map(btn => [btn]);
  if (paginationButtons.length > 0) {
    inlineKeyboard.push(paginationButtons);
  }
  return Markup.inlineKeyboard(inlineKeyboard);
}

export function setupOrdersCommand(bot: Telegraf) {
  // Команда /orders — проверка регистрации и вывод последних 5 заказов с пагинацией
  bot.command("orders", async (ctx) => {
    try {
      const tgName = ctx.from?.username || ctx.from?.first_name;
      const user = await getUserByTgName(tgName!);

      if (!user) {
        return ctx.reply("❌ Вы не зарегистрированы в системе.");
      }

      let orders;
      if (user.role === "client") {
        orders = await getOrdersByClientId(user.id);
      } else {
        orders = await getAllOrders();
      }

      if (orders.length === 0) {
        return ctx.reply("📦 У вас пока нет заказов.");
      }

      // Сортируем заказы по убыванию id (последние заказы – первыми)
      orders.sort((a, b) => b.id - a.id);

      const page = 1;
      const keyboard = buildOrdersKeyboard(orders, page);
      await ctx.reply("📦 *Ваши заказы:*", {
        ...keyboard,
        parse_mode: "Markdown"
      });
      logger.info(`${tgName} запросил список заказов`);
    } catch (error: any) {
      logger.error(`Ошибка при запросе заказов: ${error.message}`);
      await ctx.reply("❌ Произошла ошибка при получении заказов.");
    }
  });

  // Обработка пагинации – обновление списка заказов для нужной страницы
  bot.action(/orders_page:(\d+)/, async (ctx) => {
    try {
      const page = Number(ctx.match[1]);
      if (isNaN(page)) return;

      const tgName = ctx.from?.username || ctx.from?.first_name;
      const user = await getUserByTgName(tgName!);
      if (!user) {
        return ctx.reply("❌ Вы не зарегистрированы в системе.");
      }
      let orders;
      if (user.role === "client") {
        orders = await getOrdersByClientId(user.id);
      } else {
        orders = await getAllOrders();
      }
      if (orders.length === 0) {
        return ctx.reply("📦 У вас пока нет заказов.");
      }
      orders.sort((a, b) => b.id - a.id);
      const keyboard = buildOrdersKeyboard(orders, page);
      // Обновляем сообщение с заказами, заменяя инлайн‑клавиатуру
      await ctx.editMessageReplyMarkup(keyboard.reply_markup);
    } catch (error: any) {
      logger.error(`Ошибка при обработке пагинации заказов: ${error.message}`);
      await ctx.reply("❌ Произошла ошибка при обновлении списка заказов.");
    }
  });

  // Обработка выбора заказа — вывод информации с кнопками и кнопкой "Назад"
  bot.action(/order_(\d+)/, async (ctx) => {
    try {
      // Скрываем кнопки заказа (редактируя сообщение)
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
      
      const orderId = Number(ctx.match[1]);
      const tgName = ctx.from?.username || ctx.from?.first_name;
      const user = await getUserByTgName(tgName!);
      if (!user) {
        return ctx.reply("❌ Вы не зарегистрированы.");
      }
      const order = await db("orders").where("id", orderId).first();
      if (!order) {
        return ctx.reply(`❌ Заказ 🆔 ${orderId} не найден.`);
      }
      
      // Формируем кнопки деталей заказа
      const orderButtons = [
        Markup.button.callback("📜 История", `history_${orderId}`)
      ];
      if (user.role === "admin") {
        orderButtons.push(Markup.button.callback("✏ Изменить статус", `set_status_${orderId}`));
      }
      // Добавляем дополнительную кнопку "Назад"
      const backButton = Markup.button.callback("🔙 Назад", "orders_back");

      await ctx.reply(`🆔 *Заказ ${orderId}*`, {
        reply_markup: Markup.inlineKeyboard([
          orderButtons,
          [backButton]
        ]).reply_markup,
        parse_mode: "Markdown"
      });
      
    } catch (error: any) {
      logger.error(`Ошибка при выборе заказа: ${error.message}`);
      await ctx.reply("❌ Произошла ошибка при обработке вашего выбора.");
    }
  });

  // Обработка кнопки "Назад" — возвращаем список заказов
  bot.action("orders_back", async (ctx) => {
    try {
      // Скрываем кнопки текущего сообщения
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
      
      const tgName = ctx.from?.username || ctx.from?.first_name;
      const user = await getUserByTgName(tgName!);
      if (!user) {
        return ctx.reply("❌ Вы не зарегистрированы в системе.");
      }
      
      let orders;
      if (user.role === "client") {
        orders = await getOrdersByClientId(user.id);
      } else {
        orders = await getAllOrders();
      }
      if (orders.length === 0) {
        return ctx.reply("📦 У вас пока нет заказов.");
      }
      orders.sort((a, b) => b.id - a.id);
      const page = 1;
      const keyboard = buildOrdersKeyboard(orders, page);
      await ctx.editMessageText("📦 *Ваши заказы:*", {
        reply_markup: keyboard.reply_markup,
        parse_mode: "Markdown"
      });
    } catch (error: any) {
      logger.error(`Ошибка при переходе назад к списку заказов: ${error.message}`);
      await ctx.reply("❌ Произошла ошибка при обновлении списка заказов.");
    }
  });
}
