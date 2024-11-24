import simpleImportSort from "eslint-plugin-simple-import-sort";
import unusedImports from "eslint-plugin-unused-imports";
import _import from "eslint-plugin-import";
import { fixupPluginRules } from "@eslint/compat";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [...compat.extends(
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/stylistic",
    "plugin:prettier/recommended",
), {
    plugins: {
        "simple-import-sort": simpleImportSort,
        "unused-imports": unusedImports,
        import: fixupPluginRules(_import),
    },

    languageOptions: {
        parser: tsParser,
        ecmaVersion: 2020,
        sourceType: "script",
    },

    rules: {
        "comma-dangle": ["error", "always-multiline"],

        "no-underscore-dangle": ["warn", {
            allowAfterThis: true,
        }],

        "import/extensions": "off",

        "import/no-duplicates": ["error", {
            "prefer-inline": true,
        }],

        "unused-imports/no-unused-imports": "error",

        "@typescript-eslint/no-unused-vars": ["off", {
            ignoreRestSiblings: true,
        }],

        "@typescript-eslint/consistent-type-imports": ["warn", {
            fixStyle: "inline-type-imports",
        }],

        "import/consistent-type-specifier-style": ["warn", "prefer-inline"],
        "simple-import-sort/imports": "warn",
    },
}];