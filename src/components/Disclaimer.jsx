import { useState, useEffect } from 'react';
import { getSetting, setSetting } from '../lib/db';

const KEY = 'disclaimerAcknowledged';

export const SHORT =
  'Personal record, not medical advice. Nothing here is a substitute for a qualified clinician.';

export const FULL = [
  {
    h: 'This is one person’s private log, not medical advice',
    p: 'This app was built by and for a single individual to track their own health protocol. It is a personal record. It is not medical, clinical, nutritional, or professional advice, it is not a diagnosis or a treatment plan, and it is not reviewed, endorsed, or supervised by any physician, therapist, or health authority.',
  },
  {
    h: 'Nothing here was written for you',
    p: 'The protocols, dosages, exercises, and observations reflect one person’s specific conditions, history, surgeries, and clinician conversations. They are not general recommendations. What is appropriate for one body may be useless or actively harmful for another. Do not follow any of it because you found it here.',
  },
  {
    h: 'Talk to a professional before doing anything',
    p: 'Always seek the advice of a physician or other qualified health provider with any questions about a medical condition, supplement, or exercise programme. Never disregard professional medical advice, or delay seeking it, because of something you read here. If you think you may have a medical emergency, call your doctor or emergency services immediately.',
  },
  {
    h: 'Physical risk',
    p: 'Some entries describe manual soft-tissue work, loaded stretching, eccentric loading, nerve mobilisation, breath holds, and cold exposure. These carry real risk of injury, and several carry specific risks for people with connective tissue, cardiovascular, or autonomic conditions. Undertaking any physical activity described here is done entirely at your own risk.',
  },
  {
    h: 'No warranty, no liability',
    p: 'This software and its content are provided “as is”, without warranty of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, accuracy, and non-infringement. In no event shall the author be liable for any claim, damages, injury, or other liability, whether in an action of contract, tort, or otherwise, arising from or in connection with this software or its use.',
  },
  {
    h: 'Your data',
    p: 'Everything you enter stays in your own browser’s local storage on your own device. Nothing is transmitted to any server and the author cannot see it. Clearing your browser data will delete it permanently, so use the export button if you want a backup.',
  },
  {
    h: 'Third-party photographs',
    p: 'Reference photographs come from the Free Exercise DB (github.com/yuhonas/free-exercise-db), released into the public domain under the Unlicense. They illustrate general movement patterns and are not instructions from the people depicted, who have no connection to this project.',
  },
];

/* Shown once per device until acknowledged. Deliberately blocking: the
   content includes loaded stretching and nerve work, and a public URL
   means the first visitor may not be the person it was written for. */
export default function Disclaimer({ theme }) {
  const { fg, sub, cardBg, cardBd, pa, bg } = theme;
  const [ack, setAck] = useState(null);

  useEffect(() => {
    getSetting(KEY).then(v => setAck(v === true));
  }, []);

  if (ack === null || ack === true) return null;

  const accept = () => {
    setAck(true);
    setSetting(KEY, true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Important notice before using this app"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000, background: bg,
        overflowY: 'auto', padding: '24px 16px 32px',
      }}
    >
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: fg, margin: '0 0 4px' }}>
          Before you use this
        </h2>
        <p style={{ fontSize: 12.5, lineHeight: 1.6, color: sub, margin: '0 0 16px' }}>
          If you have arrived here from a search engine or a link, please read this.
          It is short and it matters.
        </p>

        {FULL.map((s, i) => (
          <div
            key={i}
            style={{
              background: cardBg, border: `1px solid ${cardBd}`,
              borderRadius: 10, padding: '11px 13px', marginBottom: 8,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: fg, marginBottom: 4 }}>
              {s.h}
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.6, color: sub }}>{s.p}</div>
          </div>
        ))}

        <button
          onClick={accept}
          style={{
            width: '100%', marginTop: 8, padding: '13px 16px', fontSize: 14,
            fontWeight: 600, borderRadius: 10, color: '#fff', background: pa,
          }}
        >
          I understand — this is not medical advice
        </button>
      </div>
    </div>
  );
}
