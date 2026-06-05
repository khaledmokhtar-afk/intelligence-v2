const Anthropic = require('@anthropic-ai/sdk');
const crypto = require('crypto');
const { getDB } = require('../db/database');
const { loadConfig } = require('../routes/settings');

function getApiKey() {
  const cfg = loadConfig();
  return cfg.anthropicApiKey || process.env.ANTHROPIC_API_KEY || null;
}

function getClient() {
  const key = getApiKey();
  if (!key) return null;
  return new Anthropic({ apiKey: key });
}

function hashContext(data) {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

async function getCachedAnalysis(type, contextHash) {
  const db = getDB();
  const row = db.prepare(
    `SELECT result_text, created_at FROM ai_analyses
     WHERE analysis_type = ? AND context_hash = ?
     AND datetime(created_at) > datetime('now', '-7 days')
     ORDER BY created_at DESC LIMIT 1`
  ).get(type, contextHash);
  return row ? row.result_text : null;
}

function saveAnalysis(type, contextHash, result, model) {
  const db = getDB();
  db.prepare('INSERT INTO ai_analyses (analysis_type, context_hash, result_text, model_used) VALUES (?,?,?,?)')
    .run(type, contextHash, result, model);
}

async function analyzePortfolio(metrics, forceRefresh = false) {
  const client = getClient();
  if (!client) {
    return 'AI analysis unavailable — add your Anthropic API key in Settings (top-right gear icon).';
  }
  const contextHash = hashContext(metrics);
  if (!forceRefresh) {
    const cached = await getCachedAnalysis('portfolio_summary', contextHash);
    if (cached) return cached;
  }

  const prompt = `You are a project controls analyst. Today is ${new Date().toISOString().split('T')[0]}.

Portfolio metrics:
- Total deliverables: ${metrics.total}
- AFC (complete): ${metrics.afc_count} (${metrics.afc_pct}%)
- IFR (in review): ${metrics.ifr_count}
- Not Started: ${metrics.not_started_count}
- Overdue: ${metrics.late_count}
- At risk (due within 14 days, not AFC): ${metrics.at_risk_count}
- Overall health score: ${metrics.health_score}/100
- Projects: ${JSON.stringify(metrics.projects?.slice(0, 10))}

Write a 3-paragraph executive summary:
1. Overall portfolio health and completion status
2. Top 3 concerns with specific numbers
3. Recommended actions for this week

Be specific, concise, and actionable. No bullet points — flowing prose.`;

  const model = 'claude-haiku-4-5-20251001';
  const message = await client.messages.create({
    model,
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }]
  });
  const result = message.content[0].text;
  saveAnalysis('portfolio_summary', contextHash, result, model);
  return result;
}

async function analyzeRisks(lateItems, atRiskItems, forceRefresh = false) {
  const client = getClient();
  if (!client) {
    return 'AI analysis unavailable — add your Anthropic API key in Settings (top-right gear icon).';
  }
  const contextHash = hashContext({ lateItems: lateItems.slice(0,20), atRiskItems: atRiskItems.slice(0,20) });
  if (!forceRefresh) {
    const cached = await getCachedAnalysis('risk_analysis', contextHash);
    if (cached) return cached;
  }

  const prompt = `You are a project risk analyst. Today is ${new Date().toISOString().split('T')[0]}.

OVERDUE ITEMS (${lateItems.length} total, showing first 20):
${JSON.stringify(lateItems.slice(0,20).map(d => ({ id: d.id, title: d.title, planned_end: d.planned_end, status: d.status, discipline: d.discipline })), null, 2)}

AT RISK ITEMS (${atRiskItems.length} total, due within 14 days):
${JSON.stringify(atRiskItems.slice(0,20).map(d => ({ id: d.id, title: d.title, planned_end: d.planned_end, status: d.status })), null, 2)}

Provide a concise risk analysis:
1. Identify any patterns (e.g., bottleneck in a specific discipline or review stage)
2. Assess severity — which overdue items are most critical?
3. Recommend specific interventions

Keep it under 250 words.`;

  const model = 'claude-haiku-4-5-20251001';
  const message = await client.messages.create({
    model,
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }]
  });
  const result = message.content[0].text;
  saveAnalysis('risk_analysis', contextHash, result, model);
  return result;
}

module.exports = { analyzePortfolio, analyzeRisks };
