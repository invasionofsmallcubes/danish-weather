# 📑 Danish Weather App - Documentation Index

## Start Here 👇

### For First-Time Setup
1. **[BOOTSTRAP_SUMMARY.md](./BOOTSTRAP_SUMMARY.md)** ← Start here!
   - What was built
   - How to get started
   - Quality metrics

2. **[QUICKSTART.md](./QUICKSTART.md)**
   - 5-minute setup guide
   - Running dev server
   - Basic customization

3. **[README.md](./README.md)**
   - Complete documentation
   - Feature descriptions
   - Architecture overview
   - API integration guide

### For Development

#### Understanding the Code
- **API Integration**
  - `src/lib/api/yr.ts` - YR.no weather client
  - `src/lib/api/dmi.ts` - DMI weather client
  - `src/lib/api/index.ts` - API aggregation layer

- **Data Validation**
  - `src/lib/schemas/yr.ts` - YR.no Zod schemas
  - `src/lib/schemas/dmi.ts` - DMI Zod schemas

- **React Components**
  - `src/components/WeatherContainer.tsx` - Main container (state management)
  - `src/components/YrWeatherDisplay.tsx` - YR.no UI component
  - `src/components/DmiWeatherDisplay.tsx` - DMI UI component

- **Pages**
  - `src/app/page.tsx` - Homepage
  - `src/app/layout.tsx` - Root layout
  - `src/app/globals.css` - Global styles

#### Configuration Files
- `package.json` - Dependencies & scripts
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `next.config.ts` - Next.js configuration
- `.env.example` - Environment variables template
- `.gitignore` - Git ignore rules

#### Project Standards
- **[AGENT.md](./AGENT.md)** - Technical standards & best practices

## Common Tasks

### Running the App
```bash
npm run dev          # Development server
npm run build        # Production build
npm start            # Start production server
npm run lint         # Run ESLint
```

### Integrating Real APIs
1. Get endpoint URLs from yr.no and dmi.dk
2. Update `YR_BASE_URL` in `src/lib/api/yr.ts`
3. Update `DMI_BASE_URL` in `src/lib/api/dmi.ts`
4. Update response parsing in fetch functions
5. Test with `npm run dev`

### Adding New Features
1. **New Location Support**
   - Modify `src/app/page.tsx` to accept location selector
   - Pass latitude/longitude to `<WeatherContainer />`

2. **New Weather Data Fields**
   - Update Zod schemas in `src/lib/schemas/`
   - Update API clients in `src/lib/api/`
   - Update components in `src/components/`

3. **New Styling**
   - Modify `src/app/globals.css` for global styles
   - Update components with Tailwind classes
   - Configure theme in `tailwind.config.ts`

## Architecture Overview

```
Clean Architecture Pattern
├── API Layer (src/lib/api/)
│   ├── Fetch functions
│   ├── Retry logic
│   └── Error handling
│
├── Validation Layer (src/lib/schemas/)
│   ├── Zod schemas
│   └── Type definitions
│
├── UI Layer (src/components/)
│   ├── React components
│   ├── State management (hooks)
│   └── Error/loading states
│
└── Pages (src/app/)
    ├── Route definitions
    └── Layout wrapper
```

## Key Technologies

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 15.5.12 | React framework |
| React | 19.2.4 | UI library |
| TypeScript | 5.9.3 | Type safety |
| Zod | 3.25.76 | Runtime validation |
| Tailwind CSS | 3.4.19 | Styling |
| ESLint | 8.57.1 | Code quality |

## Features Checklist

- ✅ Fetch from two weather sources
- ✅ Type-safe with TypeScript
- ✅ Zod validation schemas
- ✅ React components with hooks
- ✅ Loading states (skeletons)
- ✅ Error handling (graceful fallbacks)
- ✅ Auto-refresh (10 minutes)
- ✅ Responsive design (Tailwind)
- ✅ Retry logic (exponential backoff)
- ✅ Timeout protection (5 seconds)

## Development Workflow

```
1. Start dev server
   npm run dev

2. Edit files (hot reload)
   Files auto-refresh in browser

3. Check for errors
   TypeScript errors show in terminal
   ESLint warnings show in terminal

4. Build for production
   npm run build
   (Verifies all errors before deploy)

5. Deploy
   npm start (local)
   OR
   Deploy to Vercel (1-click)
```

## Troubleshooting

### TypeScript Errors
```bash
npm run build     # Shows all type errors
```

### API Not Loading
- Check browser console (F12 → Console)
- Verify API endpoints in `src/lib/api/`
- Check network tab (F12 → Network)

### Styling Issues
- Check Tailwind config: `tailwind.config.ts`
- Check global styles: `src/app/globals.css`
- Check component classes (TailwindCSS syntax)

### Port Already in Use
```bash
npm run dev -- -p 3001    # Use different port
```

## Additional Resources

### Official Docs
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Zod Documentation](https://zod.dev)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

### Weather APIs
- [YR.no API](https://www.yr.no/en/documentation)
- [DMI Open Data](https://www.dmi.dk/en/open-data)

### Deploy
- [Vercel Deployment](https://vercel.com) - 1-click deploy from GitHub
- [Netlify](https://netlify.com) - Alternative hosting
- [Self-hosted](https://nextjs.org/docs/deployment) - Docker/custom server

## File Tree

```
danishweather/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── WeatherContainer.tsx
│   │   ├── YrWeatherDisplay.tsx
│   │   └── DmiWeatherDisplay.tsx
│   └── lib/
│       ├── api/
│       │   ├── index.ts
│       │   ├── yr.ts
│       │   └── dmi.ts
│       └── schemas/
│           ├── yr.ts
│           └── dmi.ts
├── .env.example
├── .gitignore
├── INDEX.md (this file)
├── README.md
├── QUICKSTART.md
├── BOOTSTRAP_SUMMARY.md
├── AGENT.md
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── postcss.config.js
```

---

**Last Updated:** February 28, 2026
**Status:** ✅ Ready for Development
**Build Status:** ✅ Passing
