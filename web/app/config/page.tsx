import type { Metadata } from 'next';
import { getHealth } from '@/lib/api';
import { ProviderHealth } from '@/components/config/ProviderHealth';
import { WeightSliders } from '@/components/config/WeightSliders';
import { ThresholdSliders } from '@/components/config/ThresholdSliders';
import { TierModelEditor } from '@/components/config/TierModelEditor';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Configuration',
  description: 'Inspect tier-model mappings, classifier weights, threshold boundaries, and provider health.',
};

export const revalidate = 60;

const TIER_MODEL_MAP = {
  low:      { model: 'llama-3.3-70b-versatile', provider: 'Groq',      cost: 'Free tier' },
  medium:   { model: 'gemini-3.6-flash',         provider: 'Google AI', cost: 'Free tier' },
  high:     { model: 'gpt-5.5-pro',              provider: 'OpenAI',    cost: '$0.0300 / 1K in' },
  high_alt: { model: 'claude-opus-4-8',          provider: 'Anthropic', cost: '$0.0050 / 1K in' },
};

export default async function ConfigPage() {
  const health = await getHealth().catch(() => null);

  return (
    <div className={styles.page}>
      <div className="container">
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerText}>
            <h1 className={`${styles.title} serif-heading`}>Routing Configuration</h1>
            <p className={styles.subtitle}>
              Parameters and weights governing complexity classification, tier cutoffs, and provider connectivity.
            </p>
          </div>

          <div className={styles.previewTag}>
            <span>Simulator Mode</span>
          </div>
        </div>

        {/* 2-Column Bento Layout */}
        <div className={styles.grid}>
          {/* Left Column */}
          <div className={styles.col}>
            <TierModelEditor tiers={TIER_MODEL_MAP} />
            <ThresholdSliders />
            <ProviderHealth health={health} />
          </div>

          {/* Right Column */}
          <div className={styles.col}>
            <WeightSliders />
          </div>
        </div>
      </div>
    </div>
  );
}
