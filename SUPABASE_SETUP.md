# Supabase Setup Guide

Follow these steps to set up Supabase for your portfolio tracker:

## 1. Create a Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up for a free account
3. Create a new project
4. Wait for the project to be set up (takes ~2 minutes)

## 2. Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (under "Project URL")
   - **anon public** key (under "Project API keys")

## 3. Set Up Environment Variables

1. Create a `.env.local` file in the root of your project (if it doesn't exist)
2. Add the following:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

Replace `your_project_url_here` and `your_anon_key_here` with the values from step 2.

## 4. Set Up the Database

1. In your Supabase project dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste the entire contents of `supabase/schema.sql`
4. Click **Run** to execute the SQL
5. Verify the tables were created by going to **Table Editor**

## 5. Configure Authentication

1. In Supabase dashboard, go to **Authentication** → **Settings**
2. Under **Site URL**, add: `http://localhost:3000` (for development)
3. Under **Redirect URLs**, add: `http://localhost:3000/**`
4. (Optional) Enable email confirmation if you want users to verify their email

## 6. Test the Setup

1. Start your development server: `npm run dev`
2. Navigate to `http://localhost:3000/signup`
3. Create a test account
4. Try logging in at `http://localhost:3000/login`

## Troubleshooting

### "User not authenticated" errors
- Make sure you're logged in
- Check that middleware is working correctly
- Verify your Supabase URL and keys are correct

### Database errors
- Make sure you ran the schema.sql file
- Check that Row Level Security (RLS) policies are enabled
- Verify your user has the correct permissions

### CORS errors
- Make sure your redirect URLs are configured in Supabase
- Check that your Site URL matches your development URL

## Next Steps

After setup:
1. All routes are now protected (except `/login` and `/signup`)
2. User data is stored in Supabase instead of localStorage
3. Each user has their own isolated data
4. Data persists across devices and sessions

