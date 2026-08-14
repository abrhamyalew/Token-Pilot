'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Nav.module.css';

const NAV_LINKS = [
  { href: '/',          label: 'Playground' },
  { href: '/dashboard', label: 'Dashboard'  },
  { href: '/config',    label: 'Config'     },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        {/* Logo */}
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>⚡</span>
          <span className={styles.logoText}>
            Token<strong>Pilot</strong>
          </span>
        </Link>

        {/* Links */}
        <ul className={styles.links}>
          {NAV_LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className={`${styles.link} ${pathname === href ? styles.active : ''}`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Status pill */}
        <div className={styles.status}>
          <span className="status-dot online" />
          <span className={styles.statusText}>Live</span>
        </div>
      </nav>
    </header>
  );
}
