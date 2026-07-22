// ============================================================
// RT KNITS — NITA CMMS Profile Module
// ============================================================

import { $, esc, toast } from './utils';
import { supaInsert } from './supabase';
import {
  session, setSession, feedbacks, taskRequests, technicians
} from './state';

export function renderProfile(): void {
  const el = $('profile-content');
  if (!el) return;
  const s = session || { user: { full_name: 'Nelson Fodjo', role: 'coordinator', phone_number: '+23051234567', user_id: 'coordinator' }, role: 'coordinator', userId: 'coordinator' };
  const u = s.user;
  const myRatings = feedbacks.filter((f) => (f.rated_by_user_id === u.user_id) || (f.technician_id === u.user_id));
  const avgRating = myRatings.length ? Math.round(myRatings.reduce((sum, f) => sum + (f.derived_rating || f.rating || 5), 0) / myRatings.length) : 5;
  const commendations = myRatings.filter((f) => f.commendation || f.derived_sentiment === 'positive').length;
  const myTasks = taskRequests.filter((tk) => tk.created_by_user_id === u.user_id).length;

  const inits = (u.full_name || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  el.innerHTML =
    '<div class="profile-header">' +
    '<div class="profile-avatar-lg">' + inits + '</div>' +
    '<div class="profile-info"><h2>' + esc(u.full_name || 'User') + '</h2>' +
    '<span class="badge badge-' + (u.role === 'coordinator' || u.role === 'admin' ? 'accent' : u.role === 'technician' ? 'cyan' : 'normal') + '">' + esc(u.role || 'unknown') + '</span></div>' +
    '</div>' +
    '<div class="profile-stats">' +
    '<div class="pstat"><div class="pstat-num">' + myTasks + '</div><div class="pstat-label">My Requests</div></div>' +
    '<div class="pstat"><div class="pstat-num">' + avgRating + ' \u2605</div><div class="pstat-label">Avg Rating</div></div>' +
    '<div class="pstat"><div class="pstat-num">' + commendations + '</div><div class="pstat-label">Commendations</div></div>' +
    '<div class="pstat"><div class="pstat-num">' + myRatings.length + '</div><div class="pstat-label">Reviews</div></div>' +
    '</div>' +
    '<div class="profile-form">' +
    '<h3>Edit Profile</h3>' +
    '<label class="field-label">Full Name</label><input class="field-input" id="prof-name" value="' + esc(u.full_name || '') + '">' +
    '<label class="field-label">Email</label><input class="field-input" id="prof-email" value="' + esc(u.email || '') + '" type="email">' +
    '<label class="field-label">Preferred Language</label>' +
    '<select class="field-input" id="prof-lang"><option value="en">English</option><option value="fr">Fran\u00E7ais</option><option value="cr">Kreol</option><option value="hi">\u0939\u093F\u0928\u094D\u0926\u0940</option></select>' +
    '<button class="btn-primary" onclick="saveProfile()" style="margin-top:12px">Save Changes</button>' +
    '</div>' +
    renderRatingBoard();
}

export function saveProfile(): void {
  const nameInput = $('prof-name') as HTMLInputElement | null;
  const emailInput = $('prof-email') as HTMLInputElement | null;
  const langInput = $('prof-lang') as HTMLSelectElement | null;
  const name = nameInput ? nameInput.value.trim() : '';
  const email = emailInput ? emailInput.value.trim() : '';
  const lang = langInput ? langInput.value : 'en';

  if (!name) return toast('Full name cannot be empty.', 'error');
  if (!session) {
    setSession({ user: {} as any, role: 'coordinator', userId: '' });
  }
  if (session) {
    session.user.full_name = name;
    session.user.email = email;
    session.user.preferred_language = lang;
    localStorage.setItem('nita_session', JSON.stringify(session));
  }

  if (window.NITA_I18N) window.NITA_I18N.setLang(lang);
  (window as any).updateUI();
  toast('Profile updated successfully!', 'success');
}

function renderRatingBoard(): string {
  const techsWithRatings = technicians.map((t) => {
    const r = feedbacks.filter((f) => f.technician_id === t.technician_id || f.rated_by_user_id === t.user_id);
    const avg = r.length ? Math.round(r.reduce((s, f) => s + (f.derived_rating || f.rating || 5), 0) / r.length) : 5;
    return { tech: t, ratings: r, avg, commendations: r.filter((f) => f.commendation || f.derived_sentiment === 'positive').length };
  }).sort((a, b) => b.avg - a.avg);

  const rows = techsWithRatings.map((item) => {
    let stars = '';
    for (let i = 0; i < 5; i++) stars += i < item.avg ? '\u2605' : '\u2606';
    return '<tr><td>' + esc(item.tech.full_name) + '</td><td>' + esc(item.tech.trade) + '</td><td class="stars" style="color:var(--amber)">' + stars + '</td><td>' + item.ratings.length + '</td><td style="color:var(--amber)">' + item.commendations + '</td></tr>';
  }).join('');

  return '<div class="rating-board" style="padding:20px"><h3>Technician Leaderboard</h3>' +
    '<table class="data-table"><thead><tr><th>Technician</th><th>Trade</th><th>Rating</th><th>Reviews</th><th>Commendations</th></tr></thead><tbody>' +
    rows + '</tbody></table></div>';
}
