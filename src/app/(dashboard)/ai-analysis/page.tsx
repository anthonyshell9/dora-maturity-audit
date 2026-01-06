"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Brain,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface Organization {
  id: string;
  name: string;
  _count: { documents: number };
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

interface AISuggestion {
  id: string;
  questionId: string;
  suggestion: string;
  confidence: number;
  reasoning: string;
  sources: {
    documentName: string;
    chunkContent: string;
    relevanceScore: number;
  }[];
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
  const [audits, setAudits] = useState<Audit[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);

  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [selectedAuditId, setSelectedAuditId] = useState<string>("");
  const [selectedChapterId, setSelectedChapterId] = useState<string>("all");

  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

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
    }
  }, [selectedOrgId, fetchAudits]);

  useEffect(() => {
    if (selectedAuditId) {
      setLoading(true);
      fetchSuggestions();
    }
  }, [selectedAuditId, fetchSuggestions]);

  const handleRunAnalysis = async () => {
    if (!selectedAuditId || !selectedOrgId) {
      toast.error("Please select an organization and audit");
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
          chapterId: selectedChapterId !== "all" ? selectedChapterId : undefined,
          limit: 20, // Analyze 20 questions at a time
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Analysis failed");
      }

      const result = await res.json();
      setAnalysisProgress(100);

      toast.success(
        `Analyzed ${result.analyzed} questions (${result.failed} failed)`
      );

      // Refresh suggestions
      fetchSuggestions();
    } catch (error) {
      console.error("Error running analysis:", error);
      toast.error(
        error instanceof Error ? error.message : "Analysis failed"
      );
    } finally {
      setAnalyzing(false);
      setAnalysisProgress(0);
    }
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
        ? "bg-green-100 text-green-700"
        : suggestion === "NO"
        ? "bg-red-100 text-red-700"
        : "bg-yellow-100 text-yellow-700";

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

  const filteredSuggestions =
    selectedChapterId === "all"
      ? suggestions
      : suggestions.filter(
          (s) => s.question.article.chapter.id === parseInt(selectedChapterId)
        );

  const selectedOrg = organizations.find((o) => o.id === selectedOrgId);
  const hasDocuments = (selectedOrg?._count?.documents || 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Analysis</h1>
          <p className="text-muted-foreground">
            Use AI to analyze your documents and suggest DORA compliance answers
          </p>
        </div>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Analysis Configuration
          </CardTitle>
          <CardDescription>
            Select an organization, audit, and optionally a chapter to analyze
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Organization</label>
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Audit</label>
              <Select
                value={selectedAuditId}
                onValueChange={setSelectedAuditId}
                disabled={!selectedOrgId || audits.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      audits.length === 0 ? "No audits found" : "Select audit"
                    }
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Chapter (Optional)</label>
              <Select
                value={selectedChapterId}
                onValueChange={setSelectedChapterId}
              >
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
          </div>

          {!hasDocuments && selectedOrgId && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  No documents uploaded
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Please upload documents first before running AI analysis.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <Button
              onClick={handleRunAnalysis}
              disabled={
                !selectedAuditId || !selectedOrgId || !hasDocuments || analyzing
              }
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run AI Analysis
                </>
              )}
            </Button>

            {analyzing && (
              <div className="flex-1">
                <Progress value={analysisProgress} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Suggestions
            </CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suggestions.length}</div>
            <p className="text-xs text-muted-foreground">AI-generated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Compliant</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {suggestions.filter((s) => s.suggestion === "YES").length}
            </div>
            <p className="text-xs text-muted-foreground">Questions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Non-Compliant</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {suggestions.filter((s) => s.suggestion === "NO").length}
            </div>
            <p className="text-xs text-muted-foreground">Questions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Needs Review
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {
                suggestions.filter(
                  (s) =>
                    s.suggestion === "PARTIAL" ||
                    s.suggestion === "INSUFFICIENT_INFO"
                ).length
              }
            </div>
            <p className="text-xs text-muted-foreground">Questions</p>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>AI Suggestions</CardTitle>
          <CardDescription>
            Review and validate AI-generated compliance suggestions
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
                Run AI analysis to generate compliance suggestions
              </p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="space-y-2">
              {filteredSuggestions.map((suggestion) => (
                <AccordionItem
                  key={suggestion.id}
                  value={suggestion.id}
                  className="border rounded-lg px-4"
                >
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-4 text-left">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">
                            Ch.{suggestion.question.article.chapter.id} Art.
                            {suggestion.question.article.number} -{" "}
                            {suggestion.question.ref}
                          </Badge>
                          {getSuggestionBadge(
                            suggestion.suggestion,
                            suggestion.confidence
                          )}
                        </div>
                        <p className="text-sm">{suggestion.question.text}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-4">
                      <div>
                        <h4 className="font-medium mb-2">AI Reasoning</h4>
                        <p className="text-sm text-muted-foreground">
                          {suggestion.reasoning}
                        </p>
                      </div>

                      {suggestion.sources && suggestion.sources.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Sources</h4>
                          <div className="space-y-2">
                            {suggestion.sources.map((source, idx) => (
                              <div
                                key={idx}
                                className="p-3 bg-muted rounded-lg"
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <FileText className="h-4 w-4" />
                                  <span className="font-medium text-sm">
                                    {source.documentName}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {Math.round(source.relevanceScore * 100)}%
                                    match
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {source.chunkContent}
                                </p>
                              </div>
                            ))}
                          </div>
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
    </div>
  );
}
