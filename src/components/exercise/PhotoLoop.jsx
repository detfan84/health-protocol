import { useState } from 'react';

const BASE = 'bodywork-images';

/* Two frames — the start and end of the movement — crossfaded on a loop,
   with a pause control and prefers-reduced-motion honoured.
   Photographs: Free Exercise DB (github.com/yuhonas/free-exercise-db),
   released into the public domain under the Unlicense. */
export default function PhotoLoop({ shot, theme }) {
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [paused, setPaused] = useState(reduced);
  const { sub, fg } = theme;

  return (
    <figure style={{ margin: '0 0 10px' }}>
      <div className={`bw-frames${paused ? ' bw-paused' : ''}`}>
        <img
          src={`${import.meta.env.BASE_URL}${BASE}/${shot.set}_0.jpg`}
          alt={shot.cap}
          loading="lazy"
          decoding="async"
        />
        <img
          className="bw-b"
          src={`${import.meta.env.BASE_URL}${BASE}/${shot.set}_1.jpg`}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
        />
        <button
          type="button"
          className="bw-pp"
          aria-label="Pause or play this movement"
          onClick={() => setPaused(p => !p)}
        >
          {paused ? 'Play' : 'Pause'}
        </button>
      </div>
      <figcaption style={{ fontSize: 11, lineHeight: 1.5, color: sub, marginTop: 5 }}>
        {shot.approx && (
          <em style={{ color: fg, fontStyle: 'italic', fontWeight: 600 }}>
            Close, not exact.{' '}
          </em>
        )}
        {shot.cap}
      </figcaption>
    </figure>
  );
}
