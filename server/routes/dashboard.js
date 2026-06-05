const express = require('express');
const { getDB } = require('../db/database');

const router = express.Router();

function today() { return new Date().toISOString().split('T')[0]; }
function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

router.get('/', (req, res) => {
  const db = getDB();
  const t = today();
  const soon = addDays(14);

  const total = db.prepare(`SELECT COUNT(*) as c FROM deliverables WHERE status != 'CANCELLED'`).get().c;
  const afc_count = db.prepare(`SELECT COUNT(*) as c FROM deliverables WHERE status = 'AFC'`).get().c;
  const ifr_count = db.prepare(`SELECT COUNT(*) as c FROM deliverables WHERE status = 'IFR'`).get().c;
  const not_started_count = db.prepare(`SELECT COUNT(*) as c FROM deliverables WHERE status = 'NOT_STARTED'`).get().c;
  const late_count = db.prepare(`SELECT COUNT(*) as c FROM deliverables WHERE planned_end < ? AND status != 'AFC' AND status != 'CANCELLED'`).get(t).c;
  const at_risk_count = db.prepare(`SELECT COUNT(*) as c FROM deliverables WHERE planned_end <= ? AND planned_end >= ? AND status != 'AFC' AND status != 'CANCELLED'`).get(soon, t).c;

  const afc_pct = total > 0 ? Math.round((afc_count / total) * 100) : 0;
  const health_score = total > 0 ? Math.round(Math.max(0, Math.min(100, (afc_count/total)*70 - Math.min(30, late_count*5) + 30))) : 100;

  const projects = db.prepare(`SELECT id, name, overall_status, health_score FROM projects ORDER BY health_score ASC`).all();

  // Per-project stats
  const projectsWithStats = projects.map(p => {
    const ptotal = db.prepare(`SELECT COUNT(*) as c FROM deliverables WHERE project_id = ? AND status != 'CANCELLED'`).get(p.id).c;
    const pafc = db.prepare(`SELECT COUNT(*) as c FROM deliverables WHERE project_id = ? AND status = 'AFC'`).get(p.id).c;
    const pifr = db.prepare(`SELECT COUNT(*) as c FROM deliverables WHERE project_id = ? AND status = 'IFR'`).get(p.id).c;
    const plate = db.prepare(`SELECT COUNT(*) as c FROM deliverables WHERE project_id = ? AND planned_end < ? AND status != 'AFC' AND status != 'CANCELLED'`).get(p.id, t).c;
    return { ...p, total: ptotal, afc: pafc, ifr: pifr, late: plate };
  });

  const snapshots = db.prepare(`SELECT snapshot_date, afc_count, total_count, health_score FROM snapshots ORDER BY snapshot_date ASC LIMIT 12`).all();

  const lastUpdated = db.prepare(`SELECT MAX(updated_at) as t FROM deliverables`).get().t;

  res.json({
    total, afc_count, ifr_count, not_started_count, late_count, at_risk_count, afc_pct, health_score,
    projects: projectsWithStats, snapshots, lastUpdated
  });
});

module.exports = router;
