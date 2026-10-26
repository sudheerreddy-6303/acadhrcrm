import { useEffect, useRef, useState } from 'react';

// Loading indicator used wherever the app shows "Loading…".
//   <Loader label="Loading teachers…" />            big: plays the AcadHr logo video
//   <Loader size="sm" inline label="Loading…" />    small spinner (headers / buttons)
// The video (public/loading.mp4, ~127 KB, muted, looping) shows a still logo
// frame instantly, and falls back to that still image when the phone has
// "reduce motion" or "data saver" turned on.

function prefersStill() {
  try {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
    const c = navigator.connection;
    if (c && (c.saveData || /(^|-)2g$/.test(String(c.effectiveType || '')))) return true;
  } catch (_) { /* ignore */ }
  return false;
}

function LoadingVideo() {
  const ref = useRef(null);
  const [still] = useState(prefersStill);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true; // required for autoplay on phones
    const p = v.play();
    if (p && p.catch) p.catch(() => { /* autoplay blocked: the still frame stays */ });
  }, []);
  if (still) return <img className="app-loader-video" src="/loading-poster.jpg" alt="" aria-hidden="true" />;
  return (
    <video
      ref={ref}
      className="app-loader-video"
      src="/loading.mp4"
      poster="/loading-poster.jpg"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}

export default function Loader({ label = 'Loading…', size = 'lg', inline = false }) {
  const big = size !== 'sm';
  return (
    <span className={`app-loader ${big ? 'lg' : 'sm'} ${inline ? 'inline' : ''}`} role="status" aria-live="polite">
      {big ? <LoadingVideo /> : <span className="app-loader-ring" aria-hidden="true" />}
      {label ? <span className="app-loader-label">{label}</span> : <span className="sr-only">Loading…</span>}
    </span>
  );
}
