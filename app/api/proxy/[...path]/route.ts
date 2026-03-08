import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.API_URL || 'http://localhost:8000';
const API_KEY = process.env.API_KEY as string; // ← BỎ fallback

if (!API_KEY) {
    throw new Error('API_KEY is not set in environment variables');
}

// Helper function để pass-through an toàn
async function proxyRequest(request: NextRequest, pathArray: string[], method: string) {
    // === THÊM TRƯỚC KHI TẠO URL ===
    const ALLOWED_PATHS = ['vision', 'chat', 'crime', 'requests', 'predictions', 'alerts', 'kpis'];
    if (!ALLOWED_PATHS.includes(pathArray[0])) {
        return NextResponse.json({ error: 'Forbidden path' }, { status: 403 });
    }

    const path = pathArray.join('/');
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${BACKEND_URL}/api/v1/${path}${searchParams ? `?${searchParams}` : ''}`;

    try {
        const headers = new Headers(request.headers);
        headers.set('X-API-Key', API_KEY);
        headers.delete('host'); // Ép host header tự phân giải

        const options: RequestInit = { method, headers };

        // Chỉ đọc body nếu không phải GET/HEAD
        if (method !== 'GET' && method !== 'HEAD') {
            options.body = request.body;
            // @ts-ignore - duplex is required for streaming
            options.duplex = 'half';
        }

        const response = await fetch(url, options);

        // THỢ RÈN: ZERO-COPY STREAMING. 
        // Đẩy thẳng response.body (ReadableStream) về client. Không dùng await response.text()
        return new NextResponse(response.body, {
            status: response.status,
            headers: response.headers,
        });
    } catch (error) {
        console.error(`[PROXY FATAL] ${method} error:`, error);
        return NextResponse.json({ error: 'Gateway Timeout' }, { status: 504 });
    }
}

export const GET = (req: NextRequest, { params }: any) => proxyRequest(req, params.path, 'GET');
export const POST = (req: NextRequest, { params }: any) => proxyRequest(req, params.path, 'POST');
