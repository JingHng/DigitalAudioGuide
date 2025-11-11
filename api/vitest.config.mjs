import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.{js,mjs,ts}'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.js',
        '**/generated/**',
        'prisma/**',
      ],
    },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  esbuild: {
    target: 'node18',
  },
});

