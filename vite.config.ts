import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

function normalizeSupabaseUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined;
  const trimmed = rawUrl.trim();
  if (!trimmed) return undefined;
  try {
    const parsed = new URL(trimmed);
    if (/\/(rest|auth|storage|realtime)\/v1/i.test(parsed.pathname)) {
      return `${parsed.protocol}//${parsed.host}`;
    }
    const cleanPath = parsed.pathname.replace(/\/+$/, '');
    return `${parsed.protocol}//${parsed.host}${cleanPath}`;
  } catch {
    return trimmed
      .replace(/(?:\/+(?:rest|auth|storage|realtime)\/v1)+\/?$/i, '')
      .replace(/\/+$/, '');
  }
}

export default defineConfig(({mode}) => {
  const loadedEnv = loadEnv(mode, process.cwd(), 'VITE_');
  const normalizedSupabaseUrl = normalizeSupabaseUrl(
    process.env.VITE_SUPABASE_URL || loadedEnv.VITE_SUPABASE_URL
  );
  if (normalizedSupabaseUrl) {
    process.env.VITE_SUPABASE_URL = normalizedSupabaseUrl;
  }

  return {
    define: normalizedSupabaseUrl
      ? {
          'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(normalizedSupabaseUrl),
        }
      : undefined,
    plugins: [
      react(),
      tailwindcss(),
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
