const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const CONFIG_PATH = path.join(__dirname, '../../data/app_config.json');

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return {};
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch { return {}; }
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

// GET /api/settings — return config with key masked
router.get('/', (req, res) => {
  const cfg = loadConfig();
  res.json({
    hasApiKey: !!(cfg.anthropicApiKey || process.env.ANTHROPIC_API_KEY),
    apiKeyPreview: cfg.anthropicApiKey ? `sk-ant-...${cfg.anthropicApiKey.slice(-4)}` : (process.env.ANTHROPIC_API_KEY ? `env (${process.env.ANTHROPIC_API_KEY.slice(-4)})` : null),
    apiKeySource: cfg.anthropicApiKey ? 'app' : (process.env.ANTHROPIC_API_KEY ? 'env' : null),
  });
});

// POST /api/settings — save API key
router.post('/', (req, res) => {
  const { anthropicApiKey } = req.body;
  if (!anthropicApiKey || typeof anthropicApiKey !== 'string') {
    return res.status(400).json({ error: 'anthropicApiKey is required' });
  }
  if (!anthropicApiKey.startsWith('sk-ant-')) {
    return res.status(400).json({ error: 'Invalid API key format — must start with sk-ant-' });
  }
  const cfg = loadConfig();
  cfg.anthropicApiKey = anthropicApiKey.trim();
  saveConfig(cfg);
  res.json({ success: true });
});

// DELETE /api/settings/apikey — clear saved key
router.delete('/apikey', (req, res) => {
  const cfg = loadConfig();
  delete cfg.anthropicApiKey;
  saveConfig(cfg);
  res.json({ success: true });
});

function getApiKey() {
  const cfg = loadConfig();
  return cfg.anthropicApiKey || process.env.ANTHROPIC_API_KEY || null;
}

module.exports = { router, loadConfig, getApiKey };
