const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db/database');

const uploadRoute = require('./routes/upload');
const dashboardRoute = require('./routes/dashboard');
const weeklyRoute = require('./routes/weekly');
const issuesRoute = require('./routes/issues');
const deliverablesRoute = require('./routes/deliverables');
const matrixRoute = require('./routes/matrix');
const analyzeRoute = require('./routes/analyze');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/upload', uploadRoute);
app.use('/api/dashboard', dashboardRoute);
app.use('/api/weekly', weeklyRoute);
app.use('/api/issues', issuesRoute);
app.use('/api/deliverables', deliverablesRoute);
app.use('/api/matrix', matrixRoute);
app.use('/api/analyze', analyzeRoute);

// Serve built frontend
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

initDB();

app.listen(PORT, () => {
  console.log(`MDR Intelligence server running on http://localhost:${PORT}`);
});
