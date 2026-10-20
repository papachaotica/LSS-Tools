const strings = [
    // Standard-HTML & JS Core
    'div', 'span', 'p', 'a', 'button', 'ul', 'li', 'form', 'input', 'label',
    'id', 'class', 'click', 'submit', 'change', 'GET', 'POST', 'true', 'false',

    // Bootstrap 3 Grid System
    'container', 'container-fluid', 'row', 'clearfix',
    'col-xs-', 'col-sm-', 'col-md-', 'col-lg-',
    'col-xs-offset-', 'col-sm-offset-', 'col-md-offset-', 'col-lg-offset-',

    // Bootstrap 3 & JavaScript Plugins
    'modal', 'modal-dialog', 'modal-content', 'modal-header', 'modal-body', 'modal-footer',
    'dropdown', 'dropdown-menu', 'dropdown-toggle', 'caret',

    'navbar', 'navbar-default', 'navbar-inverse', 'navbar-fixed-top', 'navbar-brand', 'navbar-toggle', 'navbar-collapse',
    'nav', 'nav-tabs', 'nav-pills', 'nav-stacked',

    'btn', 'btn-default', 'btn-primary', 'btn-success', 'btn-info', 'btn-warning', 'btn-danger', 'btn-link', 'btn-xs',
    'btn-lg', 'btn-md', 'btn-sm', 'btn-xs', 'btn-block',

    'form-group', 'form-control', 'input-group', 'input-group-addon', 'checkbox', 'radio',

    'alert', 'alert-success', 'alert-info', 'alert-warning', 'alert-danger',
    'panel', 'panel-default', 'panel-heading', 'panel-body', 'panel-footer',
    'list-group', 'list-group-item', 'well', 'jumbotron', 'badge',
    'label',

    // values
    '[0-9]+%', 'none', 'all', '[1-9]+px', 

    // Utility & Status
    'pull-left', 'pull-right', 'center-block',

    'text-left', 'text-right', 'text-center', 'text-justify', 'text-muted', 'text-primary', 'text-success', 'text-info', 'text-warning', 'text-danger',
    'bg-primary', 'bg-success', 'bg-info', 'bg-warning', 'bg-danger',
    'active', 'disabled', 'hidden', 'show', 'fade', 'in',

    // Bootstrap Data
    'collapse', 'tab', 'popover', 'tooltip', 'carousel',

    // Leitstellenspiel / LSS-Manager API
    'caption', 'extensions', 'maxLevel',

    // own variables
    'lastUpdate', 'buildings', 'buildingTypes', 'vehicles', 'vehicleTypes', 'templates',
];

const expressionsFunctionText = [ 'append', ];
const expessionsCall =
    `CallExpression:not(:has(MemberExpression > Identifier[name='append'])) > Literal[raw=/^"/]`;


const regex = `^"(${strings.join("|")})"$`;
const selector = `Literal[raw=/${regex}/]`;

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

        'quotes': 'off',
        'max-len': [
            'error',
            {
                'code': 80,
                'tabWidth': 4,
                'ignoreStrings': true,
                'ignoreTemplateLiterals': true,
                'ignoreRegExpLiterals': true,
                'ignoreComments': true,
            },
        ],

        'indent': [
            'error',
            //4,
            2,
            {
                'SwitchCase': 1,
                'VariableDeclarator': 2, // 2 * 2 = 4 Spaces für Variablen im Code
                'outerIIFEBody': 1,
                'MemberExpression': 1,
                'FunctionDeclaration': { 'body': 2, 'parameters': 2 }, // 2 * 2 = 4 Spaces für Funktionen
                'FunctionExpression': { 'body': 2, 'parameters': 2 },   // 2 * 2 = 4 Spaces für anonyme Funktionen
                'ObjectExpression': 1,
                'ArrayExpression': 1,
            },
           /* {
                'SwitchCase': 1,
                'ignoredNodes': [
                    'ObjectExpression',
                    'ArrayExpression',
                    'Property'
                ],

            },*/
        ],

        'no-restricted-syntax': [
            'error',
            {
                selector: selector,
                message: `Rule: technical strings need (' exemplars).`,
            },
            {
                selector: `Property[computed=false] > Literal.key[raw=/^\"/]`,
                message: `Rule: Object keys must use single quotes (').`,
            },
            {
                selector: `MemberExpression[computed=true] > Literal[raw=/^\"/]`,
                message: `Rule: Technical property access in brackets must use single quotes (e.g. ['main'] instead of [\"main\"]).`,
            },
            {
                selector: expessionsCall,
                message: `Rule: Technical arguments in function calls must use single quotes (').`,
            },
        ],
    },
};
