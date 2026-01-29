"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { EventColorPicker } from "./EventColorPicker";

type EventEditDialogProps = {
  open: boolean;
  event: {
    id: string;
    summary?: string;
    colorId?: string;
    start?: { dateTime?: string; date?: string };
    end?: { dateTime?: string; date?: string };
  };
  onClose: () => void;
  onSave: (updates: { summary?: string; colorId?: string }) => Promise<void>;
  onDelete: () => Promise<void>;
};

export function EventEditDialog({
  open,
  event,
  onClose,
  onSave,
  onDelete,
}: EventEditDialogProps) {
  const [summary, setSummary] = useState(event.summary || "");
  const [colorId, setColorId] = useState(event.colorId || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave({ summary, colorId: colorId || undefined });
      onClose();
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(false);
    }
  }, [summary, colorId, onSave, onClose]);

  const handleDeleteClick = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    setShowDeleteConfirm(false);
    setDeleting(true);
    try {
      await onDelete();
      onClose();
    } catch (error) {
      console.error("Failed to delete:", error);
    } finally {
      setDeleting(false);
    }
  }, [onDelete, onClose]);

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Event title"
            />
          </div>

          <div className="space-y-2">
            <Label>Time</Label>
            <p className="text-sm text-muted-foreground">
              {formatDateTime(event.start?.dateTime)}
              {event.end?.dateTime && ` - ${formatDateTime(event.end.dateTime)}`}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <EventColorPicker selectedColorId={colorId} onSelect={setColorId} />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <Button
            variant="ghost"
            onClick={handleDeleteClick}
            disabled={deleting || saving}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this event? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleDeleteCancel} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
