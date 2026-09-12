import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const response = NextResponse.json({ message: 'Logged out successfully' });
  const isHttps = request.url.startsWith('https:') || request.headers.get('x-forwarded-proto') === 'https';
  
  response.cookies.set('auth_token', '', {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    maxAge: 0,
    expires: new Date(0),
    path: '/',
  });
  
  return response;
}

export async function GET(request: Request) {
  return POST(request);
}
