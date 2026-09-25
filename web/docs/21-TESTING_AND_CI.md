# Testing & CI/CD

## Overview

Comprehensive test suite for backend and frontend with continuous integration.

## Backend Tests

### Structure

```
apps/api/src/test/
├── setup.ts          # Test DB setup, migrations
├── helpers.ts        # Test data factories
├── money.test.ts     # Unit tests: fare calculation
├── auth.test.ts      # Integration: login, refresh
└── tickets.test.ts   # Integration: issue, batch, verify, void
```

### Running Tests

```bash
cd apps/api

# Run all tests
npm run test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

### Test Database

Tests use separate database `eticket_test`:

```bash
# Create test database
createdb eticket_test

# Or with Docker
docker exec -it postgres createdb -U postgres eticket_test
```

### Coverage Targets

| Module            | Target | Current |
| ----------------- | ------ | ------- |
| Money calculation | 100%   | ✅      |
| Auth              | 90%+   | 📝      |
| Tickets           | 90%+   | 📝      |
| Finance           | 80%+   | ⏳      |
| Sync              | 80%+   | ⏳      |

## Frontend Tests

### Structure

```
artifacts/transit-eticket/src/test/
├── setup.ts           # Test environment setup
├── utils.tsx          # Render helpers with providers
├── money-utils.test.ts
├── offline-queue.test.ts
└── components.test.tsx
```

### Running Tests

```bash
cd artifacts/transit-eticket

# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# With coverage
pnpm test:coverage
```

## CI/CD Pipelines

### Backend CI (`.github/workflows/backend-ci.yml`)

```yaml
Triggers: Push to main/develop, PR to main

Jobs:
  test:
    - Start PostgreSQL service
    - Install dependencies
    - Build shared packages
    - Run migrations
    - Run tests with coverage
    - Upload to Codecov

  lint:
    - TypeScript type checking
```

### Frontend CI (`.github/workflows/frontend-ci.yml`)

```yaml
Triggers: Push to main/develop, PR to main

Jobs:
  test:
    - Install dependencies (pnpm)
    - Run tests with coverage
    - Build production bundle
    - Upload to Codecov

  lint:
    - TypeScript type checking
```

## Writing New Tests

### Backend Test Example

```typescript
import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app";
import { createTestUser, generateTestToken } from "./helpers";

describe("New Feature", () => {
  it("should do something", async () => {
    const user = await createTestUser();
    const token = generateTestToken({
      userId: user.id,
      role: "TICKETER",
      stationId: null,
    });

    const res = await request(app)
      .post("/api/v1/endpoint")
      .set("Authorization", `Bearer ${token}`)
      .send({ data: "test" });

    expect(res.status).toBe(200);
  });
});
```

### Frontend Test Example

```typescript
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "./utils";
import MyComponent from "@/components/my-component";

describe("MyComponent", () => {
  it("renders correctly", () => {
    renderWithProviders(<MyComponent />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("handles user interaction", async () => {
    const onClick = vi.fn();
    render(<MyComponent onClick={onClick} />);

    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalled();
  });
});
```

## Test Checklist

Before deploying, verify:

- [ ] All tests pass locally
- [ ] Coverage meets targets
- [ ] No console errors in tests
- [ ] TypeScript compiles without errors
- [ ] Build succeeds
- [ ] CI pipeline passes

## Future Testing Needs

| Area                     | Priority | Effort |
| ------------------------ | -------- | ------ |
| E2E tests (Playwright)   | High     | 1 week |
| Mobile app tests (Detox) | Medium   | 1 week |
| Load testing (k6)        | Medium   | 3 days |
| Security testing (OWASP) | High     | 1 week |
| Accessibility testing    | Low      | 3 days |
