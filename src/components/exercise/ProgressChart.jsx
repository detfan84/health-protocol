import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { EXERCISES } from '../../data/exercises';
import { getAllWorkouts } from '../../lib/db';

export default function ProgressChart({ theme }) {
  const [exerciseId, setExerciseId] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const { fg, sub, cardBg, cardBd, inputBg, pa } = theme;

  useEffect(() => {
    if (!exerciseId) { setData([]); return; }
    setLoading(true);
    getAllWorkouts().then(workouts => {
      const points = [];
      for (const w of workouts) {
        if (w.data && w.data[exerciseId]) {
          const sets = w.data[exerciseId];
          const ex = EXERCISES.find(e => e.id === exerciseId);
          if (ex?.trackingType === 'duration') {
            const best = Math.max(...sets.map(s => s.duration || 0));
            if (best > 0) points.push({ date: w.date, value: best, label: `${best}s` });
          } else {
            const bestReps = Math.max(...sets.map(s => s.reps || 0));
            const bestWeight = Math.max(...sets.filter(s => s.weight).map(s => s.weight || 0));
            const totalVol = sets.reduce((sum, s) => sum + (s.reps || 0) * (s.weight || 1), 0);
            if (bestReps > 0) points.push({
              date: w.date,
              value: bestReps,
              weight: bestWeight || undefined,
              volume: totalVol,
            });
          }
        }
      }
      points.sort((a, b) => a.date.localeCompare(b.date));
      setData(points);
      setLoading(false);
    });
  }, [exerciseId]);

  const exerciseOptions = EXERCISES.filter(e => e.trackingType !== undefined);

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: sub, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Progress Tracker
      </div>
      <select
        value={exerciseId}
        onChange={e => setExerciseId(e.target.value)}
        style={{
          width: '100%', padding: '8px 12px', borderRadius: 8,
          border: `1px solid ${cardBd}`, fontSize: 13, background: inputBg, color: fg,
          marginBottom: 12,
        }}
      >
        <option value="">Select an exercise...</option>
        {exerciseOptions.map(ex => (
          <option key={ex.id} value={ex.id}>{ex.name}</option>
        ))}
      </select>

      {loading && <div style={{ fontSize: 12, color: sub }}>Loading...</div>}

      {!loading && exerciseId && data.length === 0 && (
        <div style={{ fontSize: 12, color: sub, padding: 16, textAlign: 'center' }}>
          No workout data yet for this exercise. Log a workout to start tracking progress.
        </div>
      )}

      {data.length > 0 && (
        <div style={{ background: cardBg, borderRadius: 10, padding: 12, border: `1px solid ${cardBd}` }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: fg, marginBottom: 8 }}>
            Best Set Over Time
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.faint} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: sub }}
                tickFormatter={d => d.slice(5)}
              />
              <YAxis tick={{ fontSize: 10, fill: sub }} />
              <Tooltip
                contentStyle={{ background: cardBg, border: `1px solid ${cardBd}`, borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: fg }}
              />
              <Line type="monotone" dataKey="value" stroke={pa} strokeWidth={2} dot={{ fill: pa, r: 3 }} />
            </LineChart>
          </ResponsiveContainer>

          {/* Last workout summary */}
          {data.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 11, color: sub }}>
              Last: {data[data.length - 1].date} — {data[data.length - 1].value}
              {data[data.length - 1].weight ? ` × ${data[data.length - 1].weight} lb` : ' reps'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
