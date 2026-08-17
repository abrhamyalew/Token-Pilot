/**
 * Gateway client configuration and URL resolution.
 * Safe for use in browser client components and client-side hooks.
 */

export function getGatewayUrl(): string {
  const url = process.env.NEXT_PUBLIC_GATEWAY_URL ?? 'http://localhost:3000';
  return url.replace(/\/+$/, '');
}
