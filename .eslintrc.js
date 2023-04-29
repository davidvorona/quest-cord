module.exports = {
    root: true,
    parser: "@typescript-eslint/parser",
    env: {
        node: true,
        es6: true
    },
    plugins: [
        "@typescript-eslint",
    ],
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
    ],
    rules: {
        "semi": "off",
        "@typescript-eslint/semi": ["error", "always"],
        "quotes": "off",
        "@typescript-eslint/quotes": ["error", "double"],
        "indent": "off",
        "@typescript-eslint/indent": [
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
        "no-console": ["warn", { "allow": ["warn", "error", "info"] }]
    }
};
