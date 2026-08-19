import type { Metadata } from 'next';
import { getHealth } from '@/lib/api';
import { ProviderHealth } from '@/components/config/ProviderHealth';
import { WeightSliders } from '@/components/config/WeightSliders';
import { ThresholdSliders } from '@/components/config/ThresholdSliders';
import { TierModelEditor } from '@/components/config/TierModelEditor';
import { ApiKeyManager } from '@/components/config/ApiKeyManager';
import { ConfigHeader } from '@/components/config/ConfigHeader';
import { ClassifierToggle } from '@/components/config/ClassifierToggle';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Configuration',
  description: 'Manage custom BYOK API keys, tier-model routing assignments, classifier engine, and provider health.',
};

export const revalidate = 60;

export default async function ConfigPage() {
  const health = await getHealth().catch(() => null);

  return (
    <div className={styles.page}>
      <div className="container">
        {/* Header with Mode Toggle */}
        <ConfigHeader />

        {/* 2-Column Bento Layout */}
        <div className={styles.grid}>
          {/* Left Column */}
          <div className={styles.col}>
            <TierModelEditor />
            <ApiKeyManager />
          </div>

          {/* Right Column */}
          <div className={styles.col}>
            <ClassifierToggle />
            <ThresholdSliders />
            <WeightSliders />
            <ProviderHealth health={health} />
          </div>
        </div>
      </div>
    </div>
  );
}
