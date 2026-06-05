const express = require('express');
const { getDB } = require('../db/database');

const router = express.Router();

function getWeekBounds(dateStr) {
  const date = dateStr ? new Date(dateStr) : new Date();
  const day = date.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().split('T')[0],
    end: friday.toISOString().split('T')[0]
  };
}

router.get('/', (req, res) => {
  const db = getDB();
  const { date } = req.query;
  const { start, end } = getWeekBounds(date);
  const today = new Date().toISOString().split('T')[0];

  const dueThisWeek = db.prepare(`
    SELECT * FROM deliverables 
    WHERE planned_end >= ? AND planned_end <= ? AND status != 'AFC' AND status != 'CANCELLED'
    ORDER BY planned_end ASC
  `).all(start, end);

  const carryOver = db.prepare(`
    SELECT * FROM deliverables 
    WHERE planned_end < ? AND status != 'AFC' AND status != 'CANCELLED'
    ORDER BY planned_end ASC
    LIMIT 50
  `).all(start);

  // Add days late
  const withLate = carryOver.map(d => ({
    ...d,
    days_late: d.planned_end ? Math.floor((new Date(today) - new Date(d.planned_end)) / 86400000) : 0
  }));

  res.json({ weekStart: start, weekEnd: end, dueThisWeek, carryOver: withLate });
});

module.exports = router;
