import { useState } from 'react';
import {
  Check,
  Copy,
  Luggage,
  Plane,
  Search,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Modal,
  SegmentedControl,
  Select,
  SkeletonBlock,
  StatusIndicator,
  StepIndicator,
  Textarea,
} from '@/src/components/ui';
import {
  BagSwapIllustration,
  BaggageCarouselIllustration,
  PinkSuitcaseMascot,
  TagScanIllustration,
  type MascotMood,
} from '@/src/components/illustrations';
import { COLOR_TOKENS } from '@/src/design-system/tokens';
import { PLANNED_ROUTES } from '@/src/types/baggage';
import { formatBaggageTag, formatFlightCode } from '@/src/lib/utils';
import { isSupabaseConfigured } from '@/src/lib/supabase';

const MASCOT_MOODS: { value: MascotMood; label: string }[] = [
  { value: 'greeting', label: 'Greeting' },
  { value: 'searching', label: 'Searching' },
  { value: 'matched', label: 'Matched' },
  { value: 'helper', label: 'Helper' },
];

const DEMO_STEPS = [
  { id: 'type', label: 'Incident Type', caption: 'Lost, found, or exchanged' },
  { id: 'bag', label: 'Bag & Tag Details', caption: 'Color, size, and tag ID' },
  { id: 'flight', label: 'Flight & Contact', caption: 'Airport and verification' },
];

const BAG_SIZE_OPTIONS = [
  { value: 'cabin', label: 'Cabin Carry-On (up to 55 cm)' },
  { value: 'medium', label: 'Medium Checked (60–70 cm)' },
  { value: 'large', label: 'Large Checked (75–82 cm)' },
  { value: 'oversized', label: 'Oversized / Special Equipment' },
];

const ARCHITECTURE_MODULES = [
  {
    layer: 'Design Tokens',
    path: 'src/index.css & src/design-system/tokens.ts',
    purpose: 'Deep navy surfaces, pink/lavender accents, Outfit/Plus Jakarta Sans/JetBrains Mono scale, reduced-motion rules',
  },
  {
    layer: 'UI Primitives',
    path: 'src/components/ui/*',
    purpose: 'Accessible Button, Card, Input, Select, Textarea, SegmentedControl, StatusIndicator, Modal, StepIndicator, FeedbackStates',
  },
  {
    layer: 'Brand Illustrations',
    path: 'src/components/illustrations/*',
    purpose: 'PinkSuitcaseMascot (4 moods), BaggageCarouselIllustration, BagSwapIllustration, TagScanIllustration',
  },
  {
    layer: 'Layout Shell',
    path: 'src/components/layout/*',
    purpose: 'AppShell with keyboard skip-link, 3-zone TopNav contract, responsive mobile menu, quiet Footer',
  },
  {
    layer: 'Domain & Client',
    path: 'src/types/baggage.ts & src/lib/supabase.ts',
    purpose: 'BaggageReport & PotentialMatch TypeScript models, formatting utilities, and Supabase client scaffold',
  },
];

