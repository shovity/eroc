module.exports = {
    env: {
        commonjs: true,
        es2021: true,
        node: true,
    },
    extends: ['plugin:prettier/recommended', 'eslint:recommended'],
    overrides: [],
    parserOptions: {
        ecmaVersion: 'latest',
    },
    rules: {
        'no-unused-vars': [
            'error',
            {
                argsIgnorePattern: '^_|^next$',
            },
        ],
    },
    globals: {
        check: true,
    },
}
