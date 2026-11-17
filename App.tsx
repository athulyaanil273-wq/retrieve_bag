/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { AppShell } from '@/src/components/layout/AppShell';
import { DesignSystemShowcase } from '@/src/components/design-system/DesignSystemShowcase';
import { AuthProvider, useAuth } from '@/src/contexts/AuthContext';
import { LandingPage } from '@/src/pages/LandingPage';
import { LoginPage } from '@/src/pages/LoginPage';
import { RegisterPage } from '@/src/pages/RegisterPage';
import {
  ReportExchangedPage,
  ReportFoundPage,
  ReportLostPage,
} from '@/src/pages/ReportPages';
import { DashboardPage } from '@/src/pages/DashboardPage';
import { NotificationsPage } from '@/src/pages/NotificationsPage';
import { MatchDetailsPage } from '@/src/pages/MatchDetailsPage';
import { ConnectionsPage } from '@/src/pages/ConnectionsPage';
import { AdminDashboardPage } from '@/src/pages/AdminDashboardPage';
import {
  fetchOwnedAndUserReports,
  fetchUnreadNotificationCount,
} from '@/src/lib/baggageService';
import { useBaggageRealtimeSync } from '@/src/lib/realtimeSync';
import { getOwnedReportIds } from '@/src/lib/reportOwnership';
import type { NavItem } from '@/src/components/layout/TopNav';
import type { ReportType } from '@/src/types/baggage';

const FOOTER_LINKS: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Lost Bag', href: '/report/lost' },
  { label: 'Found Bag', href: '/report/found' },
  { label: 'Exchanged Bag', href: '/report/exchanged' },
  { label: 'Notifications', href: '/notifications' },
  { label: 'My Reports', href: '/dashboard' },
  { label: 'Admin Console', href: '/admin' },
];

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isConfigured } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!isConfigured) {
      setUnreadCount(0);
      return;
    }

    try {
      const ownedIds = getOwnedReportIds();
      const ownedReports = await fetchOwnedAndUserReports(user?.id ?? null, ownedIds);
      const allIds = Array.from(new Set([...ownedIds, ...ownedReports.map((r) => r.id)]));
      const count = await fetchUnreadNotificationCount(allIds, user?.id ?? null);
      setUnreadCount(count);
    } catch {
      setUnreadCount(0);
    }
  }, [user, isConfigured]);

  useEffect(() => {
    void refreshUnreadCount();
  }, [refreshUnreadCount, location.pathname]);

  useBaggageRealtimeSync(() => {
    void refreshUnreadCount();
  }, isConfigured);

  const scrollToSection = (sectionId: string) => {
    if (location.pathname !== '/') {
      navigate('/');
      window.setTimeout(() => {
        if (sectionId === 'home') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 60);
      return;
    }

    if (sectionId === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleNavigate = async (href: string) => {
    if (href === '#logout') {
      await signOut();
      navigate('/');
      return;
    }

    if (href.startsWith('#')) {
      scrollToSection(href.slice(1));
      return;
    }

    navigate(href);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrimaryCta = () => {
    navigate('/dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectReportType = (type: ReportType) => {
    navigate(`/report/${type}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navItems: NavItem[] = [
    { label: 'Home', href: '/' },
    { label: 'Lost Bag', href: '/report/lost' },
    { label: 'Found Bag', href: '/report/found' },
    { label: 'Exchanged', href: '/report/exchanged' },
    { label: 'Notifications', href: '/notifications', badgeCount: unreadCount },
  ];

  const footerLinks: NavItem[] = user
    ? [...FOOTER_LINKS, { label: 'Logout', href: '#logout' }]
    : FOOTER_LINKS;

  return (
    <AppShell
      navItems={navItems}
      footerLinks={footerLinks}
      activeHref={location.pathname}
      onNavigate={(href) => void handleNavigate(href)}
      primaryActionLabel="My Reports"
      onPrimaryAction={handlePrimaryCta}
    >
      <Routes>
        <Route
          path="/"
          element={
            <LandingPage
              onGetStarted={() => scrollToSection('main-actions')}
              onHowItWorks={() => scrollToSection('how-it-works')}
              onSelectReportType={handleSelectReportType}
              onOpenLogin={() => navigate('/dashboard')}
            />
          }
        />
        <Route path="/report/lost" element={<ReportLostPage />} />
        <Route path="/report/found" element={<ReportFoundPage />} />
        <Route path="/report/exchanged" element={<ReportExchangedPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/matches/:matchId" element={<MatchDetailsPage />} />
        <Route path="/connections" element={<ConnectionsPage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/design-system" element={<DesignSystemShowcase />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </MotionConfig>
  );
}
