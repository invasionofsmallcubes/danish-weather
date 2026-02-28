# GitHub Actions CI/CD to Cloudflare Pages - Setup Guide

This document provides step-by-step instructions to complete the GitHub Actions CI/CD integration with Cloudflare Pages.

## Overview

Your GitHub Actions workflow is now configured to automatically deploy to Cloudflare Pages. The workflow has:

- ✅ **5 test jobs** (existing): lint, build, type-check, code-quality, security
- ✅ **Production deploy job** (new): Deploys to Cloudflare on `main` branch
- ✅ **PR preview job** (new): Creates preview deployments for pull requests

**Before deployment works, you need to:**
1. Create Cloudflare API credentials
2. Add secrets to GitHub
3. Create Cloudflare Pages project

---

## Step 1: Create Cloudflare API Token

### 1.1: Go to Cloudflare API Tokens page

1. Open: https://dash.cloudflare.com/profile/api-tokens
2. You should see your profile with API Tokens section

### 1.2: Create a new token

1. Click **"Create Token"** button
2. Find the **"Edit Cloudflare Workers"** template
3. Click **"Use Template"**

### 1.3: Configure permissions

The template should pre-select these permissions:
- **Account** → **Workers Scripts** (edit)
- **User** → **Memberships** (read)

These are the minimum required permissions. Leave them as-is and don't add more.

### 1.4: Set token lifetime

- **TTL**: 90 days is recommended for security
- Or set a custom date if preferred

### 1.5: Get the token

1. Click **"Continue to summary"**
2. Click **"Create Token"**
3. **IMPORTANT**: Copy the token immediately
   - You will NOT be able to see it again
   - If you lose it, you'll need to create a new one

**Save this token** - you'll paste it into GitHub in Step 3.

---

## Step 2: Get Your Cloudflare Account ID

### 2.1: Get Account ID from dashboard

**Option A: From the URL**
1. Go to: https://dash.cloudflare.com/?to=/:account
2. Look at the URL: `https://dash.cloudflare.com/?to=/XXXXXXX/...`
3. The `XXXXXXX` part is your **Account ID** (32 hex characters)

**Option B: From Workers page**
1. Go to: https://dash.cloudflare.com/?to=/:account/workers-and-pages
2. Click any project/worker
3. Go to **Settings** tab
4. Look for "Account ID" field

**Save this Account ID** - you'll paste it into GitHub in Step 3.

---

## Step 3: Add Secrets to GitHub

### 3.1: Go to GitHub Repository Secrets

1. Open: https://github.com/invasionofsmallcubes/danish-weather
2. Click **Settings** (top menu)
3. Left sidebar → **Secrets and variables** → **Actions**

### 3.2: Add CLOUDFLARE_API_TOKEN

1. Click **"New repository secret"** button
2. Name: `CLOUDFLARE_API_TOKEN`
3. Value: (paste the token from Step 1.5)
4. Click **"Add secret"**

### 3.3: Add CLOUDFLARE_ACCOUNT_ID

1. Click **"New repository secret"** button
2. Name: `CLOUDFLARE_ACCOUNT_ID`
3. Value: (paste the Account ID from Step 2.1)
4. Click **"Add secret"**

### 3.4: Verify secrets are added

1. You should see both secrets listed in the Actions secrets section
2. Values are hidden (shows `●●●●●●●●●●`)
3. You can delete/update them anytime

---

## Step 4: Create Cloudflare Pages Project

### 4.1: Start Pages project creation

1. Go to: https://dash.cloudflare.com/?to=/:account/workers-and-pages
2. Click **"Create application"**
3. Click **"Pages"**
4. Click **"Connect to Git"**

### 4.2: Authorize GitHub

1. Sign in with GitHub if prompted
2. Allow Cloudflare to access your GitHub account

### 4.3: Select repository

1. You should see **`invasionofsmallcubes/danish-weather`** in the list
2. Click to select it
3. Click **"Install & Authorize"** if prompted

### 4.4: Begin setup

1. Click **"Begin setup"**
2. You'll see the build configuration form

### 4.5: Configure build settings

Fill in these fields exactly:

| Field | Value |
|-------|-------|
| **Project name** | `danish-weather` |
| **Production branch** | `main` |
| **Build command** | `npm ci && npm run build` |
| **Build output directory** | `.next` |
| **Root directory** | `/` (leave blank, defaults to root) |

