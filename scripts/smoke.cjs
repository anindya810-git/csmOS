// Render smoke test: mounts every dashboard with fixture data in jsdom and
// fails loudly on runtime errors that `vite build` cannot catch (TDZ,
// undefined refs, crashes in row rendering). Run with: npm run smoke
const { buildSync } = require('esbuild');
const path = require('path');

buildSync({
  entryPoints: [path.join(__dirname, '__mount_test.jsx')],
  bundle: true,
  outfile: '/tmp/mount-test-bundle.cjs',
  format: 'cjs',
  platform: 'node',
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"development"' },
  loader: { '.js': 'jsx' },
  logLevel: 'error',
});

require('./__mount_runner.cjs');
