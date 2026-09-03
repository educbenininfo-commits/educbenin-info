'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BACKOFFICE_NAV } from '@/lib/backoffice-nav';

export function BackofficeSidebar() {
  const pathname = usePathname();

  return (
    <aside className="bo-side">
      <div className="bo-brand">
        <span className="mark">EB</span>Educ Bénin
      </div>
      {BACKOFFICE_NAV.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={`bo-item${pathname === item.href ? ' on' : ''}`}
        >
          <span className="ic">{item.icon}</span>
          <span className="lbl">{item.label}</span>
        </Link>
      ))}
    </aside>
  );
}
