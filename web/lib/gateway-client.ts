/**
 * Gateway client configuration and URL resolution.
 * Safe for use in browser client components and client-side hooks.
 */

export function getGatewayUrl(): string {
  return process.env.NEXT_PUBLIC_GATEWAY_URL ?? 'http://localhost:3000';
}
