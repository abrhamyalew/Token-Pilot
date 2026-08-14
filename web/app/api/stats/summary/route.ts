import { NextResponse } from 'next/server';

const GATEWAY_URL =
  process.env.GATEWAY_URL ?? process.env.NEXT_PUBLIC_GATEWAY_URL ?? 'http://localhost:3000';

export async function GET() {
  try {
    const res = await fetch(`${GATEWAY_URL}/api/stats/summary`, {
      next: { revalidate: 30 },
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
