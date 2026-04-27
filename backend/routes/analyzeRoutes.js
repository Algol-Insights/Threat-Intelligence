'use strict';
const router = require('express').Router();
const { analyzeThreat, getRemediation } = require('../aiService');
const { logAudit } = require('../auth');

// POST /api/v1/analyze/threat
router.post('/threat', async (req, res) => {
  const { log, context } = req.body;
  if (!log) return res.status(400).json({ error: 'Log object required' });

  try {
    const startTime = Date.now();
    const analysis = await analyzeThreat(log, context);
    const duration = Date.now() - startTime;

    logAudit(req.user.id, req.user.username, 'threat_analyzed', 'log', log.id,
      { severity: analysis.severity, model: analysis._model, durationMs: duration }, req.ip);

    res.json({ analysis, meta: { model: analysis._model, durationMs: duration } });
  } catch (err) {
    console.error('[ANALYZE] Error:', err.message);
    res.status(500).json({ error: 'Analysis failed', details: err.message });
  }
});

// POST /api/v1/analyze/remediation
router.post('/remediation', async (req, res) => {
  const { service } = req.body;
  if (!service) return res.status(400).json({ error: 'Service object required' });

  try {
    const result = await getRemediation(service);
    res.json({ remediation: result.content, meta: { model: result._model } });
  } catch (err) {
    res.status(500).json({ error: 'Remediation generation failed' });
  }
});

module.exports = router;
