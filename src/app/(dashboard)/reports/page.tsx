"use client";

import { useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, FileText, FileSpreadsheet, File } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";

export default function ReportsPage() {
  const [selectedAudit, setSelectedAudit] = useState<string>("");

  // Mock data
  const audits = [
    { id: "1", name: "Q4 2024 DORA Assessment - Acme Financial Services" },
    { id: "2", name: "Initial Gap Analysis - Beta Bank" },
    { id: "3", name: "Annual Compliance Review - Acme Financial Services" },
  ];

  const complianceData = [
    { name: "Compliant", value: 245, color: "#22c55e" },
    { name: "Non-Compliant", value: 45, color: "#ef4444" },
    { name: "Not Applicable", value: 30, color: "#9ca3af" },
    { name: "Not Answered", value: 16, color: "#f59e0b" },
  ];

  const chapterData = [
    { chapter: "Ch. 2", compliant: 140, nonCompliant: 20, na: 3, total: 163 },
    { chapter: "Ch. 3", compliant: 25, nonCompliant: 2, na: 1, total: 28 },
    { chapter: "Ch. 4", compliant: 28, nonCompliant: 4, na: 1, total: 33 },
    { chapter: "Ch. 5", compliant: 40, nonCompliant: 15, na: 20, total: 75 },
    { chapter: "Ch. 6", compliant: 12, nonCompliant: 4, na: 5, total: 37 },
  ];

  const handleExport = async (format: "pdf" | "excel" | "csv") => {
    if (!selectedAudit) {
      toast.error("Please select an audit first");
      return;
    }
    toast.success(`Generating ${format.toUpperCase()} report...`);
    // API call would go here: /api/audits/${selectedAudit}/report?format=${format}
  };

  const overallCompliance = Math.round(
    (complianceData[0].value / (complianceData[0].value + complianceData[1].value)) * 100
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            Generate and export DORA compliance reports
          </p>
        </div>
      </div>

      {/* Audit Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Audit</CardTitle>
          <CardDescription>
            Choose an audit to view its compliance report
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select value={selectedAudit} onValueChange={setSelectedAudit}>
              <SelectTrigger className="w-96">
                <SelectValue placeholder="Select an audit..." />
              </SelectTrigger>
              <SelectContent>
                {audits.map((audit) => (
                  <SelectItem key={audit.id} value={audit.id}>
                    {audit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => handleExport("pdf")}
                disabled={!selectedAudit}
              >
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport("excel")}
                disabled={!selectedAudit}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport("csv")}
                disabled={!selectedAudit}
              >
                <File className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedAudit && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Overall Compliance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-500">
                  {overallCompliance}%
                </div>
                <Progress value={overallCompliance} className="h-2 mt-2" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Compliant
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-500">
                  {complianceData[0].value}
                </div>
                <p className="text-sm text-muted-foreground">questions</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Non-Compliant
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-500">
                  {complianceData[1].value}
                </div>
                <p className="text-sm text-muted-foreground">gaps identified</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {Math.round(
                    ((complianceData[0].value +
                      complianceData[1].value +
                      complianceData[2].value) /
                      336) *
                      100
                  )}
                  %
                </div>
                <p className="text-sm text-muted-foreground">completed</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Compliance Distribution</CardTitle>
                <CardDescription>
                  Breakdown of responses across all questions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={complianceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                      >
                        {complianceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Compliance by Chapter</CardTitle>
                <CardDescription>
                  Breakdown of compliance per DORA chapter
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chapterData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="chapter" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="compliant" name="Compliant" fill="#22c55e" />
                      <Bar dataKey="nonCompliant" name="Non-Compliant" fill="#ef4444" />
                      <Bar dataKey="na" name="N/A" fill="#9ca3af" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chapter Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Chapter Details</CardTitle>
              <CardDescription>
                Detailed compliance statistics per chapter
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chapter</TableHead>
                    <TableHead>Total Questions</TableHead>
                    <TableHead>Compliant</TableHead>
                    <TableHead>Non-Compliant</TableHead>
                    <TableHead>N/A</TableHead>
                    <TableHead>Compliance Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chapterData.map((chapter) => {
                    const applicable = chapter.compliant + chapter.nonCompliant;
                    const rate = applicable > 0
                      ? Math.round((chapter.compliant / applicable) * 100)
                      : 0;
                    return (
                      <TableRow key={chapter.chapter}>
                        <TableCell className="font-medium">
                          {chapter.chapter}
                        </TableCell>
                        <TableCell>{chapter.total}</TableCell>
                        <TableCell>
                          <Badge className="bg-green-500">
                            {chapter.compliant}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">
                            {chapter.nonCompliant}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{chapter.na}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={rate} className="w-20 h-2" />
                            <span className="text-sm font-medium">{rate}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle>Export Report</CardTitle>
              <CardDescription>
                Download the complete audit report in your preferred format
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <Button
                  variant="outline"
                  className="h-24 flex-col"
                  onClick={() => handleExport("pdf")}
                >
                  <FileText className="h-8 w-8 mb-2 text-red-500" />
                  <span>PDF Report</span>
                  <span className="text-xs text-muted-foreground">
                    Full formatted report
                  </span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex-col"
                  onClick={() => handleExport("excel")}
                >
                  <FileSpreadsheet className="h-8 w-8 mb-2 text-green-500" />
                  <span>Excel Export</span>
                  <span className="text-xs text-muted-foreground">
                    Detailed spreadsheet
                  </span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex-col"
                  onClick={() => handleExport("csv")}
                >
                  <Download className="h-8 w-8 mb-2 text-blue-500" />
                  <span>CSV Data</span>
                  <span className="text-xs text-muted-foreground">
                    Raw data export
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
