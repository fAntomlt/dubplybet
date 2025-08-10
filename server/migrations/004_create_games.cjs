/** @param {import('knex').Knex} knex */
exports.up = async function (knex) {
  await knex.schema.createTable("games", (t) => {
    t.bigIncrements("id").primary();
    t.bigInteger("tournament_id").unsigned().notNullable()
      .references("id").inTable("tournaments").onDelete("CASCADE");
    t.string("team_a", 120).notNullable();
    t.string("team_b", 120).notNullable();
    t.dateTime("tipoff_at").notNullable(); // game start (UTC)
    t.enum("status", ["scheduled", "locked", "finished"]).notNullable().defaultTo("scheduled");
    t.integer("score_a").nullable();
    t.integer("score_b").nullable();
    t.timestamp("created_at").defaultTo(knex.fn.now());
    t.timestamp("updated_at").defaultTo(knex.fn.now());
    t.index(["tournament_id", "tipoff_at"]);
  });
};
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("games");
};