export function DesignSystemShowcase() {
  const [mascotMood, setMascotMood] = useState<MascotMood>('greeting');
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [demoLoading, setDemoLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Interactive error-prevention form demo state
  const [flightInput, setFlightInput] = useState('AI 302');
  const [tagInput, setTagInput] = useState('0098 441 920');
  const [bagSize, setBagSize] = useState('medium');
  const [notes, setNotes] = useState('Lavender luggage strap around the center with a brass cabin lock.');

  const flightError =
    flightInput.trim().length > 0 && !/^[A-Z]{2,3}\s?\d{1,4}[A-Z]?$/i.test(flightInput.trim())
      ? 'Use airline code + flight number, such as AI 302 or BA 117.'
      : undefined;

  const handleCopyHex = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopiedHex(hex);
      window.setTimeout(() => setCopiedHex(null), 1600);
    } catch {
      setCopiedHex(hex);
      window.setTimeout(() => setCopiedHex(null), 1600);
    }
  };

  const handleLoadingPreview = () => {
    setDemoLoading(true);
    window.setTimeout(() => setDemoLoading(false), 1200);
  };

  return (
    <div className="flex flex-col gap-16 sm:gap-20">
      {/* Hero / Brand Foundation */}
      <section aria-labelledby="hero-heading" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-7 flex flex-col justify-center gap-6">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-lavender-300">
            <span>Retrieve Bag</span>
            <span aria-hidden="true">·</span>
            <span>Design System & Architecture Foundation</span>
            <span aria-hidden="true">·</span>
            <span>React, Vite, Tailwind CSS & Supabase</span>
          </div>

          <h1
            id="hero-heading"
            className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-50 leading-[1.12]"
          >
            Calm, human-centered baggage recovery for stressed travelers
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
            This foundation establishes the visual language, reusable accessible components,
            mascot illustrations, and Supabase-ready architecture for reporting lost, found, or
            accidentally exchanged airport luggage before implementing feature pages.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <Button
              variant="primary"
              size="lg"
              leftIcon={<ShieldCheck className="w-5 h-5" />}
              onClick={() => setModalOpen(true)}
            >
              Preview Verification Dialog
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                document.getElementById('components')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Inspect UI Primitives
            </Button>
          </div>
        </div>

        <Card className="lg:col-span-5 flex flex-col justify-between gap-6" padding="lg">
          <div className="flex flex-col items-center text-center gap-4">
            <PinkSuitcaseMascot mood={mascotMood} size="xl" />
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold text-slate-50">
                Meet Pip, the Retrieve Bag Mascot
              </h2>
              <p className="text-sm text-slate-300 max-w-xs">
                Switch expression states to preview how Pip guides passengers through reporting and
                match verification.
              </p>
            </div>
          </div>

          <div className="flex justify-center">
            <SegmentedControl
              ariaLabel="Mascot mood selector"
              options={MASCOT_MOODS}
              value={mascotMood}
              onChange={setMascotMood}
            />
          </div>
        </Card>
      </section>

      {/* Section 1: Color Tokens & Typography */}
      <section id="foundation" aria-labelledby="foundation-heading" className="flex flex-col gap-8">
        <div className="flex flex-col gap-2 max-w-2xl">
          <h2 id="foundation-heading" className="text-2xl sm:text-3xl font-bold text-slate-50">
            01. Color System & Typographic Hierarchy
          </h2>
          <p className="text-sm sm:text-base text-slate-300">
            Guided by a disciplined 60-30-10 color allocation: deep navy canvas for calm visual
            rest, elevated navy surfaces for clear Gestalt grouping, and pink with lavender accents
            strictly for primary actions and guidance.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLOR_TOKENS.map((swatch) => {
            const isCopied = copiedHex === swatch.hex;
            return (
              <Card key={swatch.hex} padding="sm" className="flex flex-col justify-between gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div
                    className="w-12 h-12 rounded-xl border border-white/15 shrink-0"
                    style={{ backgroundColor: swatch.hex }}
                    aria-hidden="true"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyHex(swatch.hex)}
                    className="min-h-10 px-2.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-xs font-mono text-lavender-200 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                    aria-label={`Copy hex color ${swatch.hex}`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" aria-hidden="true" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{swatch.hex}</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-50">{swatch.name}</span>
                    <span className="text-xs text-lavender-300">{swatch.allocation}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{swatch.role}</p>
                  <p className="text-xs text-slate-400">{swatch.contrastNote}</p>
                </div>
              </Card>
            );
          })}
        </div>

        <Card padding="lg">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-lavender-300">Display Face · Outfit</span>
              <p className="text-3xl font-bold font-display text-slate-50 tracking-tight">
                Find your bag faster
              </p>
              <p className="text-xs text-slate-400">
                Used for headlines and section titles with balanced wrapping and friendly rounded
                geometry.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-lavender-300">
                Body Face · Plus Jakarta Sans
              </span>
              <p className="text-base text-slate-200 leading-relaxed">
                Clear, calm instructions reduce passenger cognitive load at busy baggage claim
                carousels.
              </p>
              <p className="text-xs text-slate-400">
                High x-height and optical spacing tuned for dark navy legibility.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-lavender-300">
                Identifiers · JetBrains Mono
              </span>
              <p className="text-xl font-semibold tabular-nums-mono text-pink-300">
                AI 302 · 0098 441 920
              </p>
              <p className="text-xs text-slate-400">
                Tabular numerals prevent vertical jitter when scanning flight numbers and 10-digit
                baggage claim tags.
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* Section 2: Airport Baggage Illustrations */}
      <section id="illustrations" aria-labelledby="illustrations-heading" className="flex flex-col gap-8">
        <div className="flex flex-col gap-2 max-w-2xl">
          <h2 id="illustrations-heading" className="text-2xl sm:text-3xl font-bold text-slate-50">
            02. Airport Baggage Illustrations
          </h2>
          <p className="text-sm sm:text-base text-slate-300">
            Bespoke vector illustrations provide instant visual context for baggage claim arrival,
            accidental bag swaps, and locating 10-digit claim codes without overwhelming text.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card padding="md" className="flex flex-col justify-between gap-5">
            <div className="rounded-xl bg-navy-900/80 p-4 border border-lavender-300/10">
              <BaggageCarouselIllustration />
            </div>
            <CardHeader>
              <CardTitle>Baggage Claim Carousel</CardTitle>
              <CardDescription>
                Supports Lost & Found intake empty states and terminal arrival orientation.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card padding="md" className="flex flex-col justify-between gap-5">
            <div className="rounded-xl bg-navy-900/80 p-4 border border-lavender-300/10">
              <BagSwapIllustration />
            </div>
            <CardHeader>
              <CardTitle>Accidental Exchange Detection</CardTitle>
              <CardDescription>
                Clarifies when two look-alike suitcases were swapped and highlights tag verification.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card padding="md" className="flex flex-col justify-between gap-5">
            <div className="rounded-xl bg-navy-900/80 p-4 border border-lavender-300/10">
              <TagScanIllustration />
            </div>
            <CardHeader>
              <CardTitle>Tag Reference Helper</CardTitle>
              <CardDescription>
                Prevents input errors by showing travelers exactly where to read their claim tag.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Section 3: Reusable UI Components & HCI Controls */}
      <section id="components" aria-labelledby="components-heading" className="flex flex-col gap-8">
        <div className="flex flex-col gap-2 max-w-2xl">
          <h2 id="components-heading" className="text-2xl sm:text-3xl font-bold text-slate-50">
            03. Reusable Components & HCI Safeguards
          </h2>
          <p className="text-sm sm:text-base text-slate-300">
            Every control enforces Fitts&apos;s Law (minimum 44px touch targets), Hick&apos;s Law
            (focused choices), non-hue-only status labeling, and real-time error prevention.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Buttons & Step Progression */}
          <Card padding="lg" className="lg:col-span-6 flex flex-col gap-6">
            <CardHeader>
              <CardTitle>Action Hierarchy & Step Progression</CardTitle>
              <CardDescription>
                Single-line labels, 180ms settling feedback, and progressive disclosure steps.
              </CardDescription>
            </CardHeader>

            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" leftIcon={<Luggage className="w-4 h-4" />} onClick={handleLoadingPreview} isLoading={demoLoading}>
                {demoLoading ? 'Checking...' : 'Report Lost Bag'}
              </Button>
              <Button variant="lavender" leftIcon={<Search className="w-4 h-4" />} onClick={() => setModalOpen(true)}>
                Review Matches
              </Button>
              <Button variant="secondary" onClick={() => setCurrentStep((s) => (s + 1) % DEMO_STEPS.length)}>
                Advance Step
              </Button>
              <Button variant="ghost" onClick={() => setCurrentStep(0)}>
                Reset
              </Button>
              <Button variant="danger" onClick={() => setModalOpen(true)}>
                Withdraw Report
              </Button>
            </div>

            <div className="pt-2">
              <StepIndicator
                steps={DEMO_STEPS}
                currentStepIndex={currentStep}
                onStepSelect={setCurrentStep}
              />
            </div>
          </Card>

          {/* Error Prevention Form Primitives */}
          <Card padding="lg" className="lg:col-span-6 flex flex-col gap-5">
            <CardHeader>
              <CardTitle>Error-Prevention Form Controls</CardTitle>
              <CardDescription>
                Try typing an invalid flight number (like &ldquo;INVALID&rdquo;) to preview live
                validation and formatting helpers.
              </CardDescription>
            </CardHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Flight Number"
                required
                mono
                value={flightInput}
                onChange={(e) => setFlightInput(e.target.value)}
                onBlur={() => setFlightInput(formatFlightCode(flightInput))}
                leftIcon={<Plane className="w-4 h-4" />}
                error={flightError}
                helperText="Formats automatically on blur (e.g., AI 302)"
              />

              <Input
                label="Baggage Claim Tag"
                mono
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onBlur={() => setTagInput(formatBaggageTag(tagInput))}
                leftIcon={<Tag className="w-4 h-4" />}
                helperText="Optional 10-digit code from boarding stub"
              />
            </div>

            <Select
              label="Luggage Size Category"
              required
              options={BAG_SIZE_OPTIONS}
              value={bagSize}
              onChange={(e) => setBagSize(e.target.value)}
              helperText="Limited to 4 clear choices to minimize decision fatigue"
            />

            <Textarea
              label="Distinctive Visual Markers"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxCharacters={180}
              currentLength={notes.length}
              helperText="Mention ribbons, stickers, locks, or scuff marks to improve match precision"
            />
          </Card>

          {/* Accessible Semantic Status & Feedback States */}
          <Card padding="lg" className="lg:col-span-7 flex flex-col gap-6">
            <CardHeader>
              <CardTitle>Colorblind-Safe Status & Feedback States</CardTitle>
              <CardDescription>
                Status indicators pair explicit icons with text labels, never relying on hue alone
                or decorative pulsing dots.
              </CardDescription>
            </CardHeader>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-2 border-y border-lavender-300/12">
              <StatusIndicator status="lost" />
              <StatusIndicator status="found" />
              <StatusIndicator status="exchanged" />
              <StatusIndicator status="open" />
              <StatusIndicator status="potential_match" />
              <StatusIndicator status="reunited" />
            </div>

            <div className="flex flex-col gap-3">
              <Alert
                tone="info"
                title="Privacy-first matching"
                description="Passenger contact details stay hidden until both parties confirm baggage tag or feature verification."
              />
              <Alert
                tone="success"
                title="High-confidence tag alignment ready"
                description="Flight number, arrival terminal, and luggage dimensions match a recently logged report."
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-slate-400">
                Loading Skeleton Geometry (Match List Placeholder)
              </span>
              <div className="grid grid-cols-3 gap-3">
                <SkeletonBlock className="h-10" />
                <SkeletonBlock className="h-10" />
                <SkeletonBlock className="h-10" />
              </div>
            </div>
          </Card>

          {/* Empty State Specimen */}
          <div className="lg:col-span-5 flex flex-col">
            <EmptyState
              className="h-full"
              illustration={<PinkSuitcaseMascot mood="searching" size="md" />}
              title="No matching reports logged yet"
              description="Once passenger reports are submitted, potential tag and description matches appear here automatically."
              action={
                <Button variant="secondary" onClick={() => setModalOpen(true)}>
                  Preview Match Rules
                </Button>
              }
            />
          </div>
        </div>
      </section>

      {/* Section 4: Project Architecture & Next Build Phases */}
      <section id="architecture" aria-labelledby="architecture-heading" className="flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex flex-col gap-2 max-w-2xl">
            <h2 id="architecture-heading" className="text-2xl sm:text-3xl font-bold text-slate-50">
              04. Project Architecture & Planned Routes
            </h2>
            <p className="text-sm sm:text-base text-slate-300">
              Modular folder structure, Supabase client scaffold, and planned routes are established
              and ready for subsequent page and database implementation.
            </p>
          </div>

          <div className="text-xs font-medium text-slate-300 shrink-0">
            Supabase Client:{' '}
            <span className={isSupabaseConfigured ? 'text-emerald-300' : 'text-lavender-300'}>
              {isSupabaseConfigured ? 'Configured' : 'Scaffolded (awaiting env keys)'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card padding="lg" className="lg:col-span-7">
            <CardHeader>
              <CardTitle>Module Structure</CardTitle>
              <CardDescription>
                Separation of design tokens, accessible UI primitives, domain types, and data
                clients.
              </CardDescription>
            </CardHeader>

            <CardContent className="divide-y divide-lavender-300/12">
              {ARCHITECTURE_MODULES.map((mod) => (
                <div key={mod.layer} className="py-3.5 first:pt-0 last:pb-0 flex flex-col gap-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-50">{mod.layer}</span>
                    <code className="text-xs font-mono text-pink-300">{mod.path}</code>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{mod.purpose}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card padding="lg" className="lg:col-span-5">
            <CardHeader>
              <CardTitle>Planned Application Routes</CardTitle>
              <CardDescription>
                Reserved route map to be implemented in the next phase.
              </CardDescription>
            </CardHeader>

            <CardContent className="divide-y divide-lavender-300/12">
              {PLANNED_ROUTES.map((route) => (
                <div key={route.path} className="py-3.5 first:pt-0 last:pb-0 flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-50">{route.label}</span>
                    <code className="text-xs font-mono text-lavender-300">{route.path}</code>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{route.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Accessible Confirmation Modal Demo */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Confirm Baggage Verification Request"
        description="Error-prevention modal pattern: passengers review critical flight and tag details before sharing contact confirmation."
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setModalOpen(false)}>
              Confirm & Continue
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-navy-800/80 border border-lavender-300/15">
            <PinkSuitcaseMascot mood="matched" size="sm" animate={false} />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-slate-50">
                Flight <span className="font-mono text-pink-300">{flightInput || 'AI 302'}</span>
              </span>
              <span className="text-xs text-slate-300">
                Tag <span className="font-mono text-lavender-200">{tagInput || '0098 441 920'}</span>
              </span>
            </div>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed">
            This dialog demonstrates keyboard Escape dismissal, high-contrast focus management, and
            clear primary vs. cancel button separation.
          </p>
        </div>
      </Modal>
    </div>
  );
}
