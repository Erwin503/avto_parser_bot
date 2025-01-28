import db from "../knex";
import logger from "../logger";

export async function getUserByTgName(tgName: string) {
  try {
    const user = await db("users").where("tg_name", tgName).first();
    return user;
  } catch (error) {
    logger.error(`Ошибка при получении пользователя ${tgName}: ${error}`);
    return null;
  }
}

export async function createUser(tgName: string, role: "client" | "admin") {
  try {
    const [id] = await db("users").insert({ tg_name: tgName, role });
    logger.info(`Пользователь ${tgName} (${role}) создан. ID: ${id}`);
    return id;
  } catch (error) {
    logger.error(`Ошибка при создании пользователя ${tgName}: ${error}`);
    return null;
  }
}
