"use client";

/**
 * Root error boundary — the last line of defense. Only renders when an error
 * escapes the root layout itself, so it must ship its own <html>/<body>.
 * Kept dependency-free and inline-styled (the design system's CSS may not have
 * loaded at this point).
 */
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("global error", error.digest ?? "");
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          background: "#f7f5f1",
          color: "#0F2A43",
        }}
      >
        <div style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: "#5b6470", marginBottom: 24 }}>
            We hit an unexpected error loading InterviewAce. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#0F2A43",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest && <p style={{ fontSize: 12, color: "#9AA3AE", marginTop: 16 }}>Reference: {error.digest}</p>}
        </div>
      </body>
    </html>
  );
}
