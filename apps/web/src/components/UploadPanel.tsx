import type { ComponentProps } from "react";
import { useEffect, useState } from "react";
import { getApiBaseUrl } from "./api";

type ImportResult = {
  message: string;
  competitionId: number;
  extraction: {
    competitionName: string;
    date: string | null;
    location: string | null;
    summary: {
      totalDives: number;
      totalAthletes: number;
      totalEvents: number;
      events: string[];
    };
    method?: string;
  };
  review: {
    warnings: string[];
    quality: {
      confidence: number;
      extractionMethod: string;
      rawTextLength: number;
      entryCount: number;
      athleteCount: number;
      diveCount: number;
      divesWithoutScores: number;
    };
    eventCoverage: Array<{
      eventName: string;
      entryCount: number;
      diveCount: number;
      missingScores: number;
    }>;
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
              <strong>{result.extraction.competitionName}</strong>
            </div>
            <div className="metric">
              <span>Events</span>
              <strong>{result.extraction.summary.totalEvents}</strong>
            </div>
            <div className="metric">
              <span>Athletes</span>
              <strong>{result.extraction.summary.totalAthletes}</strong>
            </div>
            <div className="metric">
              <span>Dives</span>
              <strong>{result.extraction.summary.totalDives}</strong>
            </div>
          </section>

          <section className="panel">
            <div className="section-head">
              <h2>Intake review</h2>
              <span className="muted">
                Confidence {(result.review.quality.confidence * 100).toFixed(0)}% · {result.review.quality.extractionMethod}
              </span>
            </div>
            {result.review.warnings.length > 0 ? (
              <div className="notice notice-warning">
                <strong>Review recommended</strong>
                <ul className="plain-list">
                  {result.review.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="notice notice-success">No parsing warnings were detected for this intake.</div>
            )}
            <div className="metrics">
              <div className="metric">
                <span>Entries</span>
                <strong>{result.review.quality.entryCount}</strong>
              </div>
              <div className="metric">
                <span>Missing scores</span>
                <strong>{result.review.quality.divesWithoutScores}</strong>
              </div>
              <div className="metric">
                <span>Text payload</span>
                <strong>{result.review.quality.rawTextLength}</strong>
              </div>
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
            <table className="table" style={{ marginTop: 16 }}>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Entries</th>
                  <th>Dives</th>
                  <th>Missing scores</th>
                </tr>
              </thead>
              <tbody>
                {result.review.eventCoverage.map((event) => (
                  <tr key={event.eventName}>
                    <td>
                      <strong>{event.eventName}</strong>
                    </td>
                    <td>{event.entryCount}</td>
                    <td>{event.diveCount}</td>
                    <td>{event.missingScores}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="toolbar" style={{ marginTop: 16 }}>
              <a className="button secondary" href={`/competitions?id=${result.competitionId}`}>
                Open competition workspace
              </a>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
