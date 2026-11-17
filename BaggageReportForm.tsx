import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeftRight,
  Calendar,
  CheckCircle2,
  Luggage,
  MapPin,
  Search,
  Tag,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  SegmentedControl,
  Select,
  StatusIndicator,
  Textarea,
} from '@/src/components/ui';
import {
  BagSwapIllustration,
  PinkSuitcaseMascot,
  TagScanIllustration,
} from '@/src/components/illustrations';
import { useAuth } from '@/src/contexts/AuthContext';
import {
  createBaggageReport,
  LOST_AND_FOUND_COLLECTION_MESSAGE,
  REPORT_SUBMISSION_CONFIRMATIONS,
} from '@/src/lib/baggageService';
import { formatBaggageTag } from '@/src/lib/utils';
import {
  BAG_COLOR_OPTIONS,
  BAG_TYPE_OPTIONS,
  type BaggageReportRecord,
  type BaggageType,
  type ReportType,
} from '@/src/types/baggage';

export interface BaggageReportFormProps {
  reportType: ReportType;
}

const REPORT_TYPE_OPTIONS: { value: ReportType; label: string }[] = [
  { value: 'lost', label: 'Lost Bag' },
  { value: 'found', label: 'Found Bag' },
  { value: 'exchanged', label: 'Exchanged Bag' },
];

const FORM_COPY: Record<
  ReportType,
  {
    title: string;
    subtitle: string;
    dateLabel: string;
    bagSectionTitle: string;
    bagSectionDescription: string;
    featuresLabel: string;
    featuresPlaceholder: string;
    submitLabel: string;
  }
> = {
  lost: {
    title: 'Report a Lost Bag',
    subtitle:
      'Enter the airport, incident date, and luggage details below—no sign-in required.',
    dateLabel: 'Incident Date',
    bagSectionTitle: 'Missing Baggage Details',
    bagSectionDescription:
      'Provide as much visual detail as possible so automated matching and airport staff can recognize your bag.',
    featuresLabel: 'Distinctive Features',
    featuresPlaceholder:
      'Describe stickers, ribbons, luggage straps, dents, or exterior markings visible on the bag.',
    submitLabel: 'Submit Lost Bag Report',
  },
  found: {
    title: 'Report a Found Bag',
    subtitle:
      'Log the details of an unattended or found suitcase so the rightful traveler can be notified automatically.',
    dateLabel: 'Incident Date',
    bagSectionTitle: 'Found Baggage Details',
    bagSectionDescription:
      'Record exterior appearance and any visible baggage tag number without opening private compartments.',
    featuresLabel: 'Distinctive Features',
    featuresPlaceholder:
      'Describe visible exterior markers, ribbon color, tag stickers, or where at the airport it was found.',
    submitLabel: 'Submit Found Bag Report',
  },
  exchanged: {
    title: 'Report an Exchanged Bag',
    subtitle:
      'Log the bag involved in an accidental suitcase swap and describe both the received and expected bag.',
    dateLabel: 'Incident Date',
    bagSectionTitle: 'Exchanged Baggage Details',
    bagSectionDescription:
      'Share the tag number and visual features of the bag in your possession, plus what your expected bag looks like.',
    featuresLabel: 'Distinctive Features (Received & Expected Bag)',
    featuresPlaceholder:
      'Describe the bag you received by mistake and include key details (colour, brand, or tag) of the bag you expected.',
    submitLabel: 'Submit Exchanged Bag Report',
  },
};

