import { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
    // Очищаем таблицу перед добавлением новых данных
    await knex("users").del();

    // Добавляем пользователей
    await knex("users").insert([
        { id: 1, tg_name: "Bad_Nikkname", role: "admin" },
        { id: 2, tg_name: "S2", role: "admin" }
    ]);

    console.log("✅ Сиды пользователей загружены!");
}
