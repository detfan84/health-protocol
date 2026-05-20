import { useState, useEffect } from 'react';
import {
  getAllEpisodes,
  addEpisode,
  deleteEpisode as dbDeleteEpisode,
  getAllDailyRecords,
  setDailyField,
} from './lib/db';
import { today } from './lib/phaseUtils';

/* ─────────── DATA ─────────── */

const TRIGGERS = [
  { id: 'sleep_onset', label: 'Drifting to sleep' },
  { id: 'middle_night', label: 'Middle of night' },
  { id: 'waking', label: 'Just waking up' },
  { id: 'after_meal', label: 'After eating' },
  { id: 'after_standing', label: 'After standing' },
  { id: 'after_exertion', label: 'After exertion' },
  { id: 'rest', label: 'At rest, random' },
  { id: 'stress', label: 'During stress' },
  { id: 'other', label: 'Other' },
];

const EP_SYMPTOMS = [
  { id: 'pounding', label: 'Pounding heart (not fast)' },
  { id: 'trembling', label: 'Internal trembling' },
  { id: 'shaking', label: 'Hands visibly shaking' },
  { id: 'warm', label: 'Warm / flushed' },
  { id: 'pulsing', label: 'Visible pulsing (eyes/veins)' },
  { id: 'breath', label: 'Shallow / quivering breath' },
  { id: 'airway', label: 'Airway sensation (snore/choke)' },
  { id: 'urinary', label: 'Urinary urgency' },
  { id: 'sweat', label: 'Sweating' },
  { id: 'head_pulse', label: 'Heartbeat in head/ears' },
  { id: 'lightheaded', label: 'Lightheaded / gray-out' },
  { id: 'cold', label: 'Cold hands/feet' },
];

const SODIUM_LEVELS = ['Low', 'Moderate', 'High'];
const ACTIVITY_LEVELS = ['Low', 'Moderate', 'High'];

/* ─────────── HELPERS ─────────── */

const nowLocal = () => {
  const d = new Date();
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d - off).toISOString().slice(0, 16);
};
const fmtDateShort = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const fmtDateLong = (iso) => new Date(iso).toLocaleDateString('en-US', {
  weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
});
const fmtTime = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

/* ─────────── COMPONENT ─────────── */

