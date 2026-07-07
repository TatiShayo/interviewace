import type { Metadata, Viewport } from "next";
import { Newsreader, Inter } from "next/font/google";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-newsreader",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "InterviewAce — Be ready for your interview by tonight",
  description:
    "Paste the job posting, get the questions you'll actually be asked, practice out loud with an AI interviewer, and walk in with a salary-negotiation script.",
  manifest: "/manifest.webmanifest",
  applicationName: "InterviewAce",
  appleWebApp: { capable: true, title: "InterviewAce", statusBarStyle: "default" },
  openGraph: {
    title: "InterviewAce — Be ready by tonight",
    description: "AI interview prep: the exact questions, out-loud practice, scored feedback, negotiation script.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0F2A43",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${newsreader.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
