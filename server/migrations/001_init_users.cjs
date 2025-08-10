/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable('users', (t) => {
    t.bigIncrements('id').primary();
    t.string('email', 191).notNullable().unique();
    t.string('username', 50).notNullable().unique();
    t.string('password_hash', 255).notNullable();
    t.enum('role', ['user', 'admin']).notNullable().defaultTo('user');
    t.boolean('email_verified').notNullable().defaultTo(false);
    t.integer('correct_guesses_all_time').notNullable().defaultTo(0);
    t.bigInteger('sub_role_id').unsigned().nullable(); // FK to sub_roles later
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.index(['email', 'username']);
  });

  await knex.schema.createTable('email_verifications', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    t.string('token', 255).notNullable().unique();
    t.timestamp('expires_at').notNullable();
    t.boolean('used').notNullable().defaultTo(false);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.index(['user_id', 'token']);
  });

  await knex.schema.createTable('sub_roles', (t) => {
    t.bigIncrements('id').primary();
    t.string('name', 50).notNullable().unique();
    t.integer('threshold_correct').notNullable(); // required correct guesses
    t.integer('rank_order').notNullable().defaultTo(0);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('sub_roles');
  await knex.schema.dropTableIfExists('email_verifications');
  await knex.schema.dropTableIfExists('users');
};