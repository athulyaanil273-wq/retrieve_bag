import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { cn } from '@/src/lib/utils';

export interface NavItem {
  label: string;
  href: string;
  badgeCount?: number;
}

export interface TopNavProps {
  navItems: NavItem[];
  activeHref?: string;
  onNavigate?: (href: string) => void;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
}

/**
 * Top Bar Contract: Strictly 3 zones separated by gap-8:
 * [Brand Title] — [4-5 single-line nav links] — [1 primary CTA]
 */
export function TopNav({
  navItems,
  activeHref,
  onNavigate,
  primaryActionLabel,
  onPrimaryAction,
}: TopNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    onNavigate?.(href);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-navy-900/90 backdrop-blur-md border-b border-lavender-300/12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#home"
          onClick={(e) => {
            if (onNavigate) {
              e.preventDefault();
              handleNavClick('#home');
            }
          }}
          className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-50 whitespace-nowrap shrink-0 font-display"
        >
          <span
            className="w-8 h-8 rounded-xl bg-pink-400 text-navy-950 inline-flex items-center justify-center shadow-sm shrink-0"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4.5 h-4.5">
              <path
                d="M9 6V4.5C9 3.67 9.67 3 10.5 3H13.5C14.33 3 15 3.67 15 4.5V6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <rect
                x="5"
                y="6"
                width="14"
                height="14"
                rx="4"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path d="M9 11V15M15 11V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <span>Retrieve Bag</span>
        </a>

        {/* Zone 2: Concise single-line navigation links */}
        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-7">
          {navItems.map((item) => {
            const isActive = activeHref === item.href;
            const hasUnread = Boolean(item.badgeCount && item.badgeCount > 0);
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => {
                  if (onNavigate) {
                    e.preventDefault();
                    handleNavClick(item.href);
                  }
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 text-sm font-medium whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors duration-[180ms]',
                  isActive
                    ? 'text-pink-300 border-pink-400'
                    : 'text-slate-300 border-transparent hover:text-white hover:border-lavender-300/40'
                )}
              >
                <span>{item.label}</span>
                {hasUnread && (
                  <span
                    aria-label={`${item.badgeCount} unread`}
                    className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-pink-400 text-navy-950 text-[11px] font-bold font-mono tabular-nums-mono"
                  >
                    {item.badgeCount}
                  </span>
                )}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action + Mobile Menu Trigger */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:block">
            <Button variant="primary" size="sm" onClick={onPrimaryAction}>
              {primaryActionLabel}
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="md:hidden min-w-11 min-h-11 inline-flex items-center justify-center rounded-xl text-slate-200 hover:bg-navy-800 cursor-pointer"
          >
            {mobileOpen ? (
              <X className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Menu className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Responsive Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-lavender-300/12 bg-navy-900 px-4 py-4 flex flex-col gap-2">
          {navItems.map((item) => {
            const hasUnread = Boolean(item.badgeCount && item.badgeCount > 0);
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => {
                  if (onNavigate) {
                    e.preventDefault();
                    handleNavClick(item.href);
                  }
                }}
                className="min-h-11 px-3 rounded-xl flex items-center justify-between text-sm font-medium text-slate-200 hover:bg-navy-800 hover:text-white"
              >
                <span>{item.label}</span>
                {hasUnread && (
                  <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-pink-400 text-navy-950 text-[11px] font-bold font-mono tabular-nums-mono">
                    {item.badgeCount}
                  </span>
                )}
              </a>
            );
          })}
          <div className="pt-2">
            <Button
              variant="primary"
              size="md"
              className="w-full"
              onClick={() => {
                setMobileOpen(false);
                onPrimaryAction();
              }}
            >
              {primaryActionLabel}
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
