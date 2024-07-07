/** @type {import('vite').UserConfig} */

import { defineConfig } from 'vite';
import browserslistToEsbuild from 'browserslist-to-esbuild';
import dts from 'vite-plugin-dts';

import { coverageConfigDefaults } from 'vitest/config';
import { pathsToModuleNameMapper } from 'ts-jest';

import tsConfig from './tsconfig.json';

export default defineConfig(({ mode }) => {
  return {
    plugins: [
      dts({
        include: 'src/**/*.ts',
        outDir: 'dist',

        rollupTypes: true,
        insertTypesEntry: true,
        staticImport: true,
      }),
    ],
    build: {
      build: { target: browserslistToEsbuild() },
      sourcemap: true,
      lib: {
        entry: 'src/index.ts',
        name: 'Pocketbase',
        formats: ['es', 'cjs', 'iife', 'umd'],
      },
      rollupOptions: {
        external: ['pocketbase'],
      },
      minify: mode === 'production',
    },
    resolve: {
      alias: {
        '@': import.meta.dirname + '/src',
      },
    },
    test: {
      environment: 'happy-dom',
      setupFiles: ['./tests/setup.ts'],
      typecheck: { tsconfig: 'tsconfig.json' },
      testFiles: ['**/*.test.ts'],
      moduleNameMapper: pathsToModuleNameMapper(tsConfig.compilerOptions.paths),
      coverage: {
        reporter: ['text', 'json', 'html'],
        reportsDirectory: './tests/coverage',
        exclude: [...coverageConfigDefaults.exclude, '**/index.ts'],
      },
    },
  };
});
