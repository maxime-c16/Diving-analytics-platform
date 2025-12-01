import { useState, useRef, useEffect } from 'react';
import { Check, X, Edit2, Loader2 } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

interface EditableAthleteNameProps {
  athleteId: number;
  name: string;
  onSave?: (newName: string) => void;
  className?: string;
  compact?: boolean;
}

/**
 * Inline editable athlete name component
 * Click to edit, press Enter or click checkmark to save
 * Esc or click X to cancel
 */
export function EditableAthleteName({
  athleteId,
  name,
  onSave,
  className,
  compact = false,
}: EditableAthleteNameProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(name);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card collapse
    setIsEditing(true);
    setEditValue(name);
    setError(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(name);
    setError(null);
  };

  const handleSave = async () => {
    const trimmedValue = editValue.trim();
    
    if (!trimmedValue) {
      setError('Name cannot be empty');
      return;
    }

    if (trimmedValue === name) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await api.updateAthlete(athleteId, { name: trimmedValue });
      onSave?.(trimmedValue);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div 
        className="flex items-center gap-1"
        onClick={(e) => e.stopPropagation()} // Prevent card collapse
      >
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          className={cn(
            "h-7 px-2 py-0 text-sm font-semibold",
            error && "border-destructive",
            compact ? "w-28" : "w-40"
          )}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/30"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleCancel}
          disabled={isSaving}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
        {error && (
          <span className="text-xs text-destructive ml-1">{error}</span>
        )}
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "group flex items-center gap-1 cursor-pointer",
        className
      )}
      onClick={handleStartEdit}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleStartEdit(e as unknown as React.MouseEvent);
        }
      }}
    >
      <span className={cn(
        "font-semibold transition-colors group-hover:text-primary",
        compact ? "text-base" : "text-lg"
      )}>
        {name}
      </span>
      <Edit2 className="h-3.5 w-3.5 opacity-0 group-hover:opacity-60 transition-opacity" />
    </div>
  );
}

export default EditableAthleteName;
