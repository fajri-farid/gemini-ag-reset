const config = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "header-max-length": [2, "always", 150],
    "body-max-line-length": [2, "always", 100],
    "footer-max-line-length": [2, "always", 100],
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "chore",
        "ci",
        "build",
        "revert",
      ],
    ],
  },
};

export default config;