export function BaggageReportForm({ reportType: initialReportType }: BaggageReportFormProps) {
  const { user, isConfigured } = useAuth();
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);

  const [reportType, setReportType] = useState<ReportType>(initialReportType);
  const [airport, setAirport] = useState('');
  const [incidentDate, setIncidentDate] = useState(today);
  const [bagType, setBagType] = useState<BaggageType>('hardshell_spinner');
  const [color, setColor] = useState('Black');
  const [brand, setBrand] = useState('');
  const [tagNumber, setTagNumber] = useState('');
  const [distinctiveFeatures, setDistinctiveFeatures] = useState('');

  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<{
    report: BaggageReportRecord;
    matchesFound: number;
    notificationsCreated: number;
  } | null>(null);
  const [redirectSeconds, setRedirectSeconds] = useState(3);

  useEffect(() => {
    if (!createdResult) return;

    setRedirectSeconds(3);
    const confirmationState = {
      submissionBanner: {
        message: REPORT_SUBMISSION_CONFIRMATIONS[createdResult.report.report_type],
        reportType: createdResult.report.report_type,
        matchesFound: createdResult.matchesFound,
      },
    };

    const interval = window.setInterval(() => {
      setRedirectSeconds((prev) => (prev > 1 ? prev - 1 : 1));
    }, 1000);

    const timer = window.setTimeout(() => {
      navigate('/', { replace: true, state: confirmationState });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 3000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timer);
    };
  }, [createdResult, navigate]);

  const copy = FORM_COPY[reportType];

  const airportError =
    touched && airport.trim().length < 2
      ? 'Please enter the airport name or city.'
      : undefined;

  const dateError =
    touched && (!incidentDate || incidentDate > today)
      ? 'Select a valid date on or before today.'
      : undefined;

  const featuresError =
    touched && distinctiveFeatures.trim().length < 8
      ? 'Add at least 8 characters describing distinctive features.'
      : undefined;

  const resetForm = () => {
    setCreatedResult(null);
    setTouched(false);
    setAirport('');
    setIncidentDate(today);
    setBagType('hardshell_spinner');
    setColor('Black');
    setBrand('');
    setTagNumber('');
    setDistinctiveFeatures('');
    setSubmitError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setSubmitError(null);

    const isAirportValid = airport.trim().length >= 2;
    const isDateValid = Boolean(incidentDate && incidentDate <= today);
    const isFeaturesValid = distinctiveFeatures.trim().length >= 8;

    if (!isAirportValid || !isDateValid || !isFeaturesValid) {
      setSubmitError(
        'Please complete all required fields: Airport (at least 2 characters), valid Incident Date, and Distinctive Features (at least 8 characters).'
      );
      return;
    }

    setSubmitting(true);
    try {
      const result = await createBaggageReport(
        {
          report_type: reportType,
          airport,
          incident_date: incidentDate,
          bag_type: bagType,
          color,
          brand,
          tag_number: tagNumber,
          distinctive_features: distinctiveFeatures,
        },
        user?.id ?? null
      );

      setCreatedResult(result);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  if (createdResult) {
    const exactConfirmation = REPORT_SUBMISSION_CONFIRMATIONS[createdResult.report.report_type];
    const hasMatch = createdResult.matchesFound > 0;
    const goHomeWithBanner = () => {
      navigate('/', {
        replace: true,
        state: {
          submissionBanner: {
            message: exactConfirmation,
            reportType: createdResult.report.report_type,
            matchesFound: createdResult.matchesFound,
          },
        },
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
      <div className="max-w-2xl mx-auto py-4">
        <Card padding="lg" className="text-center flex flex-col items-center gap-6">
          <PinkSuitcaseMascot
            mood={hasMatch ? 'matched' : 'searching'}
            size="lg"
          />

          <div className="flex flex-col items-center gap-3">
            <StatusIndicator status={createdResult.report.status} />
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-50 leading-snug">
              {exactConfirmation}
            </h1>
            <p className="text-sm text-slate-300">
              {createdResult.report.airport} ·{' '}
              <span className="font-mono tabular-nums-mono">
                {createdResult.report.incident_date}
              </span>
            </p>
          </div>

          {hasMatch ? (
            <Alert
              tone="success"
              className="w-full text-left"
              title={`${createdResult.matchesFound} potential match${
                createdResult.matchesFound > 1 ? 'es' : ''
              } detected automatically`}
              description={
                createdResult.report.report_type === 'lost'
                  ? LOST_AND_FOUND_COLLECTION_MESSAGE
                  : 'We notified the matching traveler and recorded the match in your Notifications section. Please ensure airport baggage staff verify ownership before any handover.'
              }
            />
          ) : (
            <Alert
              tone="info"
              className="w-full text-left"
              title="Automatic matching is active"
              description="No manual searching needed. Whenever a matching baggage report is submitted, an alert will appear automatically in your Notifications section."
            />
          )}

          <p className="text-xs text-lavender-300 font-medium tabular-nums-mono">
            Redirecting to the home page in {redirectSeconds}s…
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 w-full">
            <Button
              variant="primary"
              size="lg"
              onClick={goHomeWithBanner}
            >
              Return to Home Now
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate('/notifications')}
            >
              View Notifications
            </Button>
            <Button variant="ghost" size="lg" onClick={resetForm}>
              Submit Another Report
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <StatusIndicator status={reportType} />
          <h1 className="text-2xl sm:text-4xl font-bold font-display text-slate-50">
            {copy.title}
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl">{copy.subtitle}</p>
        </div>
        <PinkSuitcaseMascot
          mood={reportType === 'found' ? 'searching' : 'helper'}
          size="md"
          className="hidden sm:inline-flex"
        />
      </div>

      {!isConfigured && (
        <Alert
          tone="warning"
          title="Supabase connection required for submission"
          description="Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to save reports."
        />
      )}

      <Card padding="lg">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
          {submitError && (
            <Alert tone="error" title="Could not submit report" description={submitError} />
          )}

          {/* Section 1: Report Type, Airport & Incident Date */}
          <div className="flex flex-col gap-5">
            <CardHeader>
              <CardTitle>01. Report Overview</CardTitle>
              <CardDescription>
                Confirm the report type, airport, and date of the incident.
              </CardDescription>
            </CardHeader>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-200">
                Report Type <span className="text-pink-400">*</span>
              </span>
              <div>
                <SegmentedControl
                  ariaLabel="Report Type"
                  value={reportType}
                  onChange={setReportType}
                  options={REPORT_TYPE_OPTIONS.map((opt) => ({
                    ...opt,
                    icon:
                      opt.value === 'lost' ? (
                        <Luggage className="w-4 h-4" />
                      ) : opt.value === 'found' ? (
                        <Search className="w-4 h-4" />
                      ) : (
                        <ArrowLeftRight className="w-4 h-4" />
                      ),
                  }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input
                label="Airport"
                required
                placeholder="e.g., Dubai International Airport"
                value={airport}
                onChange={(e) => setAirport(e.target.value)}
                leftIcon={<MapPin className="w-4 h-4" />}
                error={airportError}
                helperText="Enter the airport name or city"
              />

              <Input
                label={copy.dateLabel}
                type="date"
                required
                max={today}
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
                leftIcon={<Calendar className="w-4 h-4" />}
                error={dateError}
              />
            </div>
          </div>

          {/* Section 2: Baggage Details */}
          <div className="pt-6 border-t border-lavender-300/12 flex flex-col gap-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-7">
                <CardHeader>
                  <CardTitle>02. {copy.bagSectionTitle}</CardTitle>
                  <CardDescription>{copy.bagSectionDescription}</CardDescription>
                </CardHeader>
              </div>
              <div className="lg:col-span-5 rounded-2xl bg-navy-900/80 border border-lavender-300/12 p-3">
                {reportType === 'exchanged' ? <BagSwapIllustration /> : <TagScanIllustration />}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Select
                label="Bag Type"
                required
                options={BAG_TYPE_OPTIONS}
                value={bagType}
                onChange={(e) => setBagType(e.target.value as BaggageType)}
              />

              <Select
                label="Bag Colour"
                required
                options={BAG_COLOR_OPTIONS}
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />

              <Input
                label="Brand"
                placeholder="e.g., Samsonite, American Tourister, Rimowa"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                helperText="Optional manufacturer or brand name"
              />

              <Input
                label="Baggage Tag Number"
                mono
                placeholder="e.g., 0098 441 920"
                value={tagNumber}
                onChange={(e) => setTagNumber(e.target.value)}
                onBlur={() => tagNumber && setTagNumber(formatBaggageTag(tagNumber))}
                leftIcon={<Tag className="w-4 h-4" />}
                helperText="Optional tag code printed on your baggage receipt"
              />
            </div>

            <Textarea
              label={copy.featuresLabel}
              required
              placeholder={copy.featuresPlaceholder}
              value={distinctiveFeatures}
              onChange={(e) => setDistinctiveFeatures(e.target.value)}
              maxCharacters={320}
              currentLength={distinctiveFeatures.length}
              error={featuresError}
            />
          </div>

          <div className="pt-4 border-t border-lavender-300/12 flex flex-wrap items-center justify-between gap-4">
            <Button type="button" variant="ghost" onClick={() => navigate('/dashboard')}>
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={submitting}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              {copy.submitLabel}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
