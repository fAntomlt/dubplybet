/** @param {import('knex').Knex} knex */
exports.up = async function (knex) {
  await knex.schema.createTable("tournaments", (t) => {
    t.bigIncrements("id").primary();
    t.string("name", 120).notNullable();
    t.date("start_date").notNullable();
    t.date("end_date").notNullable();
    t.enum("status", ["draft", "active", "archived"]).notNullable().defaultTo("draft");
    t.string("winner_team", 120).nullable(); // set on finish
    t.timestamp("created_at").defaultTo(knex.fn.now());
    t.timestamp("updated_at").defaultTo(knex.fn.now());
  });
};
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("tournaments");
};