**Important Notes:**
- Do NOT select a framework preset
- Do NOT change any of these values
- Build output must be `.next` (not `.open-next`)

### 4.6: Skip environment variables (optional)

- Leave environment variables section empty for now
- Your app uses public APIs, no secrets needed
- Can add later if needed

### 4.7: Complete setup

1. Click **"Save and Deploy"**
2. Cloudflare will start the first build
3. Expected build time: 2-3 minutes
4. Monitor build logs on the dashboard

### 4.8: First deployment

After build completes:
- ✅ You'll see a deployment URL: `https://danish-weather.pages.dev`
- ✅ Visit the URL to verify it works
- ✅ Check that weather data loads

**If first build fails:**
- Check build logs in Cloudflare dashboard
- Common issues: missing permissions, branch not found
- Go to **Settings** → check production branch is set to `main`

---

## Step 5: Verify Workflow Integration

### 5.1: Check workflow file on GitHub

1. Go to: https://github.com/invasionofsmallcubes/danish-weather
2. Click **Code** tab
3. Navigate to `.github/workflows/ci.yml`
4. You should see two new jobs:
   - `deploy` (for main branch)
   - `deploy-preview` (for PRs)

### 5.2: Test the workflow (optional)

**Option A: Trigger via push**
1. Make a small change to a file (e.g., README)
2. Commit and push to main
3. Go to **Actions** tab
4. Watch the workflow run

**Option B: Manual test**
1. Go to **Actions** tab
2. Select **CI/CD Pipeline** workflow
3. Click **Run workflow** button
4. Select branch: `main`
5. Click **Run workflow**

### 5.3: Monitor deployment

1. Go to **Actions** tab
2. Click the running workflow
3. Watch the jobs:
   - `lint-and-build` → 2-3 min
   - `type-check` → 1 min
   - `code-quality` → <1 min
   - `security` → <1 min
   - `deploy` → 2-3 min
   - `notify` → <1 min

**Total expected time: 5-7 minutes**

---

## Step 6: Test Production Deployment

### 6.1: Push to main branch

1. Make any change to your code
2. Commit and push to main:
   ```bash
   git add .
   git commit -m "Test deployment"
   git push origin main
   ```

3. Go to: https://github.com/invasionofsmallcubes/danish-weather/actions
4. Watch the workflow run

### 6.2: Verify deployment

1. Wait for `deploy` job to complete (green checkmark)
2. Go to Cloudflare dashboard → danish-weather project
3. Check **Deployments** tab
4. Should see new deployment with timestamp
5. Visit `https://danish-weather.pages.dev`
6. Verify weather data loads correctly

### 6.3: Test deploy blocking

1. Introduce a TypeScript error:
   ```typescript
   // src/components/WeatherContainer.tsx
   const undefinedVar: unknown; // This will fail type-check
   ```

2. Commit and push to main
3. Go to Actions tab
4. Watch workflow
5. `type-check` job should fail ❌
6. `deploy` job should NOT run (skipped)
7. Fix the error and re-push
8. Deployment should proceed normally

---

## Step 7: Test PR Preview Deployment

### 7.1: Create a test PR

1. Create a new branch:
   ```bash
   git checkout -b test/preview-deployment
   ```

2. Make a small change (e.g., update README):
   ```bash
   echo "# Test PR" >> README.md
   ```

3. Commit and push:
   ```bash
   git add README.md
   git commit -m "Test PR preview deployment"
   git push origin test/preview-deployment
   ```

### 7.2: Open PR on GitHub

1. Go to: https://github.com/invasionofsmallcubes/danish-weather
2. You should see a notification about your branch
3. Click **"Compare & pull request"**
4. Create PR with any title/description
5. Click **"Create pull request"**

### 7.3: Watch preview deployment

1. Go to PR page
2. Scroll to **Checks** section
3. Watch `deploy-preview` job run
4. Expected time: 3-4 minutes

### 7.4: Access preview URL

After `deploy-preview` completes:
1. Look for comment in PR with preview URL
2. Should say: "🚀 Preview Deployment Ready!"
3. Click the link to visit preview
4. Verify it's fully functional
5. Preview URL looks like: `https://[random-hash].pages.dev`

### 7.5: Clean up test PR

1. Close the PR (click **Close pull request**)
2. Delete the branch:
   ```bash
   git branch -d test/preview-deployment
   git push origin --delete test/preview-deployment
   ```

---

## Deployment Workflow Summary

