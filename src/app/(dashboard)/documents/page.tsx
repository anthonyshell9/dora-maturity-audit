"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Upload,
  FileText,
  Trash2,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileUp,
} from "lucide-react";
import { toast } from "sonner";

interface Organization {
  id: string;
  name: string;
}

interface Document {
  id: string;
  name: string;
  originalName: string;
  fileType: string;
  fileSize: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "ERROR";
  errorMessage?: string;
  uploadedAt: string;
  processedAt?: string;
  _count: {
    chunks: number;
  };
}

export default function DocumentsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchOrganizations = useCallback(async () => {
    try {
      const res = await fetch("/api/organizations");
      if (!res.ok) throw new Error("Failed to fetch organizations");
      const data = await res.json();
      setOrganizations(data);
      if (data.length > 0 && !selectedOrgId) {
        setSelectedOrgId(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching organizations:", error);
      toast.error("Failed to load organizations");
    }
  }, [selectedOrgId]);

  const fetchDocuments = useCallback(async () => {
    if (!selectedOrgId) return;

    try {
      const res = await fetch(`/api/documents?organizationId=${selectedOrgId}`);
      if (!res.ok) throw new Error("Failed to fetch documents");
      const data = await res.json();
      setDocuments(data);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [selectedOrgId]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  useEffect(() => {
    if (selectedOrgId) {
      setLoading(true);
      fetchDocuments();
    }
  }, [selectedOrgId, fetchDocuments]);

  // Poll for document status updates
  useEffect(() => {
    const hasProcessing = documents.some(
      (d) => d.status === "PENDING" || d.status === "PROCESSING"
    );
    if (hasProcessing) {
      const interval = setInterval(fetchDocuments, 5000);
      return () => clearInterval(interval);
    }
  }, [documents, fetchDocuments]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    const totalFiles = files.length;
    let completedFiles = 0;

    for (const file of Array.from(files)) {
      // Validate file size (5GB max)
      if (file.size > 5 * 1024 * 1024 * 1024) {
        toast.error(`File "${file.name}" exceeds 5GB limit`);
        continue;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("organizationId", selectedOrgId);

      try {
        const res = await fetch("/api/documents", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Upload failed");
        }

        completedFiles++;
        setUploadProgress((completedFiles / totalFiles) * 100);
        toast.success(`Uploaded "${file.name}"`);
      } catch (error) {
        console.error("Error uploading file:", error);
        toast.error(
          `Failed to upload "${file.name}": ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }

    setUploading(false);
    setUploadProgress(0);
    fetchDocuments();

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (!selectedDoc) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/documents/${selectedDoc.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Delete failed");
      }

      toast.success("Document deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedDoc(null);
      fetchDocuments();
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete document"
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleReprocess = async (docId: string) => {
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: "POST",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Reprocess failed");
      }

      toast.success("Document reprocessing started");
      fetchDocuments();
    } catch (error) {
      console.error("Error reprocessing document:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to reprocess document"
      );
    }
  };

  const formatFileSize = (bytes: string) => {
    const size = parseInt(bytes, 10);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024)
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const getStatusBadge = (status: Document["status"], errorMessage?: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case "PROCESSING":
        return (
          <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-700">
            <Loader2 className="h-3 w-3 animate-spin" />
            Processing
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge variant="default" className="gap-1 bg-green-100 text-green-700">
            <CheckCircle2 className="h-3 w-3" />
            Ready
          </Badge>
        );
      case "ERROR":
        return (
          <Badge variant="destructive" className="gap-1" title={errorMessage}>
            <XCircle className="h-3 w-3" />
            Error
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const completedCount = documents.filter((d) => d.status === "COMPLETED").length;
  const totalChunks = documents.reduce((sum, d) => sum + (d._count?.chunks || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-muted-foreground">
            Upload documents for AI-powered DORA compliance analysis
          </p>
        </div>
      </div>

      {/* Organization Selector & Upload */}
      <div className="flex items-center gap-4">
        <div className="w-64">
          <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
            <SelectTrigger>
              <SelectValue placeholder="Select organization" />
            </SelectTrigger>
            <SelectContent>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.md,.docx,.xlsx,.doc,.xls"
          className="hidden"
          onChange={handleFileSelect}
        />

        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={!selectedOrgId || uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload Documents
            </>
          )}
        </Button>
      </div>

      {uploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Upload progress</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <Progress value={uploadProgress} />
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents.length}</div>
            <p className="text-xs text-muted-foreground">
              {completedCount} ready for analysis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Text Chunks</CardTitle>
            <FileUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalChunks}</div>
            <p className="text-xs text-muted-foreground">
              Indexed for AI search
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {documents.filter((d) => d.status === "ERROR").length > 0 ? (
                <span className="text-red-500">
                  {documents.filter((d) => d.status === "ERROR").length} errors
                </span>
              ) : documents.filter(
                  (d) => d.status === "PENDING" || d.status === "PROCESSING"
                ).length > 0 ? (
                <span className="text-blue-500">Processing...</span>
              ) : (
                <span className="text-green-500">All ready</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {documents.filter(
                (d) => d.status === "PENDING" || d.status === "PROCESSING"
              ).length}{" "}
              in queue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Documents</CardTitle>
          <CardDescription>
            Documents are automatically processed for AI analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No documents yet</h3>
              <p className="text-muted-foreground mb-4">
                Upload PDF, Word, or text documents for AI analysis
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={!selectedOrgId}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Documents
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Chunks</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.originalName}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{doc.fileType.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                    <TableCell>{doc._count?.chunks || 0}</TableCell>
                    <TableCell>
                      {getStatusBadge(doc.status, doc.errorMessage)}
                    </TableCell>
                    <TableCell>
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {doc.status === "ERROR" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleReprocess(doc.id)}
                            title="Reprocess"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedDoc(doc);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedDoc?.name}&quot;?
              This action cannot be undone and will remove all indexed content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
