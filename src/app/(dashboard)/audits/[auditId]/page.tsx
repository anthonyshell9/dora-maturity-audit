"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  MinusCircle,
  HelpCircle,
  Upload,
  FileText,
  Download,
  Trash2,
  Save,
  Loader2,
  Brain,
  Sparkles,
  Link as LinkIcon,
  Plus,
  RefreshCw,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

interface Evidence {
  id: string;
  fileName: string;
  fileUrl: string;
}

interface DocumentLink {
  id: string;
  documentId: string;
  relevanceScore: number | null;
  excerpt: string | null;
  status: string;
  document: {
    id: string;
    name: string;
    originalName: string;
    fileType: string;
    fileUrl: string;
  };
}

interface Document {
  id: string;
  name: string;
  originalName: string;
  fileType: string;
  status: string;
}

interface Question {
  id: string;
  ref: string;
  text: string;
  article: {
    number: number;
    title: string;
    chapter: {
      id: number;
      title: string;
    };
  };
}

interface Response {
  id: string;
  questionId: string;
  answer: "YES" | "NO" | "NA" | "NO_ANSWER";
  notes: string | null;
  evidences: Evidence[];
  documentLinks?: DocumentLink[];
}

interface Chapter {
  id: number;
  title: string;
  _count: {
    questions: number;
  };
}

interface Audit {
  id: string;
  name: string;
  status: string;
  organization: {
    id: string;
    name: string;
  };
  responses: Response[];
}

interface AISuggestion {
  suggestion: string;
  confidence: number;
  reasoning: string;
  evidenceDescription?: string;
  sources?: Array<{
    documentId: string;
    documentName: string;
    relevanceScore: number;
    excerpt?: string;
  }>;
}

