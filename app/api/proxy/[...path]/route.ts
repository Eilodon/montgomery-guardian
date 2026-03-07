import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.API_URL || 'http://localhost:8000/api/v1';
const API_KEY = process.env.API_KEY || 'mg_secret_key_2026_change_me';

export async function GET(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    const path = params.path.join('/');
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${BACKEND_URL}/${path}${searchParams ? `?${searchParams}` : ''}`;

    try {
        const response = await fetch(url, {
            headers: {
                'X-API-Key': API_KEY,
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('Proxy GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch from backend' }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    const path = params.path.join('/');
    const url = `${BACKEND_URL}/${path}`;

    try {
        // Copy original headers and inject API Key
        const headers = new Headers(request.headers);
        headers.set('X-API-Key', API_KEY);
        // Important: Host must be removed to let fetch handle it for the target
        headers.delete('host');

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            // @ts-ignore - body can be a ReadableStream in Next.js/Undici
            body: request.body,
            // @ts-ignore - duplex is required for streaming bodies in recent fetch implementations
            duplex: 'half'
        });

        const data = await response.text();

        // Try to return as JSON if possible, otherwise return raw text/binary
        try {
            return NextResponse.json(JSON.parse(data), { status: response.status });
        } catch {
            return new NextResponse(data, {
                status: response.status,
                headers: {
                    'Content-Type': response.headers.get('Content-Type') || 'application/json'
                }
            });
        }
    } catch (error) {
        console.error('Proxy POST error:', error);
        return NextResponse.json({ error: 'Failed to post to backend' }, { status: 500 });
    }
}
