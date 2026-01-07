"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  Brain,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Sparkles,
  Upload,
  Trash2,
  FileUp,
  Check,
  X,
  Link,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface Organization {
  id: string;
  name: string;
  _count: { documents: number };
}

interface Document {
  id: string;
  name: string;
  originalName: string;
  fileType: string;
  fileSize: string;
  status: string;
  uploadedAt: string;
  _count?: { chunks: number };
}

interface Audit {
  id: string;
  name: string;
  organizationId: string;
}

interface Chapter {
  id: number;
  title: string;
  _count: { articles: number };
}

interface DocumentLink {
  documentId: string;
  documentName: string;
  relevanceScore: number;
  excerpt?: string;
}

interface AISuggestion {
  id: string;
  questionId: string;
  suggestion: string;
  confidence: number;
  reasoning: string;
  evidenceDescription?: string;
  sources: DocumentLink[];
  status?: 'pending' | 'accepted' | 'rejected';
  question: {
    id: string;
    text: string;
    ref: string;
    article: {
      number: number;
      title: string;
      chapter: {
        id: number;
        title: string;
      };
    };
  };
}

export default function AIAnalysisPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);

  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [selectedAuditId, setSelectedAuditId] = useState<string>("");
  const [selectedChapterId, setSelectedChapterId] = useState<string>("all");

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);

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
    }
  }, [selectedOrgId]);

  const fetchAudits = useCallback(async () => {
    if (!selectedOrgId) return;
    try {
      const res = await fetch(`/api/audits?organizationId=${selectedOrgId}`);
      if (!res.ok) throw new Error("Failed to fetch audits");
      const data = await res.json();
      setAudits(data);
      if (data.length > 0) {
        setSelectedAuditId(data[0].id);
      } else {
        setSelectedAuditId("");
      }
    } catch (error) {
      console.error("Error fetching audits:", error);
    }
  }, [selectedOrgId]);

  const fetchChapters = useCallback(async () => {
    try {
      const res = await fetch("/api/questions/chapters");
      if (!res.ok) throw new Error("Failed to fetch chapters");
      const data = await res.json();
      setChapters(data);
    } catch (error) {
      console.error("Error fetching chapters:", error);
    }
  }, []);

  const fetchSuggestions = useCallback(async () => {
    if (!selectedAuditId) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`/api/ai/suggestions?auditId=${selectedAuditId}`);
      if (!res.ok) throw new Error("Failed to fetch suggestions");
      const data = await res.json();
      setSuggestions(data);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedAuditId]);

  useEffect(() => {
    fetchOrganizations();
    fetchChapters();
  }, [fetchOrganizations, fetchChapters]);

  useEffect(() => {
    if (selectedOrgId) {
      fetchAudits();
      fetchDocuments();
    }
  }, [selectedOrgId, fetchAudits, fetchDocuments]);

  useEffect(() => {
    if (selectedAuditId) {
      setLoading(true);
      fetchSuggestions();
    }
  }, [selectedAuditId, fetchSuggestions]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedOrgId) return;

    if (documents.length + files.length > 100) {
      toast.error("Maximum 100 documents allowed per organization");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const totalFiles = files.length;
    let uploadedCount = 0;
    let failedCount = 0;

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("organizationId", selectedOrgId);

        const res = await fetch("/api/documents", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Upload failed");
        }

        uploadedCount++;
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        failedCount++;
      }

      setUploadProgress(Math.round(((uploadedCount + failedCount) / totalFiles) * 100));
    }

    setUploading(false);
    setUploadProgress(0);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (failedCount === 0) {
      toast.success(`Successfully uploaded ${uploadedCount} document(s)`);
    } else {
      toast.warning(`Uploaded ${uploadedCount} document(s), ${failedCount} failed`);
    }

    fetchDocuments();
    fetchOrganizations(); // Refresh document counts
  };

  const handleDeleteDocument = async () => {
    if (!deleteDocId) return;

    try {
      const res = await fetch(`/api/documents/${deleteDocId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete document");

      toast.success("Document deleted");
      fetchDocuments();
      fetchOrganizations();
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document");
    } finally {
      setDeleteDocId(null);
    }
  };

  const handleRunAnalysis = async () => {
    if (!selectedAuditId || !selectedOrgId) {
      toast.error("Please select an organization and audit");
      return;
    }

    if (documents.length === 0) {
      toast.error("Please upload documents first");
      return;
    }

    const processedDocs = documents.filter(d => d.status === "PROCESSED");
    if (processedDocs.length === 0) {
      toast.error("Please wait for documents to finish processing");
      return;
    }

    setAnalyzing(true);
    setAnalysisProgress(0);

    try {
      const res = await fetch("/api/ai/batch-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auditId: selectedAuditId,
          organizationId: selectedOrgId,
          chapterId: selectedChapterId !== "all" ? parseInt(selectedChapterId) : undefined,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Analysis failed");
      }

      const result = await res.json();
      setAnalysisProgress(100);

      toast.success(
        `Analyzed ${result.analyzed} questions. ${result.failed} failed.`
      );

      fetchSuggestions();
    } catch (error) {
      console.error("Error running analysis:", error);
      toast.error(error instanceof Error ? error.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
      setAnalysisProgress(0);
    }
  };

  const handleAcceptSuggestion = async (suggestion: AISuggestion) => {
    if (!selectedAuditId) return;

    try {
      // Create/update response with the AI suggestion
      const res = await fetch(`/api/audits/${selectedAuditId}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: suggestion.questionId,
          answer: suggestion.suggestion === "YES" ? "YES" :
                  suggestion.suggestion === "NO" ? "NO" :
                  suggestion.suggestion === "PARTIAL" ? "NA" : "NO_ANSWER",
          notes: `AI Analysis (${Math.round(suggestion.confidence * 100)}% confidence):\n${suggestion.reasoning}\n\nEvidence: ${suggestion.evidenceDescription || 'See linked documents'}`,
        }),
      });

      if (!res.ok) throw new Error("Failed to save response");

      // Update local state
      setSuggestions(prev =>
        prev.map(s => s.id === suggestion.id ? { ...s, status: 'accepted' as const } : s)
      );

      toast.success("Suggestion accepted and response saved");
    } catch (error) {
      console.error("Error accepting suggestion:", error);
      toast.error("Failed to accept suggestion");
    }
  };

  const handleRejectSuggestion = (suggestionId: string) => {
    setSuggestions(prev =>
      prev.map(s => s.id === suggestionId ? { ...s, status: 'rejected' as const } : s)
    );
    toast.info("Suggestion rejected");
  };

  const getSuggestionBadge = (suggestion: string, confidence: number) => {
    if (suggestion === "INSUFFICIENT_INFO") {
      return (
        <Badge variant="outline" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Insufficient Info
        </Badge>
      );
    }

    const color =
      suggestion === "YES"
        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
        : suggestion === "NO"
        ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";

    return (
      <Badge className={`gap-1 ${color}`}>
        {suggestion === "YES" ? (
          <CheckCircle2 className="h-3 w-3" />
        ) : suggestion === "NO" ? (
          <XCircle className="h-3 w-3" />
        ) : (
          <AlertCircle className="h-3 w-3" />
        )}
        {suggestion} ({Math.round(confidence * 100)}%)
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PROCESSED":
        return <Badge className="bg-green-100 text-green-700">Ready</Badge>;
      case "PROCESSING":
        return <Badge className="bg-blue-100 text-blue-700">Processing...</Badge>;
      case "PENDING":
        return <Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>;
      case "FAILED":
        return <Badge className="bg-red-100 text-red-700">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatFileSize = (sizeStr: string) => {
    const size = parseInt(sizeStr);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredSuggestions =
    selectedChapterId === "all"
      ? suggestions
      : suggestions.filter(
          (s) => s.question?.article?.chapter?.id === parseInt(selectedChapterId)
        );

  const pendingSuggestions = filteredSuggestions.filter(s => !s.status || s.status === 'pending');
  const acceptedSuggestions = filteredSuggestions.filter(s => s.status === 'accepted');
  const rejectedSuggestions = filteredSuggestions.filter(s => s.status === 'rejected');

  const processedDocuments = documents.filter(d => d.status === "PROCESSED");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Document Analysis</h1>
          <p className="text-muted-foreground">
            Upload documents and let AI analyze them for DORA compliance
          </p>
        </div>
      </div>

      {/* Organization & Audit Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Organization & Audit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Organization</label>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name} ({org._count?.documents || 0} docs)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Audit</label>
              <Select
                value={selectedAuditId}
                onValueChange={setSelectedAuditId}
                disabled={!selectedOrgId || audits.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={audits.length === 0 ? "No audits found" : "Select audit"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {audits.map((audit) => (
                    <SelectItem key={audit.id} value={audit.id}>
                      {audit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="documents" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="documents" className="gap-2">
            <FileUp className="h-4 w-4" />
            Documents ({documents.length}/100)
          </TabsTrigger>
          <TabsTrigger value="analysis" className="gap-2">
            <Brain className="h-4 w-4" />
            AI Analysis ({suggestions.length})
          </TabsTrigger>
        </TabsList>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Documents
              </CardTitle>
              <CardDescription>
                Upload up to 100 documents (PDF, DOCX, XLSX, TXT). AI will extract and analyze content.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.xlsx,.txt,.md,.doc,.xls"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading || !selectedOrgId || documents.length >= 100}
                />
                <FileUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || !selectedOrgId || documents.length >= 100}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading... {uploadProgress}%
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Select Files
                    </>
                  )}
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  {documents.length >= 100
                    ? "Maximum documents reached"
                    : `${100 - documents.length} slots remaining`}
                </p>
              </div>

              {uploading && (
                <Progress value={uploadProgress} className="w-full" />
              )}
            </CardContent>
          </Card>

          {/* Document List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Uploaded Documents</CardTitle>
                <Button variant="outline" size="sm" onClick={fetchDocuments}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No documents uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.originalName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(doc.fileSize)} • {doc._count?.chunks || 0} chunks
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(doc.status)}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteDocId(doc.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-4">
          {/* Analysis Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Run Global Analysis
              </CardTitle>
              <CardDescription>
                AI will analyze all documents and suggest answers for DORA compliance questions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Filter by Chapter</label>
                  <Select value={selectedChapterId} onValueChange={setSelectedChapterId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Chapters</SelectItem>
                      {chapters.map((chapter) => (
                        <SelectItem key={chapter.id} value={chapter.id.toString()}>
                          Chapter {chapter.id}: {chapter.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={handleRunAnalysis}
                    disabled={!selectedAuditId || processedDocuments.length === 0 || analyzing}
                    className="w-full"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing... {analysisProgress}%
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Run AI Analysis ({processedDocuments.length} docs)
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {analyzing && <Progress value={analysisProgress} />}

              {processedDocuments.length === 0 && documents.length > 0 && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">
                      Documents still processing
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Please wait for documents to finish processing before running analysis.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
                <Sparkles className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{suggestions.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <AlertCircle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{pendingSuggestions.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Accepted</CardTitle>
                <Check className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{acceptedSuggestions.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                <X className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{rejectedSuggestions.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Compliant</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {suggestions.filter(s => s.suggestion === "YES").length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Suggestions List */}
          <Card>
            <CardHeader>
              <CardTitle>AI Suggestions</CardTitle>
              <CardDescription>
                Review AI suggestions and accept or reject them. Accepted suggestions will be saved as responses.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredSuggestions.length === 0 ? (
                <div className="text-center py-12">
                  <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No suggestions yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Upload documents and run AI analysis to generate suggestions
                  </p>
                </div>
              ) : (
                <Accordion type="single" collapsible className="space-y-2">
                  {filteredSuggestions.map((suggestion) => (
                    <AccordionItem
                      key={suggestion.id}
                      value={suggestion.id}
                      className={`border rounded-lg px-4 ${
                        suggestion.status === 'accepted'
                          ? 'bg-green-50 dark:bg-green-950 border-green-200'
                          : suggestion.status === 'rejected'
                          ? 'bg-red-50 dark:bg-red-950 border-red-200 opacity-60'
                          : ''
                      }`}
                    >
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-4 text-left flex-1">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant="outline">
                                Ch.{suggestion.question?.article?.chapter?.id} Art.
                                {suggestion.question?.article?.number} - {suggestion.question?.ref}
                              </Badge>
                              {getSuggestionBadge(suggestion.suggestion, suggestion.confidence)}
                              {suggestion.status === 'accepted' && (
                                <Badge className="bg-green-600 text-white">Accepted</Badge>
                              )}
                              {suggestion.status === 'rejected' && (
                                <Badge className="bg-red-600 text-white">Rejected</Badge>
                              )}
                            </div>
                            <p className="text-sm">{suggestion.question?.text}</p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-4">
                          <div>
                            <h4 className="font-medium mb-2">AI Reasoning</h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {suggestion.reasoning}
                            </p>
                          </div>

                          {suggestion.evidenceDescription && (
                            <div>
                              <h4 className="font-medium mb-2">Suggested Evidence Description</h4>
                              <p className="text-sm text-muted-foreground">
                                {suggestion.evidenceDescription}
                              </p>
                            </div>
                          )}

                          {suggestion.sources && suggestion.sources.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-2 flex items-center gap-2">
                                <Link className="h-4 w-4" />
                                Linked Documents
                              </h4>
                              <div className="space-y-2">
                                {suggestion.sources.map((source, idx) => (
                                  <div key={idx} className="p-3 bg-muted rounded-lg">
                                    <div className="flex items-center gap-2 mb-1">
                                      <FileText className="h-4 w-4" />
                                      <span className="font-medium text-sm">
                                        {source.documentName}
                                      </span>
                                      {source.relevanceScore && (
                                        <Badge variant="outline" className="text-xs">
                                          {Math.round(source.relevanceScore * 100)}% relevant
                                        </Badge>
                                      )}
                                    </div>
                                    {source.excerpt && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        &quot;{source.excerpt}&quot;
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {!suggestion.status && (
                            <div className="flex gap-2 pt-2">
                              <Button
                                onClick={() => handleAcceptSuggestion(suggestion)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Accept & Save
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => handleRejectSuggestion(suggestion.id)}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <X className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteDocId} onOpenChange={() => setDeleteDocId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDocument}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
