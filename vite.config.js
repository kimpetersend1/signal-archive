import { defineConfig } from 'vite';
import { createReadStream, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Deliberately serve the unlicensed reference image ONLY from the local dev server.
// It is not placed in public/ and is never bundled into dist/.
function privateReferencePreview() {
  return {
    name: 'private-reference-preview',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__local_reference/wallhaven-jel1jq.jpg', (req, res) => {
        const file = resolve(process.cwd(), 'reference/wallhaven-jel1jq.jpg');
        if (!existsSync(file)) { res.writeHead(404); res.end('Not found'); return; }
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'no-store');
        createReadStream(file).pipe(res);
      });
    }
  };
}
export default defineConfig({ plugins: [privateReferencePreview()] });
