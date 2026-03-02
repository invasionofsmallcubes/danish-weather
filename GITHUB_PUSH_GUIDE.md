# Quick Reference: Pushing to GitHub

## One-Time Setup

```bash
# Navigate to your project
cd /Users/emanuele.ianni/personal/danishweather

# 1. Create repository on GitHub at https://github.com/new
#    - Name: danish-weather
#    - Visibility: Public
#    - Don't initialize

# 2. Add remote and push
git remote add origin https://github.com/YOUR_USERNAME/danish-weather.git
git branch -M main
git push -u origin main

# 3. Verify
git remote -v
git branch -a
```

## What's Ready

| Item | Status | Location |
|------|--------|----------|
| GPL-3.0 License | ✅ | `LICENSE` |
| Documentation | ✅ | `README.md` |
| Contributing Guide | ✅ | `CONTRIBUTING.md` |
| CI/CD Pipeline | ✅ | `.github/workflows/ci.yml` |
| PR Template | ✅ | `.github/pull_request_template.md` |
| Git Initialized | ✅ | `.git/` |
| Initial Commit | ✅ | `cf84af2` |

## License Info

**GPL-3.0**: Strict open source
- Any derivative must be open source
- Commercial use allowed if GPL-compliant
- Must disclose modifications

## Features

- ✅ Real weather data from 2 APIs
- ✅ TypeScript + Zod validation
- ✅ Server-side API proxy (no CORS)
- ✅ Auto-refresh every 10 minutes
- ✅ GitHub Actions CI/CD
- ✅ Professional documentation

## Commands to Remember

```bash
# Check status
git status

# View commits
git log --oneline

# Check remote
git remote -v

# Push updates
git push origin main

# Create feature branch
git checkout -b feature/your-feature

# After changes
git add .
git commit -m "Your message"
git push origin feature/your-feature
```

That's it! 🚀
