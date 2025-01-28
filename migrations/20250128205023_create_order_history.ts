import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    return knex.schema.createTable("order_history", (table) => {
        table.increments("id").primary();
        table.integer("order_id").unsigned().notNullable();
        table.foreign("order_id").references("orders.id").onDelete("CASCADE");
        table.integer("user_id").unsigned().notNullable();
        table.foreign("user_id").references("users.id").onDelete("CASCADE");
        table.string("action").notNullable(); // Действие (изменение статуса, назначение ответственного)
        table.timestamp("created_at").defaultTo(knex.fn.now()); // Дата изменения
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTable("order_history");
}

