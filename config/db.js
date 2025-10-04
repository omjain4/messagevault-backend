const { Pool } = require('pg');
require('dotenv').config();

console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('Using DATABASE_URL:', process.env.DATABASE_URL ? 'YES' : 'NO');

const pool = new Pool(
  process.env.DATABASE_URL ? 
  {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  } : 
  {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  }
);

module.exports = {
  query: (text, params) => pool.query(text, params),
};