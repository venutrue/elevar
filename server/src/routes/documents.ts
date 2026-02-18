import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { authenticate } from '../middleware/auth';
import { paginate } from '../utils/helpers';

const router = Router();
router.use(authenticate);

// GET / - list documents
router.get('/', async (req: Request, res: Response) => {
  try {
    const { limit, offset } = paginate(req);
    const { property_id, document_type } = req.query;

    let sql = `
      SELECT d.*, p.name AS property_name,
             u.first_name AS uploader_first_name, u.last_name AS uploader_last_name
      FROM documents d
      LEFT JOIN properties p ON p.id = d.property_id
      LEFT JOIN app_users u ON u.id = d.uploaded_by
      WHERE 1=1
    `;
    const params: any[] = [];

    if (property_id) {
      params.push(property_id);
      sql += ` AND d.property_id = $${params.length}`;
    }
    if (document_type) {
      params.push(document_type);
      sql += ` AND d.document_type = $${params.length}`;
    }

    const countResult = await query(
      sql.replace(/SELECT .* FROM/s, 'SELECT COUNT(*) FROM'),
      params
    );

    params.push(limit);
    sql += ` ORDER BY d.created_at DESC LIMIT $${params.length}`;
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
    console.error('List documents error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - get document by id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT d.*, p.name AS property_name,
              u.first_name AS uploader_first_name, u.last_name AS uploader_last_name
       FROM documents d
       LEFT JOIN properties p ON p.id = d.property_id
       LEFT JOIN app_users u ON u.id = d.uploaded_by
       WHERE d.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get document error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create document record
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      property_id, document_type, title, description,
      file_url, file_name, file_size, mime_type, expiry_date,
    } = req.body;

    if (!title || !file_url) {
      res.status(400).json({ error: 'title and file_url are required' });
      return;
    }

    const result = await query(
      `INSERT INTO documents (property_id, document_type, title, description, file_url, file_name, file_size, mime_type, expiry_date, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        property_id || null, document_type || 'general', title, description || null,
        file_url, file_name || null, file_size || null, mime_type || null,
        expiry_date || null, req.user!.id,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create document error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update document
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const {
      document_type, title, description, file_url,
      file_name, file_size, mime_type, expiry_date,
    } = req.body;

    const result = await query(
      `UPDATE documents
       SET document_type = COALESCE($1, document_type),
           title = COALESCE($2, title),
           description = COALESCE($3, description),
           file_url = COALESCE($4, file_url),
           file_name = COALESCE($5, file_name),
           file_size = COALESCE($6, file_size),
           mime_type = COALESCE($7, mime_type),
           expiry_date = COALESCE($8, expiry_date),
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [document_type, title, description, file_url, file_name, file_size, mime_type, expiry_date, req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update document error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete document
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      'DELETE FROM documents WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    console.error('Delete document error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
