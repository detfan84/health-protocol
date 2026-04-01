import { useSettings } from '../context/SettingsContext';
import { displayVolume, displayWeight } from '../lib/units';
import BadgeGrid from './BadgeGrid';
import WeightTracker from './WeightTracker';
import GoalsTracker from './GoalsTracker';

export default function ProfileTab({ theme }) {
  const {
    unitSystem, setUnitSystem,
    bodyWeight, setBodyWeight,
    hydrationTarget, setHydrationTarget,
    profile, setProfile,
    earnedBadges,
  } = useSettings();
  const { fg, sub, cardBg, cardBd, faint, inputBg, pa } = theme;

  const weightDisplay = bodyWeight ? displayWeight(bodyWeight, unitSystem) : null;
  const targetDisplay = displayVolume(hydrationTarget, unitSystem);

  const calcTargetFromWeight = () => {
    if (!bodyWeight) return;
    setHydrationTarget(Math.round(bodyWeight / 2));
  };

  const heightIn = profile.height
    ? (unitSystem === 'metric' ? parseFloat(profile.height) / 2.54 : parseFloat(profile.height))
    : 0;
  const bmi = bodyWeight && heightIn > 0
    ? (bodyWeight / (heightIn * heightIn) * 703).toFixed(1)
    : null;

  return (
    <div style={{ padding: '8px 16px 24px' }}>

      {/* Personal Info */}
      <div style={{ background: cardBg, borderRadius: 14, padding: 16, border: `1px solid ${cardBd}`, marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: fg, marginBottom: 12 }}>Personal Info</div>

        {/* Gender */}
        <div style={{ fontSize: 12, fontWeight: 600, color: sub, marginBottom: 6 }}>Gender</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {['male', 'female'].map(g => (
            <button
              key={g}
              onClick={() => setProfile({ ...profile, gender: g })}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                textTransform: 'capitalize',
                border: `2px solid ${profile.gender === g ? '#42a5f5' : cardBd}`,
                background: profile.gender === g ? (theme.dark ? '#1a2a3a' : '#e3f2fd') : 'transparent',
                color: profile.gender === g ? '#42a5f5' : sub,
              }}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Height + Body Fat */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: sub, marginBottom: 4 }}>
              Height ({unitSystem === 'metric' ? 'cm' : 'in'})
            </div>
            <input
              type="number"
              value={profile.height || ''}
              placeholder={unitSystem === 'metric' ? '178' : '70'}
              onChange={e => setProfile({ ...profile, height: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${cardBd}`, fontSize: 14, background: inputBg, color: fg }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: sub, marginBottom: 4 }}>Body Fat % (optional)</div>
            <input
              type="number"
              value={profile.bodyFatPct || ''}
              placeholder="e.g. 20"
              onChange={e => setProfile({ ...profile, bodyFatPct: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${cardBd}`, fontSize: 14, background: inputBg, color: fg }}
            />
          </div>
        </div>
      </div>

      {/* Weight Tracker */}
      <WeightTracker theme={theme} />

      {/* Hydration */}
      <div style={{ background: cardBg, borderRadius: 14, padding: 16, border: `1px solid ${cardBd}`, marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: fg, marginBottom: 12 }}>Hydration Target</div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: sub, marginBottom: 4 }}>
              Daily Target ({targetDisplay.unit})
            </div>
            <input
              type="number"
              value={targetDisplay.value}
              onChange={e => {
                const val = parseInt(e.target.value) || 0;
                setHydrationTarget(unitSystem === 'metric' ? Math.round(val / 29.5735) : val);
              }}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${cardBd}`, fontSize: 14, background: inputBg, color: fg }}
            />
          </div>
          <button
            onClick={calcTargetFromWeight}
            style={{
              padding: '10px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: `1px solid ${pa}`, color: pa, marginBottom: 0,
              opacity: bodyWeight ? 1 : 0.4,
            }}
          >
            Auto from weight
          </button>
        </div>
        <div style={{ fontSize: 10, color: sub }}>
          Standard recommendation: half your body weight in oz daily
          {bodyWeight && ` (${Math.round(bodyWeight / 2)} oz / ${Math.round(bodyWeight / 2 * 29.5735)} mL)`}
        </div>
      </div>

      {/* Goals */}
      <GoalsTracker theme={theme} />

      {/* Badges */}
      <div style={{ marginBottom: 12 }}>
        <BadgeGrid earnedBadges={earnedBadges} theme={theme} />
      </div>

      {/* Units */}
      <div style={{ background: cardBg, borderRadius: 14, padding: 16, border: `1px solid ${cardBd}` }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: fg, marginBottom: 12 }}>Measurement Units</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['imperial', 'metric'].map(u => (
            <button
              key={u}
              onClick={() => setUnitSystem(u)}
              style={{
                flex: 1, padding: '10px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: `2px solid ${unitSystem === u ? '#42a5f5' : cardBd}`,
                background: unitSystem === u ? (theme.dark ? '#1a2a3a' : '#e3f2fd') : 'transparent',
                color: unitSystem === u ? '#42a5f5' : sub,
              }}
            >
              {u === 'imperial' ? 'Imperial (oz, lb, in)' : 'Metric (mL, kg, cm)'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
