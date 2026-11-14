// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
import { defineConfig } from 'vite';

// Relative base so the same dist/ works on GitHub Pages (/seyir-defteri/) and itch.io.
export default defineConfig({
  base: './',
  build: { target: 'es2022' },
});
