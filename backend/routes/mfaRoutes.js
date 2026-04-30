'use strict';
const router = require('express').Router();
const crypto = require('crypto');
const db = require('../db');
const { authenticate, logAudit } = require('../auth');

// Simple TOTP implementation (no external dependency needed)
function generateSecret() {
  return crypto.randomBytes(20).toString('hex');
}

function generateTOTP(secret, timeStep = 30) {
  const time = Math.floor(Date.now() / 1000 / timeStep);
  const buffer = Buffer.alloc(8);
  buffer.writeUInt32BE(0, 0);
  buffer.writeUInt32BE(time, 4);
  const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'hex'));
  hmac.update(buffer);
  const hash = hmac.digest();
  const offset = hash[hash.length - 1] & 0xf;
  const code = ((hash[offset] & 0x7f) << 24 | (hash[offset + 1] & 0xff) << 16 | (hash[offset + 2] & 0xff) << 8 | (hash[offset + 3] & 0xff)) % 1000000;
  return code.toString().padStart(6, '0');
}

function verifyTOTP(secret, token, window = 1) {
  const timeStep = 30;
  for (let i = -window; i <= window; i++) {
    const time = Math.floor(Date.now() / 1000 / timeStep) + i;
    const buffer = Buffer.alloc(8);
    buffer.writeUInt32BE(0, 0);
    buffer.writeUInt32BE(time, 4);
    const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'hex'));
    hmac.update(buffer);
    const hash = hmac.digest();
    const offset = hash[hash.length - 1] & 0xf;
    const code = ((hash[offset] & 0x7f) << 24 | (hash[offset + 1] & 0xff) << 16 | (hash[offset + 2] & 0xff) << 8 | (hash[offset + 3] & 0xff)) % 1000000;
    if (code.toString().padStart(6, '0') === token) return true;
  }
  return false;
}

// POST /api/v1/auth/mfa/setup
router.post('/setup', authenticate, (req, res) => {
  const secret = generateSecret();
  const user = db.prepare('SELECT username FROM users WHERE id = ?').get(req.user.id);
  // Store secret temporarily (not enabled yet until confirmed)
  db.prepare("UPDATE users SET mfa_secret = ?, updated_at = datetime('now') WHERE id = ?").run(secret, req.user.id);
  
  // Generate otpauth URI for QR code
  const otpauthUrl = `otpauth://totp/Chengeto:${user.username}?secret=${secret}&issuer=Chengeto&algorithm=SHA1&digits=6&period=30`;
  
  logAudit(req.user.id, req.user.username, 'mfa_setup_initiated', 'auth', req.user.id, null, req.ip);
  res.json({ secret, otpauthUrl, message: 'Scan the QR code or enter the secret manually, then confirm with a TOTP code' });
});

// POST /api/v1/auth/mfa/confirm
router.post('/confirm', authenticate, (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'TOTP token required' });
  
  const user = db.prepare('SELECT mfa_secret FROM users WHERE id = ?').get(req.user.id);
  if (!user?.mfa_secret) return res.status(400).json({ error: 'MFA setup not initiated' });
  
  if (!verifyTOTP(user.mfa_secret, token)) {
    return res.status(400).json({ error: 'Invalid TOTP code' });
  }
  
  db.prepare("UPDATE users SET mfa_enabled = 1, updated_at = datetime('now') WHERE id = ?").run(req.user.id);
  logAudit(req.user.id, req.user.username, 'mfa_enabled', 'auth', req.user.id, null, req.ip);
  res.json({ success: true, message: 'MFA enabled successfully' });
});

// POST /api/v1/auth/mfa/disable
router.post('/disable', authenticate, (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Current TOTP token required to disable MFA' });
  
  const user = db.prepare('SELECT mfa_secret FROM users WHERE id = ?').get(req.user.id);
  if (!user?.mfa_secret) return res.status(400).json({ error: 'MFA not enabled' });
  
  if (!verifyTOTP(user.mfa_secret, token)) {
    return res.status(400).json({ error: 'Invalid TOTP code' });
  }
  
  db.prepare("UPDATE users SET mfa_enabled = 0, mfa_secret = NULL, updated_at = datetime('now') WHERE id = ?").run(req.user.id);
  logAudit(req.user.id, req.user.username, 'mfa_disabled', 'auth', req.user.id, null, req.ip);
  res.json({ success: true, message: 'MFA disabled' });
});

// GET /api/v1/auth/mfa/status
router.get('/status', authenticate, (req, res) => {
  const user = db.prepare('SELECT mfa_enabled FROM users WHERE id = ?').get(req.user.id);
  res.json({ mfaEnabled: !!user?.mfa_enabled });
});

module.exports = router;
