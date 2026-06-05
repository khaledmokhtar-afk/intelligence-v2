const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'mdr.db');

let db;

function getDB() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initDB() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const database = getDB();

  database.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      client TEXT,
      location TEXT,
      overall_status TEXT DEFAULT 'ON_TRACK',
      health_score INTEGER DEFAULT 100,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS deliverables (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      discipline TEXT,
      title TEXT NOT NULL,
      description TEXT,
      phase TEXT,
      status TEXT NOT NULL DEFAULT 'NOT_STARTED',
      revision TEXT,
      planned_start DATE,
      planned_end DATE,
      actual_start DATE,
      actual_end DATE,
      ifr_date DATE,
      afc_date DATE,
      completion_pct INTEGER DEFAULT 0,
      is_backlog INTEGER DEFAULT 0,
      imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      raw_row TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_date DATE,
      total_count INTEGER,
      afc_count INTEGER,
      ifr_count INTEGER,
      late_count INTEGER,
      health_score INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ai_analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      analysis_type TEXT,
      context_hash TEXT,
      result_text TEXT,
      model_used TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed responsibility matrix if not exists
  const matrixPath = path.join(DATA_DIR, 'responsibility_matrix.json');
  if (!fs.existsSync(matrixPath)) {
    fs.writeFileSync(matrixPath, JSON.stringify({ version: new Date().toISOString().split('T')[0], owners: [] }, null, 2));
  }

  // Seed column config if not exists
  const colConfigPath = path.join(DATA_DIR, 'column_config.json');
  if (!fs.existsSync(colConfigPath)) {
    const defaultConfig = {
      doc_number: ['Doc No', 'Document Number', 'Doc #', 'ID', 'Document No', 'DocNo', 'Doc Number'],
      title: ['Document Title', 'Title', 'Description', 'Doc Title', 'Name'],
      discipline: ['Discipline', 'Disc', 'Department'],
      project: ['Project', 'Project Name', 'Project Title'],
      phase: ['Phase', 'Stage', 'Document Phase'],
      status: ['Status', 'Doc Status', 'Current Status', 'Document Status'],
      planned_start: ['Planned Start', 'Start Date', 'Plan Start', 'Scheduled Start'],
      planned_end: ['Planned End', 'End Date', 'Target Date', 'Due Date', 'Plan End', 'Planned Finish'],
      actual_start: ['Actual Start', 'Act Start'],
      actual_end: ['Actual End', 'Actual Finish', 'Completion Date'],
      ifr_date: ['IFR Date', 'Issued For Review', 'IFR', 'IFR Submission'],
      afc_date: ['AFC Date', 'Approved For Construction', 'AFC', 'AFC Approval'],
      revision: ['Revision', 'Rev', 'Rev No'],
      owner: ['Owner', 'Responsible', 'Assigned To', 'Engineer', 'Lead'],
      completion_pct: ['% Complete', 'Completion %', 'Progress', '% Done', 'Percent Complete']
    };
    fs.writeFileSync(colConfigPath, JSON.stringify(defaultConfig, null, 2));
  }

  console.log('Database initialized at', DB_PATH);
}

module.exports = { getDB, initDB };
