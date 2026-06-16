import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

const typedFiles = ["src/**/*.ts", "test/**/*.ts"];

export default tseslint.config(
    {
        ignores: ["dist/**", "coverage/**", "*.vsix", "node_modules/**"],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked.map((config) => ({
        ...config,
        files: typedFiles,
    })),
    {
        files: typedFiles,
        languageOptions: {
            globals: {
                ...globals.node,
            },
            parserOptions: {
                project: "./tsconfig.json",
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            "@typescript-eslint/consistent-type-imports": "error",
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/no-misused-promises": "error",
            "@typescript-eslint/only-throw-error": "error",
            "@typescript-eslint/require-await": "error",
        },
    },
    {
        files: ["*.mjs", "scripts/**/*.mjs"],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
);
