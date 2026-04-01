import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useSettings } from '../context/SettingsContext';
import { getAllBodyLogs, setBodyLog } from '../lib/db';
import { displayWeight } from '../lib/units';

export default function WeightTracker({ theme }) {
  const { unitSystem, bodyWeight, setBodyWeight } = useSettings();
  const { fg, sub, cardBg, cardBd, faint, inputBg, pa } = theme;

  const [logs, setLogs] = useState([]);
  const [todayWeight, setTodayWeight] = useState('');
  const [todayBf, setTodayBf] = useState('');
  const [goalWeight, setGoalWeight] = useState('');
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    getAllBodyLogs().then(entries => {
      setLogs(entries);
      const todayEntry = entries.find(e => e.date === today);
      if (todayEntry) {
        setTodayWeight(todayEntry.weight || '');
        setTodayBf(todayEntry.bodyFat || '');
      }
      setLoading(false);
    });
  }, [today]);

  const logToday = () => {
    if (!todayWeight) return;
    const weightLb = unitSystem === 'metric'
      ? Math.round(parseFloat(todayWeight) / 0.453592)
      : parseFloat(todayWeight);

    const entry = { weight: weightLb, bodyFat: todayBf ? parseFloat(todayBf) : undefined };
    setBodyLog(today, entry);
    setBodyWeight(weightLb);

    // Update local logs
    const idx = logs.findIndex(e => e.date === today);
    if (idx >= 0) {
      const updated = [...logs];
      updated[idx] = { date: today, ...entry };
      setLogs(updated);
    } else {
      setLogs([...logs, { date: today, ...entry }].sort((a, b) => a.date.localeCompare(b.date)));
    }
  };

  const chartData = logs
    .filter(e => e.weight)
    .map(e => ({
      date: e.date,
      weight: unitSystem === 'metric' ? Math.round(e.weight * 0.453592 * 10) / 10 : e.weight,
      bodyFat: e.bodyFat || null,
    }));

  const unit = unitSystem === 'metric' ? 'kg' : 'lb';

  return (
    <div style={{ background: cardBg, borderRadius: 14, padding: 16, border: `1px solid ${cardBd}`, marginBottom: 12 }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: fg, marginBottom: 12 }}>Weight Log</div>

      {/* Today's entry */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: sub, marginBottom: 4 }}>Today's weight ({unit})</div>
          <input
            type="number"
            value={todayWeight}
            placeholder={unitSystem === 'metric' ? '82' : '180'}
            onChange={e => setTodayWeight(e.target.value)}
            style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: `1px solid ${cardBd}`, fontSize: 13, background: inputBg, color: fg }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: sub, marginBottom: 4 }}>Body fat % (opt)</div>
          <input
            type="number"
            value={todayBf}
            placeholder="20"
            onChange={e => setTodayBf(e.target.value)}
            style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: `1px solid ${cardBd}`, fontSize: 13, background: inputBg, color: fg }}
          />
        </div>
        <button
          onClick={logToday}
          style={{
            alignSelf: 'flex-end', padding: '6px 14px', borderRadius: 6,
            fontSize: 12, fontWeight: 600, background: pa, color: '#fff',
            opacity: todayWeight ? 1 : 0.4,
          }}
        >
          Log
        </button>
      </div>

      {/* Chart */}
      {chartData.length >= 2 ? (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: fg, marginBottom: 6 }}>Trend</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={faint} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: sub }}
                tickFormatter={d => d.slice(5)}
              />
              <YAxis
                tick={{ fontSize: 9, fill: sub }}
                domain={['auto', 'auto']}
                tickFormatter={v => `${v}`}
              />
              <Tooltip
                contentStyle={{ background: cardBg, border: `1px solid ${cardBd}`, borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: fg }}
                formatter={(value, name) => [`${value} ${name === 'weight' ? unit : '%'}`, name === 'weight' ? 'Weight' : 'Body Fat']}
              />
              <Line type="monotone" dataKey="weight" stroke={pa} strokeWidth={2} dot={{ fill: pa, r: 3 }} name="weight" />
              {chartData.some(d => d.bodyFat) && (
                <Line type="monotone" dataKey="bodyFat" stroke="#ff9800" strokeWidth={1.5} dot={{ fill: '#ff9800', r: 2 }} name="bodyFat" strokeDasharray="4 4" />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : chartData.length === 1 ? (
        <div style={{ fontSize: 11, color: sub, marginTop: 8 }}>
          First entry logged. Add another day to see your trend chart.
        </div>
      ) : (
        <div style={{ fontSize: 11, color: sub, marginTop: 8 }}>
          Log your weight to start tracking trends over time.
        </div>
      )}

      {/* Recent entries */}
      {logs.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: sub, marginBottom: 4 }}>Recent Entries</div>
          {logs.slice(-7).reverse().map(e => {
            const w = unitSystem === 'metric' ? Math.round(e.weight * 0.453592 * 10) / 10 : e.weight;
            return (
              <div key={e.date} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${faint}`, fontSize: 12 }}>
                <span style={{ color: sub }}>{e.date}</span>
                <span style={{ color: fg, fontWeight: 500 }}>
                  {w} {unit}{e.bodyFat ? ` · ${e.bodyFat}%` : ''}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Future note */}
      <div style={{ fontSize: 10, color: sub, fontStyle: 'italic', marginTop: 8 }}>
        Future: connect smart scale for automatic entries
      </div>
    </div>
  );
}
