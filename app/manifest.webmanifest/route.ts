import { NextResponse } from "next/server";

/** PWA manifest served as a route so it's always fresh and typed. */
export function GET() {
  return NextResponse.json({
    name: "InterviewAce",
    short_name: "InterviewAce",
    description: "Be ready for your interview by tonight.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#F7F5F1",
    theme_color: "#0F2A43",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
  });
}
