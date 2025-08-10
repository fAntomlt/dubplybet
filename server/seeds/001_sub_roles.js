/**
 * @param {import('knex').Knex} knex
 */
exports.seed = async function (knex) {
  await knex('sub_roles').del();
  await knex('sub_roles').insert([
    { name: 'Newbie',        threshold_correct: 0,   rank_order: 1 },
    { name: 'Scout',         threshold_correct: 10,  rank_order: 2 },
    { name: 'Analyst',       threshold_correct: 25,  rank_order: 3 },
    { name: 'Prognosticator',threshold_correct: 50,  rank_order: 4 },
    { name: 'Oracle',        threshold_correct: 100, rank_order: 5 },
  ]);
};