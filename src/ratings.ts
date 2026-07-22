// ============================================================
// RT KNITS — NITA CMMS Rating & Commendation
// ============================================================

import { $, esc, toast, uid } from './utils';
import { supaInsert } from './supabase';
import { session, feedbacks } from './state';

export function showRatingDialog(workOrderId: string, technicianId: string): void {
  const existing = $('rating-dialog');
  if (existing) existing.remove();
  const dlg = document.createElement('div');
  dlg.id = 'rating-dialog';
  dlg.className = 'modal-overlay';
  dlg.innerHTML =
    '<div class="modal-card">' +
    '<h3>Rate Technician Performance</h3>' +
    '<div class="star-select" id="star-select">' +
    '<span class="star" data-val="1">\u2605</span><span class="star" data-val="2">\u2605</span>' +
    '<span class="star" data-val="3">\u2605</span><span class="star" data-val="4">\u2605</span>' +
    '<span class="star" data-val="5">\u2605</span>' +
    '</div>' +
    '<label class="field-label">Comment (optional)</label>' +
    '<textarea class="field-input" id="rating-comment" rows="3" placeholder="How was the resolution speed and quality?"></textarea>' +
    '<label class="field-check" style="display:flex;align-items:center;gap:8px;margin-top:8px"><input type="checkbox" id="rating-commend"> Commend for excellent work</label>' +
    '<div class="modal-actions" style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">' +
    '<button class="btn-outline" onclick="document.getElementById(\'rating-dialog\').remove()">Cancel</button>' +
    '<button class="btn-primary" onclick="submitRating(\'' + esc(workOrderId) + '\',\'' + esc(technicianId) + '\')">Submit Rating</button>' +
    '</div>' +
    '</div>';
  document.body.appendChild(dlg);
  const stars = dlg.querySelectorAll('.star');
  let selectedVal = 5;
  stars.forEach((s) => {
    s.addEventListener('click', () => {
      selectedVal = parseInt(s.getAttribute('data-val') || '5');
      stars.forEach((st) => st.classList.toggle('active', parseInt(st.getAttribute('data-val') || '0') <= selectedVal));
    });
  });
  (dlg as any)._selectedRating = () => selectedVal;
}

export async function submitRating(workOrderId: string, technicianId: string): Promise<void> {
  const dlg = $('rating-dialog') as any;
  if (!dlg) return;
  const rating = dlg._selectedRating();
  if (!rating) return toast('Select a rating.', 'error');
  const commentInput = $('rating-comment') as HTMLTextAreaElement | null;
  const commendInput = $('rating-commend') as HTMLInputElement | null;
  const comment = commentInput ? commentInput.value.trim() : '';
  const commend = commendInput ? commendInput.checked : false;

  const fb: Record<string, any> = {
    feedback_id: uid('fb'),
    work_order_id: workOrderId,
    rated_by_user_id: session ? session.userId : 'Coordinator',
    feedback_type: 'text',
    feedback_text: comment || 'Rating: ' + rating + '/5',
    derived_sentiment: commend ? 'positive' : 'neutral',
    derived_rating: rating,
    key_issues: '"[]"',
    flagged_for_review: false,
    created_at: new Date().toISOString()
  };
  fb.technician_id = technicianId;
  fb.rating = rating;
  fb.comment = comment;
  fb.commendation = commend;
  fb.created_by_user_id = fb.rated_by_user_id;
  feedbacks.unshift(fb as any);
  (window as any)._logAudit('rating_submitted', 'Rated work order #' + workOrderId.slice(0, 8) + ' - ' + rating + '/5' + (commend ? ' (commended)' : ''), 'work_order:' + workOrderId);
  dlg.remove();
  toast(commend ? 'Commendation sent! Great job!' : 'Rating submitted!', 'success');
  supaInsert('work_order_feedback', fb).catch(() => {});
  (window as any)._renderAll();
}
