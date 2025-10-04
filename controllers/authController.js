const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid'); // Import the uuid package

exports.register = async (req, res) => {
  const { username, email, password, displayName } = req.body;
  try {
    // Check if user already exists
    let user = await db.query('SELECT * FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (user.rows.length > 0) {
      return res.status(400).json({ msg: 'User with that email or username already exists' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // *** FIX: Generate UUID for the new user ***
    const newUserId = uuidv4();

    // Insert new user into the database
    const newUser = await db.query(
      'INSERT INTO users (id, username, email, password_hash, display_name) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, display_name',
      [newUserId, username, email, password_hash, displayName || username]
    );

    // Create JWT token
    const payload = { user: { id: newUser.rows[0].id } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' }, (err, token) => {
      if (err) throw err;
      res.json({ token, user: newUser.rows[0] });
    });
  } catch (err) {
  console.error("--- REGISTER ERROR ---"); // Add this line
  console.error(err); // Add this line
  res.status(500).send('Server error');
}
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    let user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const payload = { user: { id: user.rows[0].id } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' }, (err, token) => {
      if (err) throw err;
      const { password_hash, ...userData } = user.rows[0];
      res.json({ token, user: userData });
    });
  } catch (err) {
  console.error("--- LOGIN ERROR ---"); // Add this line
  console.error(err); // Add this line
  res.status(500).send('Server error');
}
};

exports.getMe = async (req, res) => {
    try {
        const user = await db.query('SELECT id, username, email, display_name, avatar_url, bio FROM users WHERE id = $1', [req.user.id]);
        res.json(user.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
