const { getDB } = require('../db/database');

function today() {
  return new Date().toISOString().split('T')[0];
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function computeProjectStatus(deliverables) {
  const active = deliverables.filter(d => d.status !== 'CANCELLED');
  if (active.length === 0) return 'ON_TRACK';
  const allAFC = active.every(d => d.status === 'AFC');
  if (allAFC) return 'COMPLETED';
  const t = today();
  const hasLate = active.some(d => d.planned_end && d.planned_end < t && d.status !== 'AFC');
  if (hasLate) return 'LATE';
  const soonDate = addDays(t, 14);
  const hasAtRisk = active.some(d => d.planned_end && d.planned_end <= soonDate && d.status !== 'AFC');
  if (hasAtRisk) return 'AT_RISK';
  return 'ON_TRACK';
}

function computeHealthScore(deliverables) {
  const active = deliverables.filter(d => d.status !== 'CANCELLED');
  if (active.length === 0) return 100;
  const total = active.length;
  const afcCount = active.filter(d => d.status === 'AFC').length;
  const t = today();
  const lateCount = active.filter(d => d.planned_end && d.planned_end < t && d.status !== 'AFC').length;
  const base = (afcCount / total) * 70;
  const penalty = Math.min(30, lateCount * 5);
  return Math.round(Math.max(0, Math.min(100, base - penalty + 30)));
}

function refreshProjectStatuses() {
  const db = getDB();
  const projects = db.prepare('SELECT id FROM projects').all();
  for (const project of projects) {
    const deliverables = db.prepare('SELECT * FROM deliverables WHERE project_id = ?').all(project.id);
    const status = computeProjectStatus(deliverables);
    const health = computeHealthScore(deliverables);
    db.prepare('UPDATE projects SET overall_status = ?, health_score = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(status, health, project.id);
  }
}

function saveSnapshot() {
  const db = getDB();
  const t = today();
  const existing = db.prepare('SELECT id FROM snapshots WHERE snapshot_date = ?').get(t);
  if (existing) return;
  const total = db.prepare(`SELECT COUNT(*) as c FROM deliverables WHERE status != ?`).get('CANCELLED').c;
  const afc = db.prepare(`SELECT COUNT(*) as c FROM deliverables WHERE status = ?`).get('AFC').c;
  const ifr = db.prepare(`SELECT COUNT(*) as c FROM deliverables WHERE status = ?`).get('IFR').c;
  const late = db.prepare(`SELECT COUNT(*) as c FROM deliverables WHERE planned_end < ? AND status != 'AFC' AND status != 'CANCELLED'`).get(t).c;
  const health = total > 0 ? Math.round(Math.max(0, Math.min(100, ((afc/total)*70) - Math.min(30, late*5) + 30))) : 100;
  db.prepare('INSERT INTO snapshots (snapshot_date, total_count, afc_count, ifr_count, late_count, health_score) VALUES (?,?,?,?,?,?)')
    .run(t, total, afc, ifr, late, health);
}

module.exports = { computeProjectStatus, computeHealthScore, refreshProjectStatuses, saveSnapshot };
