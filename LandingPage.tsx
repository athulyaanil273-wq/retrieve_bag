import { useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  ArrowRight,
  CheckCircle2,
  Clock,
  Lock,
  Luggage,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LOST_AND_FOUND_COLLECTION_MESSAGE } from '@/src/lib/baggageService';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  StatusIndicator,
} from '@/src/components/ui';
import {
  BagSwapIllustration,
  BaggageCarouselIllustration,
  PinkSuitcaseMascot,
  TagScanIllustration,
} from '@/src/components/illustrations';
import type { ReportType } from '@/src/types/baggage';

export interface LandingPageProps {
  onGetStarted: () => void;
  onHowItWorks: () => void;
  onSelectReportType: (type: ReportType) => void;
  onOpenLogin: () => void;
}

const ACTION_CARDS: {
  type: ReportType;
  title: string;
  subtitle: string;
  description: string;
  ctaLabel: string;
  accentClass: string;
  iconBgClass: string;
  icon: typeof Luggage;
}[] = [
  {
    type: 'lost',
    title: 'Lost Bag',
    subtitle: 'Missing at carousel or gate',
    description:
      'Log your flight number, bag appearance, and optional 10-digit claim tag so airport finders can match your suitcase quickly.',
    ctaLabel: 'Report Lost Bag',
    accentClass: 'hover:border-rose-400/50',
    iconBgClass: 'bg-rose-400/15 text-rose-300 border-rose-400/25',
    icon: Luggage,
  },
  {
    type: 'found',
    title: 'Found Bag',
    subtitle: 'Unattended luggage spotted',
    description:
      'Picked up or noticed an unclaimed suitcase at the terminal? Submit its terminal location and tag details in under two minutes.',
    ctaLabel: 'Report Found Bag',
    accentClass: 'hover:border-lavender-300/55',
    iconBgClass: 'bg-lavender-300/15 text-lavender-200 border-lavender-300/25',
    icon: Search,
  },
  {
    type: 'exchanged',
    title: 'Exchanged Bag',
    subtitle: 'Look-alike suitcase swap',
    description:
      'Took a nearly identical bag home by mistake? Compare your baggage claim tag against recent arrivals to arrange a safe swap.',
    ctaLabel: 'Report Exchanged Bag',
    accentClass: 'hover:border-pink-400/55',
    iconBgClass: 'bg-pink-400/15 text-pink-300 border-pink-400/25',
    icon: ArrowLeftRight,
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    stepNumber: '01',
    title: 'Report Your Baggage',
    description:
      'Select Lost, Found, or Exchanged and enter your flight code, bag color, size, and optional 10-digit claim tag.',
    illustration: <TagScanIllustration />,
  },
  {
    stepNumber: '02',
    title: 'Automated Matching',
    description:
      'Retrieve Bag compares flight routes, arrival terminals, tag digits, and distinctive markers to surface likely matches.',
    illustration: <BagSwapIllustration />,
  },
  {
    stepNumber: '03',
    title: 'Verify & Retrieve',
    description:
      'Confirm ownership privately using hidden bag details before sharing contact info to reunite at the airport desk.',
    illustration: (
      <div className="flex items-center justify-center py-2">
        <PinkSuitcaseMascot mood="matched" size="lg" />
      </div>
    ),
  },
];

const WHY_PILLARS = [
  {
    icon: Clock,
    title: 'Convenience at the Carousel',
    description:
      'Designed for stressed travelers on mobile or desktop. A guided 3-step layout with smart flight formatting replaces long paper queues.',
    highlight: 'Guided intake in under 2 minutes',
  },
  {
    icon: CheckCircle2,
    title: 'Automated Match Detection',
    description:
      'Instead of scrolling through hundreds of posts, our matching engine pairs lost, found, and accidentally exchanged bags by flight and tag.',
    highlight: 'Cross-checks flight, tag & visual markers',
  },
  {
    icon: Lock,
    title: 'Secure Passenger Communication',
    description:
      'Your email and phone number stay hidden while searching. Contact details are revealed only after mutual tag or feature verification.',
    highlight: 'Privacy-first ownership checks',
  },
];

interface SubmissionBannerState {
  message: string;
  reportType: ReportType;
  matchesFound: number;
}

