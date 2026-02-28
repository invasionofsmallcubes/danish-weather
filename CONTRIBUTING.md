# Contributing to Danish Weather

Thank you for your interest in contributing! This project welcomes contributions from the community.

## License

By contributing to this project, you agree that your contributions will be licensed under the GNU General Public License v3.0. See [LICENSE](LICENSE) for details.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/yourusername/danish-weather.git
   cd danish-weather
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Running the Development Server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Building and Testing

```bash
npm run build
npm run lint
```

### Code Standards

- **TypeScript**: We use TypeScript for type safety. All code should be properly typed.
- **Formatting**: Follow the existing code style. Consider using Prettier if configured.
- **Naming**: Use descriptive names for variables, functions, and components.
- **Comments**: Add comments for complex logic, but keep them concise.

### Making Changes

1. Make your changes in your feature branch
2. Test your changes thoroughly:
   ```bash
   npm run build
   npm run dev
   ```
3. Ensure no TypeScript errors:
   ```bash
   npm run lint
   ```

### Committing Changes

Use clear, descriptive commit messages:

```bash
git commit -m "Add feature: describe what you added"
git commit -m "Fix: describe what you fixed"
git commit -m "Refactor: describe what you refactored"
```

### Pushing and Creating a Pull Request

1. Push your changes to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
2. Go to GitHub and create a Pull Request
3. Fill out the PR template with:
   - Description of your changes
   - Why this change is needed
   - Any related issues

## Pull Request Guidelines

- **Keep it focused**: One feature per PR
- **Test thoroughly**: Ensure your changes don't break existing functionality
- **Add documentation**: Update README or comments if needed
- **Follow conventions**: Use TypeScript, follow the project structure
- **Keep it small**: Smaller PRs are easier to review

## Reporting Bugs

Found a bug? Please create an issue with:

1. **Clear title**: Describe the bug concisely
2. **Environment**: OS, Node version, browser (if relevant)
3. **Steps to reproduce**: Exact steps to trigger the bug
4. **Expected vs actual**: What should happen vs what actually happens
5. **Screenshots**: If applicable

## Feature Requests

Have an idea? Share it:

1. **Title**: Clear, descriptive feature title
2. **Problem**: What problem does this solve?
3. **Solution**: Your proposed implementation
4. **Alternative approaches**: Other ways to solve it

## Questions?

- Check the [README.md](README.md) for documentation
- Review existing issues for similar questions
- Open a discussion if you have questions

## Code of Conduct

Be respectful and inclusive. We don't tolerate:
- Harassment or discrimination
- Spam or advertising
- Malicious contributions

## Project Areas

### APIs and Data Integration
- Adding new weather data sources
- Improving data validation and error handling
- Optimizing API calls

### Frontend and UI
- Improving the user interface
- Adding new features or visualizations
- Enhancing responsive design
- Better loading and error states

### Performance
- Optimizing bundle size
- Reducing API calls with caching
- Improving load times

### Documentation
- Improving README
- Adding code comments
- Creating tutorials or guides

### Testing
- Adding unit tests
- Adding integration tests
- Improving test coverage

## Recognition

All contributors will be recognized in the project. Thank you for your time and effort!

---

Happy coding! 🚀
