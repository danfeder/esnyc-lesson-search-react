Create a new React component. The component name should be provided as an argument: /new-component ComponentName

Before creating:
1. Confirm the component doesn't affect the 11 filter count (if filter-related, stop and discuss)
2. Determine the appropriate feature folder under `src/components/`

Create the component following these patterns:
- Use named exports (no default exports)
- Define `interface ComponentNameProps { }` for props
- Add `// eslint-disable-next-line no-unused-vars` above callback prop types
- Use `@/` path aliases for imports
- Add to the barrel export in the feature folder's `index.ts`

After creation, run `npm run type-check` to verify.