### On every push to main:
```
Push to GitHub
    ↓
GitHub Actions workflow triggers
    ↓
Jobs run in sequence:
  1. lint-and-build (tests on Node 18 & 20)
  2. type-check (TypeScript validation)
  3. code-quality (code checks)
  4. security (npm audit)
  ↓ (if all pass)
  5. deploy (build + Wrangler deploy)
  ↓
Cloudflare receives deployment
    ↓
Live on https://danish-weather.pages.dev
```

**Total time: ~5-7 minutes**

### On every PR:
```
Push to feature branch
    ↓
GitHub Actions workflow triggers
    ↓
Jobs run in sequence:
  1. lint-and-build
  2. type-check
  3. code-quality
  4. security
  ↓ (always runs, regardless of test results)
  5. deploy-preview (creates preview version)
  ↓
Preview URL posted to PR
    ↓
Preview available at unique URL
```

**Total time: ~4-5 minutes**

---

## Troubleshooting

### Deployment job doesn't run

**Issue**: `deploy` job shows as skipped

**Possible causes:**
1. Not on main branch (push to main only)
2. One of the test jobs failed
3. Branch protection rules blocking it

**Fix**: 
- Make sure you're pushing to `main` not `develop`
- Fix any failing tests (shown in red)
- Check GitHub branch protection settings

### Preview deployment creates wrong URL

**Issue**: Preview URL in PR comment is incorrect

**Possible cause**: Wrangler output format changed

**Fix**:
1. Check Cloudflare dashboard for actual preview URL
2. Use that URL manually
3. File an issue if this happens frequently

### Secrets not working

**Issue**: Deployment fails with "Invalid credentials"

**Possible causes:**
1. Secrets not added to GitHub
2. Secrets have wrong names (case-sensitive)
3. Token expired

**Fix**:
1. Verify secrets exist: Settings → Secrets → Actions
2. Verify names are exactly: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`
3. Create new API token and update secret

### Build fails in Cloudflare but passes locally

**Issue**: `npm run build` works locally but fails in Cloudflare

**Possible causes:**
1. Different Node version
2. Environment variables missing
3. Build cache issue

**Fix**:
1. In Cloudflare dashboard, go to **Settings** → **Build**
2. Check Node version matches (should be 18+)
3. Click **"Clear cache and redeploy"**
4. Retry build

### Wrangler deployment fails

**Issue**: `Deploy to Cloudflare` step fails

**Possible causes:**
1. Account ID incorrect
2. API token revoked or expired
3. No permission to deploy

**Fix**:
1. Re-verify Account ID (32 hex characters)
2. Create new API token
3. Update GitHub secrets
4. Retry deployment

---

## Security Notes

✅ **What's secure:**
- Secrets stored in GitHub (encrypted, not in code)
- API token with minimal permissions (Workers only)
- No credentials in `.github/workflows/ci.yml` file
- Secrets not printed in workflow logs

⚠️ **What to monitor:**
- Rotate API token every 90 days
- Review workflow logs for any exposed data
- Keep Wrangler CLI updated
- Monitor Cloudflare for unauthorized deployments

---

## Next Steps

1. ✅ Commit workflow changes (already done)
2. 👉 Complete Steps 1-4 above (manual setup)
3. Test production deployment (Step 6)
4. Test PR preview deployment (Step 7)
5. Celebrate! 🎉

---

## Quick Reference

| Task | Location |
|------|----------|
| Create API Token | https://dash.cloudflare.com/profile/api-tokens |
| Get Account ID | https://dash.cloudflare.com/?to=/:account |
| Add GitHub Secrets | https://github.com/invasionofsmallcubes/danish-weather/settings/secrets/actions |
| Create Pages Project | https://dash.cloudflare.com/?to=/:account/workers-and-pages |
| View Deployments | https://github.com/invasionofsmallcubes/danish-weather/actions |
| View Cloudflare Builds | https://dash.cloudflare.com/?to=/:account/pages/danish-weather |

---

## Support

If you encounter issues:

1. **Check GitHub Actions logs**
   - Go to Actions tab
   - Click the failed workflow
   - See detailed error messages

2. **Check Cloudflare logs**
   - Go to Pages project
   - Click Deployments tab
   - Click the deployment
   - See build logs

3. **Review this guide**
   - Most common issues are covered in Troubleshooting

4. **Open an issue**
   - https://github.com/invasionofsmallcubes/danish-weather/issues

---

**You're ready to deploy! Follow the steps above and your CI/CD pipeline will be live. 🚀**
