import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    return knex.schema.createTable("users", (table) => {
        table.increments("id").primary(); // Уникальный ID
        table.string("tg_name").notNullable().unique();
        table.enu("role", ["client", "admin"]).notNullable();
        table.timestamps(true, true); // created_at, updated_at
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTable("users");
}
