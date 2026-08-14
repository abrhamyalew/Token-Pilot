/**
 * Feature Extractor — re-exports from the shared @token-pilot/classifier package.
 *
 * The actual implementation lives in packages/classifier so both the gateway
 * and the Next.js frontend run identical code. No drift when weights are tuned.
 */
export { extractFeatures } from '@token-pilot/classifier';
