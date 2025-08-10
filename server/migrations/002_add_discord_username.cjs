/** @param {import('knex').Knex} knex */
exports.up = async function (knex) {
  const has = await knex.schema.hasColumn("users", "discord_username");
  if (!has) {
    await knex.schema.alterTable("users", (t) => {
      t.string("discord_username", 32).notNullable().unique().after("username");
    });
  }
  // try {
  //   await knex.schema.alterTable("users", (t) => t.unique(["discord_username"]));
  // } catch (e) {/* ignore if already unique */}
};

exports.down = async function (knex) {
  const has = await knex.schema.hasColumn("users", "discord_username");
  if (has) {
    await knex.schema.alterTable("users", (t) => {
      t.dropColumn("discord_username");
    });
  }
};