export default function EpisodeTab({ theme }) {
  const { fg, sub, pa, bg, cardBg, cardBd, faint, inputBg, dark } = theme;

  // Theme-derived accent backgrounds
  const accentBg = dark ? '#2a2a3a' : '#e8eaf6';
  const warn = dark ? '#ffb74d' : '#8B5A2B';
  const warnBg = dark ? '#2a2010' : '#f5ebe0';
  const danger = dark ? '#ef5350' : '#8B2B2B';
  const dangerBg = dark ? '#2a1010' : '#f5e0e0';

  const [view, setView] = useState('home');
  const [episodes, setEpisodes] = useState([]);
  const [dailyReviews, setDailyReviews] = useState({});
  const [loading, setLoading] = useState(true);
  const [draftEpisode, setDraftEpisode] = useState(null);
  const [draftDaily, setDraftDaily] = useState(null);
  const [detailEpisode, setDetailEpisode] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    (async () => {
      const eps = await getAllEpisodes();
      const allDaily = await getAllDailyRecords();
      const reviews = {};
      Object.entries(allDaily || {}).forEach(([date, data]) => {
        if (data?.episodeReview) reviews[date] = { date, ...data.episodeReview };
      });
      const sorted = (eps || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setEpisodes(sorted);
      setDailyReviews(reviews);
      setLoading(false);
    })();
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  };

  /* ─────────── EPISODE LOGIC ─────────── */

  const startEpisode = () => {
    setDraftEpisode({
      timestamp: nowLocal(),
      trigger: '',
      symptoms: {},
      severity: 5,
      duration: '',
      notes: '',
    });
    setView('logEpisode');
  };

  const saveEpisode = async () => {
    if (!draftEpisode.trigger) {
      showToast('Pick a trigger');
      return;
    }
    const ep = {
      ...draftEpisode,
      id: `ep_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const next = [ep, ...episodes].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
    setEpisodes(next);
    await addEpisode(ep);
    setDraftEpisode(null);
    setView('home');
    showToast('Episode logged');
  };

  const handleDeleteEpisode = async (id) => {
    const next = episodes.filter((e) => e.id !== id);
    setEpisodes(next);
    await dbDeleteEpisode(id);
    setDetailEpisode(null);
    showToast('Deleted');
  };

  const toggleSymptom = (id) => {
    setDraftEpisode((d) => ({
      ...d,
      symptoms: { ...d.symptoms, [id]: !d.symptoms[id] },
    }));
  };

  /* ─────────── DAILY LOGIC ─────────── */

  const startDaily = () => {
    const t = today();
    const existing = dailyReviews[t] || {};
    setDraftDaily({
      date: t,
      sleepHours: existing.sleepHours ?? 6,
      wakeUps: existing.wakeUps ?? 0,
      sodium: existing.sodium || 'Moderate',
      stress: existing.stress ?? 5,
      activity: existing.activity || 'Low',
      notes: existing.notes || '',
    });
    setView('logDaily');
  };

  const saveDaily = async () => {
    const { date, ...rest } = draftDaily;
    const next = { ...dailyReviews, [date]: { date, ...rest } };
    setDailyReviews(next);
    await setDailyField(date, 'episodeReview', rest);
    setDraftDaily(null);
    setView('home');
    showToast('Daily review saved');
  };

  /* ─────────── STATS ─────────── */

  const weekStats = (() => {
    const weekAgo = Date.now() - 7 * 86400000;
    const recent = episodes.filter((e) => new Date(e.timestamp).getTime() >= weekAgo);
    const avgSev = recent.length === 0
      ? 0
      : recent.reduce((s, e) => s + (e.severity || 0), 0) / recent.length;
    const sleepOnsetCount = recent.filter((e) => e.trigger === 'sleep_onset').length;
    return { count: recent.length, avgSev: avgSev.toFixed(1), sleepOnsetCount };
  })();

  /* ─────────── EXPORT ─────────── */

  const buildSummary = (rangeDays = 30) => {
    const cutoff = Date.now() - rangeDays * 86400000;
    const eps = episodes.filter((e) => new Date(e.timestamp).getTime() >= cutoff);
    const days = Object.values(dailyReviews).filter(
      (d) => new Date(d.date).getTime() >= cutoff
    );

    if (eps.length === 0 && days.length === 0) return 'No data in selected range.';

    let out = 'KEVIN BOWIE — AUTONOMIC EPISODE TRACKING\n';
    out += `Range: last ${rangeDays} days (${eps.length} episodes, ${days.length} daily reviews)\n`;
    out += `Generated: ${new Date().toLocaleString()}\n\n`;

    out += 'EPISODE FREQUENCY BY TRIGGER:\n';
    const triggerCount = {};
    eps.forEach((e) => { triggerCount[e.trigger] = (triggerCount[e.trigger] || 0) + 1; });
    Object.entries(triggerCount)
      .sort((a, b) => b[1] - a[1])
      .forEach(([t, n]) => {
        const lbl = TRIGGERS.find((x) => x.id === t)?.label || t;
        out += `  ${n}x  ${lbl}\n`;
      });
    out += '\n';

    out += 'SYMPTOM FREQUENCY (across all episodes):\n';
    const symCount = {};
    eps.forEach((e) => {
      Object.entries(e.symptoms || {}).forEach(([s, v]) => {
        if (v) symCount[s] = (symCount[s] || 0) + 1;
      });
    });
    Object.entries(symCount)
      .sort((a, b) => b[1] - a[1])
      .forEach(([s, n]) => {
        const lbl = EP_SYMPTOMS.find((x) => x.id === s)?.label || s;
        const pct = Math.round((n / eps.length) * 100);
        out += `  ${n}/${eps.length} (${pct}%)  ${lbl}\n`;
      });
    out += '\n';

    if (eps.length > 0) {
      const avgSev = (eps.reduce((s, e) => s + e.severity, 0) / eps.length).toFixed(1);
      const maxSev = Math.max(...eps.map((e) => e.severity));
      out += `SEVERITY: avg ${avgSev}/10, peak ${maxSev}/10\n\n`;
    }

    if (days.length > 0) {
      const avgSleep = (days.reduce((s, d) => s + (d.sleepHours || 0), 0) / days.length).toFixed(1);
      const avgWakes = (days.reduce((s, d) => s + (d.wakeUps || 0), 0) / days.length).toFixed(1);
      const avgStress = (days.reduce((s, d) => s + (d.stress || 0), 0) / days.length).toFixed(1);
      out += `DAILY AVERAGES (n=${days.length}):\n`;
      out += `  Sleep: ${avgSleep} hrs\n`;
      out += `  Night wake-ups: ${avgWakes}\n`;
      out += `  Stress: ${avgStress}/10\n\n`;
    }

    out += '─────────────────────────────\nDETAILED EPISODE LOG\n─────────────────────────────\n\n';
    eps.slice(0, 50).forEach((e) => {
      const lbl = TRIGGERS.find((x) => x.id === e.trigger)?.label || e.trigger;
      out += `${fmtDateLong(e.timestamp)} ${fmtTime(e.timestamp)}\n`;
      out += `  Trigger: ${lbl}\n`;
      out += `  Severity: ${e.severity}/10`;
      if (e.duration) out += `  •  Duration: ${e.duration}`;
      out += '\n';
      const sympList = Object.entries(e.symptoms || {})
        .filter(([, v]) => v)
        .map(([s]) => EP_SYMPTOMS.find((x) => x.id === s)?.label || s);
      if (sympList.length) out += `  Symptoms: ${sympList.join(', ')}\n`;
      if (e.notes) out += `  Notes: ${e.notes}\n`;
      out += '\n';
    });

    return out;
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied to clipboard');
    } catch {
      showToast('Copy failed — long-press to select');
    }
  };

  /* ─────────── STYLES ─────────── */

  const styles = `
    .ep-tab button { cursor: pointer; font-family: inherit; }
    .ep-tab input, .ep-tab textarea, .ep-tab select { font-family: inherit; }
    .ep-btn-primary {
      font-weight: 600; font-size: 15px;
      padding: 14px 20px;
      background: ${pa}; color: white;
      border: none; border-radius: 12px;
      width: 100%;
      letter-spacing: 0.02em;
      transition: opacity 0.2s ease;
    }
    .ep-btn-primary:hover { opacity: 0.9; }
    .ep-btn-secondary {
      font-weight: 500; font-size: 14px;
      padding: 12px 18px;
      background: ${cardBg}; color: ${fg};
      border: 1px solid ${cardBd}; border-radius: 12px;
      width: 100%;
      letter-spacing: 0.02em;
      transition: border-color 0.2s ease;
    }
    .ep-btn-secondary:hover { border-color: ${pa}; }
    .ep-pill {
      font-size: 12.5px; font-weight: 500;
      padding: 7px 13px;
      background: ${cardBg}; color: ${fg};
      border: 1px solid ${cardBd}; border-radius: 999px;
      transition: all 0.15s ease;
    }
    .ep-pill.active {
      background: ${pa}; color: white; border-color: ${pa};
    }
    .ep-chip {
      font-size: 13px; font-weight: 500;
      padding: 11px 13px;
      background: ${cardBg}; color: ${fg};
      border: 1px solid ${cardBd}; border-radius: 10px;
      text-align: left;
      transition: all 0.15s ease;
      line-height: 1.3;
    }
    .ep-chip.active {
      background: ${accentBg}; border-color: ${pa}; color: ${pa};
      font-weight: 600;
    }
    .ep-card {
      background: ${cardBg};
      border: 1px solid ${cardBd};
      border-radius: 14px;
      padding: 16px;
    }
    .ep-label {
      font-size: 12px; font-weight: 600;
      color: ${sub};
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 10px;
      display: block;
    }
    .ep-input, .ep-textarea {
      width: 100%;
      padding: 11px 13px;
      border: 1px solid ${cardBd};
      border-radius: 10px;
      font-size: 14px;
      background: ${inputBg}; color: ${fg};
      outline: none;
      transition: border-color 0.2s ease;
    }
    .ep-input:focus, .ep-textarea:focus { border-color: ${pa}; }
    .ep-textarea { min-height: 70px; resize: vertical; line-height: 1.5; }
    .ep-sev {
      font-size: 13px; font-weight: 600;
      flex: 1;
      padding: 10px 0;
      background: ${cardBg}; color: ${fg};
      border: 1px solid ${cardBd}; border-radius: 8px;
      transition: all 0.15s ease;
    }
    .ep-sev.active {
      background: ${pa}; color: white; border-color: ${pa};
    }
    .ep-toast {
      position: fixed; bottom: 24px; left: 50%;
      transform: translateX(-50%);
      background: ${fg}; color: ${bg};
      padding: 11px 18px; border-radius: 999px;
      font-size: 13px; font-weight: 500;
      z-index: 100;
      animation: ep-slideUp 0.3s ease;
    }
    @keyframes ep-slideUp {
      from { transform: translate(-50%, 30px); opacity: 0; }
      to { transform: translate(-50%, 0); opacity: 1; }
    }
    @keyframes ep-fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .ep-view { animation: ep-fadeIn 0.25s ease; }
  `;

  if (loading) {
    return (
      <div className="ep-tab" style={{ padding: 40, textAlign: 'center', color: sub, fontSize: 13 }}>
        Loading…
      </div>
    );
  }

  return (
    <div className="ep-tab" style={{ paddingBottom: 24, position: 'relative' }}>
      <style>{styles}</style>

      {/* Sub-nav back button */}
      {view !== 'home' && (
        <div style={{ padding: '0 16px 8px' }}>
          <button
            onClick={() => {
              setView('home');
              setDraftEpisode(null);
              setDraftDaily(null);
            }}
            style={{
              background: 'transparent',
              border: `1px solid ${cardBd}`,
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 12, color: sub,
            }}
          >
            ← Back
          </button>
        </div>
      )}

      {/* ─────── HOME ─────── */}
      {view === 'home' && (
        <div className="ep-view" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px' }}>
          <button onClick={startEpisode} className="ep-btn-primary">
            ⊕ Log Episode Now
          </button>
          <button onClick={startDaily} className="ep-btn-secondary">
            Morning Review for Today
          </button>

          {/* Week stats */}
          <div className="ep-card" style={{ marginTop: 4 }}>
            <div className="ep-label" style={{ marginBottom: 12 }}>This Week</div>
            <div style={{ display: 'flex', gap: 14 }}>
              <Stat label="Episodes" value={weekStats.count} fg={fg} sub={sub} />
              <Stat label="Avg severity" value={weekStats.count ? `${weekStats.avgSev}/10` : '—'} fg={fg} sub={sub} />
              <Stat label="At sleep onset" value={weekStats.sleepOnsetCount} fg={fg} sub={sub} />
            </div>
          </div>

          {/* Recent */}
          <div className="ep-card">
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 12,
            }}>
              <div className="ep-label" style={{ margin: 0 }}>Recent Episodes</div>
              {episodes.length > 0 && (
                <button
                  onClick={() => setView('history')}
                  style={{
                    background: 'transparent', border: 'none',
                    color: pa, fontSize: 12, fontWeight: 500,
                  }}
                >
                  View all ({episodes.length}) →
                </button>
              )}
            </div>
            {episodes.length === 0 ? (
              <div style={{
                fontSize: 13, color: sub, fontStyle: 'italic', lineHeight: 1.5,
              }}>
                Nothing logged yet. The next time you feel the pounding heart, internal trembling, or any of the patterns we talked about — tap <strong>Log Episode Now</strong>. Even a 20-second log captures the data.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {episodes.slice(0, 4).map((e) => (
                  <EpisodeRow
                    key={e.id} ep={e}
                    fg={fg} sub={sub} pa={pa}
                    cardBg={cardBg} cardBd={cardBd}
                    accentBg={accentBg} warn={warn} warnBg={warnBg}
                    danger={danger} dangerBg={dangerBg}
                    onClick={() => setDetailEpisode(e)}
                  />
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setView('export')}
            className="ep-btn-secondary"
            style={{ marginTop: 4 }}
          >
            Generate Summary for Doctor
          </button>
        </div>
      )}

      {/* ─────── LOG EPISODE ─────── */}
      {view === 'logEpisode' && draftEpisode && (
        <div className="ep-view" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '0 16px' }}>
          <div>
            <label className="ep-label">When did it happen?</label>
            <input
              className="ep-input"
              type="datetime-local"
              value={draftEpisode.timestamp}
              onChange={(e) => setDraftEpisode({ ...draftEpisode, timestamp: e.target.value })}
            />
          </div>

          <div>
            <label className="ep-label">Trigger / Context</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {TRIGGERS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setDraftEpisode({ ...draftEpisode, trigger: t.id })}
                  className={`ep-pill ${draftEpisode.trigger === t.id ? 'active' : ''}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="ep-label">Symptoms (tap all that apply)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
              {EP_SYMPTOMS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => toggleSymptom(s.id)}
                  className={`ep-chip ${draftEpisode.symptoms[s.id] ? 'active' : ''}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="ep-label">Severity ({draftEpisode.severity}/10)</label>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => setDraftEpisode({ ...draftEpisode, severity: n })}
                  className={`ep-sev ${draftEpisode.severity === n ? 'active' : ''}`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div style={{
              fontSize: 10.5, color: sub, marginTop: 6,
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span>barely noticed</span>
              <span>worst I've felt</span>
            </div>
          </div>

          <div>
            <label className="ep-label">Duration (optional)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {['< 1 min', '1–5 min', '5–15 min', '15–30 min', '30+ min', 'ongoing'].map((d) => (
                <button
                  key={d}
                  onClick={() => setDraftEpisode({ ...draftEpisode, duration: d })}
                  className={`ep-pill ${draftEpisode.duration === d ? 'active' : ''}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="ep-label">Notes (optional)</label>
            <textarea
              className="ep-textarea"
              value={draftEpisode.notes}
              onChange={(e) => setDraftEpisode({ ...draftEpisode, notes: e.target.value })}
              placeholder="What else? Position, what you were doing, anything unusual…"
            />
          </div>

          <button onClick={saveEpisode} className="ep-btn-primary">
            Save Episode
          </button>
        </div>
      )}

      {/* ─────── LOG DAILY ─────── */}
      {view === 'logDaily' && draftDaily && (
        <div className="ep-view" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '0 16px' }}>
          <div className="ep-card" style={{ background: accentBg, borderColor: pa }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: pa }}>
              Morning Review — {fmtDateLong(draftDaily.date)}
            </div>
            <div style={{ fontSize: 12, color: sub, marginTop: 4, lineHeight: 1.5 }}>
              Best done first thing — easier to remember last night while it's fresh.
            </div>
          </div>

          <div>
            <label className="ep-label">Hours of sleep (estimate)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {[3, 4, 5, 6, 7, 8, 9].map((h) => (
                <button
                  key={h}
                  onClick={() => setDraftDaily({ ...draftDaily, sleepHours: h })}
                  className={`ep-pill ${draftDaily.sleepHours === h ? 'active' : ''}`}
                >
                  {h} hrs
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="ep-label">Number of wake-ups</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setDraftDaily({ ...draftDaily, wakeUps: n })}
                  className={`ep-pill ${draftDaily.wakeUps === n ? 'active' : ''}`}
                >
                  {n === 5 ? '5+' : n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="ep-label">Sodium intake yesterday</label>
            <div style={{ display: 'flex', gap: 7 }}>
              {SODIUM_LEVELS.map((s) => (
                <button
                  key={s}
                  onClick={() => setDraftDaily({ ...draftDaily, sodium: s })}
                  className={`ep-pill ${draftDaily.sodium === s ? 'active' : ''}`}
                  style={{ flex: 1 }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="ep-label">Activity yesterday</label>
            <div style={{ display: 'flex', gap: 7 }}>
              {ACTIVITY_LEVELS.map((a) => (
                <button
                  key={a}
                  onClick={() => setDraftDaily({ ...draftDaily, activity: a })}
                  className={`ep-pill ${draftDaily.activity === a ? 'active' : ''}`}
                  style={{ flex: 1 }}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="ep-label">Stress level yesterday ({draftDaily.stress}/10)</label>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => setDraftDaily({ ...draftDaily, stress: n })}
                  className={`ep-sev ${draftDaily.stress === n ? 'active' : ''}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="ep-label">Notes</label>
            <textarea
              className="ep-textarea"
              value={draftDaily.notes}
              onChange={(e) => setDraftDaily({ ...draftDaily, notes: e.target.value })}
              placeholder="Anything notable about how you feel, what you noticed…"
            />
          </div>

          <button onClick={saveDaily} className="ep-btn-primary">
            Save Daily Review
          </button>
        </div>
      )}

      {/* ─────── HISTORY ─────── */}
      {view === 'history' && (
        <div className="ep-view" style={{ padding: '0 16px' }}>
          <div className="ep-label">All Episodes ({episodes.length})</div>
          {episodes.length === 0 ? (
            <div style={{
              fontSize: 13, color: sub, fontStyle: 'italic',
              padding: 20, textAlign: 'center',
            }}>
              No episodes logged yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {episodes.map((e) => (
                <EpisodeRow
                  key={e.id} ep={e}
                  fg={fg} sub={sub} pa={pa}
                  cardBg={cardBg} cardBd={cardBd}
                  accentBg={accentBg} warn={warn} warnBg={warnBg}
                  danger={danger} dangerBg={dangerBg}
                  onClick={() => setDetailEpisode(e)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─────── EXPORT ─────── */}
      {view === 'export' && (
        <div className="ep-view" style={{ padding: '0 16px' }}>
          <div className="ep-card">
            <div className="ep-label">Generate Clinical Summary</div>
            <div style={{
              fontSize: 13, color: sub, lineHeight: 1.5, marginBottom: 14,
            }}>
              Creates a formatted summary you can hand to Dr. Suleman or attach to any specialist brief. Pick a time range:
            </div>
            <ExportPanel
              buildSummary={buildSummary}
              copyToClipboard={copyToClipboard}
              bg={bg} pa={pa} fg={fg} cardBd={cardBd}
            />
          </div>
        </div>
      )}

      {/* ─────── DETAIL MODAL ─────── */}
      {detailEpisode && (
        <div
          onClick={() => setDetailEpisode(null)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'flex-end', justifyContent: 'center',
            zIndex: 50,
            animation: 'ep-fadeIn 0.2s ease',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: cardBg,
              borderRadius: '20px 20px 0 0',
              padding: 22, width: '100%', maxWidth: 480,
              maxHeight: '85vh', overflowY: 'auto',
            }}
          >
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'flex-start', marginBottom: 14,
            }}>
              <div>
                <div style={{
                  fontSize: 11.5, fontWeight: 600, color: sub,
                  letterSpacing: '0.05em', textTransform: 'uppercase',
                  marginBottom: 4,
                }}>
                  {fmtDateLong(detailEpisode.timestamp)}
                </div>
                <div style={{ fontSize: 19, fontWeight: 700, color: fg }}>
                  {fmtTime(detailEpisode.timestamp)}
                </div>
              </div>
              <button
                onClick={() => setDetailEpisode(null)}
                style={{
                  background: 'transparent', border: 'none',
                  fontSize: 22, color: sub, lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <DetailRow label="Trigger" sub={sub} fg={fg}>
                {TRIGGERS.find((t) => t.id === detailEpisode.trigger)?.label || detailEpisode.trigger}
              </DetailRow>
              <DetailRow label="Severity" sub={sub} fg={fg}>
                {detailEpisode.severity}/10
              </DetailRow>
              {detailEpisode.duration && (
                <DetailRow label="Duration" sub={sub} fg={fg}>
                  {detailEpisode.duration}
                </DetailRow>
              )}
              <DetailRow label="Symptoms" sub={sub} fg={fg}>
                {Object.entries(detailEpisode.symptoms || {})
                  .filter(([, v]) => v)
                  .map(([s]) => EP_SYMPTOMS.find((x) => x.id === s)?.label || s)
                  .join(', ') || '—'}
              </DetailRow>
              {detailEpisode.notes && (
                <DetailRow label="Notes" sub={sub} fg={fg}>
                  {detailEpisode.notes}
                </DetailRow>
              )}
            </div>

            <button
              onClick={() => {
                if (confirm('Delete this episode?')) handleDeleteEpisode(detailEpisode.id);
              }}
              style={{
                marginTop: 22, width: '100%', padding: 11,
                background: 'transparent',
                border: `1px solid ${dangerBg}`,
                borderRadius: 10,
                color: danger,
                fontSize: 13, fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Delete Episode
            </button>
          </div>
        </div>
      )}

      {toast && <div className="ep-toast">{toast}</div>}
    </div>
  );
}

/* ─────────── SUBCOMPONENTS ─────────── */

function Stat({ label, value, fg, sub }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: fg, lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{
        fontSize: 11, color: sub, marginTop: 4,
        letterSpacing: '0.03em',
      }}>
        {label}
      </div>
    </div>
  );
}

function EpisodeRow({ ep, fg, sub, pa, cardBg, cardBd, accentBg, warn, warnBg, danger, dangerBg, onClick }) {
  const triggerLabel = TRIGGERS.find((t) => t.id === ep.trigger)?.label || ep.trigger;
  const sevColor = ep.severity >= 8 ? danger : ep.severity >= 5 ? warn : pa;
  const sevBg = ep.severity >= 8 ? dangerBg : ep.severity >= 5 ? warnBg : accentBg;
  const symCount = Object.values(ep.symptoms || {}).filter(Boolean).length;
  return (
    <button
      onClick={onClick}
      style={{
        background: cardBg,
        border: `1px solid ${cardBd}`,
        borderRadius: 12, padding: 12,
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', textAlign: 'left',
        transition: 'all 0.15s ease',
        cursor: 'pointer',
      }}
    >
      <div style={{
        background: sevBg, color: sevColor,
        fontSize: 15, fontWeight: 700,
        width: 40, height: 40, borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {ep.severity}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11, fontWeight: 600, color: sub,
          letterSpacing: '0.04em', textTransform: 'uppercase',
        }}>
          {fmtDateShort(ep.timestamp)} · {fmtTime(ep.timestamp)}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: fg, marginTop: 2 }}>
          {triggerLabel}
        </div>
        <div style={{ fontSize: 12, color: sub, marginTop: 2 }}>
          {symCount} symptom{symCount === 1 ? '' : 's'}
          {ep.duration ? ` · ${ep.duration}` : ''}
        </div>
      </div>
    </button>
  );
}

function DetailRow({ label, children, sub, fg }) {
  return (
    <div>
      <div style={{
        fontSize: 11, fontWeight: 600, color: sub,
        letterSpacing: '0.05em', textTransform: 'uppercase',
        marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.5, color: fg }}>{children}</div>
    </div>
  );
}

function ExportPanel({ buildSummary, copyToClipboard, bg, pa, fg, cardBd }) {
  const [range, setRange] = useState(30);
  const [preview, setPreview] = useState('');

  const generate = () => setPreview(buildSummary(range));

  return (
    <div>
      <div style={{ display: 'flex', gap: 7, marginBottom: 13 }}>
        {[7, 14, 30, 60, 90].map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`ep-pill ${range === r ? 'active' : ''}`}
            style={{ flex: 1 }}
          >
            {r}d
          </button>
        ))}
      </div>
      <button onClick={generate} className="ep-btn-primary" style={{ marginBottom: 13 }}>
        Generate
      </button>
      {preview && (
        <>
          <button
            onClick={() => copyToClipboard(preview)}
            className="ep-btn-secondary"
            style={{ marginBottom: 13 }}
          >
            Copy to Clipboard
          </button>
          <textarea
            readOnly
            value={preview}
            style={{
              width: '100%',
              minHeight: 260,
              padding: 12,
              fontFamily: 'ui-monospace, Menlo, monospace',
              fontSize: 11.5,
              lineHeight: 1.5,
              background: bg,
              color: fg,
              border: `1px solid ${cardBd}`,
              borderRadius: 10,
              resize: 'vertical',
            }}
          />
        </>
      )}
    </div>
  );
}
