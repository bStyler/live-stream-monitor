"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";

interface RemoveStreamDialogProps {
  streamId: string;
  streamTitle: string;
  trigger?: React.ReactNode;
}

export function RemoveStreamDialog({
  streamId,
  streamTitle,
  trigger,
}: RemoveStreamDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const removeStreamMutation = useMutation({
    mutationFn: async (streamId: string) => {
      const res = await fetch("/api/streams/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streamId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to remove stream");
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch dashboard stats
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      // Force immediate refetch
      queryClient.refetchQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Stream removed", {
        description: "Stream has been removed from your monitoring list.",
      });
      setOpen(false);
    },
    onError: (error: Error) => {
      toast.error("Failed to remove stream", {
        description: error.message,
      });
    },
  });

  const handleRemove = () => {
    removeStreamMutation.mutate(streamId);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger || (
          <Button variant="destructive" size="sm">
            <Trash2 className="h-4 w-4 mr-2" />
            Remove
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Stream</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to stop monitoring{" "}
            <span className="font-semibold text-foreground">"{streamTitle}"</span>?
            <br />
            <br />
            You can always add it back later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={removeStreamMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRemove}
            disabled={removeStreamMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {removeStreamMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
