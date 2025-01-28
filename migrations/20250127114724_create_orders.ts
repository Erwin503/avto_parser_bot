import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    return knex.schema.createTable("orders", (table) => {
        table.increments("id").primary(); // Уникальный ID
        table.enu("status", ["created", "processing", "complete"]).notNullable();
        table.string("detail_articule").notNullable();

        table.integer("responsible_id").unsigned();
        table.foreign("responsible_id").references("users.id").onDelete("CASCADE");

        table.integer("client_id").unsigned().notNullable();
        table.foreign("client_id").references("users.id").onDelete("CASCADE");

        table.timestamps(true, true); // created_at, updated_at
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTable("orders");
}
