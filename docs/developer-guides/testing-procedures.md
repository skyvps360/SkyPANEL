# SkyPANEL Testing Procedures Guide

This guide outlines the testing procedures and best practices for the SkyPANEL application, covering unit testing, integration testing, end-to-end testing, and manual testing approaches.

## Table of Contents

1. [Testing Overview](#testing-overview)
2. [Testing Tools and Framework](#testing-tools-and-framework)
3. [Unit Testing](#unit-testing)
4. [Integration Testing](#integration-testing)
5. [End-to-End Testing](#end-to-end-testing)
6. [API Testing](#api-testing)
7. [Performance Testing](#performance-testing)
8. [Security Testing](#security-testing)
9. [Manual Testing](#manual-testing)
10. [Continuous Integration](#continuous-integration)
11. [Test Coverage](#test-coverage)

## Testing Overview

SkyPANEL employs a comprehensive testing strategy to ensure code quality, functionality, and reliability. Our testing approach includes:

- **Unit Testing**: Testing individual components in isolation
- **Integration Testing**: Testing interactions between components
- **End-to-End Testing**: Testing complete user flows
- **API Testing**: Validating API endpoints and responses
- **Performance Testing**: Ensuring the application performs well under load
- **Security Testing**: Identifying and addressing security vulnerabilities
- **Manual Testing**: Human verification of functionality and user experience

All code changes should be accompanied by appropriate tests to maintain and improve the overall quality of the application.

## Testing Tools and Framework

SkyPANEL uses the following testing tools and frameworks:

### Primary Testing Framework

- **Vitest**: Fast and lightweight testing framework compatible with Vite
  - Used for unit and integration tests
  - Supports TypeScript natively
  - Provides Jest-compatible API

### Additional Testing Tools

- **Testing Library**: For testing React components
- **MSW (Mock Service Worker)**: For mocking API requests
- **Supertest**: For testing HTTP endpoints
- **Playwright**: For end-to-end testing (when needed)

### Test Utilities

- **Faker.js**: For generating test data
- **ts-mockito**: For mocking TypeScript classes and interfaces
- **vitest-mock-extended**: For creating type-safe mocks

## Unit Testing

Unit tests focus on testing individual functions, components, or modules in isolation.

### Writing Unit Tests

1. Create test files with the naming convention `*.test.ts` or `*.test.tsx`
2. Place test files alongside the code they test or in a parallel test directory
3. Use descriptive test names that explain what is being tested
4. Follow the Arrange-Act-Assert pattern
5. Mock external dependencies

### Example Unit Test (Function)

```typescript
// Function to test (utils/math.ts)
export function calculateTotal(items: { price: number; quantity: number }[]): number {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
}

// Test file (utils/math.test.ts)
import { describe, it, expect } from 'vitest';
import { calculateTotal } from './math';

describe('calculateTotal', () => {
  it('should return 0 for empty array', () => {
    // Arrange
    const items = [];
    
    // Act
    const result = calculateTotal(items);
    
    // Assert
    expect(result).toBe(0);
  });

  it('should calculate total correctly for multiple items', () => {
    // Arrange
    const items = [
      { price: 10, quantity: 2 },
      { price: 15, quantity: 1 },
      { price: 5, quantity: 3 }
    ];
    
    // Act
    const result = calculateTotal(items);
    
    // Assert
    expect(result).toBe(10 * 2 + 15 * 1 + 5 * 3); // 50
  });
});
```

### Example Unit Test (React Component)

```typescript
// Component to test (components/Button.tsx)
import React from 'react';

interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ label, onClick, disabled = false }) => {
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`btn ${disabled ? 'btn-disabled' : 'btn-primary'}`}
    >
      {label}
    </button>
  );
};

// Test file (components/Button.test.tsx)
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('should render with the correct label', () => {
    // Arrange
    const onClick = vi.fn();
    
    // Act
    render(<Button label="Click me" onClick={onClick} />);
    
    // Assert
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    // Arrange
    const onClick = vi.fn();
    
    // Act
    render(<Button label="Click me" onClick={onClick} />);
    fireEvent.click(screen.getByText('Click me'));
    
    // Assert
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    // Arrange
    const onClick = vi.fn();
    
    // Act
    render(<Button label="Click me" onClick={onClick} disabled={true} />);
    const button = screen.getByText('Click me');
    
    // Assert
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
```

### Running Unit Tests

To run all unit tests:

```bash
npm test
```

To run tests in watch mode during development:

```bash
npm run test:watch
```

To run tests for a specific file:

```bash
npm test -- path/to/file.test.ts
```

## Integration Testing

Integration tests verify that different parts of the application work together correctly.

### Writing Integration Tests

1. Focus on testing interactions between components or services
2. Use real implementations where possible, mock external dependencies
3. Test common user flows and edge cases
4. Verify that components integrate correctly with services

### Example Integration Test

```typescript
// Integration test for authentication flow
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from './LoginForm';
import { AuthProvider } from '../context/AuthContext';
import { authService } from '../services/authService';

// Mock the auth service
vi.mock('../services/authService', () => ({
  authService: {
    login: vi.fn()
  }
}));

describe('Login Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call auth service and redirect on successful login', async () => {
    // Arrange
    authService.login.mockResolvedValue({ success: true, user: { id: '123', username: 'testuser' } });
    
    // Act
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );
    
    // Fill in the form
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    
    // Assert
    expect(authService.login).toHaveBeenCalledWith('testuser', 'password123');
    await waitFor(() => {
      expect(screen.getByText(/login successful/i)).toBeInTheDocument();
    });
  });

  it('should display error message on failed login', async () => {
    // Arrange
    authService.login.mockRejectedValue(new Error('Invalid credentials'));
    
    // Act
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );
    
    // Fill in the form
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpassword' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    
    // Assert
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });
});
```

### Running Integration Tests

Integration tests are run using the same commands as unit tests:

```bash
npm test
```

## End-to-End Testing

End-to-end (E2E) tests verify that the entire application works correctly from the user's perspective.

### Writing E2E Tests

SkyPANEL uses Playwright for E2E testing when needed. E2E tests should:

1. Focus on critical user flows
2. Test the application as a whole
3. Verify that all components work together correctly
4. Test across different browsers if necessary

### Example E2E Test

```typescript
// tests/e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    // Navigate to the login page
    await page.goto('http://localhost:5000/auth');
    
    // Fill in the login form
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password123');
    
    // Click the login button
    await page.click('button[type="submit"]');
    
    // Verify redirect to dashboard
    await expect(page).toHaveURL(/dashboard/);
    
    // Verify user is logged in
    await expect(page.locator('.user-profile')).toContainText('testuser');
  });

  test('should show error with invalid credentials', async ({ page }) => {
    // Navigate to the login page
    await page.goto('http://localhost:5000/auth');
    
    // Fill in the login form with invalid credentials
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'wrongpassword');
    
    // Click the login button
    await page.click('button[type="submit"]');
    
    // Verify error message
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('Invalid credentials');
  });
});
```

### Running E2E Tests

To run E2E tests:

```bash
npm run test:e2e
```

## API Testing

API tests verify that the backend API endpoints work correctly.

### Writing API Tests

1. Test each API endpoint for success and failure cases
2. Verify response status codes, headers, and body
3. Test authentication and authorization
4. Test input validation and error handling

### Example API Test

```typescript
// tests/api/auth.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/app';
import { createTestUser, deleteTestUser } from '../helpers/userHelpers';

describe('Authentication API', () => {
  let testUser;

  beforeAll(async () => {
    testUser = await createTestUser({
      username: 'apitestuser',
      password: 'testpassword',
      email: 'apitest@example.com'
    });
  });

  afterAll(async () => {
    await deleteTestUser(testUser.id);
  });

  it('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'apitestuser',
        password: 'testpassword'
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('user');
    expect(response.body.user.username).toBe('apitestuser');
    expect(response.body).toHaveProperty('token');
  });

  it('should return 401 with invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'apitestuser',
        password: 'wrongpassword'
      });
    
    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toMatch(/invalid credentials/i);
  });

  it('should return user profile when authenticated', async () => {
    // First login to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'apitestuser',
        password: 'testpassword'
      });
    
    const token = loginResponse.body.token;
    
    // Then use token to get profile
    const profileResponse = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    
    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body).toHaveProperty('user');
    expect(profileResponse.body.user.username).toBe('apitestuser');
  });
});
```

### Running API Tests

API tests are run as part of the regular test suite:

```bash
npm test
```

## Performance Testing

Performance testing ensures that the application performs well under various conditions.

### Performance Testing Approaches

1. **Load Testing**: Testing the application under expected load
2. **Stress Testing**: Testing the application under extreme conditions
3. **Endurance Testing**: Testing the application over an extended period
4. **Spike Testing**: Testing the application with sudden increases in load

### Tools for Performance Testing

- **k6**: For load and performance testing
- **Lighthouse**: For frontend performance testing
- **Node.js profiling tools**: For backend performance analysis

### Example Performance Test

```javascript
// tests/performance/api-load.js
import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  vus: 10, // 10 virtual users
  duration: '30s', // Test runs for 30 seconds
};

export default function () {
  // Test the API endpoint
  const res = http.get('http://localhost:5000/api/servers');
  
  // Check that the response is successful
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  // Wait between requests
  sleep(1);
}
```

### Running Performance Tests

To run performance tests:

```bash
k6 run tests/performance/api-load.js
```

## Security Testing

Security testing identifies and addresses security vulnerabilities in the application.

### Security Testing Approaches

1. **Static Application Security Testing (SAST)**: Analyzing code for security issues
2. **Dynamic Application Security Testing (DAST)**: Testing running applications for vulnerabilities
3. **Dependency Scanning**: Checking for vulnerabilities in dependencies
4. **Manual Security Review**: Human review of security-critical code

### Tools for Security Testing

- **ESLint security plugins**: For static analysis
- **npm audit**: For dependency scanning
- **OWASP ZAP**: For dynamic security testing

### Example Security Test

```typescript
// tests/security/auth.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../server/app';

describe('Authentication Security', () => {
  it('should rate limit login attempts', async () => {
    // Make multiple login attempts with invalid credentials
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({
          username: 'securitytest',
          password: 'wrongpassword'
        });
    }
    
    // The next attempt should be rate limited
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'securitytest',
        password: 'wrongpassword'
      });
    
    expect(response.status).toBe(429); // Too Many Requests
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toMatch(/too many requests/i);
  });

  it('should not be vulnerable to SQL injection', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: "' OR 1=1 --",
        password: "password"
      });
    
    // Should not authenticate with SQL injection attempt
    expect(response.status).toBe(401);
  });
});
```

### Running Security Tests

Security tests are run as part of the regular test suite:

```bash
npm test
```

## Manual Testing

Manual testing involves human testers verifying functionality and user experience.

### Manual Testing Checklist

1. **Functionality Testing**: Verify that all features work as expected
2. **Usability Testing**: Ensure the application is user-friendly
3. **Compatibility Testing**: Test across different browsers and devices
4. **Accessibility Testing**: Verify that the application is accessible to all users
5. **Exploratory Testing**: Unscripted testing to find unexpected issues

### Manual Testing Process

1. Create a test plan with scenarios to test
2. Execute the test plan and document results
3. Report any issues found
4. Verify fixes for reported issues

### Example Manual Test Plan

```markdown
# Manual Test Plan: User Registration

## Test Scenario 1: Successful Registration
1. Navigate to the registration page
2. Fill in all required fields with valid data
3. Submit the form
4. Verify that the user is redirected to the verification page
5. Check email for verification link
6. Click the verification link
7. Verify that the account is activated

## Test Scenario 2: Validation Errors
1. Navigate to the registration page
2. Submit the form without filling any fields
3. Verify that appropriate error messages are displayed
4. Fill in invalid data (e.g., invalid email format)
5. Verify that appropriate error messages are displayed

## Test Scenario 3: Duplicate Username
1. Navigate to the registration page
2. Fill in all required fields with a username that already exists
3. Submit the form
4. Verify that an appropriate error message is displayed
```

## Continuous Integration

SkyPANEL uses continuous integration to automatically run tests on code changes.

### CI Workflow

1. Developer pushes code to a feature branch
2. CI system automatically runs tests
3. Test results are reported back to the pull request
4. Code is only merged if all tests pass

### CI Configuration

The CI pipeline includes:

1. Installing dependencies
2. Running linting and type checking
3. Running unit and integration tests
4. Running security scans
5. Generating test coverage reports

## Test Coverage

Test coverage measures how much of the codebase is covered by tests.

### Coverage Goals

- **Unit Tests**: Aim for 80%+ coverage of business logic
- **Integration Tests**: Cover all critical user flows
- **E2E Tests**: Cover key user journeys

### Measuring Coverage

SkyPANEL uses Vitest's built-in coverage reporting:

```bash
npm test -- --coverage
```

This generates a coverage report showing:

- Percentage of lines covered
- Percentage of branches covered
- Percentage of functions covered
- Percentage of statements covered

### Improving Coverage

To improve test coverage:

1. Identify untested code using coverage reports
2. Prioritize testing critical and complex code
3. Add tests for uncovered edge cases
4. Refactor code to make it more testable if necessary

---

By following these testing procedures, we can ensure that SkyPANEL maintains high quality and reliability. If you have questions about testing or need help writing tests, please reach out to the development team.