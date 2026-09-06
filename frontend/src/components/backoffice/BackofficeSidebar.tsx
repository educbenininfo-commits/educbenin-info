'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BACKOFFICE_NAV } from '@/lib/backoffice-nav';
import { useDossiersUnreadCount } from '@/lib/useDossiersUnreadCount';

export function BackofficeSidebar() {
  const pathname = usePathname();
  const dossiersUnread = useDossiersUnreadCount();

  return (
    <aside className="bo-side">
      <div className="bo-brand">
        <img
          src="/logo/lockup-dark.svg"
          alt="Educ Bénin"
          height={26}
          style={{ height: 26, width: 'auto' }}
        />
      </div>
      {BACKOFFICE_NAV.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={`bo-item${pathname === item.href ? ' on' : ''}`}
        >
          <span className="ic">{item.icon}</span>
          <span className="lbl">{item.label}</span>
          {item.key === 'dossiers' && dossiersUnread > 0 && (
            <span className="nav-badge">{dossiersUnread > 99 ? '99+' : dossiersUnread}</span>
          )}
        </Link>
      ))}
    </aside>
  );
}
