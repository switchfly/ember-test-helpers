module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2017,
  },
  plugins: ['node', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:node/recommended',
    'plugin:prettier/recommended',
  ],
  env: {
    node: true,
  },
  rules: { },
  overrides: [
    // test files
    {
      files: [
        '__tests__/**/*.js',
      ],
      env: {
        jest: true,
      },
      rules: {
        'node/no-unpublished-require': 'off',
      },
    },
  ],
};
