# Contributing Guidelines

Thank you for your interest in contributing to the Academic Platform! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful, inclusive, and collaborative. We're building a platform to improve education for everyone.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/smart.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Follow the setup instructions in [QUICKSTART.md](QUICKSTART.md)

## Development Workflow

### 1. Before Starting

- Check existing issues/PRs to avoid duplicates
- Create an issue for major changes first
- Discuss your approach before major rewrites

### 2. Code Standards

#### TypeScript

- Use strict mode
- Add type annotations for all functions
- Avoid `any` types

```typescript
// Good
function getUserById(id: string): Promise<User> {
  return db.users.findOne({ _id: id });
}

// Avoid
function getUserById(id: any): any {
  return db.users.findOne({ _id: id });
}
```

#### Python

- Follow PEP 8
- Use type hints
- Document complex functions

```python
# Good
async def search(query: str, limit: int = 10) -> List[SearchResult]:
    """Perform semantic search on resources."""
    embeddings = embedding_service.get_embedding(query)
    return await search_service.search(embeddings, limit)
```

### 3. Naming Conventions

- **Folders**: kebab-case (e.g., `user-profile`)
- **Files**: camelCase for components, snake_case for utils
- **Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE

### 4. Commit Messages

Follow the conventional commits format:

```
type(scope): subject

feat(auth): add email verification
fix(search): improve query parsing
docs(api): update endpoint documentation
style(buttons): adjust padding
refactor(database): optimize queries
test(discussion): add answer upvote tests
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### 5. Pull Requests

**Before submitting:**
- [ ] Code follows project standards
- [ ] All tests pass
- [ ] No console errors/warnings
- [ ] Documentation updated
- [ ] Commit messages are clear

**PR Template:**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe testing performed:
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing

## Screenshots (if applicable)

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
```

## Testing

### Running Tests

```bash
# Frontend
cd frontend && npm test

# Backend
cd backend && npm test

# AI Service
cd ai-service && pytest tests/
```

### Writing Tests

**Frontend (Vitest):**
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Login from '@/pages/Login';

describe('Login Component', () => {
  it('should render login form', () => {
    render(<Login />);
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
  });
});
```

**Backend (Jest):**
```typescript
import { describe, it, expect } from '@jest/globals';
import { createUser } from '@/services/user.service';

describe('User Service', () => {
  it('should create user with valid data', async () => {
    const user = await createUser({
      email: 'test@example.com',
      name: 'Test User',
      role: 'student'
    });
    expect(user.email).toBe('test@example.com');
  });
});
```

**Python (Pytest):**
```python
import pytest
from app.services.embedding import embedding_service

@pytest.mark.asyncio
async def test_embedding_generation():
    embedding = embedding_service.get_embedding("test text")
    assert isinstance(embedding, list)
    assert len(embedding) == 384  # MiniLM dimension
```

## Documentation

### Code Comments

Comment the "why", not the "what":

```typescript
// Good
// We cache results for 5 minutes to avoid redundant AI API calls
const cached = cache.get(cacheKey);

// Avoid
// Get cached value
const cached = cache.get(cacheKey);
```

### Changelog

Update [CHANGELOG.md](docs/CHANGELOG.md) with your changes:

```markdown
## [1.1.0] - 2024-02-08

### Added
- Semantic search filters
- User reputation system

### Fixed
- Discussion pagination bug
- File upload validation
```

## Issues & Discussions

### Reporting Bugs

**Title:** Brief description
**Description:** Include:
- Current behavior
- Expected behavior
- Steps to reproduce
- Environment (Node v18, Python 3.11, etc.)
- Relevant logs

### Feature Requests

**Title:** [Feature] Brief description
**Description:** Include:
- Problem statement
- Proposed solution
- Alternative approaches
- Mockups (if applicable)

## Project Structure Guidelines

```
src/
  components/      # Reusable React components
  pages/          # Route-level pages
  services/       # API and external services
  utils/          # Helper functions
  types/          # TypeScript type definitions
  hooks/          # Custom React hooks
  middleware/     # Express/Hono middleware
  models/         # Database models
  routes/         # API route definitions
  config/         # Configuration files
  tests/          # Test files
```

## Deployment Considerations

When adding features, consider:

- **Database Migrations**: Update schema safely
- **Environment Variables**: Add to `.env.example`
- **Backwards Compatibility**: Don't break existing APIs
- **Performance**: Index new database fields
- **Security**: Input validation, authentication checks

## Release Process

1. Update version in `package.json`
2. Update CHANGELOG
3. Create release PR
4. After merge, create GitHub release
5. Deploy to staging → production

## Communication

- **Issues**: For bug reports and features
- **Discussions**: For questions and ideas
- **PRs**: For code changes
- **Email**: For security issues (security@academicplatform.com)

## Recognition

Contributors will be:
- Listed in contributors section
- Acknowledged in release notes
- Mentioned in documentation

Thank you for contributing! 🎉

---

Questions? Open an issue or ask in discussions!
