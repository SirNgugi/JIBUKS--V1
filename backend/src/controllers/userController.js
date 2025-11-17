const db = require('../db');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

async function listUsers(req, res, next) {
  try {
    const result = await db.query('SELECT id, name, email, created_at FROM users ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required' });
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    const insert = await db.query(
      'INSERT INTO users(name, email, password) VALUES($1, $2, $3) RETURNING id, name, email, created_at',
      [name || null, email, hashed]
    );

    res.status(201).json(insert.rows[0]);
  } catch (err) {
    // unique violation code for Postgres is '23505'
    if (err.code === '23505') {
      return res.status(409).json({ error: 'email already exists' });
    }
    next(err);
  }
}

module.exports = { listUsers, createUser };
