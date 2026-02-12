import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import swc from 'unplugin-swc';

export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  resolve: {
    alias: [
      {
        find: /^@\/generated\/(.*)/,
        replacement: resolve(__dirname, 'prisma/generated/prisma/$1'),
      },
      {
        find: /^@\/(.*)/,
        replacement: resolve(__dirname, 'src/$1'),
      },
    ],
  },
  test: {
    include: ['test/**/*.e2e-spec.ts'],
    testTimeout: 30000,
    fileParallelism: false,
    globalSetup: ['./test/setup-e2e.ts'],
  },
});
