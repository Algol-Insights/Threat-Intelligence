'use strict';

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'chengeto-dev-secret-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '8h';

// ── Token management ─────────────────────────────────────────────────────────

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, displayName: user.display_name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// ── Express middleware ────────────────────────────────────────────────────────

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const decoded = verifyToken(header.slice(7));
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Requires role: ${roles.join(' or ')}` });
    }
    next();
  };
}

// ── User operations ──────────────────────────────────────────────────────────

function createUser(username, password, role = 'viewer', displayName = null) {
  const id = uuidv4();
  const hash = bcrypt.hashSync(password, 12);
  db.prepare(`
    INSERT INTO users (id, username, password_hash, role, display_name) VALUES (?, ?, ?, ?, ?)
  `).run(id, username, hash, role, displayName || username);
  return { id, username, role, displayName: displayName || username };
}

function authenticateUser(username, password) {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return null;
  if (!bcrypt.compareSync(password, user.password_hash)) return null;
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    displayName: user.display_name,
    mfaEnabled: !!user.mfa_enabled,
  };
}

function getAllUsers() {
  return db.prepare(`
    SELECT id, username, role, display_name, mfa_enabled, created_at, updated_at
    FROM users ORDER BY created_at ASC
  `).all();
}

function updateUserRole(userId, newRole) {
  db.prepare(`UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?`).run(newRole, userId);
}

function deleteUser(userId) {
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
}

// ── Audit logging ────────────────────────────────────────────────────────────

function logAudit(actorId, actorUsername, action, targetType, targetId, details, ipAddress) {
  db.prepare(`
    INSERT INTO audit_log (id, actor_id, actor_username, action, target_type, target_id, details, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), actorId, actorUsername, action, targetType, targetId, 
    typeof details === 'object' ? JSON.stringify(details) : details, ipAddress);
}

function getAuditLog(limit = 100, offset = 0, filters = {}) {
  let query = 'SELECT * FROM audit_log WHERE 1=1';
  const params = [];

  if (filters.action) { query += ' AND action = ?'; params.push(filters.action); }
  if (filters.actor) { query += ' AND actor_username = ?'; params.push(filters.actor); }
  if (filters.since) { query += ' AND created_at >= ?'; params.push(filters.since); }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return db.prepare(query).all(...params);
}

module.exports = {
  generateToken, verifyToken, authenticate, requireRole,
  createUser, authenticateUser, getAllUsers, updateUserRole, deleteUser,
  logAudit, getAuditLog,
};
