//Imports
require('dotenv').config();
const { Model } = require('objection');
const Knex = require('knex');
const { knexSnakeCaseMappers } = require('objection');

// Initialize knex.
const knex = Knex({
  client: 'pg',
  debug: (process.env.NODE_ENV == 'test'),
  useNullAsDefault: true,
  connection: process.env.PSQL_URI,
  searchPath: ['knex', 'public'],
  ...knexSnakeCaseMappers()
});
 
Model.knex(knex);

module.exports = knex;

