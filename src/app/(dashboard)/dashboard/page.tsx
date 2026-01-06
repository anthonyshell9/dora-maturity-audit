"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  ClipboardList,
  Building2,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
} from "lucide-react";

export default function DashboardPage() {
  // Mock data - will be replaced with real API calls
  const stats = {
    totalAudits: 3,
    completedAudits: 1,
    inProgressAudits: 2,
    totalOrganizations: 2,
  };

  const recentAudits = [
    {
      id: "1",
      name: "Q4 2024 DORA Assessment",
      organization: "Acme Financial Services",
      status: "IN_PROGRESS",
      progress: 65,
      lastUpdated: "2024-01-05",
    },
    {
      id: "2",
      name: "Initial Gap Analysis",
      organization: "Beta Bank",
      status: "IN_PROGRESS",
      progress: 32,
      lastUpdated: "2024-01-04",
    },
    {
      id: "3",
      name: "Annual Compliance Review",
      organization: "Acme Financial Services",
      status: "COMPLETED",
      progress: 100,
      lastUpdated: "2024-01-01",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to the DORA Maturity Audit Tool
          </p>
        </div>
        <Link href="/audits/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Audit
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Audits</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAudits}</div>
            <p className="text-xs text-muted-foreground">
              Across all organizations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgressAudits}</div>
            <p className="text-xs text-muted-foreground">
              Active assessments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedAudits}</div>
            <p className="text-xs text-muted-foreground">
              Finalized audits
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrganizations}</div>
            <p className="text-xs text-muted-foreground">
              Being audited
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Audits */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Audits</CardTitle>
              <CardDescription>Your latest DORA assessments</CardDescription>
            </div>
            <Link href="/audits">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentAudits.map((audit) => (
              <div
                key={audit.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/audits/${audit.id}`}
                      className="font-medium hover:underline"
                    >
                      {audit.name}
                    </Link>
                    <Badge
                      variant={
                        audit.status === "COMPLETED" ? "default" : "secondary"
                      }
                    >
                      {audit.status === "COMPLETED" ? "Completed" : "In Progress"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {audit.organization}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-32">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{audit.progress}%</span>
                    </div>
                    <Progress value={audit.progress} className="h-2" />
                  </div>
                  <Link href={`/audits/${audit.id}`}>
                    <Button variant="outline" size="sm">
                      Continue
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/audits/new" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="h-4 w-4 mr-2" />
                Start New Audit
              </Button>
            </Link>
            <Link href="/organizations/new" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Building2 className="h-4 w-4 mr-2" />
                Add Organization
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>DORA Compliance Overview</CardTitle>
            <CardDescription>Key regulation chapters</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Chapter 2: ICT Risk Management</span>
                <span className="text-muted-foreground">163 questions</span>
              </div>
              <div className="flex justify-between">
                <span>Chapter 3: Incident Management</span>
                <span className="text-muted-foreground">28 questions</span>
              </div>
              <div className="flex justify-between">
                <span>Chapter 4: Resilience Testing</span>
                <span className="text-muted-foreground">33 questions</span>
              </div>
              <div className="flex justify-between">
                <span>Chapter 5: Third-Party Risk</span>
                <span className="text-muted-foreground">75 questions</span>
              </div>
              <div className="flex justify-between">
                <span>Chapter 6: Information Sharing</span>
                <span className="text-muted-foreground">37 questions</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
