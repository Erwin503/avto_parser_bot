import db from "../knex";
import logger from "../logger";

export async function addOrderHistory(orderId: number, userId: number, action: string) {
    try {
        await db("order_history").insert({
            order_id: orderId,
            user_id: userId,
            action
        });
        logger.info(`📝 История заказа: Order ID ${orderId} изменен пользователем ${userId}. Действие: ${action}`);
    } catch (error) {
        logger.error(`Ошибка при добавлении истории заказа: ${error}`);
    }
}

export async function getOrderHistory(orderId: number) {
    try {
        const history = await db("order_history")
            .join("users", "order_history.user_id", "users.id")
            .where("order_history.order_id", orderId)
            .select("order_history.id", "users.tg_name as user", "order_history.action", "order_history.created_at");

        return history;
    } catch (error) {
        logger.error(`Ошибка при получении истории заказа ${orderId}: ${error}`);
        return [];
    }
}
