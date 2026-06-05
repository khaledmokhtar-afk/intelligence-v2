const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '../../data');

function parseDate(val) {
  if (!val) return null;
  if (typeof val === 'number') {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(val);
    if (date) return `${date.y}-${String(date.m).padStart(2,'0')}-${String(date.d).padStart(2,'0')}`;
  }
  if (typeof val === 'string') {
    val = val.trim();
    if (!val) return null;
    // Try various formats
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    // DD/MM/YYYY
    const dmyMatch = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (dmyMatch) {
      const [, d, m, y] = dmyMatch;
      const fullY = y.length === 2 ? '20' + y : y;
      return `${fullY}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    }
  }
  return null;
}

function normalizeStatus(val) {
  if (!val) return 'NOT_STARTED';
  const s = String(val).trim().toUpperCase();
  if (s.includes('AFC') || s === 'APPROVED' || s === 'COMPLETE' || s === 'COMPLETED') return 'AFC';
  if (s.includes('IFR') || s === 'REVIEW' || s === 'IN REVIEW' || s === 'ISSUED') return 'IFR';
  if (s === 'CANCELLED' || s === 'CANCELED' || s === 'VOID') return 'CANCELLED';
  if (s === 'NOT STARTED' || s === 'PENDING' || s === '' || s === 'N/A') return 'NOT_STARTED';
  if (s.includes('PROGRESS') || s === 'WIP' || s === 'IN PROGRESS') return 'IFR';
  return 'NOT_STARTED';
}

function findColumn(headers, synonyms) {
  const lowerHeaders = headers.map(h => String(h || '').trim().toLowerCase());
  for (const syn of synonyms) {
    const idx = lowerHeaders.indexOf(syn.toLowerCase());
    if (idx !== -1) return headers[idx];
  }
  // Fuzzy: contains match
  for (const syn of synonyms) {
    const idx = lowerHeaders.findIndex(h => h.includes(syn.toLowerCase()) || syn.toLowerCase().includes(h));
    if (idx !== -1 && lowerHeaders[idx].length > 0) return headers[idx];
  }
  return null;
}

function computeCompletion(status) {
  switch (status) {
    case 'AFC': return 100;
    case 'IFR': return 75;
    case 'NOT_STARTED': return 0;
    case 'CANCELLED': return 0;
    default: return 0;
  }
}

function parseExcel(filePath) {
  const colConfig = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'column_config.json'), 'utf8'));

  const workbook = XLSX.readFile(filePath, { cellDates: false, raw: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (rows.length < 2) return { valid: [], quarantine: [], columnMap: {} };

  const headers = rows[0].map(h => String(h || '').trim());

  // Build column map
  const columnMap = {};
  for (const [field, synonyms] of Object.entries(colConfig)) {
    const matched = findColumn(headers, synonyms);
    if (matched) columnMap[field] = matched;
  }

  const valid = [];
  const quarantine = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.every(cell => !cell && cell !== 0)) continue; // skip empty rows

    const get = (field) => {
      const col = columnMap[field];
      if (!col) return '';
      const idx = headers.indexOf(col);
      return idx !== -1 ? row[idx] : '';
    };

    const rawObj = {};
    headers.forEach((h, idx) => { rawObj[h] = row[idx]; });

    const docNum = String(get('doc_number') || '').trim();
    const title = String(get('title') || '').trim();

    if (!docNum && !title) {
      quarantine.push({ row: i + 1, reason: 'Missing doc number and title', raw: rawObj });
      continue;
    }

    const id = docNum || `ROW-${i}`;
    const status = normalizeStatus(get('status'));
    const completionFromExcel = get('completion_pct');
    let completion = completionFromExcel ? parseInt(String(completionFromExcel).replace('%','')) : null;
    if (isNaN(completion) || completion === null) completion = computeCompletion(status);

    valid.push({
      id,
      project_id: String(get('project') || 'DEFAULT').trim() || 'DEFAULT',
      discipline: String(get('discipline') || '').trim(),
      title: title || id,
      phase: String(get('phase') || '').trim(),
      status,
      revision: String(get('revision') || '').trim(),
      planned_start: parseDate(get('planned_start')),
      planned_end: parseDate(get('planned_end')),
      actual_start: parseDate(get('actual_start')),
      actual_end: parseDate(get('actual_end')),
      ifr_date: parseDate(get('ifr_date')),
      afc_date: parseDate(get('afc_date')),
      completion_pct: Math.min(100, Math.max(0, completion || 0)),
      is_backlog: 0,
      raw_row: JSON.stringify(rawObj),
      _owner: String(get('owner') || '').trim()
    });
  }

  return { valid, quarantine, columnMap, unmappedFields: Object.keys(colConfig).filter(f => !columnMap[f]) };
}

module.exports = { parseExcel };
