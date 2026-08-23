import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { userRepository, UserRecord } from '../repositories/userRepository.js';
import { auditLogRepository } from '../repositories/auditLogRepository.js';
import { User, UserRole } from '../../shared/types.js';

export class AuthService {
  async login(
    email: string,
    pass: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ user: User; accessToken: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const user = await userRepository.findByEmail(cleanEmail);

    // 1. Strict user lookup: NO auto-create accounts on login!
    if (!user) {
      await auditLogRepository.log({
        id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        action: 'LOGIN_FAILED',
        entity_type: 'USER',
        metadata: { email: cleanEmail, reason: 'USER_NOT_FOUND' },
        ip_address: ipAddress,
        user_agent: userAgent,
      });
      throw {
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Email atau kata sandi tidak valid.',
      };
    }

    // 2. Active status check
    if (!user.is_active) {
      await auditLogRepository.log({
        id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        user_id: user.id,
        action: 'LOGIN_FAILED',
        entity_type: 'USER',
        metadata: { email: cleanEmail, reason: 'USER_INACTIVE' },
        ip_address: ipAddress,
        user_agent: userAgent,
      });
      throw {
        statusCode: 403,
        code: 'ACCOUNT_DISABLED',
        message: 'Akun Anda dinonaktifkan. Hubungi Administrator.',
      };
    }

    // 3. Strict password hash verification: NO password bypasses!
    const isValidPassword = await bcrypt.compare(pass, user.password_hash);
    if (!isValidPassword) {
      await auditLogRepository.log({
        id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        user_id: user.id,
        action: 'LOGIN_FAILED',
        entity_type: 'USER',
        metadata: { email: cleanEmail, reason: 'WRONG_PASSWORD' },
        ip_address: ipAddress,
        user_agent: userAgent,
      });
      throw {
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Email atau kata sandi tidak valid.',
      };
    }

    // 4. Update last login timestamp
    await userRepository.updateLastLogin(user.id);

    // 5. Generate secure JWT token
    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      config.AUTH_SECRET,
      { expiresIn: config.ACCESS_TOKEN_EXPIRES_IN as any }
    );

    // 6. Audit log login success
    await auditLogRepository.log({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id: user.id,
      action: 'LOGIN_SUCCESS',
      entity_type: 'USER',
      entity_id: user.id,
      metadata: { role: user.role },
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    const { password_hash, ...safeUser } = user;
    return { user: safeUser as User, accessToken };
  }

  async createUser(data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    actorUserId?: string;
  }): Promise<User> {
    const cleanEmail = data.email.trim().toLowerCase();
    const existing = await userRepository.findByEmail(cleanEmail);
    if (existing) {
      throw {
        statusCode: 409,
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'Email sudah terdaftar dalam sistem.',
      };
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(data.password, salt);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const user = await userRepository.create({
      id: userId,
      name: data.name,
      email: cleanEmail,
      password_hash,
      role: data.role,
      is_active: true,
    });

    await auditLogRepository.log({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id: data.actorUserId,
      action: 'CREATE_USER',
      entity_type: 'USER',
      entity_id: user.id,
      metadata: { email: user.email, role: user.role },
    });

    return user;
  }
}

export const authService = new AuthService();
