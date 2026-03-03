# Code Coverage Setup Guide

This project is configured with Jest for unit testing and code coverage reporting. Coverage reports are automatically generated on each pull request and available as GitHub artifacts.

## Overview

- **Test Framework**: Jest with React Testing Library
- **Coverage Tool**: Jest built-in coverage
- **Coverage Threshold**: 80% (statements, branches, functions, lines)
- **CI/CD Integration**: GitHub Actions

## Running Tests Locally

```bash
# Run all tests once
npm run test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Coverage Report

After running `npm run test:coverage`, a detailed HTML report is generated in `coverage/lcov-report/index.html`.

Coverage is tracked across:
- **Statements**: Individual statements in the code
- **Branches**: Conditional paths (if/else)
- **Functions**: Function definitions
- **Lines**: Individual lines of code

## Writing Tests

### File Structure

Tests should be placed in `__tests__` subdirectories or use `.test.ts`/`.test.tsx` naming:

```
src/
├── lib/
│   ├── utils/
│   │   ├── weatherCodes.ts
│   │   └── __tests__/
│   │       └── weatherCodes.test.ts
├── components/
│   ├── WeatherContainer.tsx
│   └── __tests__/
│       └── WeatherContainer.test.tsx
```

### Example: Testing Utility Functions

```typescript
// src/lib/utils/__tests__/weatherCodes.test.ts
import { getWeatherDescription } from '@/lib/utils/weatherCodes';

describe('getWeatherDescription', () => {
  it('should return correct description for clear sky', () => {
    expect(getWeatherDescription(0)).toBe('Clear sky');
  });

  it('should return "Unknown" for unmapped code', () => {
    expect(getWeatherDescription(9999)).toBe('Unknown');
  });
});
```

### Example: Testing React Components

```typescript
// src/components/__tests__/MyComponent.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { MyComponent } from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should render content', async () => {
    render(<MyComponent />);
    
    await waitFor(() => {
      expect(screen.getByText('Expected text')).toBeInTheDocument();
    });
  });
});
```

## GitHub Actions Integration

The CI pipeline includes a dedicated `coverage` job that:

1. Runs all tests with coverage collection
2. Uploads coverage report to Codecov (optional)
3. Posts a coverage summary comment on pull requests
4. Archives the coverage report as a GitHub artifact

### Viewing Coverage on PRs

When you open a pull request, a comment with the coverage summary will be automatically posted:

```
## 📊 Code Coverage Report

| Metric | Coverage |
|--------|----------|
| Statements | 85.50% |
| Branches | 75.00% |
| Functions | 100.00% |
| Lines | 85.50% |
```

### Accessing Coverage Reports

Coverage artifacts are available for 30 days:

1. Go to the GitHub Actions run for your PR
2. Scroll down to "Artifacts"
3. Download `coverage-report.zip`
4. Extract and open `lcov-report/index.html` in your browser

## Configuration Files

### jest.config.ts

Main Jest configuration file that:
- Sets up Next.js support via `next/jest`
- Configures test environments (jsdom for React)
- Defines coverage thresholds (80%)
- Specifies which files to include in coverage

### jest.setup.ts

Runs before each test suite:
- Imports testing library matchers
- Mocks Next.js modules (router, image, etc.)

## Best Practices

1. **Aim for 80% coverage**: This is the configured threshold
2. **Test behavior, not implementation**: Focus on what the code does, not how
3. **Use descriptive test names**: Should clearly describe what is being tested
4. **Mock external dependencies**: APIs, routers, etc.
5. **Test edge cases**: Error scenarios, empty states, etc.

## Excluding Files from Coverage

The following are already excluded:
- TypeScript declaration files (`.d.ts`)
- Storybook files (`.stories.tsx`)
- Test files themselves (`__tests__/`, `.test.ts`, `.test.tsx`)
- CSS modules

To exclude additional files, update the `collectCoverageFrom` array in `jest.config.ts`.

## Troubleshooting

### Tests fail with "Cannot find module"
- Ensure path aliases are configured in both `tsconfig.json` and `jest.config.ts`

### Mock not working
- Clear jest cache: `npx jest --clearCache`
- Check that the module path in the mock matches the import

### Coverage thresholds not met
- Run `npm run test:coverage` to see which files need more tests
- Add tests to increase coverage until thresholds are met

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Best Practices](https://testing-library.com/docs/queries/about)
