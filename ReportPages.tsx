import { BaggageReportForm } from '@/src/components/forms/BaggageReportForm';

export function ReportLostPage() {
  return <BaggageReportForm key="lost" reportType="lost" />;
}

export function ReportFoundPage() {
  return <BaggageReportForm key="found" reportType="found" />;
}

export function ReportExchangedPage() {
  return <BaggageReportForm key="exchanged" reportType="exchanged" />;
}
