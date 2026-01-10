// src/ErrorBoundary.tsx
import React from "react";

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error?: any }
> {
  state = { error: undefined as any };

  static getDerivedStateFromError(error: any) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 16, fontFamily: "system-ui", color: "#111" }}>
          <h2>Se rompió la app 😵</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}