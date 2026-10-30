const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  const { username, name, email, password, role } = req.body;
  try {
    // Validate username
    if (!username || username.trim() === '') {
      return res.status(400).json({ message: 'User ID is required.' });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ message: 'User ID can only contain letters, numbers, and underscores.' });
    }

    // Check if username already taken
    const existingUsername = await pool.query('SELECT 1 FROM users WHERE username = $1', [username]);
    if (existingUsername.rows.length > 0) {
      return res.status(400).json({ message: `User ID "${username}" is already taken. Please choose another.` });
    }

    // Validate email format
    if (!email || !/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(email)) {
      return res.status(400).json({ message: 'Email address must be a valid Gmail address (ending in @gmail.com).' });
    }

    // Check if email already taken
    const existingEmail = await pool.query('SELECT 1 FROM users WHERE email = $1', [email]);
    if (existingEmail.rows.length > 0) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    // Validate password
    if (!password || password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ message: 'Password must contain at least one uppercase letter (A-Z).' });
    }
    if (!/[a-z]/.test(password)) {
      return res.status(400).json({ message: 'Password must contain at least one lowercase letter (a-z).' });
    }
    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ message: 'Password must contain at least one number (0-9).' });
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      return res.status(400).json({ message: 'Password must contain at least one special character.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newRole = role || 'Passenger';

    const newUser = await pool.query(
      'INSERT INTO users (username, name, email, password, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, name, email, role',
      [username, name, email, hashedPassword, newRole]
    );

    res.status(201).json({ message: 'User registered successfully', user: newUser.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;
  try {
    if (!username || !password) {
      return res.status(400).json({ message: 'User ID and password are required.' });
    }

    const user = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (user.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid User ID or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.rows[0].password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid User ID or password.' });
    }

    const payload = {
      user: {
        id: user.rows[0].id,
        role: user.rows[0].role
      }
    };

    const jwtSecret = process.env.JWT_SECRET || 'secret123';
    jwt.sign(payload, jwtSecret, { expiresIn: 360000 }, (err, token) => {
      if (err) throw err;
      res.json({
        token,
        role: user.rows[0].role,
        name: user.rows[0].name,
        username: user.rows[0].username,
        email: user.rows[0].email
      });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};
