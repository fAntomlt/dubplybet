/** @param {import('knex').Knex} knex */
exports.up = async function (knex) {
  await knex.schema.createTable("tournament_scores", (t) => {
    t.bigIncrements("id").primary();
    t.bigInteger("tournament_id").unsigned().notNullable()
      .references("id").inTable("tournaments").onDelete("CASCADE");
    t.bigInteger("user_id").unsigned().notNullable()
      .references("id").inTable("users").onDelete("CASCADE");
    t.integer("points").notNullable().defaultTo(0);
    t.integer("correct_any").notNullable().defaultTo(0); // how many games with >=1 condition right
    t.timestamp("updated_at").defaultTo(knex.fn.now());

    t.unique(["tournament_id", "user_id"]);
    t.index(["tournament_id", "points"]);
  });
};
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("tournament_scores");
};