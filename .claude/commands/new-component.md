Create a new React component. The component name should be provided as an argument: /new-component ComponentName

Before creating:
1. If filter-related, consult stakeholders before modifying filter categories
2. Determine the appropriate feature folder under `src/components/`

Create the component following these patterns:
- Use named exports (no default exports)
- Define `interface ComponentNameProps { }` for props
- Add `// eslint-disable-next-line no-unused-vars` above callback prop types
- Use `@/` path aliases for imports
- Import components by direct path (`@/components/FeatureName/ComponentName`); do not create or extend barrel `index.ts` files (only `Internal/` and `Schools/` keep one)

After creation, run `npm run type-check` to verify.
