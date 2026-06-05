const express = require('express');
const { getDB } = require('../db/database');
const { analyzeRisks } = require('../lib/claude-client');

const router = express.Router();

function today() { return new Date().toISOString().split('T')[0]; }
function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

router.get('/', async (req, res) => {
  const db = getDB();
  const t = today();
  const soon = addDays(14);
  const { ai, project } = req.query;

  let lateQuery = `SELECT * FROM deliverables WHERE planned_end < ? AND status != 'AFC' AND status != 'CANCELLED'`;
  let atRiskQuery = `SELECT * FROM deliverables WHERE planned_end <= ? AND planned_end >= ? AND status != 'AFC' AND status != 'CANCELLED'`;
  let stuckQuery = `SELECT * FROM deliverables WHERE status = 'IFR' AND ifr_date IS NOT NULL AND julianday('now') - julianday(ifr_date) > 21`;
  
  const lateParams = [t];
  const atRiskParams = [soon, t];
  
  if (project) {
    lateQuery += ` AND project_id = ?`;
    atRiskQuery += ` AND project_id = ?`;
    stuckQuery += ` AND project_id = ?`;
    lateParams.push(project);
    atRiskParams.push(project);
  }
  
  lateQuery += ` ORDER BY planned_end ASC`;
  atRiskQuery += ` ORDER BY planned_end ASC`;

  const lateItems = db.prepare(lateQuery).all(...lateParams).map(d => ({
    ...d,
    days_late: d.planned_end ? Math.floor((new Date(t) - new Date(d.planned_end)) / 86400000) : 0
  }));
  const atRiskItems = db.prepare(atRiskQuery).all(...atRiskParams).map(d => ({
    ...d,
    days_until_due: d.planned_end ? Math.floor((new Date(d.planned_end) - new Date(t)) / 86400000) : 0
  }));
  const stuckItems = db.prepare(stuckQuery + (project ? ` AND project_id = ?` : '')).all(...(project ? [project] : []));

  let aiAnalysis = null;
  if (ai === 'true') {
    try { aiAnalysis = await analyzeRisks(lateItems, atRiskItems, req.query.force === 'true'); }
    catch(e) { aiAnalysis = 'AI analysis temporarily unavailable.'; }
  }

  res.json({ lateItems, atRiskItems, stuckItems, aiAnalysis });
});

module.exports = router;
