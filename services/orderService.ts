import db from "../knex";
import logger from "../logger";

export async function getOrdersByClientId(clientId: number) {
    try {
        const orders = await db("orders").where("client_id", clientId);
        return orders;
    } catch (error) {
        logger.error(`Ошибка при получении заказов клиента ${clientId}: ${error}`);
        return [];
    }
}

export async function getAllOrders() {
    try {
        const orders = await db("orders")
            .join("users as clients", "orders.client_id", "clients.id")
            .leftJoin("users as admins", "orders.responsible_id", "admins.id")
            .select(
                "orders.id",
                "orders.detail_articule",
                "orders.status",
                "clients.tg_name as client",
                "admins.tg_name as responsible"
            );

        return orders;
    } catch (error) {
        logger.error(`Ошибка при получении всех заказов: ${error}`);
        return [];
    }
}

export async function createOrder(
    detailArticule: string,
    clientId: number,
    responsibleId?: number
) {
    try {
        const [id] = await db("orders").insert({
            status: "created",
            detail_articule: detailArticule,
            client_id: clientId,
            responsible_id: responsibleId || null
        });
        logger.info(`Заказ 🆔 ${id} создан. Клиент ID: ${clientId}, Ответственный: ${responsibleId || "❌ Нет"}`);
        return id;
    } catch (error) {
        logger.error(`Ошибка при создании заказа: ${error}`);
        return null;
    }
}


