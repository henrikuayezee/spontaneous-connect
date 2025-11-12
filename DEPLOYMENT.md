# Deployment Guide for SpontaneousConnect

## 🚀 Vercel Deployment

### Prerequisites
- Supabase account with a project set up
- Vercel account connected to your GitHub repository
- Database configured using `database/setup.sql`

### Step 1: Configure Environment Variables in Vercel

**IMPORTANT**: The app requires environment variables to function. Without these, you'll see an authentication error.

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following **required** variables:

#### Required Variables

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**Where to find these values:**
- Go to your Supabase project dashboard
- Navigate to **Settings** → **API**
- Copy the **Project URL** for `VITE_SUPABASE_URL`
- Copy the **anon public** key for `VITE_SUPABASE_ANON_KEY`

#### Optional Variables (for enhanced features)

```bash
# EmailJS (for email notifications)
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
VITE_EMAILJS_PUBLIC_KEY=your_public_key

# Sentry (for error monitoring)
VITE_SENTRY_DSN=your_sentry_dsn

# PostHog (for analytics)
VITE_POSTHOG_KEY=your_posthog_key
VITE_POSTHOG_HOST=https://app.posthog.com

# App configuration
VITE_APP_VERSION=1.0.0
VITE_APP_NAME=SpontaneousConnect
VITE_ENABLE_DEBUG_LOGGING=false
VITE_ENABLE_PERFORMANCE_MONITORING=true
```

### Step 2: Environment Scope

Make sure to set the environment variables for the correct environments:

- ✅ **Production** - for main branch deployments
- ✅ **Preview** - for feature branch deployments
- ✅ **Development** - for local development (if needed)

### Step 3: Redeploy

After adding environment variables:

1. Go to **Deployments** in Vercel
2. Find your latest deployment
3. Click the **three dots** menu (⋯)
4. Select **Redeploy**
5. Check **Use existing Build Cache** (optional)
6. Click **Redeploy**

### Step 4: Verify Deployment

Once deployed, visit your app URL and verify:

- ✅ App loads without errors
- ✅ Sign up/Sign in forms are visible
- ✅ No "Authentication Problem" error

## 🔧 Troubleshooting

### Error: "Missing required environment variables"

**Symptoms**: App shows authentication error immediately on load

**Solution**:
1. Check that environment variables are set in Vercel
2. Verify variable names are exact (case-sensitive):
   - `VITE_SUPABASE_URL` (not `SUPABASE_URL`)
   - `VITE_SUPABASE_ANON_KEY` (not `SUPABASE_KEY`)
3. Redeploy after adding variables

### Error: "There's an issue with your session"

**Symptoms**: Can't sign in or authentication fails

**Possible causes**:
1. **Wrong Supabase URL or key**
   - Verify URL format: `https://xxxxx.supabase.co`
   - Ensure you're using the **anon public** key, not service role key

2. **Database not set up**
   - Run `database/setup.sql` in Supabase SQL editor
   - Verify tables exist: users, call_history, blocked_times, schedule_helper

3. **Email confirmation required**
   - Check Supabase **Authentication** → **Email Templates**
   - Disable email confirmation for testing, or check your email

### Error: Network or CORS issues

**Symptoms**: API requests fail, CORS errors in console

**Solution**:
1. Check Supabase project is active
2. Verify Supabase URL is accessible
3. Check Supabase **Authentication** → **URL Configuration**
   - Add your Vercel domain to **Site URL**
   - Add to **Redirect URLs** if using OAuth

## 📋 Deployment Checklist

Use this checklist before deploying:

- [ ] Supabase project created
- [ ] Database schema applied (`database/setup.sql`)
- [ ] Row Level Security (RLS) policies enabled
- [ ] Environment variables configured in Vercel:
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] Vercel deployment successful
- [ ] App loads without errors
- [ ] Authentication works (sign up/sign in)
- [ ] Database operations work (create profile, schedule calls)

## 🔒 Security Best Practices

1. **Never commit** `.env` or `.env.local` files
2. **Use anon key** for client-side (not service role key)
3. **Enable RLS** on all Supabase tables
4. **Rotate keys** if accidentally exposed
5. **Set up Vercel domains** in Supabase allowed domains

## 📚 Additional Resources

- [Vercel Environment Variables Docs](https://vercel.com/docs/concepts/projects/environment-variables)
- [Supabase API Keys](https://supabase.com/docs/guides/api#api-url-and-keys)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)

---

**Need help?** Open an issue on GitHub or contact support.
