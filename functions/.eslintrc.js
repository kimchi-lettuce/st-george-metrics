module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["./functions/tsconfig.json", "./functions/tsconfig.dev.json"],
    ecmaVersion: 2018,
    sourceType: "module",
  },
  ignorePatterns: [
    "/lib/**/*", // Ignore built files.
    "/scripts/**/*", // Ignore script files.
  ],
  plugins: [
    "@typescript-eslint",
  ],
  rules: {
    // Enable rules that help catch common mistakes.
    "no-constant-condition": "warn", // Warn if a condition always evaluates to true/false.
    "no-unreachable": "warn", // Warn about unreachable code after return, throw, continue, and break statements.
    "no-redeclare": "warn", // Warn about redeclaring variables.
    "no-shadow": "warn", // Warn about variable declarations that shadow variables declared in the outer scope.
    "no-console": "off", // Allow the use of console (useful for Cloud Functions logs).

    // Disable the base rule as it can report incorrect errors for TS
    "no-unused-vars": "off",
    // Enable the TypeScript-specific rule
    "@typescript-eslint/no-unused-vars": ["warn", {
      // Add options here to fit your project's needs
      "vars": "all",
      "args": "after-used",
      "ignoreRestSiblings": true,
      "argsIgnorePattern": "^_"
    }],
    "@typescript-eslint/no-explicit-any": "off", // Allow the use of the `any` type.

    // Turn off formatting-specific rules to avoid being too opinionated.
    "indent": "off",
    "linebreak-style": "off",
    "quotes": "off",
    "semi": "off",
    "comma-dangle": "off",
    "object-curly-spacing": "off",
    "@typescript-eslint/indent": "off",
    "@typescript-eslint/quotes": "off",
    "@typescript-eslint/semi": "off",
    "@typescript-eslint/member-delimiter-style": "off",
  },
};
