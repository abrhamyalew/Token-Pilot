import { NextRequest, NextResponse } from 'next/server';

const GATEWAY_URL =
  process.env.GATEWAY_URL ?? process.env.NEXT_PUBLIC_GATEWAY_URL ?? 'http://localhost:3000';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawDays = searchParams.get('days') ?? '7';

  // Parse and clamp to a safe integer range before forwarding to the gateway
  const days = Math.max(1, Math.min(90, parseInt(rawDays, 10) || 7));

  try {
    const res = await fetch(`${GATEWAY_URL}/api/stats/timeseries?days=${days}`, {
      next: { revalidate: 60 },
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
