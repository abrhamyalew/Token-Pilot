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
  low:      { model: 'llama-3.3-70b',    provider: 'Groq',   cost: 'Free' },
  medium:   { model: 'gemini-2.0-flash', provider: 'Google', cost: 'Free' },
  high:     { model: 'gpt-4o',           provider: 'OpenAI', cost: '$0.0025/1K in' },
  high_alt: { model: 'claude-3-5-sonnet',provider: 'Anthropic', cost: '$0.003/1K in' },
};

export default async function ConfigPage() {
  const health = await getHealth().catch(() => null);

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Configuration</h1>
            <p className={styles.subtitle}>Inspect routing rules, classifier weights, and tier boundaries</p>
          </div>
          <div className={styles.previewBadge}>
            👁 Preview Mode — changes run against shared classifier
          </div>
        </div>

        <div className={styles.grid}>
          {/* Left column */}
          <div className={styles.col}>
            <TierModelEditor tiers={TIER_MODEL_MAP} />
            <ThresholdSliders />
            <ProviderHealth health={health} />
          </div>

          {/* Right column */}
          <div className={styles.col}>
            <WeightSliders />
          </div>
        </div>
      </div>
    </div>
  );
}
