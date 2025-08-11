/** @param {import('knex').Knex} knex */
exports.up = async function (knex) {
  await knex.schema.createTable("guesses", (t) => {
    t.bigIncrements("id").primary();
    t.bigInteger("tournament_id").unsigned().notNullable()
      .references("id").inTable("tournaments").onDelete("CASCADE");
    t.bigInteger("game_id").unsigned().notNullable()
      .references("id").inTable("games").onDelete("CASCADE");
    t.bigInteger("user_id").unsigned().notNullable()
      .references("id").inTable("users").onDelete("CASCADE");

    t.integer("guess_a").notNullable();
    t.integer("guess_b").notNullable();

    // evaluation fields (set when game is finished):
    t.boolean("cond_ok").defaultTo(false);    // winner tier correct ( >5, <5, =5 )
    t.boolean("diff_ok").defaultTo(false);    // exact point difference correct
    t.boolean("exact_ok").defaultTo(false);   // exact score A-B correct
    t.integer("awarded_points").defaultTo(0); // 0/1/3/5 or 0/2/4/6 depending on stage

    t.timestamp("created_at").defaultTo(knex.fn.now());
    t.timestamp("updated_at").defaultTo(knex.fn.now());

    t.unique(["game_id", "user_id"]); // one guess per user per game
    t.index(["tournament_id", "game_id", "user_id"]);
  });
};
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("guesses");
};