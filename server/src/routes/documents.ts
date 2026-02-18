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
      SELECT d.*, p.title AS property_title,
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
      `SELECT d.*, p.title AS property_title,
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
      property_id, owner_id, document_type, title,
      storage_key, mime_type, file_size_bytes,
      checksum_sha256, is_sensitive, expires_on,
    } = req.body;

    if (!title || !storage_key) {
      res.status(400).json({ error: 'title and storage_key are required' });
      return;
    }

    const result = await query(
      `INSERT INTO documents (property_id, owner_id, uploaded_by, document_type, title, storage_key, mime_type, file_size_bytes, checksum_sha256, is_sensitive, expires_on)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        property_id || null, owner_id || null, req.user!.id,
        document_type || 'other', title, storage_key,
        mime_type || null, file_size_bytes || null,
        checksum_sha256 || null, is_sensitive || false, expires_on || null,
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
      document_type, title, storage_key,
      mime_type, file_size_bytes, checksum_sha256,
      is_sensitive, expires_on, owner_id,
    } = req.body;

    const result = await query(
      `UPDATE documents
       SET document_type = COALESCE($1, document_type),
           title = COALESCE($2, title),
           storage_key = COALESCE($3, storage_key),
           mime_type = COALESCE($4, mime_type),
           file_size_bytes = COALESCE($5, file_size_bytes),
           checksum_sha256 = COALESCE($6, checksum_sha256),
           is_sensitive = COALESCE($7, is_sensitive),
           expires_on = COALESCE($8, expires_on),
           owner_id = COALESCE($9, owner_id),
           updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [document_type, title, storage_key, mime_type, file_size_bytes, checksum_sha256, is_sensitive, expires_on, owner_id, req.params.id]
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