export function LandingPage({
  onGetStarted,
  onHowItWorks,
  onSelectReportType,
  onOpenLogin,
}: LandingPageProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const stateBanner =
    (location.state as { submissionBanner?: SubmissionBannerState } | null)?.submissionBanner ??
    null;

  const [banner, setBanner] = useState<SubmissionBannerState | null>(stateBanner);

  useEffect(() => {
    if (stateBanner) {
      setBanner(stateBanner);
      window.history.replaceState({}, document.title);
    }
  }, [stateBanner]);

  return (
    <div className="flex flex-col gap-20 sm:gap-28">
      {banner && (
        <Alert
          tone="success"
          title={banner.message}
          description={
            banner.matchesFound > 0
              ? banner.reportType === 'lost'
                ? LOST_AND_FOUND_COLLECTION_MESSAGE
                : 'A potential match was detected automatically. Open Notifications to review details and verification instructions.'
              : 'Automatic matching is active. You will see an alert in Notifications as soon as a matching report is found.'
          }
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" size="sm" onClick={() => navigate('/dashboard')}>
                My Reports
              </Button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/notifications')}>
                View Notifications
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setBanner(null)}>
                Dismiss
              </Button>
            </div>
          }
        />
      )}

      {/* 1. Hero Section */}
      <section
        aria-labelledby="hero-headline"
        className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center pt-2 sm:pt-4"
      >
        <div className="lg:col-span-6 flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-lavender-300">
            <span>Retrieve Bag</span>
            <span aria-hidden="true">·</span>
            <span>Airport Baggage Retrieval System</span>
          </div>

          <h1
            id="hero-headline"
            className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold font-display tracking-tight text-slate-50 leading-[1.08]"
          >
            Lost it? <span className="text-pink-400">Let&apos;s retrieve it.</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-xl leading-relaxed">
            Report lost, found, or accidentally exchanged airport luggage in minutes. Retrieve Bag
            matches flight details, baggage tags, and visual traits so travelers reunite with their
            suitcases calmly.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <Button
              variant="primary"
              size="lg"
              rightIcon={<ArrowRight className="w-5 h-5" />}
              onClick={onGetStarted}
            >
              Get Started
            </Button>
            <Button variant="secondary" size="lg" onClick={onHowItWorks}>
              How It Works
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400 pt-1">
            <span>Lost, found &amp; exchanged coverage</span>
            <span aria-hidden="true">·</span>
            <span>10-digit tag verification</span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={onOpenLogin}
              className="text-lavender-300 hover:text-pink-300 underline underline-offset-4 cursor-pointer"
            >
              Track an existing report
            </button>
          </div>
        </div>

        {/* Hero Illustration Stage: Airport Baggage Carousel + Cute Pink Suitcase Mascot */}
        <div className="lg:col-span-6">
          <Card padding="lg" className="relative overflow-hidden bg-navy-850/90 border-lavender-300/20">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="shrink-0 flex flex-col items-center">
                  <PinkSuitcaseMascot mood="greeting" size="lg" />
                </div>
                <div className="flex-1 text-center sm:text-left flex flex-col gap-1.5">
                  <StatusIndicator status="potential_match" className="justify-center sm:justify-start" />
                  <p className="text-base font-semibold text-slate-50 font-display">
                    Friendly guidance from carousel to pickup
                  </p>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Match missing bags, report unattended luggage, or resolve a look-alike suitcase
                    swap right from your phone.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-navy-900/90 border border-lavender-300/12 p-4">
                <BaggageCarouselIllustration />
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* 2. Main Actions: Three Interactive Cards (Lost Bag, Found Bag, Exchanged Bag) */}
      <section
        id="main-actions"
        aria-labelledby="main-actions-heading"
        className="scroll-mt-24 flex flex-col gap-8"
      >
        <div className="flex flex-col gap-2 max-w-2xl">
          <h2 id="main-actions-heading" className="text-2xl sm:text-3xl font-bold text-slate-50">
            Choose what happened to your baggage
          </h2>
          <p className="text-sm sm:text-base text-slate-300">
            Select one of the three reporting paths below so Retrieve Bag collects only the details
            needed for your situation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ACTION_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.type}
                interactive
                padding="lg"
                className={`flex flex-col justify-between gap-6 ${card.accentClass}`}
              >
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`w-12 h-12 rounded-2xl border inline-flex items-center justify-center shrink-0 ${card.iconBgClass}`}
                      aria-hidden="true"
                    >
                      <Icon className="w-6 h-6" />
                    </span>
                    <StatusIndicator status={card.type} />
                  </div>

                  <CardHeader>
                    <CardTitle className="text-xl">{card.title}</CardTitle>
                    <p className="text-xs font-medium text-lavender-300">{card.subtitle}</p>
                    <CardDescription className="pt-1">{card.description}</CardDescription>
                  </CardHeader>
                </div>

                <Button
                  variant={card.type === 'lost' ? 'primary' : 'secondary'}
                  size="md"
                  className="w-full"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  onClick={() => onSelectReportType(card.type)}
                >
                  {card.ctaLabel}
                </Button>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 3. How It Works: 3-Step Visual Explanation */}
      <section
        id="how-it-works"
        aria-labelledby="how-it-works-heading"
        className="scroll-mt-24 flex flex-col gap-8"
      >
        <div className="flex flex-col gap-2 max-w-2xl">
          <h2 id="how-it-works-heading" className="text-2xl sm:text-3xl font-bold text-slate-50">
            How Retrieve Bag works
          </h2>
          <p className="text-sm sm:text-base text-slate-300">
            Three clear steps take you from reporting at the baggage carousel to verifying ownership
            and retrieving your suitcase.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {HOW_IT_WORKS_STEPS.map((step) => (
            <Card key={step.stepNumber} padding="lg" className="flex flex-col justify-between gap-6">
              <div className="rounded-2xl bg-navy-900/85 border border-lavender-300/12 p-4 min-h-40 flex items-center justify-center">
                {step.illustration}
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold text-slate-50 font-display">
                  {step.stepNumber}. {step.title}
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">{step.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 4. Why Retrieve Bag / About Section */}
      <section
        id="about"
        aria-labelledby="about-heading"
        className="scroll-mt-24 flex flex-col gap-8"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <Card padding="lg" className="lg:col-span-5 flex flex-col justify-between gap-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <PinkSuitcaseMascot mood="helper" size="md" />
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-lavender-300">Why Retrieve Bag</span>
                  <h2 id="about-heading" className="text-2xl sm:text-3xl font-bold text-slate-50">
                    Designed for calm, accurate baggage reunions
                  </h2>
                </div>
              </div>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Airports are stressful enough when a bag goes missing or gets swapped on a busy
                carousel. Retrieve Bag removes guesswork with structured intake, smart matching,
                and privacy-safe verification.
              </p>

              <Alert
                tone="info"
                title="Built with strict HCI & accessibility standards"
                description="Large 44px touch targets, clear error prevention, and colorblind-safe indicators keep every step effortless."
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button variant="primary" onClick={onGetStarted}>
                Start a Report
              </Button>
              <Link
                to="/design-system"
                className="min-h-11 px-4 py-2 rounded-xl text-sm font-medium text-lavender-300 hover:text-white hover:bg-navy-800 inline-flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                <span>View Design System</span>
              </Link>
            </div>
          </Card>

          <Card padding="lg" className="lg:col-span-7 flex flex-col justify-center">
            <div className="divide-y divide-lavender-300/12">
              {WHY_PILLARS.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <div
                    key={pillar.title}
                    className="py-6 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-start gap-4"
                  >
                    <span
                      className="w-11 h-11 rounded-xl bg-navy-800 border border-lavender-300/20 text-pink-400 inline-flex items-center justify-center shrink-0"
                      aria-hidden="true"
                    >
                      <Icon className="w-5 h-5" />
                    </span>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="text-lg font-semibold text-slate-50 font-display">
                          {pillar.title}
                        </h3>
                        <span className="text-xs font-medium text-lavender-300">
                          {pillar.highlight}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed">{pillar.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </section>

      {/* Bottom Call-to-Action Banner */}
      <section aria-label="Ready to report baggage">
        <Card padding="lg" className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-navy-850 border-pink-400/25">
          <div className="flex items-center gap-4">
            <ShieldCheck className="w-9 h-9 text-pink-400 shrink-0 hidden sm:block" aria-hidden="true" />
            <div className="flex flex-col gap-1">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-50">
                Ready to locate or return a suitcase?
              </h2>
              <p className="text-sm text-slate-300">
                Choose Lost, Found, or Exchanged Bag to begin your guided report.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button variant="secondary" onClick={onOpenLogin}>
              My Reports
            </Button>
            <Button
              variant="primary"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={onGetStarted}
            >
              Get Started
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}
