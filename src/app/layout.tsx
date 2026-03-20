import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'CascadeGuard — Are your medications treating side effects of each other?',
  description:
    'Detect prescribing cascades in your medication list using FDA adverse event data and 65 expert-validated patterns.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#1e40af',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* FDA Disclaimer — visible on every page */}
        <footer
          role="contentinfo"
          className="fixed bottom-0 w-full bg-gray-100 border-t border-gray-200 px-4 py-2 text-center text-sm text-gray-600"
        >
          This is an educational screening tool, not medical advice. Do not
          change medications without consulting your physician.
        </footer>
      </body>
    </html>
  );
}
