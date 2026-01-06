"use client";

import { useState, use } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
} from "lucide-react";
import { toast } from "sonner";

interface Question {
  id: string;
  ref: string;
  text: string;
  chapter: number;
  chapterTitle: string;
  articleNumber: number;
  articleTitle: string;
  response?: {
    answer: "YES" | "NO" | "NA" | "NO_ANSWER";
    notes: string | null;
    evidences: { id: string; fileName: string; fileUrl: string }[];
  };
}

interface ChapterData {
  chapter: number;
  title: string;
  questions: Question[];
}

// Mock data structure
const MOCK_CHAPTERS: ChapterData[] = [
  {
    chapter: 2,
    title: "ICT Risk Management",
    questions: [
      {
        id: "q1",
        ref: "1.1",
        text: "Do you have an internal governance and control framework to manage ICT risks?",
        chapter: 2,
        chapterTitle: "ICT Risk Management",
        articleNumber: 5,
        articleTitle: "Governance and organisation",
        response: { answer: "YES", notes: "Full ISMS implemented", evidences: [{ id: "e1", fileName: "ISMS_Policy.pdf", fileUrl: "#" }] },
      },
      {
        id: "q2",
        ref: "1.2",
        text: "Does your management body oversee the internal governance and control framework?",
        chapter: 2,
        chapterTitle: "ICT Risk Management",
        articleNumber: 5,
        articleTitle: "Governance and organisation",
        response: { answer: "YES", notes: null, evidences: [] },
      },
      {
        id: "q3",
        ref: "2.1",
        text: "Do you have policies addressing the availability, authenticity, integrity and confidentiality of data?",
        chapter: 2,
        chapterTitle: "ICT Risk Management",
        articleNumber: 5,
        articleTitle: "Governance and organisation",
      },
      {
        id: "q4",
        ref: "2.2",
        text: "Have these policies been implemented and tested to ensure they are effective and sufficient in scope?",
        chapter: 2,
        chapterTitle: "ICT Risk Management",
        articleNumber: 5,
        articleTitle: "Governance and organisation",
      },
    ],
  },
  {
    chapter: 3,
    title: "ICT-Related Incident Management",
    questions: [
      {
        id: "q5",
        ref: "1.1",
        text: "Have you established an ICT-related incident management process to detect, manage and notify those appropriate of ICT-related incidents?",
        chapter: 3,
        chapterTitle: "ICT-Related Incident Management",
        articleNumber: 17,
        articleTitle: "ICT-related incident management process",
      },
    ],
  },
];

export default function AuditDetailPage({
  params,
}: {
  params: Promise<{ auditId: string }>;
}) {
  const { auditId } = use(params);
  const [activeChapter, setActiveChapter] = useState(2);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, { answer: string; notes: string }>>({});
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  // Mock audit data
  const audit = {
    id: auditId,
    name: "Q4 2024 DORA Assessment",
    organization: { name: "Acme Financial Services" },
    status: "IN_PROGRESS",
    progress: 65,
  };

  const currentChapter = MOCK_CHAPTERS.find((c) => c.chapter === activeChapter);
  const questions = currentChapter?.questions || [];
  const currentQuestion = questions[currentQuestionIndex];

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
    setResponses((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], answer, notes: prev[questionId]?.notes || "" },
    }));
  };

  const handleNotesChange = (questionId: string, notes: string) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], notes, answer: prev[questionId]?.answer || "" },
    }));
  };

  const handleSaveResponse = async () => {
    if (!currentQuestion) return;
    toast.success("Response saved");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    toast.success(`${files.length} file(s) uploaded`);
    setUploadDialogOpen(false);
  };

  const getQuestionResponse = (q: Question) => {
    return responses[q.id] || (q.response ? { answer: q.response.answer, notes: q.response.notes || "" } : null);
  };

  // Calculate chapter progress
  const chapterProgress = MOCK_CHAPTERS.map((chapter) => {
    const answered = chapter.questions.filter(
      (q) => q.response?.answer || responses[q.id]?.answer
    ).length;
    return {
      chapter: chapter.chapter,
      title: chapter.title,
      total: chapter.questions.length,
      answered,
      percentage: Math.round((answered / chapter.questions.length) * 100),
    };
  });

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
              <Badge variant="secondary">In Progress</Badge>
            </div>
            <p className="text-muted-foreground">{audit.organization.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button>
            <Save className="h-4 w-4 mr-2" />
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
            <CardDescription>{currentChapter?.title}</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-2">
                {questions.map((q, idx) => {
                  const response = getQuestionResponse(q);
                  return (
                    <div
                      key={q.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        currentQuestionIndex === idx
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => setCurrentQuestionIndex(idx)}
                    >
                      <div className="flex items-start gap-2">
                        {currentQuestionIndex !== idx && getAnswerIcon(response?.answer)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {q.ref}. {q.text.substring(0, 50)}...
                          </p>
                          <p
                            className={`text-xs ${
                              currentQuestionIndex === idx
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground"
                            }`}
                          >
                            Article {q.articleNumber}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
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
                      Article {currentQuestion.articleNumber}: {currentQuestion.articleTitle}
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
                      onClick={() => setCurrentQuestionIndex((i) => i - 1)}
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
                      onClick={() => setCurrentQuestionIndex((i) => i + 1)}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Answer Selection */}
                <div className="space-y-3">
                  <Label>Response</Label>
                  <RadioGroup
                    value={getQuestionResponse(currentQuestion)?.answer || ""}
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
                    value={getQuestionResponse(currentQuestion)?.notes || ""}
                    onChange={(e) =>
                      handleNotesChange(currentQuestion.id, e.target.value)
                    }
                    rows={4}
                  />
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
                            Upload files to support your answer. Accepted formats: PDF,
                            images, documents, spreadsheets.
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
                              accept=".pdf,.png,.jpg,.jpeg,.gif,.doc,.docx,.xls,.xlsx,.txt,.zip"
                            />
                            <label htmlFor="file-upload" className="cursor-pointer">
                              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">
                                Click to upload or drag and drop
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Max 10MB per file
                              </p>
                            </label>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* Existing evidence files */}
                  {currentQuestion.response?.evidences?.length ? (
                    <div className="space-y-2">
                      {currentQuestion.response.evidences.map((evidence) => (
                        <div
                          key={evidence.id}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{evidence.fileName}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No evidence files uploaded yet
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-between pt-4 border-t">
                  <Button variant="outline" onClick={handleSaveResponse}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Response
                  </Button>
                  <Button
                    onClick={() => {
                      handleSaveResponse();
                      if (currentQuestionIndex < questions.length - 1) {
                        setCurrentQuestionIndex((i) => i + 1);
                      }
                    }}
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
