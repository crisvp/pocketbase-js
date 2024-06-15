/** @type {import('vite').UserConfig} */

import { defineConfig } from "vite";
import browserslistToEsbuild from "browserslist-to-esbuild";
import dts from "vite-plugin-dts";

export default defineConfig(({ mode }) => {
    return {
        plugins: [
            dts({
                include: "src/**/*.ts",
                outDir: "dist",

                rollupTypes: true,
                insertTypesEntry: true,
                staticImport: true,
            }),
        ],
        build: {
            build: { target: browserslistToEsbuild() },
            lib: {
                entry: "src/index.ts",
                name: "Pocketbase",
                formats: ["es", "cjs", "iife", "umd"],
            },
            rollupOptions: {
                external: ["pocketbase"],
            },
            minify: mode === "production",
        },
        resolve: {
            alias: {
                "@": import.meta.dirname + "/src",
            },
        },
        test: {
            typecheck: {
                tsconfig: "tsconfig.test.json",
            },
            testFiles: ["**/*.test.ts"],
            transform: {
                "^.+\\.ts$": "ts-jest",
            },
        },
    };
});
