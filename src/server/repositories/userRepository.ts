import { query, isDbPostgres, memoryStore } from '../config/database.js';
import { User, UserRole } from '../../shared/types.js';

export interface UserRecord extends User {
  password_hash: string;
}

export class UserRepository {
  async findByEmail(email: string): Promise<UserRecord | null> {
    if (isDbPostgres()) {
      const res = await query<UserRecord>('SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
      return res.rows[0] || null;
    }
    return memoryStore.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  async findById(id: string): Promise<User | null> {
    if (isDbPostgres()) {
      const res = await query<UserRecord>('SELECT id, name, email, role, is_active, last_login_at, created_at, updated_at FROM users WHERE id = $1', [id]);
      return res.rows[0] || null;
    }
    const user = memoryStore.users.find((u) => u.id === id);
    if (!user) return null;
    const { password_hash, ...safeUser } = user;
    return safeUser as User;
  }

  async create(user: { id: string; name: string; email: string; password_hash: string; role: UserRole; is_active?: boolean }): Promise<User> {
    const now = new Date().toISOString();
    const isActive = user.is_active !== undefined ? user.is_active : true;

    if (isDbPostgres()) {
      const res = await query<UserRecord>(
        `INSERT INTO users (id, name, email, password_hash, role, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING id, name, email, role, is_active, last_login_at, created_at, updated_at`,
        [user.id, user.name, user.email, user.password_hash, user.role, isActive]
      );
      return res.rows[0];
    }

    const fullRecord: UserRecord = {
      id: user.id,
      name: user.name,
      email: user.email,
      password_hash: user.password_hash,
      role: user.role,
      is_active: isActive,
      last_login_at: null,
      created_at: now,
      updated_at: now,
    };
    memoryStore.users.push(fullRecord);
    const { password_hash, ...safeUser } = fullRecord;
    return safeUser as User;
  }

  async updateLastLogin(id: string): Promise<void> {
    const now = new Date().toISOString();
    if (isDbPostgres()) {
      await query('UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1', [id]);
      return;
    }
    const user = memoryStore.users.find((u) => u.id === id);
    if (user) {
      user.last_login_at = now;
      user.updated_at = now;
    }
  }

  async listAll(): Promise<User[]> {
    if (isDbPostgres()) {
      const res = await query<User>('SELECT id, name, email, role, is_active, last_login_at, created_at, updated_at FROM users ORDER BY created_at ASC');
      return res.rows;
    }
    return memoryStore.users.map(({ password_hash, ...u }) => u as User);
  }

  async update(id: string, updates: Partial<{ name: string; role: UserRole; is_active: boolean; password_hash?: string }>): Promise<User | null> {
    const now = new Date().toISOString();
    if (isDbPostgres()) {
      const sets: string[] = ['updated_at = NOW()'];
      const vals: any[] = [id];
      let idx = 2;

      if (updates.name !== undefined) {
        sets.push(`name = $${idx++}`);
        vals.push(updates.name);
      }
      if (updates.role !== undefined) {
        sets.push(`role = $${idx++}`);
        vals.push(updates.role);
      }
      if (updates.is_active !== undefined) {
        sets.push(`is_active = $${idx++}`);
        vals.push(updates.is_active);
      }
      if (updates.password_hash !== undefined) {
        sets.push(`password_hash = $${idx++}`);
        vals.push(updates.password_hash);
      }

      const res = await query<User>(
        `UPDATE users SET ${sets.join(', ')} WHERE id = $1 RETURNING id, name, email, role, is_active, last_login_at, created_at, updated_at`,
        vals
      );
      return res.rows[0] || null;
    }

    const user = memoryStore.users.find((u) => u.id === id);
    if (!user) return null;
    if (updates.name !== undefined) user.name = updates.name;
    if (updates.role !== undefined) user.role = updates.role;
    if (updates.is_active !== undefined) user.is_active = updates.is_active;
    if (updates.password_hash !== undefined) user.password_hash = updates.password_hash;
    user.updated_at = now;

    const { password_hash, ...safe } = user;
    return safe as User;
  }

  async delete(id: string): Promise<boolean> {
    if (isDbPostgres()) {
      const res = await query('DELETE FROM users WHERE id = $1', [id]);
      return (res.rowCount || 0) > 0;
    }
    const idx = memoryStore.users.findIndex((u) => u.id === id);
    if (idx >= 0) {
      memoryStore.users.splice(idx, 1);
      return true;
    }
    return false;
  }
}

export const userRepository = new UserRepository();
