import { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, Upload, RefreshCw } from 'lucide-react';
import { CompetitionCard } from './competition-card';
import { Button, Card, CardContent } from '@/components/ui';
import { api, type IngestionLog, type IngestionStatus } from '@/lib/api';
import Link from 'next/link';

interface RecentCompetitionsProps {
  /** Maximum number of competitions to show */
  limit?: number;
  /** Filter by status */
  status?: IngestionStatus;
  /** Show upload CTA when empty */
  showUploadCTA?: boolean;
  /** Title for the section */
  title?: string;
  /** Additional CSS classes */
  className?: string;
}

interface EnrichedCompetition extends IngestionLog {
  competitionName?: string;
  location?: string;
  eventType?: string;
  athleteCount?: number;
  diveCount?: number;
  averageScore?: number;
}

/**
 * Grid layout for displaying recent competitions
 * Responsive: 1 column on mobile, 2 on tablet, 3 on desktop
 */
export function RecentCompetitions({
  limit = 6,
  status,
  showUploadCTA = true,
  title = 'Recent Competitions',
  className = '',
}: RecentCompetitionsProps) {
  const [competitions, setCompetitions] = useState<EnrichedCompetition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchCompetitions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getIngestionLogs({ status, limit, offset: 0 });

      setCompetitions(response.data as EnrichedCompetition[]);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load competitions');
    } finally {
      setLoading(false);
    }
  }, [limit, status]);

  useEffect(() => {
    fetchCompetitions();
  }, [fetchCompetitions]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <p className="text-destructive mb-4">{error}</p>
          <Button variant="outline" onClick={fetchCompetitions}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (competitions.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center">
          <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Competitions Yet</h3>
          <p className="text-muted-foreground mb-4">
            Upload a PDF or CSV file to get started with diving analytics.
          </p>
          {showUploadCTA && (
            <Button asChild>
              <Link href="/competitions">Upload Competition</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={fetchCompetitions}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {total > limit && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/competitions">View All ({total})</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {competitions.map((competition) => (
          <CompetitionCard key={competition.id} competition={competition} />
        ))}
      </div>
    </div>
  );
}

export default RecentCompetitions;
