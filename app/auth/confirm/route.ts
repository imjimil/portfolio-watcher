import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next') || '/';

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash,
    });

    if (!error) {
      // Successfully verified, redirect to home
      return NextResponse.redirect(new URL('/', requestUrl.origin));
    }
  }

  // If there's an error or missing params, redirect to login with error
  return NextResponse.redirect(new URL('/login?error=invalid_token', requestUrl.origin));
}

