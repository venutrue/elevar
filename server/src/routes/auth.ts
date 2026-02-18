import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/database';
import { authenticate } from '../middleware/auth';
import { generateToken } from '../middleware/auth';

const router = Router();

// POST /register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, first_name, last_name, phone, role } = req.body;

    if (!email || !password || !first_name) {
      res.status(400).json({ error: 'Email, password, and first_name are required' });
      return;
    }

    const existing = await query('SELECT id FROM app_users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    const result = await query(
      `INSERT INTO app_users (email, password_hash, first_name, last_name, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, first_name, last_name, phone, created_at`,
      [email, password_hash, first_name, last_name || null, phone || null]
    );

    const user = result.rows[0];

    // Assign role
    const userRole = role || 'tenant';
    await query(
      `INSERT INTO user_roles (user_id, role_name) VALUES ($1, $2)`,
      [user.id, userRole]
    );

    const token = generateToken({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      roles: [userRole],
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        roles: [userRole],
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const result = await query(
      `SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name, u.is_active,
              COALESCE(array_agg(r.role_name) FILTER (WHERE r.role_name IS NOT NULL), '{}') AS roles
       FROM app_users u
       LEFT JOIN user_roles r ON r.user_id = u.id
       WHERE u.email = $1
       GROUP BY u.id`,
      [email]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const user = result.rows[0];

    if (!user.is_active) {
      res.status(403).json({ error: 'Account is deactivated' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      roles: user.roles,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        roles: user.roles,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /me - requires authentication
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.avatar_url,
              u.is_active, u.created_at, u.updated_at,
              COALESCE(array_agg(r.role_name) FILTER (WHERE r.role_name IS NOT NULL), '{}') AS roles
       FROM app_users u
       LEFT JOIN user_roles r ON r.user_id = u.id
       WHERE u.id = $1
       GROUP BY u.id`,
      [req.user!.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
