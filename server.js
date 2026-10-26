// Production server for the CRM frontend (use instead of `vite preview`).
//   npm run build   -> creates dist/
//   npm start       -> serves dist/ on $PORT
// - gzip compression (app files ~4-5x smaller to download)
// - long browser caching for /assets (file names change on every build)
// - index.html never cached, so a new deploy shows up immediately
// - every other path returns index.html, so links like /teachers work on refresh
import express from 'express';
import compression from 'compression';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, 'dist');
const app = express();

app.disable('x-powered-by');
app.use(compression({ threshold: 1024 }));

app.use('/assets', express.static(path.join(dist, 'assets'), {
  immutable: true,
  maxAge: '365d',
  fallthrough: false,
}));

app.use(express.static(dist, {
  index: false,
  maxAge: '1h',
}));

app.get('/health', (req, res) => res.json({ ok: true }));

app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(dist, 'index.html'));
});

const PORT = process.env.PORT || 4173;
app.listen(PORT, () => console.log(`[frontend] serving dist/ on :${PORT}`));
