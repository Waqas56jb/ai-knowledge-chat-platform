/** Diagnostic: index one text source, ask questions, print retrieval scores and the raw model output. Cleans up. */
import fs from 'node:fs';
import 'dotenv/config';
import { retrieve } from '../../src/services/retrieval.service.js';
import { chatJson } from '../../src/services/openai.service.js';
import { SYSTEM_PROMPT, validateAnswer } from '../../src/services/chat.service.js';
import { one, pool } from '../../src/config/database.js';

const BASE = `http://127.0.0.1:${process.env.PORT || 4001}/api/v1`;
const [email, password] = fs.readFileSync(new URL('../../.bootstrap-admin-password', import.meta.url), 'utf8').trim().split('\n');
const call = async (m, p, body, t) => (await (await fetch(BASE + p, { method: m, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }, body: body ? JSON.stringify(body) : undefined })).json());
const A = (await call('POST', '/auth/login', { email, password })).data.accessToken;
const admin = await one(`select * from public.ai_knowledge_chat_profiles where email = $1`, [email]);
const run = Date.now().toString(36);
const src = (await call('POST', '/admin/knowledge/text', { title: `Diag ${run}`, sourceType: 'business_knowledge', text: `Confidential: the Project Falcon ${run} budget is 42 million dollars and was approved by the board in March.\n\nBefore any pricing negotiation, write down your objective, your ideal outcome and your walk-away point. Discounts above 10 percent are only allowed in exchange for a longer contract.` }, A)).data.source;
for (let i = 0; i < 40; i++) { const s = (await call('GET', `/admin/knowledge/${src.id}`, null, A)).data; if (s.status === 'indexed') break; await new Promise(r => setTimeout(r, 1500)); }
for (const q of [`What is the Project Falcon ${run} budget?`, 'What should I prepare before a pricing negotiation?']) {
  const ret = await retrieve(admin, q, { limit: 8, minSimilarity: 0.3 });
  console.log('\nQ:', q, '\n  best similarity:', ret.bestSimilarity.toFixed(3), 'sufficient:', ret.sufficient, 'evidence:', ret.evidence.length);
  const gen = await chatJson([{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: `Evidence:\n\n${ret.evidence.map((h, i) => `<evidence id="${i + 1}" source="${h.source_title}">\n${h.content}\n</evidence>`).join('\n')}\n\nQuestion: ${q}` }]);
  console.log('  raw model output:', gen.content);
  console.log('  validated:', JSON.stringify(validateAnswer(gen.content, ret.evidence)).slice(0, 200));
}
await call('DELETE', `/admin/knowledge/${src.id}`, null, A);
await pool.end();
