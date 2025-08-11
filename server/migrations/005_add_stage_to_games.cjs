/** @param {import('knex').Knex} knex */
exports.up = async function (knex) {
  const has = await knex.schema.hasColumn("games", "stage");
  if (!has) {
    await knex.schema.alterTable("games", (t) => {
      t.enum("stage", ["group", "playoff"]).notNullable().defaultTo("group").after("status");
    });
  }
};
exports.down = async function (knex) {
  const has = await knex.schema.hasColumn("games", "stage");
  if (has) {
    await knex.schema.alterTable("games", (t) => t.dropColumn("stage"));
  }
};