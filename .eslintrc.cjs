module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    // AntD Modal v5 migration guard: warn on deprecated props
    'no-restricted-syntax': [
      'warn',
      {
        selector: "JSXOpeningElement[name.name='Modal'] > JSXAttribute[name.name='destroyOnClose']",
        message: "AntD Modal v5: use `destroyOnHidden` instead of `destroyOnClose`.",
      },
      {
        selector: "JSXOpeningElement[name.name='Modal'] > JSXAttribute[name.name='bodyStyle']",
        message: "AntD Modal v5: use `styles.body` instead of `bodyStyle`.",
      },
      {
        selector: "JSXOpeningElement[name.name='Modal'] > JSXAttribute[name.name='footerStyle']",
        message: "AntD Modal v5: use `styles.footer` instead of `footerStyle`.",
      },
    ],
  },
}