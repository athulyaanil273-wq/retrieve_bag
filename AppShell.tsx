import type { ReactNode } from 'react';
import { TopNav, type NavItem } from './TopNav';
import { Footer } from './Footer';

export interface AppShellProps {
  navItems: NavItem[];
  footerLinks?: NavItem[];
  activeHref?: string;
  onNavigate?: (href: string) => void;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  children: ReactNode;
}

export function AppShell({
  navItems,
  footerLinks,
  activeHref,
  onNavigate,
  primaryActionLabel,
  onPrimaryAction,
  children,
}: AppShellProps) {
  return (
    <div id="home" className="min-h-screen flex flex-col bg-navy-900 text-slate-100">
      {/* Accessibility: Keyboard skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:rounded-xl focus:bg-pink-400 focus:text-navy-950 focus:font-semibold"
      >
        Skip to main content
      </a>

      <TopNav
        navItems={navItems}
        activeHref={activeHref}
        onNavigate={onNavigate}
        primaryActionLabel={primaryActionLabel}
        onPrimaryAction={onPrimaryAction}
      />

      <main id="main-content" className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {children}
      </main>

      <Footer links={footerLinks ?? navItems} onNavigate={onNavigate} />
    </div>
  );
}
