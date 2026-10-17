module.exports = {
    env: {
        browser: true,
        es6: true,
    },

    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'script',
    },

    globals: {
        GM: 'readonly',
        GM_deleteValue: 'readonly',
        GM_getValue: 'readonly',
        GM_listValues: 'readonly',
        GM_setValue: 'readonly',
        GM_xmlhttpRequest: 'readonly',
    },

    rules: {
        'no-multi-spaces': 'error',
        'no-trailing-spaces': 'error',
    },
};
