import Link from 'next/link';
import { Calendar, MapPin, Users, Trophy, BarChart3 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Badge, Button } from '@/components/ui';
import type { IngestionLog } from '@/lib/api';

interface CompetitionCardProps {
  competition: IngestionLog & {
    competitionName?: string;
    location?: string;
    eventType?: string;
    athleteCount?: number;
    diveCount?: number;
    averageScore?: number;
  };
}

/**
 * Competition card for displaying competition summary in grid layouts
 * Shows key stats: date, location, event type, athlete count, dive count
 */
export function CompetitionCard({ competition }: CompetitionCardProps) {
  const {
    id,
    competitionName,
    fileName,
    status,
    createdAt,
    location,
    eventType,
    athleteCount,
    diveCount,
    averageScore,
    confidence,
  } = competition;

  const displayName = competitionName || fileName?.replace(/\.(pdf|csv)$/i, '') || 'Untitled Competition';
  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const statusVariant = {
    completed: 'success' as const,
    processing: 'warning' as const,
    failed: 'destructive' as const,
    pending: 'secondary' as const,
    partial: 'warning' as const,
  }[status] || 'secondary' as const;

  return (
    <Card className="flex flex-col h-full hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-lg line-clamp-2">{displayName}</CardTitle>
          <Badge variant={statusVariant} className="shrink-0">
            {status}
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-1 mt-1">
          <Calendar className="h-3.5 w-3.5" />
          <span>{formattedDate}</span>
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        {/* Location */}
        {location && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="line-clamp-1">{location}</span>
          </div>
        )}

        {/* Event Type */}
        {eventType && (
          <Badge variant="outline" className="text-xs">
            {eventType}
          </Badge>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {athleteCount !== undefined && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm">
                <span className="font-medium">{athleteCount}</span>
                <span className="text-muted-foreground ml-1">athletes</span>
              </div>
            </div>
          )}

          {diveCount !== undefined && (
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm">
                <span className="font-medium">{diveCount}</span>
                <span className="text-muted-foreground ml-1">dives</span>
              </div>
            </div>
          )}

          {averageScore !== undefined && (
            <div className="flex items-center gap-2 col-span-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm">
                <span className="text-muted-foreground">Avg: </span>
                <span className="font-medium">{averageScore.toFixed(1)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Confidence indicator */}
        {confidence !== undefined && confidence > 0 && (
          <div className="pt-2">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>OCR Confidence</span>
              <span>{Math.round(confidence * 100)}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  confidence >= 0.9
                    ? 'bg-green-500'
                    : confidence >= 0.7
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${confidence * 100}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2">
        <Button asChild variant="default" className="w-full">
          <Link href={`/competitions/${id}`}>View Details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default CompetitionCard;
