import { BADGES, BADGE_CATEGORIES } from '../data/badges';

export default function BadgeGrid({ earnedBadges = {}, theme }) {
  const { fg, sub, cardBg, cardBd, faint, pa } = theme;
  const badges = earnedBadges || {};

  const totalEarned = BADGES.filter(b => badges[b.id]?.earned).length;

  return (
    <div style={{ background: cardBg, borderRadius: 14, padding: 16, border: `1px solid ${cardBd}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: fg }}>Badges</div>
        <div style={{ fontSize: 11, color: sub }}>{totalEarned}/{BADGES.length} earned</div>
      </div>

      {BADGE_CATEGORIES.map(cat => {
        const catBadges = BADGES.filter(b => b.category === cat.id);
        const catEarned = catBadges.filter(b => badges[b.id]?.earned).length;

        return (
          <div key={cat.id} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: sub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {cat.name} ({catEarned}/{catBadges.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {catBadges.map(badge => {
                const status = earnedBadges[badge.id] || { earned: false, progress: 0 };
                const earned = status.earned;

                return (
                  <div
                    key={badge.id}
                    style={{
                      width: 72, textAlign: 'center', padding: '8px 4px',
                      borderRadius: 10, border: `1px solid ${earned ? pa : cardBd}`,
                      background: earned ? (theme.dark ? '#1a2a2a' : '#f0f8ff') : faint,
                      opacity: earned ? 1 : 0.5,
                    }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 2 }}>{badge.icon}</div>
                    <div style={{ fontSize: 9, fontWeight: 600, color: earned ? fg : sub, lineHeight: 1.2 }}>
                      {badge.name}
                    </div>
                    {earned && status.date && (
                      <div style={{ fontSize: 8, color: sub, marginTop: 2 }}>{status.date}</div>
                    )}
                    {!earned && status.progress > 0 && (
                      <div style={{ marginTop: 3, height: 3, background: cardBd, borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${status.progress * 100}%`, background: pa, borderRadius: 2 }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
