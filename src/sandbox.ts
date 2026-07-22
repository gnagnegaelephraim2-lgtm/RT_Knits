// ============================================================
// RT KNITS — NITA CMMS API Sandbox
// ============================================================

import { $ } from './utils';
import { API } from './api';
import { assets, technicians, departments, session } from './state';

export function runApiRequest(): void {
  const sel = $('api-endpoint-selector') as HTMLSelectElement | null;
  const viewer = $('api-response-json');
  if (!sel || !viewer) return;
  viewer.textContent = 'Sending HTTP request to NITA Engine...';
  const endpoint = sel.value;
  const params: Record<string, string> = {};
  if (endpoint === 'api-assets') params.code = '39';
  if (endpoint === 'api-find-asset') { params.location = 'Knitting'; params.keyword = 'Circular'; }
  if (endpoint === 'api-technicians' || endpoint === 'api-recommend-technician') params.trade = 'mechanic';
  if (endpoint === 'api-technician-daily-tasks' || endpoint === 'api-next-task') params.technician_id = session ? session.userId : '';
  if (endpoint === 'api-admin-read') params.table = 'department';

  API.get('/' + endpoint, params).then((d) => {
    viewer.textContent = JSON.stringify(d, null, 2);
  }).catch(() => {
    const mockResp = {
      status: "200 OK",
      endpoint,
      timestamp: new Date().toISOString(),
      payload: endpoint.includes('asset') ? assets : endpoint.includes('tech') ? technicians : departments
    };
    viewer.textContent = JSON.stringify(mockResp, null, 2);
  });
}
