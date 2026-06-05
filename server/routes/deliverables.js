const express = require('express');
const { getDB } = require('../db/database');

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDB();
  const { status, project, discipline, search, sort = 'planned_end', order = 'ASC', limit = 500, offset = 0 } = req.query;

  const allowed_sorts = ['id', 'title', 'project_id', 'discipline', 'status', 'planned_end', 'completion_pct', 'phase'];
  const sortCol = allowed_sorts.includes(sort) ? sort : 'planned_end';
  const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  let where = [];
  const params = [];
  if (status && status !== 'ALL') { where.push('status = ?'); params.push(status); }
  if (project) { where.push('project_id = ?'); params.push(project); }
  if (discipline) { where.push('discipline = ?'); params.push(discipline); }
  if (search) { where.push('(title LIKE ? OR id LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = db.prepare(`SELECT COUNT(*) as c FROM deliverables ${whereClause}`).get(...params).c;
  const rows = db.prepare(`SELECT * FROM deliverables ${whereClause} ORDER BY ${sortCol} ${sortOrder} LIMIT ? OFFSET ?`).all(...params, parseInt(limit), parseInt(offset));

  const disciplines = db.prepare(`SELECT DISTINCT discipline FROM deliverables WHERE discipline != '' ORDER BY discipline`).all().map(r => r.discipline);
  const projects = db.prepare(`SELECT DISTINCT project_id FROM deliverables ORDER BY project_id`).all().map(r => r.project_id);

  res.json({ rows, total, disciplines, projects });
});

module.exports = router;