export default function AuditDetailPage({
  params,
}: {
  params: Promise<{ auditId: string }>;
}) {
  const { auditId } = use(params);

  const [audit, setAudit] = useState<Audit | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeChapter, setActiveChapter] = useState<number | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [localResponses, setLocalResponses] = useState<Record<string, { answer: string; notes: string }>>({});
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [addDocDialogOpen, setAddDocDialogOpen] = useState(false);
  const [reanalyzeDialogOpen, setReanalyzeDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [linkedDocuments, setLinkedDocuments] = useState<DocumentLink[]>([]);
  const [availableDocuments, setAvailableDocuments] = useState<Document[]>([]);
  const [selectedDocToAdd, setSelectedDocToAdd] = useState<string>("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [selectedDocsForAnalysis, setSelectedDocsForAnalysis] = useState<string[]>([]);

  // Fetch audit data
  const fetchAudit = useCallback(async () => {
    try {
      const res = await fetch(`/api/audits/${auditId}`);
      if (!res.ok) throw new Error("Failed to fetch audit");
      const data = await res.json();
      setAudit(data);

      // Initialize local responses from saved responses
      const savedResponses: Record<string, { answer: string; notes: string }> = {};
      data.responses?.forEach((r: Response) => {
        savedResponses[r.questionId] = {
          answer: r.answer,
          notes: r.notes || "",
        };
      });
      setLocalResponses(savedResponses);
    } catch (error) {
      console.error("Error fetching audit:", error);
      toast.error("Failed to load audit");
    }
  }, [auditId]);

  // Fetch chapters
  const fetchChapters = useCallback(async () => {
    try {
      const res = await fetch("/api/questions/chapters");
      if (!res.ok) throw new Error("Failed to fetch chapters");
      const data = await res.json();
      setChapters(data);
      if (data.length > 0 && !activeChapter) {
        setActiveChapter(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching chapters:", error);
    }
  }, [activeChapter]);

  // Fetch questions for chapter
  const fetchQuestions = useCallback(async () => {
    if (!activeChapter) return;
    try {
      const res = await fetch(`/api/audits/${auditId}/questions?chapterId=${activeChapter}`);
      if (!res.ok) throw new Error("Failed to fetch questions");
      const data = await res.json();
      setQuestions(data);
      setCurrentQuestionIndex(0);
    } catch (error) {
      console.error("Error fetching questions:", error);
    } finally {
      setLoading(false);
    }
  }, [auditId, activeChapter]);

  // Fetch linked documents for current question
  const fetchLinkedDocuments = useCallback(async () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion || !audit) return;

    const response = audit.responses?.find(r => r.questionId === currentQuestion.id);
    if (!response) {
      setLinkedDocuments([]);
      return;
    }

    try {
      const res = await fetch(`/api/audits/${auditId}/responses/${response.id}/documents`);
      if (!res.ok) {
        setLinkedDocuments([]);
        return;
      }
      const data = await res.json();
      setLinkedDocuments(data);
    } catch (error) {
      console.error("Error fetching linked documents:", error);
      setLinkedDocuments([]);
    }
  }, [auditId, audit, questions, currentQuestionIndex]);

  // Fetch available documents for the organization
  const fetchAvailableDocuments = useCallback(async () => {
    if (!audit?.organization.id) return;
    try {
      const res = await fetch(`/api/documents?organizationId=${audit.organization.id}`);
      if (!res.ok) return;
      const data = await res.json();
      setAvailableDocuments(data.filter((d: Document) => d.status === "COMPLETED" || d.status === "PROCESSED"));
    } catch (error) {
      console.error("Error fetching documents:", error);
    }
  }, [audit?.organization.id]);

  useEffect(() => {
    fetchAudit();
    fetchChapters();
  }, [fetchAudit, fetchChapters]);

  useEffect(() => {
    if (activeChapter) {
      setLoading(true);
      fetchQuestions();
    }
  }, [activeChapter, fetchQuestions]);

  useEffect(() => {
    fetchLinkedDocuments();
  }, [fetchLinkedDocuments]);

  useEffect(() => {
    fetchAvailableDocuments();
  }, [fetchAvailableDocuments]);

  const currentQuestion = questions[currentQuestionIndex];
  const currentResponse = audit?.responses?.find(r => r.questionId === currentQuestion?.id);

  const getAnswerIcon = (answer?: string) => {
    switch (answer) {
      case "YES":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "NO":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "NA":
        return <MinusCircle className="h-5 w-5 text-gray-400" />;
      default:
        return <HelpCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setLocalResponses((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], answer, notes: prev[questionId]?.notes || "" },
    }));
  };

  const handleNotesChange = (questionId: string, notes: string) => {
    setLocalResponses((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], notes, answer: prev[questionId]?.answer || "" },
    }));
  };

  const handleSaveResponse = async (questionId?: string) => {
    const qId = questionId || currentQuestion?.id;
    if (!qId) return;

    const response = localResponses[qId];
    if (!response?.answer) {
      toast.error("Please select an answer");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/audits/${auditId}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: qId,
          answer: response.answer,
          notes: response.notes || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to save response");
      toast.success("Response saved");
      fetchAudit();
    } catch (error) {
      console.error("Error saving response:", error);
      toast.error("Failed to save response");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    const responsesToSave = Object.entries(localResponses).filter(
      ([, r]) => r.answer && r.answer !== ""
    );

    if (responsesToSave.length === 0) {
      toast.error("No responses to save");
      return;
    }

    setSavingAll(true);
    let saved = 0;
    let failed = 0;

    for (const [questionId, response] of responsesToSave) {
      try {
        const res = await fetch(`/api/audits/${auditId}/responses`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId,
            answer: response.answer,
            notes: response.notes || null,
          }),
        });

        if (res.ok) {
          saved++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    setSavingAll(false);
    toast.success(`Saved ${saved} responses${failed > 0 ? `, ${failed} failed` : ""}`);
    fetchAudit();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !currentQuestion) return;

    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("files", file);
    });
    formData.append("questionId", currentQuestion.id);

    try {
      const res = await fetch(`/api/audits/${auditId}/evidence`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to upload");
      toast.success(`${files.length} file(s) uploaded`);
      setUploadedFiles((prev) => [...prev, ...Array.from(files)]);
      setUploadDialogOpen(false);
      fetchAudit();
    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error("Failed to upload files");
    }
  };

  const handleAddDocumentLink = async () => {
    if (!selectedDocToAdd || !currentResponse) {
      toast.error("Please select a document and save the response first");
      return;
    }

    try {
      const res = await fetch(`/api/audits/${auditId}/responses/${currentResponse.id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: selectedDocToAdd,
          status: "approved",
        }),
      });

      if (!res.ok) throw new Error("Failed to link document");
      toast.success("Document linked successfully");
      setAddDocDialogOpen(false);
      setSelectedDocToAdd("");
      fetchLinkedDocuments();
    } catch (error) {
      console.error("Error linking document:", error);
      toast.error("Failed to link document");
    }
  };

  const handleRemoveDocumentLink = async (linkId: string) => {
    if (!currentResponse) return;

    try {
      const res = await fetch(`/api/audits/${auditId}/responses/${currentResponse.id}/documents?linkId=${linkId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to remove link");
      toast.success("Document link removed");
      fetchLinkedDocuments();
    } catch (error) {
      console.error("Error removing link:", error);
      toast.error("Failed to remove document link");
    }
  };

  const handleAIAnalysis = async (withContext = false) => {
    if (!currentQuestion) return;

    setAnalyzing(true);
    setAiSuggestion(null);

    try {
      const body: Record<string, unknown> = {
        auditId,
        questionId: currentQuestion.id,
        questionText: currentQuestion.text,
        organizationId: audit?.organization.id,
      };

      if (withContext) {
        if (additionalContext) {
          body.additionalContext = additionalContext;
        }
        if (selectedDocsForAnalysis.length > 0) {
          body.specificDocumentIds = selectedDocsForAnalysis;
        }
      }

      const res = await fetch("/api/ai/analyze-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "AI analysis failed");
      }

      const suggestion = await res.json();
      setAiSuggestion(suggestion);
      setReanalyzeDialogOpen(false);

      if (suggestion.suggestion && suggestion.suggestion !== "INSUFFICIENT_INFO") {
        toast.success("AI suggestion ready! Review and apply if appropriate.");
      }
    } catch (error) {
      console.error("Error running AI analysis:", error);
      toast.error(error instanceof Error ? error.message : "AI analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const applyAISuggestion = async () => {
    if (!aiSuggestion || !currentQuestion) return;

    const answer = aiSuggestion.suggestion === "YES" ? "YES"
      : aiSuggestion.suggestion === "NO" ? "NO"
      : aiSuggestion.suggestion === "PARTIAL" ? "NO"
      : "NA";

    setLocalResponses((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        answer,
        notes: `[AI Suggestion - ${Math.round(aiSuggestion.confidence * 100)}% confidence]\n${aiSuggestion.reasoning}${aiSuggestion.evidenceDescription ? `\n\nEvidence: ${aiSuggestion.evidenceDescription}` : ''}`,
      },
    }));

    // Save the response first
    await handleSaveResponse(currentQuestion.id);

    // Then link the source documents if available
    if (aiSuggestion.sources && aiSuggestion.sources.length > 0) {
      await fetchAudit(); // Refresh to get the response ID
      const updatedAudit = audit;
      const response = updatedAudit?.responses?.find(r => r.questionId === currentQuestion.id);

      if (response) {
        for (const source of aiSuggestion.sources) {
          try {
            await fetch(`/api/audits/${auditId}/responses/${response.id}/documents`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                documentId: source.documentId,
                relevanceScore: source.relevanceScore,
                excerpt: source.excerpt,
                status: "approved",
              }),
            });
          } catch (e) {
            console.error("Error linking document:", e);
          }
        }
        fetchLinkedDocuments();
      }
    }

    toast.success("AI suggestion applied");
  };

  const getQuestionResponse = (questionId: string) => {
    return localResponses[questionId] || null;
  };

  // Calculate chapter progress
  const getChapterProgress = () => {
    return chapters.map((chapter) => {
      const answeredCount = audit?.responses?.filter((r) => {
        const q = questions.find((q) => q.id === r.questionId);
        return q?.article?.chapter?.id === chapter.id;
      }).length || 0;

      const localAnsweredCount = Object.entries(localResponses).filter(
        ([qId, r]) => {
          const q = questions.find((q) => q.id === qId);
          return q?.article?.chapter?.id === chapter.id && r.answer;
        }
      ).length;

      const total = chapter._count.questions;
      const answered = Math.max(answeredCount, localAnsweredCount);

      return {
        chapter: chapter.id,
        title: chapter.title,
        total,
        answered,
        percentage: total > 0 ? Math.round((answered / total) * 100) : 0,
      };
    });
  };

  const chapterProgress = getChapterProgress();

  if (!audit) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/audits">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{audit.name}</h1>
              <Badge variant="secondary">{audit.status.replace("_", " ")}</Badge>
            </div>
            <p className="text-muted-foreground">{audit.organization.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button onClick={handleSaveAll} disabled={savingAll}>
            {savingAll ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save All
          </Button>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="grid gap-4 md:grid-cols-5">
        {chapterProgress.map((cp) => (
          <Card
            key={cp.chapter}
            className={`cursor-pointer transition-colors ${
              activeChapter === cp.chapter ? "border-primary" : ""
            }`}
            onClick={() => {
              setActiveChapter(cp.chapter);
              setCurrentQuestionIndex(0);
            }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Chapter {cp.chapter}</CardTitle>
              <CardDescription className="text-xs truncate">
                {cp.title}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <Progress value={cp.percentage} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {cp.answered}/{cp.total} ({cp.percentage}%)
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Questions List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Chapter {activeChapter} Questions</CardTitle>
            <CardDescription>
              {chapters.find((c) => c.id === activeChapter)?.title}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-2">
                  {questions.map((q, idx) => {
                    const response = getQuestionResponse(q.id);
                    return (
                      <div
                        key={q.id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          currentQuestionIndex === idx
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        }`}
                        onClick={() => {
                          setCurrentQuestionIndex(idx);
                          setAiSuggestion(null);
                        }}
                      >
                        <div className="flex items-start gap-2">
                          {currentQuestionIndex !== idx && getAnswerIcon(response?.answer)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">
                              {q.ref}. {q.text?.substring(0, 50) || "Question"}...
                            </p>
                            <p
                              className={`text-xs ${
                                currentQuestionIndex === idx
                                  ? "text-primary-foreground/70"
                                  : "text-muted-foreground"
                              }`}
                            >
                              Article {q.article?.number || "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Question Detail */}
        <Card className="lg:col-span-2">
          {currentQuestion ? (
            <>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <Badge variant="outline" className="mb-2">
                      Article {currentQuestion.article?.number || "N/A"}: {currentQuestion.article?.title || ""}
                    </Badge>
                    <CardTitle className="text-lg">
                      {currentQuestion.ref}. {currentQuestion.text}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={currentQuestionIndex === 0}
                      onClick={() => {
                        setCurrentQuestionIndex((i) => i - 1);
                        setAiSuggestion(null);
                      }}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {currentQuestionIndex + 1} / {questions.length}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={currentQuestionIndex === questions.length - 1}
                      onClick={() => {
                        setCurrentQuestionIndex((i) => i + 1);
                        setAiSuggestion(null);
                      }}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* AI Analysis Section */}
                <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-purple-500" />
                      <span className="font-medium">AI Assistant</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Dialog open={reanalyzeDialogOpen} onOpenChange={setReanalyzeDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Analyze with Context
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Re-analyze with Context</DialogTitle>
                            <DialogDescription>
                              Add context to help the AI understand what to look for
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Additional Context (optional)</Label>
                              <Textarea
                                placeholder="E.g., 'Look for information about backup policies in the IT security document...'"
                                value={additionalContext}
                                onChange={(e) => setAdditionalContext(e.target.value)}
                                rows={3}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Specific Documents (optional)</Label>
                              <Select
                                value=""
                                onValueChange={(value) => {
                                  if (!selectedDocsForAnalysis.includes(value)) {
                                    setSelectedDocsForAnalysis([...selectedDocsForAnalysis, value]);
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select documents to focus on..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableDocuments.map((doc) => (
                                    <SelectItem key={doc.id} value={doc.id}>
                                      {doc.originalName || doc.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {selectedDocsForAnalysis.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {selectedDocsForAnalysis.map((docId) => {
                                    const doc = availableDocuments.find((d) => d.id === docId);
                                    return (
                                      <Badge key={docId} variant="secondary" className="gap-1">
                                        {doc?.originalName || doc?.name}
                                        <button
                                          onClick={() => setSelectedDocsForAnalysis(
                                            selectedDocsForAnalysis.filter((id) => id !== docId)
                                          )}
                                          className="ml-1 hover:text-red-500"
                                        >
                                          ×
                                        </button>
                                      </Badge>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setReanalyzeDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={() => handleAIAnalysis(true)} disabled={analyzing}>
                              {analyzing ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4 mr-2" />
                              )}
                              Re-analyze
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAIAnalysis(false)}
                        disabled={analyzing}
                      >
                        {analyzing ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4 mr-2" />
                        )}
                        Quick Analyze
                      </Button>
                    </div>
                  </div>

                  {aiSuggestion && (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge className={
                          aiSuggestion.suggestion === "YES" ? "bg-green-500" :
                          aiSuggestion.suggestion === "NO" ? "bg-red-500" :
                          aiSuggestion.suggestion === "PARTIAL" ? "bg-yellow-500" :
                          "bg-gray-500"
                        }>
                          {aiSuggestion.suggestion}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {Math.round(aiSuggestion.confidence * 100)}% confidence
                        </span>
                      </div>
                      <p className="text-sm">{aiSuggestion.reasoning}</p>
                      {aiSuggestion.sources && aiSuggestion.sources.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Sources: {aiSuggestion.sources.map(s => s.documentName).join(", ")}
                        </div>
                      )}
                      <Button size="sm" onClick={applyAISuggestion}>
                        Apply Suggestion
                      </Button>
                    </div>
                  )}
                </div>

                {/* Answer Selection */}
                <div className="space-y-3">
                  <Label>Response</Label>
                  <RadioGroup
                    value={getQuestionResponse(currentQuestion.id)?.answer || ""}
                    onValueChange={(value) =>
                      handleAnswerChange(currentQuestion.id, value)
                    }
                    className="grid grid-cols-4 gap-4"
                  >
                    {[
                      { value: "YES", label: "Yes", icon: CheckCircle2, color: "text-green-500" },
                      { value: "NO", label: "No", icon: XCircle, color: "text-red-500" },
                      { value: "NA", label: "N/A", icon: MinusCircle, color: "text-gray-400" },
                      { value: "NO_ANSWER", label: "Skip", icon: HelpCircle, color: "text-muted-foreground" },
                    ].map((option) => (
                      <div key={option.value}>
                        <RadioGroupItem
                          value={option.value}
                          id={option.value}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={option.value}
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                        >
                          <option.icon className={`h-6 w-6 mb-2 ${option.color}`} />
                          <span className="text-sm font-medium">{option.label}</span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes / Evidence Description</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add notes or describe the evidence supporting your answer..."
                    value={getQuestionResponse(currentQuestion.id)?.notes || ""}
                    onChange={(e) =>
                      handleNotesChange(currentQuestion.id, e.target.value)
                    }
                    rows={4}
                  />
                </div>

                {/* Linked Documents from AI Analysis */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" />
                      <Label>Linked Documents ({linkedDocuments.length})</Label>
                    </div>
                    <Dialog open={addDocDialogOpen} onOpenChange={setAddDocDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={!currentResponse}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Document
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Link Document</DialogTitle>
                          <DialogDescription>
                            Select a document from your organization&apos;s document base
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Select value={selectedDocToAdd} onValueChange={setSelectedDocToAdd}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a document..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableDocuments
                                .filter((d) => !linkedDocuments.some((l) => l.documentId === d.id))
                                .map((doc) => (
                                  <SelectItem key={doc.id} value={doc.id}>
                                    {doc.originalName || doc.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setAddDocDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleAddDocumentLink} disabled={!selectedDocToAdd}>
                            Link Document
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {!currentResponse && (
                    <p className="text-sm text-muted-foreground">
                      Save your response first to link documents
                    </p>
                  )}

                  {linkedDocuments.length > 0 ? (
                    <div className="space-y-2">
                      {linkedDocuments.map((link) => (
                        <div
                          key={link.id}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <span className="text-sm font-medium">
                                {link.document.originalName || link.document.name}
                              </span>
                              {link.relevanceScore && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  ({Math.round(link.relevanceScore * 100)}% relevant)
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveDocumentLink(link.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : currentResponse ? (
                    <p className="text-sm text-muted-foreground">
                      No documents linked yet. Add from your document base or run AI analysis.
                    </p>
                  ) : null}
                </div>

                {/* Evidence Files */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Evidence Files</Label>
                    <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Files
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Upload Evidence</DialogTitle>
                          <DialogDescription>
                            Upload files to support your answer.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="border-2 border-dashed rounded-lg p-8 text-center">
                            <input
                              type="file"
                              multiple
                              onChange={handleFileUpload}
                              className="hidden"
                              id="file-upload"
                              accept=".pdf,.png,.jpg,.jpeg,.gif,.doc,.docx,.xls,.xlsx,.txt"
                            />
                            <label htmlFor="file-upload" className="cursor-pointer">
                              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">
                                Click to upload or drag and drop
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                PDF, Images, Documents (max 50MB)
                              </p>
                            </label>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {uploadedFiles.length > 0 || (currentResponse?.evidences?.length || 0) > 0 ? (
                    <div className="space-y-2">
                      {currentResponse?.evidences?.map((ev) => (
                        <div
                          key={ev.id}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{ev.fileName}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" asChild>
                              <a href={ev.fileUrl} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </div>
                      ))}
                      {uploadedFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{file.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setUploadedFiles((prev) => prev.filter((_, i) => i !== idx))}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No evidence files uploaded yet.
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-between pt-4 border-t">
                  <Button variant="outline" onClick={() => handleSaveResponse()} disabled={saving}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Response
                  </Button>
                  <Button
                    onClick={() => {
                      handleSaveResponse();
                      if (currentQuestionIndex < questions.length - 1) {
                        setCurrentQuestionIndex((i) => i + 1);
                        setAiSuggestion(null);
                      }
                    }}
                    disabled={saving}
                  >
                    Save & Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-96">
              <p className="text-muted-foreground">Select a question to view details</p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
