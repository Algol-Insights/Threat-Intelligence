'use strict';
const router = require('express').Router();
const { generateToken, authenticateUser, createUser, authenticate, requireRole, getAllUsers, updateUserRole, deleteUser, logAudit } = require('../auth');

// POST /api/v1/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const user = authenticateUser(username, password);
  if (!user) {
    logAudit(null, username, 'login_failed', 'auth', null, 'Invalid credentials', req.ip);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = generateToken(user);
  logAudit(user.id, user.username, 'login_success', 'auth', user.id, null, req.ip);

  res.json({ token, user: { id: user.id, username: user.username, role: user.role, displayName: user.displayName } });
});

// GET /api/v1/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// POST /api/v1/auth/register (admin only)
router.post('/register', authenticate, requireRole('admin'), (req, res) => {
  const { username, password, role, displayName } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (role && !['admin', 'analyst', 'viewer'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

  try {
    const user = createUser(username, password, role || 'viewer', displayName);
    logAudit(req.user.id, req.user.username, 'user_created', 'user', user.id, { username, role: role || 'viewer' }, req.ip);
    res.status(201).json({ user });
  } catch (err) {
    if (err.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Username already exists' });
    throw err;
  }
});

// GET /api/v1/auth/users (admin only)
router.get('/users', authenticate, requireRole('admin'), (req, res) => {
  res.json({ users: getAllUsers() });
});

// PATCH /api/v1/auth/users/:id/role (admin only)
router.patch('/users/:id/role', authenticate, requireRole('admin'), (req, res) => {
  const { role } = req.body;
  if (!['admin', 'analyst', 'viewer'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  updateUserRole(req.params.id, role);
  logAudit(req.user.id, req.user.username, 'role_changed', 'user', req.params.id, { newRole: role }, req.ip);
  res.json({ success: true });
});

// DELETE /api/v1/auth/users/:id (admin only)
router.delete('/users/:id', authenticate, requireRole('admin'), (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
  deleteUser(req.params.id);
  logAudit(req.user.id, req.user.username, 'user_deleted', 'user', req.params.id, null, req.ip);
  res.json({ success: true });
});

module.exports = router;
