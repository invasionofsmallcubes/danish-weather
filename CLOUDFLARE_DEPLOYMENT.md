# Cloudflare Pages Deployment Guide

This guide explains how to deploy the Danish Weather app to Cloudflare Pages.

## Overview

The Danish Weather app is configured for deployment to **Cloudflare Pages + Workers runtime** using the **OpenNext adapter**. This setup provides:

- ✅ Full support for Next.js API routes (`/api/weather`)
- ✅ Server-side rendering and static generation
- ✅ Automatic deployments from GitHub
- ✅ Preview deployments for pull requests
- ✅ Global CDN with edge computing
- ✅ All secrets stored securely (never in Git)

## Prerequisites

Before deploying, you need:

1. **Cloudflare Account** (free tier is sufficient)
   - Sign up at https://dash.cloudflare.com

2. **GitHub Repository Access**
   - Already connected: `invasionofsmallcubes/danish-weather`

3. **Local Setup** (for testing)
   - Node.js 18+ installed
   - Project dependencies: `npm install` ✅ (already done)

## Deployment Methods

### Method 1: Automatic Deployment (Recommended)

**This is the easiest method** - deployments happen automatically when you push to GitHub.

#### Step 1: Create Cloudflare Pages Project

1. Go to: https://dash.cloudflare.com/?to=/:account/workers-and-pages
2. Click **"Create application"** → **"Pages"** → **"Connect to Git"**
3. Sign in with GitHub
4. Select repository: **`invasionofsmallcubes/danish-weather`**
5. Click **"Install & Authorize"**
6. Click **"Begin setup"**

#### Step 2: Configure Build Settings

Fill in the following fields:

| Setting | Value |
|---------|-------|
| **Project name** | `danish-weather` |
| **Production branch** | `main` |
| **Build command** | `npm ci && npm run build` |
| **Build output directory** | `.next` |
| **Root directory** | `/` (leave blank - it defaults to root) |

**Note**: Do NOT select a framework preset - the build command already handles everything.

#### Step 3: Configure Environment Variables (Optional)

If you need to add environment variables:

1. In the setup form, scroll to **"Environment variables"**
2. Click **"Add variable"**
3. Add your variables (e.g., API keys, configuration)
4. Click **"Save and Deploy"**

**Important**: Environment variables added here will NOT be stored in Git - they only exist in Cloudflare.

#### Step 4: First Deployment

After clicking **"Save and Deploy"**:

- Cloudflare will clone your repo
- Run `npm ci && npm run build`
- OpenNext adapter compiles your app
- Deploy to global CDN

**Expected build time**: 2-3 minutes

#### Step 5: View Your Site

Once deployment completes:

- **Production URL**: `https://danish-weather.pages.dev`
- View it in your browser
- Check Cloudflare dashboard for build logs

#### Automatic Updates

From now on:

- **Push to `main`** → Production deployment (1-2 minutes)
- **Create PR** → Preview deployment with unique URL (shown in PR comments)
- **Merge PR** → Production deployment

### Method 2: Manual Deployment (Wrangler CLI)

If you prefer to deploy from your local machine:

#### Prerequisites

1. **Wrangler CLI** (already installed as dev dependency)
2. **Cloudflare Account** credentials

#### Step 1: Authenticate with Cloudflare

```bash
npx wrangler login
```

This opens a browser to authorize Cloudflare access. A token is saved locally (NOT in Git).

#### Step 2: Deploy Your App

```bash
npm run deploy
```

This:
- Builds your Next.js app
- Compiles with OpenNext adapter
- Uploads to Cloudflare
- Makes it live immediately

#### Step 3: View Your Site

Your app is now live! Check the output for your deployment URL.

#### For CI/CD Integration

If you want GitHub Actions to deploy automatically:

1. Create a Cloudflare API token:
   - Go to: https://dash.cloudflare.com/profile/api-tokens
   - Click **"Create Token"**
   - Choose **"Edit Cloudflare Workers"** template
   - Click **"Use Template"**
   - Keep defaults, click **"Continue to summary"** → **"Create Token"**
   - Copy the token

2. Add to GitHub repository:
   - Go to: `https://github.com/invasionofsmallcubes/danish-weather/settings/secrets/actions`
   - Click **"New repository secret"**
   - Name: `CLOUDFLARE_API_TOKEN`
   - Value: (paste the token)
   - Click **"Add secret"**

3. Add your Cloudflare Account ID:
   - Go to: https://dash.cloudflare.com/?to=/:account
   - Look at the URL or dashboard for Account ID
   - Create another secret: `CLOUDFLARE_ACCOUNT_ID`

4. (Optional) Add a GitHub Actions workflow job to deploy:

