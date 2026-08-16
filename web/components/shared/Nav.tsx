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
          <svg
            className={styles.logoIcon}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 32 32"
            fill="none"
            width="22"
            height="22"
            aria-hidden="true"
          >
            <rect width="32" height="32" rx="7" fill="#1C1B1A" />
            <rect x="0.5" y="0.5" width="31" height="31" rx="6.5" stroke="#37352F" strokeOpacity="0.5" />
            <circle cx="9" cy="23" r="2.5" fill="#38A169" />
            <circle cx="16" cy="11" r="2.5" fill="#3182CE" />
            <circle cx="23" cy="20" r="2.5" fill="#805AD5" />
            <path d="M9 23L16 11L23 20" stroke="#E2E0D8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
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
