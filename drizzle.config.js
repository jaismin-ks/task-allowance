// drizzle.config.js
/** @type {import('drizzle-kit').Config} */
export default {
    schema: './db/schema.js',
    out: './db/migrations',
    dialect: 'sqlite',
    driver: 'expo',
  };