```yaml
# Add this to .github/workflows/ci.yml

deploy:
  name: Deploy to Cloudflare Pages
  runs-on: ubuntu-latest
  needs: [lint-and-build, type-check]
  if: github.ref == 'refs/heads/main'
  
  steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 18
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Deploy to Cloudflare
      env:
        CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
      run: npm run deploy
```

## Local Testing

### Test in Development Mode

```bash
npm run dev
```

Starts Next.js dev server on `http://localhost:3000` with fast hot reload.

### Test in Production Mode (Recommended Before Deploy)

```bash
npm run preview
```

Builds your app and runs it in the Workers runtime locally. This is more accurate to production because it uses the same runtime as Cloudflare:

- Tests API routes in Workers environment
- Verifies all features work correctly
- Takes ~1-2 minutes to start

After starting, visit `http://localhost:8787` to preview.

## Environment Variables

### For Local Development

Create `.env.local` in the project root:

```bash
# Copy from .env.example and add your values
NEXT_PUBLIC_WEATHER_API=https://api.example.com
```

This file is in `.gitignore` - never committed.

### For Production (Cloudflare Pages)

1. Go to Cloudflare dashboard
2. Select `danish-weather` project
3. **Settings** → **Environment variables**
4. Add your variables
5. They're automatically available during builds and at runtime

**Important**: Secrets are never exposed to the browser (unless prefixed with `NEXT_PUBLIC_`).

## Build Process Explained

When you deploy, OpenNext does:

```
npm run build
    ↓
Creates standard Next.js build (.next/)
    ↓
OpenNext adapter processes it:
    ├── Extracts API routes → Worker code
    ├── Optimizes static files → CDN assets
    ├── Generates .open-next/worker.js
    └── Creates .open-next/assets/
    ↓
Wrangler packages everything
    ↓
Deploys to Cloudflare Workers + CDN
```

The `.open-next/` directory is created during build - it's in `.gitignore`.

## Troubleshooting

### Build Fails

1. Check build logs in Cloudflare dashboard
2. Run `npm run build` locally to replicate
3. Common issues:
   - Missing dependencies: Run `npm install`
   - TypeScript errors: Run `npm run lint`
   - Node version mismatch: Check in Cloudflare settings

### API Routes Not Working

1. Verify endpoint works locally: `npm run preview`
2. Check Cloudflare logs in dashboard
3. Ensure `nodejs_compat` flag is set in `wrangler.toml`

### Environment Variables Not Available

1. Confirm they're set in Cloudflare dashboard
2. Rebuild/redeploy the project
3. Check if variable name is correct (case-sensitive)

### Preview Deployments Not Showing

1. Ensure PR deployments are enabled in Cloudflare settings
2. Check GitHub integration is still authorized
3. Try re-authorizing in Cloudflare dashboard

## Rollback

If something goes wrong:

1. Go to Cloudflare Pages dashboard
2. Find **"Deployments"** tab
3. Click the previous working version
4. Click **"Rollback"** button
5. Instant rollback (no rebuild needed)

## Monitoring & Analytics

### View Build Logs

1. Go to Cloudflare Pages dashboard
2. Select `danish-weather` project
3. Click **"Deployments"** tab
4. Click a deployment to see logs

### View Production Metrics

1. Click **"Analytics"** tab
2. See traffic, errors, performance metrics

### Enable Cloudflare Analytics Engine

1. Go to **Settings** → **Analytics Engine**
2. Enable to track custom metrics

## Security Best Practices

1. **Never commit secrets** - All sensitive data goes in Cloudflare dashboard
2. **Use Wrangler login** - One-time setup on local machine
3. **Rotate API tokens** - Periodically update Cloudflare tokens
4. **Review deployed code** - Check what's actually deployed via Git
5. **Use preview deployments** - Test PRs before merging to main

## Next Steps

1. **Create Cloudflare Pages project** (steps above)
2. **Test the deployment**:
   - Visit production URL
   - Check weather data loads
   - Test API endpoints
3. **Set up monitoring** (optional):
   - Cloudflare Analytics
   - Error tracking (Sentry, Datadog, etc.)
4. **Configure custom domain** (optional):
   - Add CNAME record
   - Enable SSL/TLS

## Additional Resources

- **Cloudflare Pages Docs**: https://developers.cloudflare.com/pages/
- **OpenNext Adapter**: https://opennext.js.org/cloudflare
- **Wrangler CLI**: https://developers.cloudflare.com/workers/wrangler/
- **Next.js on Workers**: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs

## Support

For questions or issues:

- Check Cloudflare docs: https://developers.cloudflare.com/pages/
- Open an issue on GitHub: https://github.com/invasionofsmallcubes/danish-weather/issues
- Review deployment logs in Cloudflare dashboard

---

**Happy deploying! 🚀**
