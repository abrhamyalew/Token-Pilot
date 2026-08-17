import { NextRequest, NextResponse } from 'next/server';
import { getGatewayUrl } from '@/lib/gateway-client';

const GATEWAY_URL = getGatewayUrl();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawLimit = searchParams.get('limit') ?? '25';

  // Parse and clamp to a safe integer range before forwarding to the gateway
  const limit = Math.max(1, Math.min(100, parseInt(rawLimit, 10) || 25));

  try {
    const res = await fetch(`${GATEWAY_URL}/api/stats/recent?limit=${limit}`, {
      next: { revalidate: 15 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Gateway returned status ${res.status}` },
        { status: res.status },
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message ?? 'Failed to connect to gateway' },
      { status: 502 },
    );
  }
}
