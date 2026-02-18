import { Request } from 'express';

export function paginate(req: Request): { limit: number; offset: number } {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  return { limit, offset: (page - 1) * limit };
}

export function auditLog(pool: any, userId: string | undefined, action: string, entityType: string, entityId: string, metadata: object = {}, req?: Request) {
  return pool.query(
    `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, metadata, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [userId, action, entityType, entityId, JSON.stringify(metadata), req?.ip, req?.headers['user-agent']]
  );
}
