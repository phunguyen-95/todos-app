const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function connectWithRetry() {
  for (let i = 0; i < 20; i++) {          
    try {
      await pool.query('SELECT 1')
      console.log('Database connected!')
      return
    } catch (err) {
      console.log(`DB not ready, retrying ${i + 1}/20...`)
      await new Promise(r => setTimeout(r, 3000)) 
    }
  }
  throw new Error('Cannot connect to database')
}

async function init() {
  await connectWithRetry();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      done BOOLEAN DEFAULT false
    )
  `);
  console.log('Table ready!');
}

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/todos', async (req, res) => {
  const result = await pool.query('SELECT * FROM todos ORDER BY id');
  res.json(result.rows);
});

app.post('/todos', async (req, res) => {
  const { title } = req.body;
  const result = await pool.query(
    'INSERT INTO todos (title) VALUES ($1) RETURNING *',
    [title]
  );
  res.json(result.rows[0]);
});

init().then(() => {
  app.listen(3000, () => console.log('Server running on port 3000 v1'));
});
