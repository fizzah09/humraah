import type { Metadata, Viewport } from 'next';
import './globals.css';
import Nav from '@/components/Nav';
import AssistantFab from '@/components/AssistantFab';
import { LangProvider } from '@/components/LangProvider';
import AuthGate from '@/components/AuthGate';
import ReminderBanner from '@/components/ReminderBanner';
import { colors } from '@/theme/colors';

export const metadata: Metadata = {
  title: 'Bank Saathi',
  description: 'Urdu-first AI banking companion. Not a bank, never moves money.',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = { themeColor: colors.primary, width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ur">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Nastaliq+Urdu:wght@400;600&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-bg font-sans min-h-screen">
        <LangProvider>
          <AuthGate>
            <Nav />
            <ReminderBanner />
            <main className="max-w-6xl mx-auto px-4 pt-6 pb-32 lg:pb-16">{children}</main>
            <footer className="max-w-6xl mx-auto px-4 pb-28 lg:pb-8 text-sm text-inkMuted">
              Bank Saathi is not a bank, is not affiliated with any bank, and never moves money or asks for your PIN, password or OTP.
            </footer>
            <AssistantFab />
          </AuthGate>
        </LangProvider>
      </body>
    </html>
  );
}
