"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Search, FileText, Download, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Audit {
  id: string;
  name: string;
  organization: { id: string; name: string };
  status: "IN_PROGRESS" | "COMPLETED" | "ARCHIVED";
  _count: { responses: number };
  startedAt: string;
  completedAt?: string;
}

export default function AuditsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(336);

  const fetchAudits = useCallback(async () => {
    try {
      const res = await fetch("/api/audits");
      if (!res.ok) throw new Error("Failed to fetch audits");
      const data = await res.json();
      setAudits(data);
    } catch (error) {
      console.error("Error fetching audits:", error);
      toast.error("Failed to load audits");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchQuestionCount = useCallback(async () => {
    try {
      const res = await fetch("/api/questions/chapters");
      if (!res.ok) return;
      const chapters = await res.json();
      const total = chapters.reduce((sum: number, ch: { _count: { questions: number } }) => sum + ch._count.questions, 0);
      if (total > 0) setTotalQuestions(total);
    } catch (error) {
      console.error("Error fetching question count:", error);
    }
  }, []);

  useEffect(() => {
    fetchAudits();
    fetchQuestionCount();
  }, [fetchAudits, fetchQuestionCount]);

  const handleDelete = async () => {
    if (!selectedAudit) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/audits/${selectedAudit.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete audit");
      }

      toast.success("Audit deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedAudit(null);
      fetchAudits();
    } catch (error) {
      console.error("Error deleting audit:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete audit");
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteDialog = (audit: Audit) => {
    setSelectedAudit(audit);
    setDeleteDialogOpen(true);
  };

  const filteredAudits = audits.filter((audit) => {
    const matchesSearch =
      audit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      audit.organization.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || audit.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="secondary">In Progress</Badge>;
      case "ARCHIVED":
        return <Badge variant="outline">Archived</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getProgress = (responsesCount: number) => {
    return Math.round((responsesCount / totalQuestions) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audits</h1>
          <p className="text-muted-foreground">
            Manage your DORA maturity assessments
          </p>
        </div>
        <Link href="/audits/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Audit
          </Button>
        </Link>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Audit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedAudit?.name}&quot;? This action cannot be undone
              and will also delete all responses and reports associated with this audit.
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Audits</CardTitle>
              <CardDescription>
                {filteredAudits.length} audit(s) found
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search audits..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAudits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery || statusFilter !== "all"
                ? "No audits match your filters"
                : "No audits yet. Create one to get started."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAudits.map((audit) => {
                  const progress = getProgress(audit._count.responses);
                  return (
                    <TableRow key={audit.id}>
                      <TableCell>
                        <Link
                          href={`/audits/${audit.id}`}
                          className="font-medium hover:underline"
                        >
                          {audit.name}
                        </Link>
                      </TableCell>
                      <TableCell>{audit.organization.name}</TableCell>
                      <TableCell>{getStatusBadge(audit.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={progress} className="w-20 h-2" />
                          <span className="text-sm text-muted-foreground">
                            {progress}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(audit.startedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/audits/${audit.id}`}>
                            <Button variant="outline" size="sm">
                              <FileText className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </Link>
                          {audit.status === "COMPLETED" && (
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4 mr-1" />
                              Report
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(audit)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
