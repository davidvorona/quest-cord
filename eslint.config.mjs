// @ts-check
import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
    eslint.configs.recommended,
    tseslint.configs.recommended,
    {
        rules: {
            "semi": ["error", "always"],
            "quotes": ["error", "double"],
            "indent": [
                "error", 4, { "MemberExpression": 1, "SwitchCase": 0 }
            ],
            "max-len": ["error", { "code": 100 }],
            "no-trailing-spaces": ["error", {}],
            "space-before-function-paren": ["error", {
                "anonymous": "always",
                "named": "never",
                "asyncArrow": "always"
            }],
            "space-in-parens": ["error", "never"],
            "eol-last": ["error", "always"],
            "no-console": ["warn", { "allow": ["warn", "error", "info"] }],
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": ["error", { "caughtErrors": "none" }]
        }
    }
);
