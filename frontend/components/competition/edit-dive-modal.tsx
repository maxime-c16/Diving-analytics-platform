import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
} from '@/components/ui';
import { api } from '@/lib/api';
import type { ExtendedDiveResult } from '@/lib/types';

interface EditDiveModalProps {
  dive: ExtendedDiveResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedDive: ExtendedDiveResult) => void;
}

/**
 * Modal for editing dive attributes
 * Allows editing: dive code, difficulty, judge scores, final score
 */
export function EditDiveModal({
  dive,
  open,
  onOpenChange,
  onSave,
}: EditDiveModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [diveCode, setDiveCode] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [judgeScores, setJudgeScores] = useState<string[]>([]);
  const [finalScore, setFinalScore] = useState('');

  // Initialize form when dive changes
  useEffect(() => {
    if (dive) {
      setDiveCode(dive.diveCode || '');
      setDifficulty(dive.difficulty?.toString() || '');
      setJudgeScores(dive.judgeScores?.map(s => s.toString()) || []);
      setFinalScore(dive.finalScore?.toString() || '');
      setError(null);
    }
  }, [dive]);

  const handleJudgeScoreChange = (index: number, value: string) => {
    const newScores = [...judgeScores];
    newScores[index] = value;
    setJudgeScores(newScores);
  };

  const handleSave = async () => {
    if (!dive) return;
``
    setIsSaving(true);
    setError(null);

    try {
      const updates: Parameters<typeof api.updateDive>[1] = {};

      if (diveCode !== dive.diveCode) {
        updates.diveCode = diveCode;
      }

      if (parseFloat(difficulty) !== dive.difficulty) {
        updates.difficulty = parseFloat(difficulty);
      }

      const parsedScores = judgeScores.map(s => parseFloat(s)).filter(s => !isNaN(s));
      const originalScores = dive.judgeScores || [];
      if (JSON.stringify(parsedScores) !== JSON.stringify(originalScores)) {
        updates.judgeScores = parsedScores;
      }

      if (parseFloat(finalScore) !== dive.finalScore) {
        updates.finalScore = parseFloat(finalScore);
      }

      // Only call API if there are updates
      if (Object.keys(updates).length > 0) {
        await api.updateDive(dive.id, updates);
      }

      // Build updated dive object
      const updatedDive: ExtendedDiveResult = {
        ...dive,
        diveCode: diveCode,
        difficulty: parseFloat(difficulty),
        judgeScores: parsedScores,
        finalScore: parseFloat(finalScore),
      };

      onSave(updatedDive);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  if (!dive) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Dive</DialogTitle>
          <DialogDescription>
            Round {dive.roundNumber} - Update dive attributes below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Dive Code */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="diveCode" className="text-right">
              Dive Code
            </Label>
            <Input
              id="diveCode"
              value={diveCode}
              onChange={(e) => setDiveCode(e.target.value.toUpperCase())}
              className="col-span-3 font-mono"
              placeholder="e.g., 105B"
            />
          </div>

          {/* Difficulty */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="difficulty" className="text-right">
              Difficulty
            </Label>
            <Input
              id="difficulty"
              type="number"
              step="0.1"
              min="1.0"
              max="5.0"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="col-span-3"
            />
          </div>

          {/* Judge Scores */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">Judge Scores</Label>
            <div className="col-span-3 grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Label className="text-xs text-muted-foreground text-center block">
                    J{i + 1}
                  </Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    max="10"
                    value={judgeScores[i] || ''}
                    onChange={(e) => handleJudgeScoreChange(i, e.target.value)}
                    className="text-center text-sm p-1 h-8"
                    placeholder="—"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Final Score */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="finalScore" className="text-right">
              Final Score
            </Label>
            <Input
              id="finalScore"
              type="number"
              step="0.01"
              min="0"
              value={finalScore}
              onChange={(e) => setFinalScore(e.target.value)}
              className="col-span-3"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EditDiveModal;
