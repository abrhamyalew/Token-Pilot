'use client';

import React from 'react';
import { useConfigStore } from '@/lib/config-store';
import styles from './ConfigHeader.module.css';

export function ConfigHeader() {
  const { routingMode, setRoutingMode, activeKeyCount } = useConfigStore();

  return (
    <div className={styles.header}>
      <div className={styles.headerText}>
        <h1 className={`${styles.title} serif-heading`}>Routing Configuration</h1>
        <p className={styles.subtitle}>
          Customize model assignments per tier, manage your personal BYOK API keys, and tune classification sensitivity.
        </p>
      </div>

      <div className={styles.controlsGroup}>
        <div className={styles.modeToggleGroup}>
          <button
            type="button"
            className={`${styles.modeToggleBtn} ${
              routingMode === 'preset' ? styles.modeActive : ''
            }`}
            onClick={() => setRoutingMode('preset')}
            title="Preset Mode: Uses public demo keys for Low/Med tiers"
          >
            <span>Preset Mode (Free Demo)</span>
          </button>

          <button
            type="button"
            className={`${styles.modeToggleBtn} ${
              routingMode === 'byok' ? styles.modeActive : ''
            }`}
            onClick={() => setRoutingMode('byok')}
            title="BYOK Mode: Uses your custom keys and model tier overrides"
          >
            <span>BYOK Mode (Custom Keys)</span>
            {activeKeyCount > 0 && (
              <span className={styles.activeKeyCountBadge}>{activeKeyCount}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
