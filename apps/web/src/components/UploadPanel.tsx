import type { ComponentProps } from "react";
import { useEffect, useState } from "react";
import { getApiBaseUrl } from "./api";

type ImportResult = {
  message: string;
  competitionId: number;
  extraction: {
    competition_name: string;
    date: string | null;
    location: string | null;
    summary: {
      total_dives: number;
      total_athletes: number;
      total_events: number;
      events: string[];
    };
  };
};

type FormSubmitEvent = Parameters<NonNullable<ComponentProps<"form">["onSubmit"]>>[0];

export function UploadPanel() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [apiBaseUrl, setApiBaseUrl] = useState<string | null>(null);

  useEffect(() => {
    setApiBaseUrl(getApiBaseUrl());
  }, []);

  async function handleSubmit(event: FormSubmitEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);

    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);

    try {
      const response = await fetch(`${getApiBaseUrl()}/ingestions/pdf`, {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Import failed");
      }

      setResult(payload);
      form.reset();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error ? submissionError.message : "Import failed",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-grid">
      <section className="panel">
        <h2>Ingest an official result sheet</h2>
        <form className="stack" onSubmit={handleSubmit}>
          <input
            className="input"
            type="file"
            name="file"
            accept="application/pdf"
            required
          />
          <div className="toolbar">
            <button className="button" type="submit" disabled={busy}>
              {busy ? "Processing..." : "Start intake"}
            </button>
            <span className="muted">
              API target: {apiBaseUrl || "derived from the current host"}
            </span>
          </div>
        </form>
      </section>

      {error ? <div className="notice">{error}</div> : null}

      {result ? (
        <>
          <section className="metrics">
            <div className="metric">
              <span>Competition</span>
              <strong>{result.extraction.competition_name}</strong>
            </div>
            <div className="metric">
              <span>Events</span>
              <strong>{result.extraction.summary.total_events}</strong>
            </div>
            <div className="metric">
              <span>Athletes</span>
              <strong>{result.extraction.summary.total_athletes}</strong>
            </div>
            <div className="metric">
              <span>Dives</span>
              <strong>{result.extraction.summary.total_dives}</strong>
            </div>
          </section>

          <section className="panel">
            <h2>Imported event program</h2>
            <div className="cluster">
              {result.extraction.summary.events.map((eventName) => (
                <span className="chip" key={eventName}>
                  {eventName}
                </span>
              ))}
            </div>
            <div className="toolbar" style={{ marginTop: 16 }}>
              <a className="button secondary" href={`/competitions?id=${result.competitionId}`}>
                Open meet workspace
              </a>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
