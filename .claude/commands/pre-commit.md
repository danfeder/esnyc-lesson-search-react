Run pre-commit checks for this project. Execute these commands and report any issues:

1. Run `npm run type-check` - TypeScript must pass
2. Run `npm run lint` - ESLint must pass
3. Run `npm run test:run` - Tests must pass (use `test:run`, not `npm run test` which is vitest watch mode and never exits)

If any checks fail, analyze the errors and suggest fixes. Do not proceed to create a commit - just report the results.
