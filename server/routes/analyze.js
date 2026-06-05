const express = require('express');
const { getDB } = require('../db/database');
const { analyzePortfolio, analyzeRisks } = require('../lib/claude-client');

const router = express.Router();

router.post('/portfolio', async (req, res) => {
  const db = getDB();
  const today = new Date().toISOString().split('T')[0];
  const soon = new Date(); soon.setDate(soon.getDate()+14);
  const soonStr = soon.toISOString().split('T')[0];

  const total = db.prepare(`SELECT COUNT(*) as c FROM deliverables WHERE status != 'CANCELLED'`).get().c;
  const afc_count = db.prepare(`SELECT COUNT(*) as c FROM deliverables WHERE status = 'AFC'`).get().c;
  const ifr_count = db.prepare(`SELECT COUNT(*) as c FROM deliverables WHERE status = 'IFR'`).get().c;
  const not_started_count = db.prepare(`SELECT COUNT(*) as c FROM deliverables WHERE status = 'NOT_STARTED'`).get().c;
  const late_count = db.prepare(`SELECT COUNT(*) as c FROM deliverables WHERE planned_end < ? AND status != 'AFC' AND status != 'CANCELLED'`).get(today).c;
  const at_risk_count = db.prepare(`SELECT COUNT(*) as c FROM deliverables WHERE planned_end <= ? AND planned_end >= ? AND status != 'AFC' AND status != 'CANCELLED'`).get(soonStr, today).c;
  const afc_pct = total > 0 ? Math.round((afc_count/total)*100) : 0;
  const health_score = total > 0 ? Math.round(Math.max(0,Math.min(100,(afc_count/total)*70-Math.min(30,late_count*5)+30))) : 100;
  const projects = db.prepare(`SELECT id, name, overall_status, health_score FROM projects LIMIT 10`).all();

  try {
    const result = await analyzePortfolio({ total, afc_count, ifr_count, not_started_count, late_count, at_risk_count, afc_pct, health_score, projects }, req.body?.force);
    res.json({ result });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/risks', async (req, res) => {
  const db = getDB();
  const today = new Date().toISOString().split('T')[0];
  const soon = new Date(); soon.setDate(soon.getDate()+14);
  const soonStr = soon.toISOString().split('T')[0];

  const lateItems = db.prepare(`SELECT * FROM deliverables WHERE planned_end < ? AND status != 'AFC' AND status != 'CANCELLED' ORDER BY planned_end ASC LIMIT 30`).all(today);
  const atRiskItems = db.prepare(`SELECT * FROM deliverables WHERE planned_end <= ? AND planned_end >= ? AND status != 'AFC' AND status != 'CANCELLED'`).all(soonStr, today);

  try {
    const result = await analyzeRisks(lateItems, atRiskItems, req.body?.force);
    res.json({ result });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
