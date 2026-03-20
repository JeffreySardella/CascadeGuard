/**
 * DoctorCard — P4's component
 *
 * Generates a one-page PDF summarizing cascade findings.
 * Patient prints this and brings to their doctor.
 *
 * Requirements:
 * - Client-side PDF generation with jsPDF
 * - Preview before download
 * - Includes: patient name, date, med list, cascades, alternatives, disclaimer
 * - Disclaimer MUST be on the PDF
 */

'use client';

interface DoctorCardProps {
  analysisResult: any; // TODO: type from AnalysisResult
}

export default function DoctorCard({ analysisResult }: DoctorCardProps) {
  // TODO: P4 implements this
  return (
    <button
      className="mt-4 px-6 py-3 bg-cascade-primary text-white font-semibold rounded-lg hover:bg-cascade-primary-hover transition-colors"
      aria-label="Download a PDF summary to bring to your doctor"
    >
      Download Doctor Card (PDF)
    </button>
  );
}
