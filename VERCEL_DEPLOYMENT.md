# Vercel Deployment Guide - Vikar System

## Prerequisites

1. Vercel account (sign up at https://vercel.com)
2. Supabase project set up and database migration run
3. All environment variables ready

## Step 1: Prepare Your Repository

Ensure your code is pushed to a Git repository (GitHub, GitLab, or Bitbucket).

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your Git repository
4. Configure the project:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel

# For production deployment
vercel --prod
```

## Step 3: Configure Environment Variables

In your Vercel project settings, add these environment variables:

### Required Variables

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Optional Variables (if using)

```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CPR_ENCRYPTION_KEY=your_32_byte_hex_key
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

**How to add environment variables:**
1. Go to your project in Vercel Dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable for:
   - **Production**
   - **Preview** (optional, for PR previews)
   - **Development** (optional, for local dev)

## Step 4: Configure Build Settings

Vercel should auto-detect Next.js, but verify:

- **Framework**: Next.js
- **Node.js Version**: 18.x or higher (set in `package.json` engines)
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

## Step 5: Deploy

1. Click **Deploy** in Vercel Dashboard
2. Wait for build to complete
3. Your app will be live at `https://your-project.vercel.app`

## Step 6: Configure Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions

## Post-Deployment Checklist

- [ ] Verify environment variables are set correctly
- [ ] Test authentication flow (login/register)
- [ ] Test role-based routing (worker/company/admin)
- [ ] Verify Supabase connection
- [ ] Check that middleware is working (redirects)
- [ ] Test on mobile devices (worker portal)
- [ ] Test on desktop (company portal)

## Troubleshooting

### Build Fails

1. Check build logs in Vercel Dashboard
2. Ensure all dependencies are in `package.json`
3. Verify Node.js version compatibility
4. Check for TypeScript errors locally: `npm run build`

### Environment Variables Not Working

1. Ensure variables are prefixed with `NEXT_PUBLIC_` for client-side access
2. Redeploy after adding new variables
3. Check variable names match exactly (case-sensitive)

### Supabase Connection Issues

1. Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
2. Check CORS settings in Supabase Dashboard
3. Ensure RLS policies allow public access where needed
4. Verify anon key is correct

### Middleware Not Working

1. Check `middleware.ts` is in root directory
2. Verify route matcher pattern in `middleware.ts`
3. Check Vercel logs for middleware errors

## Continuous Deployment

Vercel automatically deploys:
- **Production**: On push to main/master branch
- **Preview**: On every push to other branches (creates preview URLs)

## Monitoring

- View deployment logs in Vercel Dashboard
- Check function logs for server actions
- Monitor performance in Vercel Analytics (if enabled)

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase + Vercel Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs)

