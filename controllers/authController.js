const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid'); // Import the uuid package

exports.register = async (req, res) => {
  const { username, email, password, displayName } = req.body;
  
  // Validate input
  if (!username || !email || !password) {
    return res.status(400).json({ msg: 'Please provide username, email, and password' });
  }
  
  if (password.length < 8) {
    return res.status(400).json({ msg: 'Password must be at least 8 characters long' });
  }
  
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET not found in environment variables');
    return res.status(500).json({ msg: 'Server configuration error' });
  }
  
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
      if (err) {
        console.error('JWT signing error during registration:', err);
        return res.status(500).json({ msg: 'Token generation failed' });
      }
      res.json({ token, user: newUser.rows[0] });
    });
  } catch (err) {
    console.error("--- REGISTER ERROR ---");
    console.error(err);
    
    // Handle specific database errors
    if (err.code === '23505') { // PostgreSQL unique violation
      return res.status(400).json({ msg: 'User with that email or username already exists' });
    }
    
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  
  // Validate input
  if (!email || !password) {
    return res.status(400).json({ msg: 'Please provide email and password' });
  }
  
  try {
    // Check JWT_SECRET exists
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET not found in environment variables');
      return res.status(500).json({ msg: 'Server configuration error' });
    }
    
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
      if (err) {
        console.error('JWT signing error:', err);
        return res.status(500).json({ msg: 'Token generation failed' });
      }
      const { password_hash, ...userData } = user.rows[0];
      res.json({ token, user: userData });
    });
  } catch (err) {
    console.error("--- LOGIN ERROR ---");
    console.error(err);
    res.status(500).json({ msg: 'Server error', error: err.message });
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
