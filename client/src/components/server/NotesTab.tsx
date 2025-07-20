import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { FileText, Plus, Edit, Trash2, Calendar } from "lucide-react";
import { getServerNotes, createServerNote, updateServerNote, deleteServerNote } from "@/lib/api";

interface NotesTabProps {
  serverId: number;
}

interface ServerNote {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * NotesTab component for displaying and managing server notes
 * Allows users to create, edit, and delete notes for a specific server
 */
export const NotesTab = ({ serverId }: NotesTabProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<ServerNote | null>(null);
  const [newNote, setNewNote] = useState({ title: "", content: "" });
  const [editNote, setEditNote] = useState({ title: "", content: "" });

  // Fetch server notes
  const { data: notesData, isLoading: notesLoading, error: notesError } = useQuery({
    queryKey: ['/api/user/servers', serverId, 'notes'],
    queryFn: () => getServerNotes(serverId),
    staleTime: 30000, // Cache for 30 seconds
  });

  const notes: ServerNote[] = Array.isArray(notesData) ? notesData : [];

  // Create note mutation
  const createNoteMutation = useMutation({
    mutationFn: (noteData: { title: string; content: string }) => 
      createServerNote(serverId, noteData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/servers', serverId, 'notes'] });
      setNewNote({ title: "", content: "" });
      setIsCreateDialogOpen(false);
      toast({
        title: "Note Created",
        description: "Your note has been successfully created.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Creating Note",
        description: error.message || "Failed to create note. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update note mutation
  const updateNoteMutation = useMutation({
    mutationFn: ({ noteId, noteData }: { noteId: number; noteData: { title: string; content: string } }) => 
      updateServerNote(serverId, noteId, noteData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/servers', serverId, 'notes'] });
      setEditingNote(null);
      setEditNote({ title: "", content: "" });
      toast({
        title: "Note Updated",
        description: "Your note has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Updating Note",
        description: error.message || "Failed to update note. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: number) => deleteServerNote(serverId, noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/servers', serverId, 'notes'] });
      toast({
        title: "Note Deleted",
        description: "Your note has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Deleting Note",
        description: error.message || "Failed to delete note. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle create note
  const handleCreateNote = () => {
    if (!newNote.title.trim() || !newNote.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide both a title and content for the note.",
        variant: "destructive",
      });
      return;
    }
    createNoteMutation.mutate(newNote);
  };

  // Handle edit note
  const handleEditNote = (note: ServerNote) => {
    setEditingNote(note);
    setEditNote({ title: note.title, content: note.content });
  };

  // Handle update note
  const handleUpdateNote = () => {
    if (!editNote.title.trim() || !editNote.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide both a title and content for the note.",
        variant: "destructive",
      });
      return;
    }
    if (editingNote) {
      updateNoteMutation.mutate({ noteId: editingNote.id, noteData: editNote });
    }
  };

  // Handle delete note
  const handleDeleteNote = (noteId: number) => {
    deleteNoteMutation.mutate(noteId);
  };

  // Format date helper
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Server Notes
              </CardTitle>
              <CardDescription>
                Keep track of important information about this server
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Note
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                  <DialogTitle>Create New Note</DialogTitle>
                  <DialogDescription>
                    Add a new note for this server. Notes help you keep track of important information.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="note-title" className="text-sm font-medium">
                      Title
                    </label>
                    <Input
                      id="note-title"
                      placeholder="Enter note title..."
                      value={newNote.title}
                      onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label htmlFor="note-content" className="text-sm font-medium">
                      Content
                    </label>
                    <Textarea
                      id="note-content"
                      placeholder="Enter note content..."
                      value={newNote.content}
                      onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                      className="mt-1 min-h-[120px]"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        setNewNote({ title: "", content: "" });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateNote}
                      disabled={createNoteMutation.isPending}
                    >
                      {createNoteMutation.isPending ? "Creating..." : "Create Note"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {notesLoading && (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <Skeleton className="h-6 w-1/3 mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ))}
            </div>
          )}

          {notesError && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-md">
              <div className="font-semibold">Error Loading Notes</div>
              <div className="text-sm mt-1">
                {notesError instanceof Error ? notesError.message : 'An unknown error occurred'}
              </div>
            </div>
          )}

          {!notesLoading && !notesError && notes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <FileText className="h-16 w-16 mb-4 opacity-50" />
              <div>No notes found for this server.</div>
              <div className="text-sm mt-1">Create your first note to get started.</div>
            </div>
          )}

          {!notesLoading && !notesError && notes.length > 0 && (
            <div className="space-y-4">
              {notes.map((note) => (
                <Card key={note.id} className="border-l-4 border-l-primary/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{note.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>Created: {formatDate(note.createdAt)}</span>
                          {note.updatedAt !== note.createdAt && (
                            <>
                              <span>•</span>
                              <span>Updated: {formatDate(note.updatedAt)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditNote(note)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Note</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this note? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteNote(note.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-sm whitespace-pre-wrap">{note.content}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Note Dialog */}
      <Dialog open={!!editingNote} onOpenChange={(open) => !open && setEditingNote(null)}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
            <DialogDescription>
              Update your note information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="edit-note-title" className="text-sm font-medium">
                Title
              </label>
              <Input
                id="edit-note-title"
                placeholder="Enter note title..."
                value={editNote.title}
                onChange={(e) => setEditNote({ ...editNote, title: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label htmlFor="edit-note-content" className="text-sm font-medium">
                Content
              </label>
              <Textarea
                id="edit-note-content"
                placeholder="Enter note content..."
                value={editNote.content}
                onChange={(e) => setEditNote({ ...editNote, content: e.target.value })}
                className="mt-1 min-h-[120px]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingNote(null);
                  setEditNote({ title: "", content: "" });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateNote}
                disabled={updateNoteMutation.isPending}
              >
                {updateNoteMutation.isPending ? "Updating..." : "Update Note"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};