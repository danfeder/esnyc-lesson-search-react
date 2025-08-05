# Contributing to ESYNYC Lesson Search

Thank you for your interest in contributing to the ESYNYC Lesson Search project! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing Requirements](#testing-requirements)
- [Submitting Changes](#submitting-changes)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please be respectful and considerate in all interactions.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/esnyc-lesson-search-react.git`
3. Add upstream remote: `git remote add upstream https://github.com/danfeder/esnyc-lesson-search-react.git`
4. Create a feature branch: `git checkout -b feature/your-feature-name`

## Development Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account (for backend development)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Add your Supabase credentials to .env
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Start development server
npm run dev
```

### Database Setup

If working with database changes:

1. Set up a Supabase project
2. Run migrations: `supabase db push`
3. Import test data: `npm run import-data`

## Making Changes

### Branch Naming Convention

- `feature/` - New features (e.g., `feature/add-print-view`)
- `fix/` - Bug fixes (e.g., `fix/search-pagination`)
- `docs/` - Documentation updates (e.g., `docs/update-setup-guide`)
- `refactor/` - Code refactoring (e.g., `refactor/simplify-filter-logic`)
- `test/` - Test additions/updates (e.g., `test/add-filter-tests`)

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
type(scope): subject

body

footer
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions/changes
- `chore`: Build process or auxiliary tool changes

Examples:
```
feat(search): add fuzzy matching support
fix(filters): correct grade level sorting
docs(readme): update installation instructions
```

## Code Style Guidelines

### TypeScript/React

- Use functional components with hooks
- Prefer interfaces over types for object shapes
- Use explicit types for function parameters and return values
- Export component props interfaces
- Use path aliases (`@/components` instead of relative imports)

### File Organization

```
src/
├── components/     # Reusable UI components
│   └── [Feature]/  # Feature-specific components
├── hooks/          # Custom React hooks
├── lib/            # External service configurations
├── pages/          # Page-level components
├── stores/         # Zustand state stores
├── types/          # TypeScript type definitions
└── utils/          # Helper functions
```

### Import Order

1. React imports
2. Third-party libraries
3. Local components
4. Hooks
5. Utils/constants
6. Types
7. Styles

### Formatting

The project uses Prettier for code formatting:

```bash
# Format all files
npm run format

# Check formatting
npm run lint
```

## Testing Requirements

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Writing Tests

- Place test files next to the components they test
- Use `.test.tsx` or `.spec.tsx` extensions
- Test user interactions, not implementation details
- Aim for meaningful coverage, not 100%

Example test structure:
```typescript
describe('ComponentName', () => {
  it('should render correctly', () => {
    // Test default rendering
  });

  it('should handle user interaction', () => {
    // Test click handlers, form submissions, etc.
  });

  it('should display error states', () => {
    // Test error handling
  });
});
```

## Submitting Changes

### Pull Request Process

1. Update your fork with the latest upstream changes:
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. Rebase your feature branch:
   ```bash
   git checkout feature/your-feature
   git rebase main
   ```

3. Push to your fork:
   ```bash
   git push origin feature/your-feature
   ```

4. Create a Pull Request on GitHub

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Added new tests for changes
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No console.logs left in code
```

### Review Process

1. All PRs require at least one review
2. Address reviewer feedback
3. Keep PRs focused and small when possible
4. Update PR description with any changes

## Reporting Issues

### Bug Reports

When reporting bugs, please include:

- Clear description of the issue
- Steps to reproduce
- Expected behavior
- Actual behavior
- Browser/OS information
- Screenshots if applicable
- Error messages from console

### Feature Requests

For feature requests, please provide:

- Use case description
- Proposed solution
- Alternative solutions considered
- Mockups/examples if applicable

## Questions?

Feel free to:
- Open an issue for clarification
- Reach out to maintainers
- Check existing issues and PRs

Thank you for contributing to ESYNYC Lesson Search!