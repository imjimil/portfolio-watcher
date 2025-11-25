import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Successfully exchanged code for session, redirect to app
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // If there's an error, redirect to login
  return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin));
}

