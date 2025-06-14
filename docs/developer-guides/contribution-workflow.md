# SkyPANEL Contribution Workflow Guide

This guide outlines the process for contributing to the SkyPANEL project, including branching strategy, code standards, pull request workflow, and code review process.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Branching Strategy](#branching-strategy)
3. [Development Process](#development-process)
4. [Code Standards](#code-standards)
5. [Commit Guidelines](#commit-guidelines)
6. [Pull Request Process](#pull-request-process)
7. [Code Review](#code-review)
8. [Merging and Deployment](#merging-and-deployment)
9. [Issue Tracking](#issue-tracking)

## Getting Started

Before contributing to SkyPANEL, ensure you have:

1. Set up your development environment following the [Setup Guide](./setup-guide.md)
2. Familiarized yourself with the codebase structure
3. Understood the project's architecture and design principles
4. Reviewed existing documentation in the `/docs` directory

## Branching Strategy

SkyPANEL follows a feature branch workflow with the following branch structure:

### Main Branches

- **main**: Production-ready code that has been thoroughly tested
- **develop**: Integration branch for features and bug fixes

### Supporting Branches

- **feature/[feature-name]**: New features or enhancements
- **bugfix/[bug-name]**: Bug fixes
- **hotfix/[hotfix-name]**: Critical fixes for production issues
- **release/[version]**: Release preparation branches

### Branch Naming Conventions

- Use lowercase letters and hyphens
- Include a descriptive name that reflects the purpose
- Include issue number if applicable

Examples:
- `feature/user-authentication`
- `bugfix/invoice-calculation`
- `hotfix/security-vulnerability`
- `feature/SP-123-add-dns-templates`

## Development Process

### Starting a New Feature

1. Ensure your local repository is up to date:
   ```bash
   git checkout develop
   git pull origin develop
   ```

2. Create a new feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. Implement your changes, following the code standards and commit guidelines

4. Regularly push your branch to the remote repository:
   ```bash
   git push origin feature/your-feature-name
   ```

### Working on Bug Fixes

1. Ensure your local repository is up to date:
   ```bash
   git checkout develop
   git pull origin develop
   ```

2. Create a new bugfix branch:
   ```bash
   git checkout -b bugfix/bug-description
   ```

3. Implement your fix, following the code standards and commit guidelines

4. Regularly push your branch to the remote repository:
   ```bash
   git push origin bugfix/bug-description
   ```

### Handling Hotfixes

For critical issues that need immediate attention in production:

1. Branch off from `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b hotfix/critical-issue
   ```

2. Implement the fix, following the code standards and commit guidelines

3. Push your branch to the remote repository:
   ```bash
   git push origin hotfix/critical-issue
   ```

4. Create a pull request to merge into both `main` and `develop`

## Code Standards

### General Guidelines

- Write clean, readable, and maintainable code
- Follow the DRY (Don't Repeat Yourself) principle
- Keep functions and methods focused on a single responsibility
- Use meaningful variable and function names
- Add comments for complex logic, but prefer self-documenting code
- Write code that is testable

### TypeScript Guidelines

- Use TypeScript for all new code
- Define proper interfaces and types
- Avoid using `any` type when possible
- Use proper access modifiers (public, private, protected)
- Follow the existing code style

### Frontend Guidelines

- Use functional components with hooks
- Keep components small and focused
- Use TypeScript for type safety
- Follow the existing component structure
- Use Tailwind CSS for styling
- Implement responsive design

### Backend Guidelines

- Organize code by domain and responsibility
- Use proper error handling
- Implement input validation
- Follow RESTful API design principles
- Document API endpoints
- Implement proper authentication and authorization

## Commit Guidelines

### Commit Message Format

SkyPANEL follows a structured commit message format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Where:
- **type**: The type of change (feat, fix, docs, style, refactor, test, chore)
- **scope**: The scope of the change (optional)
- **subject**: A short description of the change
- **body**: A more detailed explanation of the change (optional)
- **footer**: References to issues, breaking changes, etc. (optional)

### Commit Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation changes
- **style**: Changes that don't affect code functionality (formatting, etc.)
- **refactor**: Code changes that neither fix a bug nor add a feature
- **test**: Adding or modifying tests
- **chore**: Changes to the build process, dependencies, etc.

### Examples

```
feat(auth): implement two-factor authentication

Add support for TOTP-based two-factor authentication using authenticator apps.

Closes #123
```

```
fix(billing): correct invoice calculation for prorated services

Resolves #456
```

### Best Practices

- Keep commits focused on a single change
- Write clear and concise commit messages
- Reference issue numbers when applicable
- Commit frequently to capture logical changes
- Avoid committing unrelated changes together

## Pull Request Process

### Creating a Pull Request

1. Push your branch to the remote repository:
   ```bash
   git push origin your-branch-name
   ```

2. Go to the repository on GitHub and create a new pull request

3. Select the appropriate base branch:
   - For features and bug fixes: `develop`
   - For hotfixes: `main` (and create a second PR to `develop`)

4. Fill out the pull request template with:
   - A clear title that summarizes the change
   - A detailed description of the changes
   - References to related issues
   - Any special considerations or testing instructions

### Pull Request Template

```markdown
## Description
[Provide a brief description of the changes in this pull request]

## Related Issues
[Reference any related issues, e.g., "Closes #123", "Fixes #456"]

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Code refactoring
- [ ] Performance improvement
- [ ] Other (please describe)

## Testing Performed
[Describe the testing you've done to verify your changes]

## Screenshots (if applicable)
[Add screenshots to help explain your changes]

## Checklist
- [ ] My code follows the project's code standards
- [ ] I have added tests that prove my fix/feature works
- [ ] All new and existing tests pass
- [ ] I have updated the documentation accordingly
- [ ] My changes don't introduce new warnings or errors
```

### Draft Pull Requests

For work in progress, create a draft pull request:

1. Follow the same steps as creating a regular pull request
2. Select "Create draft pull request" instead of "Create pull request"
3. Convert to a regular pull request when ready for review

## Code Review

### Review Process

1. All pull requests require at least one review before merging
2. Reviewers should focus on:
   - Code quality and readability
   - Adherence to project standards
   - Potential bugs or edge cases
   - Performance considerations
   - Security implications
   - Test coverage

3. Provide constructive feedback:
   - Be specific about what needs to change
   - Explain why changes are needed
   - Suggest alternatives when appropriate
   - Use a respectful and collaborative tone

### Addressing Review Feedback

1. Respond to all review comments
2. Make requested changes or explain why they shouldn't be made
3. Push additional commits to address feedback
4. Request re-review when all feedback has been addressed

### Review Checklist

As a reviewer, check for:

- [ ] Code follows project standards and guidelines
- [ ] No obvious bugs or edge cases
- [ ] Proper error handling
- [ ] Sufficient test coverage
- [ ] Documentation is updated
- [ ] No security vulnerabilities
- [ ] No performance issues
- [ ] No unnecessary code complexity

## Merging and Deployment

### Merge Requirements

Before a pull request can be merged:

1. It must pass all automated checks (tests, linting, etc.)
2. It must have at least one approving review
3. All review comments must be resolved
4. It must be up to date with the base branch

### Merge Strategy

SkyPANEL uses squash merging to keep the commit history clean:

1. All commits in a pull request are combined into a single commit
2. The commit message is based on the pull request title and description
3. The original branch is deleted after merging

### Post-Merge Actions

After merging:

1. Delete the feature/bugfix branch
2. Update any related issues
3. Monitor the CI/CD pipeline for successful deployment
4. Verify the changes in the deployed environment

## Issue Tracking

### Creating Issues

When creating a new issue:

1. Use a clear and descriptive title
2. Provide detailed steps to reproduce (for bugs)
3. Include expected and actual behavior
4. Add screenshots or videos if applicable
5. Add appropriate labels
6. Assign to the appropriate milestone

### Issue Types

- **Bug**: Something isn't working as expected
- **Feature**: A new feature or enhancement
- **Documentation**: Documentation improvements
- **Technical Debt**: Code improvements without changing functionality
- **Question**: Questions about the project

### Issue Labels

- **priority/high**: High-priority issues that need immediate attention
- **priority/medium**: Medium-priority issues
- **priority/low**: Low-priority issues
- **status/in-progress**: Issues being actively worked on
- **status/blocked**: Issues blocked by other work
- **type/bug**: Bug reports
- **type/feature**: Feature requests
- **type/docs**: Documentation issues
- **type/refactor**: Code refactoring issues

### Working with Issues

1. Assign yourself to an issue when you start working on it
2. Reference the issue number in commits and pull requests
3. Update the issue with progress information
4. Close issues automatically through pull requests when possible

---

By following this contribution workflow, we can maintain a high-quality codebase and efficient development process. If you have any questions about contributing to SkyPANEL, please reach out to the development team.