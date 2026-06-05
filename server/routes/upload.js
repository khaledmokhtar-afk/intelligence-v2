const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { parseExcel } = require('../lib/excel-parser');
const { getDB } = require('../db/database');
const { refreshProjectStatuses, saveSnapshot } = require('../lib/status-engine');

const router = express.Router();
const upload = multer({ dest: path.join(__dirname, '../../data/uploads/') });

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const filePath = req.file.path;
  try {
    const { valid, quarantine, columnMap, unmappedFields } = parseExcel(filePath);
    const db = getDB();

    // Upsert projects
    const projectNames = [...new Set(valid.map(d => d.project_id))];
    const upsertProject = db.prepare(`
      INSERT INTO projects (id, name, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name, updated_at=CURRENT_TIMESTAMP
    `);
    for (const name of projectNames) {
      upsertProject.run(name, name);
    }

    // Upsert deliverables
    const upsertDeliverable = db.prepare(`
      INSERT INTO deliverables (id, project_id, discipline, title, phase, status, revision, planned_start, planned_end, actual_start, actual_end, ifr_date, afc_date, completion_pct, is_backlog, raw_row, updated_at)
      VALUES (@id, @project_id, @discipline, @title, @phase, @status, @revision, @planned_start, @planned_end, @actual_start, @actual_end, @ifr_date, @afc_date, @completion_pct, @is_backlog, @raw_row, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        project_id=excluded.project_id, discipline=excluded.discipline, title=excluded.title,
        phase=excluded.phase, status=excluded.status, revision=excluded.revision,
        planned_start=excluded.planned_start, planned_end=excluded.planned_end,
        actual_start=excluded.actual_start, actual_end=excluded.actual_end,
        ifr_date=excluded.ifr_date, afc_date=excluded.afc_date,
        completion_pct=excluded.completion_pct, raw_row=excluded.raw_row,
        updated_at=CURRENT_TIMESTAMP
    `);

    // Also handle responsibility matrix auto-owners from Excel 'owner' field
    const matrixPath = path.join(__dirname, '../../data/responsibility_matrix.json');
    const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));

    const insertMany = db.transaction((items) => {
      for (const item of items) {
        const { _owner, ...deliverable } = item;
        upsertDeliverable.run(deliverable);

        // Auto-add owner to matrix if found in Excel
        if (_owner) {
          let owner = matrix.owners.find(o => o.name === _owner);
          if (!owner) {
            owner = { id: `owner_${Date.now()}_${Math.random().toString(36).substr(2,5)}`, name: _owner, email: '', role: '', team: deliverable.discipline, assignments: [] };
            matrix.owners.push(owner);
          }
          const existing = owner.assignments.find(a => a.deliverable_id === deliverable.id);
          if (!existing) {
            owner.assignments.push({ deliverable_id: deliverable.id, role_on_deliverable: 'RESPONSIBLE', due_date_override: null, notes: '' });
          }
        }
      }
    });

    insertMany(valid);
    fs.writeFileSync(matrixPath, JSON.stringify(matrix, null, 2));

    refreshProjectStatuses();
    saveSnapshot();

    // Cleanup upload
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      imported: valid.length,
      quarantined: quarantine.length,
      quarantine,
      columnMap,
      unmappedFields
    });
  } catch (err) {
    console.error('Upload error:', err);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
