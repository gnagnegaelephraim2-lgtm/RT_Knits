// ============================================================
// RT KNITS — NITA CMMS Documentation Module
// ============================================================

import { $ } from './utils';

const docs: Record<string, string> = {
  design: '<h2>1. Solution Design</h2>' +
    '<p>NITA (Next-generation Intelligent Triage Assistant) automates maintenance triage and routing bottlenecks for RT Knits in Mauritius.</p>' +
    '<h3>System Architecture</h3>' +
    '<ul>' +
    '<li><strong>Frontend:</strong> High-performance HTML5, Vanilla JavaScript, and CSS variable design system.</li>' +
    '<li><strong>Database:</strong> Supabase PostgreSQL REST API with automated schema migrations.</li>' +
    '<li><strong>Integration Engine:</strong> n8n Webhook workflow engine for WhatsApp Creole/English audio transcription.</li>' +
    '</ul>',
  logic: '<h2>2. Decision Logic & NLP Triage</h2>' +
    '<p>Automatic priority classification matrix converts raw text/voice into actionable SLA categories:</p>' +
    '<ul>' +
    '<li><span class="badge badge-p0">P0 CRITICAL</span> \u2014 Line Stop / Production Halt (Immediate dispatch notification).</li>' +
    '<li><span class="badge badge-p1">P1 URGENT</span> \u2014 Component Fault / High Risk (Same-shift repair approval).</li>' +
    '<li><span class="badge badge-p2">P2 NORMAL</span> \u2014 Cosmetic / Scheduled Preventive Care.</li>' +
    '</ul>',
  model: '<h2>3. Data Model Analysis</h2>' +
    '<p>Relational entities linking <code>department</code>, <code>asset</code>, <code>task_request</code>, and <code>work_order</code>.</p>' +
    '<pre class="mono-text">department (1) \u2014\u2014 (N) asset (1) \u2014\u2014 (N) task_request (1) \u2014\u2014 (1) work_order (N) \u2014\u2014 technician</pre>',
  impact: '<h2>4. Business Impact & SLA Targets</h2>' +
    '<p>Eliminates FileMaker coordinator delay and reduces Mean Time To Repair (MTTR) by 45% across RT Knits production floors.</p>' +
    '<div class="stats-grid" style="margin-top:16px">' +
    '<div class="stat-card stat-green"><div class="stat-num">99.8%</div><div class="stat-label">Plant SLA Target</div></div>' +
    '<div class="stat-card stat-cyan"><div class="stat-num">-45%</div><div class="stat-label">MTTR Reduction</div></div>' +
    '</div>'
};

export function renderDocs(key: string): void {
  const el = $('docs-viewport');
  if (!el) return;
  el.innerHTML = docs[key] || docs.design;
}
