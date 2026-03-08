import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.API_URL || 'http://localhost:8000';
const API_KEY = process.env.API_KEY;

// Runtime check instead of build-time check
function validateApiKey() {
    if (!API_KEY) {
        console.warn('⚠️ API_KEY not set in environment variables - using proxy without authentication');
    }
}

const ALLOWED_PATHS = [
  'vision',
  'chat',
  'crime',
  'requests',
  'predictions',
  'alerts',
  'kpis',
  'districts',      // ← THÊM: useDistricts()
];

const HOP_BY_HOP = new Set([
  'transfer-encoding', 'connection', 'keep-alive',
  'proxy-authenticate', 'proxy-authorization',
  'te', 'trailers', 'upgrade',
]);

async function proxyRequest(request: NextRequest, pathArray: string[], method: string) {
  if (!ALLOWED_PATHS.includes(pathArray[0])) {
    return NextResponse.json({ error: 'Forbidden path' }, { status: 403 });
  }

  const path = pathArray.join('/');
  const searchParams = request.nextUrl.searchParams.toString();
  const url = `${BACKEND_URL}/api/v1/${path}${searchParams ? `?${searchParams}` : ''}`;

  try {
    const headers = new Headers(request.headers);
    // Only add API key if not using demo API (port 8001) and API_KEY exists
    if (!BACKEND_URL.includes('8001') && API_KEY) {
      headers.set('X-API-Key', API_KEY);
    }
    headers.delete('host');

    const options: RequestInit = { method, headers };

    if (method !== 'GET' && method !== 'HEAD') {
      options.body = request.body;
      // @ts-ignore
      options.duplex = 'half';
    }

    const response = await fetch(url, options);

    // Safe header forwarding — lọc hop-by-hop
    const safeHeaders = new Headers();
    response.headers.forEach((value, key) => {
      if (!HOP_BY_HOP.has(key.toLowerCase())) {
        safeHeaders.set(key, value);
      }
    });

    return new NextResponse(response.body, {
      status: response.status,
      headers: safeHeaders,
    });
  } catch (error) {
    console.error(`[PROXY FATAL] ${method} ${path}:`, error);
    return NextResponse.json({ error: 'Gateway Timeout' }, { status: 504 });
  }
}

export const GET = (req: NextRequest, { params }: any) =>
  proxyRequest(req, params.path, 'GET');
export const POST = (req: NextRequest, { params }: any) =>
  proxyRequest(req, params.path, 'POST');
