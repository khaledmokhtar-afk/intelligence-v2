const express = require('express');
const fs = require('fs');
const path = require('path');
const { getDB } = require('../db/database');

const router = express.Router();
const MATRIX_PATH = path.join(__dirname, '../../data/responsibility_matrix.json');

router.get('/', (req, res) => {
  const db = getDB();
  const matrix = JSON.parse(fs.readFileSync(MATRIX_PATH, 'utf8'));
  const today = new Date().toISOString().split('T')[0];
  const soon = new Date();
  soon.setDate(soon.getDate() + 14);
  const soonStr = soon.toISOString().split('T')[0];

  // Enrich each owner with their deliverable details
  const enriched = matrix.owners.map(owner => {
    const enrichedAssignments = owner.assignments.map(a => {
      const del = db.prepare('SELECT * FROM deliverables WHERE id = ?').get(a.deliverable_id);
      if (!del) return { ...a, deliverable: null };
      const dueDate = a.due_date_override || del.planned_end;
      return {
        ...a,
        deliverable: del,
        effective_due: dueDate,
        is_overdue: dueDate && dueDate < today && del.status !== 'AFC',
        is_due_soon: dueDate && dueDate <= soonStr && dueDate >= today && del.status !== 'AFC'
      };
    }).filter(a => a.deliverable);

    const overdue = enrichedAssignments.filter(a => a.is_overdue).length;
    const dueSoon = enrichedAssignments.filter(a => a.is_due_soon).length;
    const active = enrichedAssignments.filter(a => a.deliverable && a.deliverable.status !== 'AFC' && a.deliverable.status !== 'CANCELLED').length;

    return { ...owner, assignments: enrichedAssignments, stats: { total: enrichedAssignments.length, active, overdue, due_soon: dueSoon } };
  });

  res.json({ owners: enriched, version: matrix.version });
});

router.put('/', (req, res) => {
  const { owners } = req.body;
  const matrix = { version: new Date().toISOString().split('T')[0], owners };
  fs.writeFileSync(MATRIX_PATH, JSON.stringify(matrix, null, 2));
  res.json({ success: true });
});

module.exports = router;
