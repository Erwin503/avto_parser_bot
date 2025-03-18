import { Context } from 'telegraf';
import { createOrder } from '../../services/orderService';
import { searchResultsCache } from './searchResultsCache';
import logger from '../../logger';

export const createOrderAction = async (ctx: Context, selectedManuf: string, index: number) => {
  try {
    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.reply('❌ Не удалось определить пользователя.');
      return;
    }

    const partsResult = searchResultsCache.get(userId);
    if (!partsResult) {
      await ctx.reply('❌ Результаты поиска не найдены. Попробуйте снова выполнить поиск.');
      return;
    }

    const selectedParts = partsResult.filter((part: any) => part.Manuf === selectedManuf)
      .sort((a: any, b: any) => parseInt(a.Delivery) - parseInt(b.Delivery))
      .slice(0, 5);

    if (selectedParts.length <= index) {
      await ctx.reply('❌ Деталь не найдена для создания заказа.');
      return;
    }

    const part = selectedParts[index];
    const detailArticule = part.Articule || part.Name;

    const user = userCache.get(userId);
    if (!user) {
      await ctx.reply('❌ Вы не зарегистрированы в системе.');
      return;
    }

    const orderId = await createOrder(detailArticule, user.id);
    if (orderId) {
      await ctx.reply(`✅ Заказ 🆔 ${orderId} успешно создан!`);
    } else {
      await ctx.reply('❌ Ошибка при создании заказа.');
    }

    await ctx.answerCbQuery();
  } catch (error: any) {
    logger.error(`Ошибка при создании заказа: ${error.message}`);
    await ctx.reply('❌ Произошла ошибка при создании заказа.');
  }
};
