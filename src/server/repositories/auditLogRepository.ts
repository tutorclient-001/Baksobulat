import { query, isDbPostgres, memoryStore } from '../config/database.js';
import { AuditLog } from '../../shared/types.js';

export class AuditLogRepository {
  async log(entry: {
    id: string;
    user_id?: string | null;
    action: string;
    entity_type: string;
    entity_id?: string | null;
    metadata?: Record<string, any>;
    ip_address?: string;
    user_agent?: string;
  }): Promise<void> {
    const now = new Date().toISOString();
    const metaJson = entry.metadata ? JSON.stringify(entry.metadata) : null;

    if (isDbPostgres()) {
      try {
        await query(
          `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, metadata, ip_address, user_agent, created_at)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, NOW())`,
          [
            entry.id,
            entry.user_id || null,
            entry.action,
            entry.entity_type,
            entry.entity_id || null,
            metaJson,
            entry.ip_address || null,
            entry.user_agent || null,
          ]
        );
        return;
      } catch (err: any) {
        // Safe fallback to memory store if table is still migrating
      }
    }

    const logEntry: AuditLog = {
      id: entry.id,
      user_id: entry.user_id || null,
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id || undefined,
      metadata: entry.metadata,
      ip_address: entry.ip_address,
      user_agent: entry.user_agent,
      created_at: now,
    };
    memoryStore.auditLogs.unshift(logEntry);
    if (memoryStore.auditLogs.length > 500) {
      memoryStore.auditLogs.pop();
    }
  }

  async listRecent(limit = 50): Promise<AuditLog[]> {
    if (isDbPostgres()) {
      try {
        const sql = `
          SELECT a.*, u.name as user_name, u.email as user_email
          FROM audit_logs a
          LEFT JOIN users u ON a.user_id = u.id
          ORDER BY a.created_at DESC
          LIMIT $1
        `;
        const res = await query(sql, [limit]);
        return res.rows.map((row) => ({
          id: row.id,
          user_id: row.user_id,
          user_name: row.user_name,
          user_email: row.user_email,
          action: row.action,
          entity_type: row.entity_type,
          entity_id: row.entity_id,
          metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
          ip_address: row.ip_address,
          user_agent: row.user_agent,
          created_at: row.created_at,
        }));
      } catch (err) {
        // Fallback to memory
      }
    }

    return memoryStore.auditLogs.slice(0, limit).map((log) => {
      const user = memoryStore.users.find((u) => u.id === log.user_id);
      return {
        ...log,
        user_name: user?.name,
        user_email: user?.email,
      };
    });
  }

  async listForEntity(entityType: string, entityId: string, limit = 20): Promise<AuditLog[]> {
    if (isDbPostgres()) {
      try {
        const sql = `
          SELECT a.*, u.name as user_name, u.email as user_email
          FROM audit_logs a
          LEFT JOIN users u ON a.user_id = u.id
          WHERE a.entity_type = $1 AND a.entity_id = $2
          ORDER BY a.created_at DESC
          LIMIT $3
        `;
        const res = await query(sql, [entityType, entityId, limit]);
        return res.rows.map((row) => ({
          id: row.id,
          user_id: row.user_id,
          user_name: row.user_name,
          user_email: row.user_email,
          action: row.action,
          entity_type: row.entity_type,
          entity_id: row.entity_id,
          metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
          ip_address: row.ip_address,
          user_agent: row.user_agent,
          created_at: row.created_at,
        }));
      } catch (err) {
        // Fallback to memory
      }
    }

    return memoryStore.auditLogs
      .filter((log) => log.entity_type === entityType && log.entity_id === entityId)
      .slice(0, limit);
  }
}

export const auditLogRepository = new AuditLogRepository();
