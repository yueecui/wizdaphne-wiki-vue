/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution');

module.exports = {
    root: true,
    env: {
        'vue/setup-compiler-macros': true,
        browser: true,
        es6: true,
    },
    extends: [
        'plugin:vue/vue3-essential',
        'eslint:recommended',
        '@vue/eslint-config-typescript/recommended',
        '@vue/eslint-config-prettier',
        'prettier',
    ],
    rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        'vue/no-mutating-props': 'off',
        'vue/valid-template-root': 'off',
    },
    ignorePatterns: ['*.config.js'],
};
