/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.alterTable("users", (t) => {
    t.string("discord_username", 32).notNullable().unique().after("username");
  });
};
exports.down = async function (knex) {
  await knex.schema.alterTable("users", (t) => {
    t.dropColumn("discord_username");
  });
};