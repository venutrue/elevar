import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { authenticate } from '../middleware/auth';
import { paginate } from '../utils/helpers';

const router = Router();
router.use(authenticate);

// GET / - list properties with address join
router.get('/', async (req: Request, res: Response) => {
  try {
    const { limit, offset } = paginate(req);
    const { status, type } = req.query;

    let sql = `
      SELECT p.*, a.line1, a.line2, a.city, a.state, a.postal_code, a.country
      FROM properties p
      LEFT JOIN addresses a ON a.id = p.address_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      params.push(status);
      sql += ` AND p.occupancy_status = $${params.length}`;
    }
    if (type) {
      params.push(type);
      sql += ` AND p.property_type = $${params.length}`;
    }

    const countResult = await query(
      sql.replace(/SELECT .* FROM/, 'SELECT COUNT(*) FROM'),
      params
    );

    params.push(limit);
    sql += ` ORDER BY p.created_at DESC LIMIT $${params.length}`;
    params.push(offset);
    sql += ` OFFSET $${params.length}`;

    const result = await query(sql, params);

    res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].count, 10),
      limit,
      offset,
    });
  } catch (err) {
    console.error('List properties error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - get property by id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT p.*, a.line1, a.line2, a.city, a.state, a.postal_code, a.country
       FROM properties p
       LEFT JOIN addresses a ON a.id = p.address_id
       WHERE p.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get property error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create property with address
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      title, property_type, property_code, usage_type, occupancy_status,
      organization_id, purchase_date, acquisition_value, current_estimated_value,
      line1, line2, city, state, postal_code, country,
    } = req.body;

    if (!title || !property_type) {
      res.status(400).json({ error: 'title and property_type are required' });
      return;
    }

    // Create address first
    let addressId: string | null = null;
    if (line1) {
      const addrResult = await query(
        `INSERT INTO addresses (line1, line2, city, state, postal_code, country)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [line1, line2 || null, city || null, state || null, postal_code || null, country || 'India']
      );
      addressId = addrResult.rows[0].id;
    }

    const result = await query(
      `INSERT INTO properties (title, property_type, property_code, usage_type, occupancy_status, organization_id, address_id, purchase_date, acquisition_value, current_estimated_value)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [title, property_type, property_code, usage_type, occupancy_status || 'vacant', organization_id || null, addressId, purchase_date || null, acquisition_value || null, current_estimated_value || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create property error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update property
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { title, property_type, occupancy_status } = req.body;

    const result = await query(
      `UPDATE properties
       SET title = COALESCE($1, title),
           property_type = COALESCE($2, property_type),
           occupancy_status = COALESCE($3, occupancy_status),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [title, property_type, occupancy_status, req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update property error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete property
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      'DELETE FROM properties WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }

    res.json({ message: 'Property deleted successfully' });
  } catch (err) {
    console.error('Delete property error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id/owners - list owners for a property
router.get('/:id/owners', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT po.*, u.email, u.first_name, u.last_name
       FROM property_owners po
       JOIN app_users u ON u.id = po.user_id
       WHERE po.property_id = $1
       ORDER BY po.ownership_percentage DESC`,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('List property owners error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/owners - add owner to property
router.post('/:id/owners', async (req: Request, res: Response) => {
  try {
    const { user_id, ownership_percentage, ownership_type } = req.body;

    if (!user_id) {
      res.status(400).json({ error: 'user_id is required' });
      return;
    }

    const result = await query(
      `INSERT INTO property_owners (property_id, user_id, ownership_percentage, ownership_type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.params.id, user_id, ownership_percentage || 100, ownership_type || 'primary']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Add property owner error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
