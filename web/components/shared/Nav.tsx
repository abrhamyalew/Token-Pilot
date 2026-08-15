'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useConfigStore } from '@/lib/config-store';
import styles from './Nav.module.css';

const NAV_LINKS = [
  { href: '/',          label: 'Playground' },
  { href: '/dashboard', label: 'Dashboard'  },
  { href: '/config',    label: 'Config'     },
];

export function Nav() {
  const pathname = usePathname();
  const { activeKeyCount } = useConfigStore();

  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        {/* Brand */}
        <Link href="/" className={styles.logo}>
          <span className={styles.logoMark}>TP</span>
          <span className={styles.brandTitle}>Token Pilot</span>
          <span className={styles.versionTag}>v0.1</span>
        </Link>

        {/* Center Nav Links */}
        <ul className={styles.links}>
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`${styles.link} ${isActive ? styles.active : ''}`}
                >
                  <span>{label}</span>
                  {href === '/config' && activeKeyCount > 0 && (
                    <span
                      className={styles.keyIndicatorDot}
                      title={`${activeKeyCount} custom BYOK keys active`}
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
