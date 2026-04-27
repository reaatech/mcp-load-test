# Contributing to mcp-load-test

Thank you for your interest in contributing to this project! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and constructive in your interactions. We are committed to providing a welcoming and inclusive experience for everyone.

## How to Contribute

### Reporting Issues

- Before creating a new issue, please search existing ones to avoid duplicates
- Use the issue template when available
- Provide as much detail as possible, including:
  - Steps to reproduce the issue
  - Expected vs actual behavior
  - Environment details (OS, Node.js version, etc.)
  - Screenshots or logs if applicable

### Submitting Pull Requests

1. **Fork the repository** and clone your fork locally
2. **Create a new branch** for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bugfix-description
   ```
3. **Make your changes** following the project's coding standards
4. **Test your changes** thoroughly
5. **Commit your changes** with clear, descriptive commit messages
6. **Push to your fork** and submit a pull request
7. **Wait for review** - maintainers will review your PR and may request changes

### Development Setup

**Requirements:** Node.js >= 22.0.0

1. Clone the repository:
   ```bash
   git clone https://github.com/reaatech/mcp-load-test.git
   cd mcp-load-test
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Follow the development workflow described in DEV_PLAN.md
4. Review AGENTS.md and the `skills/` directory to understand how AI agents collaborate on this project

### Coding Standards

- Follow existing code style and conventions (enforced by ESLint v9 flat config and Prettier)
- Write clear, readable code with appropriate comments
- Keep functions focused and modular
- Write tests for new functionality
- Update documentation as needed
- Reference AGENTS.md when asking AI assistants for help — the skills system provides project-specific context

### Pull Request Guidelines

- **Title**: Clear and descriptive
- **Description**: Explain what changes were made and why
- **Scope**: Focus on one feature or fix per PR
- **Testing**: Include test results or describe manual testing performed
- **Documentation**: Update relevant docs if needed (README, ARCHITECTURE, AGENTS, or skills as appropriate)

### Types of Contributions We Welcome

- Bug fixes
- New features
- Documentation improvements
- Performance improvements
- Test coverage improvements
- Refactoring that improves code quality

## Questions?

If you have questions about contributing, please open an issue for discussion.

## License

By contributing, you agree that your contributions will be licensed under the MIT License (see LICENSE file).
