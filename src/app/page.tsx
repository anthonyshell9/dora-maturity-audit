import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  ClipboardCheck,
  FileText,
  Building2,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">DORA Audit</span>
          </div>
          <Link href="/dashboard">
            <Button>
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24 text-center">
        <Badge className="mb-4" variant="secondary">
          Digital Operational Resilience Act
        </Badge>
        <h1 className="text-5xl font-bold tracking-tight mb-6">
          DORA Maturity Assessment Tool
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Comprehensive gap analysis and compliance assessment for the EU Digital
          Operational Resilience Act. Evaluate your organization&apos;s ICT risk
          management maturity across all DORA requirements.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/dashboard">
            <Button size="lg">
              Start Assessment
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/audits/new">
            <Button size="lg" variant="outline">
              New Audit
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">
            Complete DORA Compliance Coverage
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Our tool covers all 5 main chapters of DORA with 336 detailed assessment
            questions based on official regulatory requirements.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <ClipboardCheck className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Chapter 2: ICT Risk Management</CardTitle>
              <CardDescription>163 Questions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Governance, ICT risk management framework, business continuity,
                backup policies, learning and evolving, and communication policies.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Chapter 3: Incident Management</CardTitle>
              <CardDescription>28 Questions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                ICT-related incident management process, classification, reporting
                to competent authorities, and notification requirements.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CheckCircle2 className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Chapter 4: Resilience Testing</CardTitle>
              <CardDescription>33 Questions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Digital operational resilience testing program, threat-led
                penetration testing (TLPT), and testing requirements.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Building2 className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Chapter 5: Third-Party Risk</CardTitle>
              <CardDescription>75 Questions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Managing ICT third-party risk, contractual arrangements, register
                of information, and critical third-party providers.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <FileText className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Chapter 6: Information Sharing</CardTitle>
              <CardDescription>37 Questions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Information-sharing arrangements on cyber threat information and
                intelligence among financial entities.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-primary text-primary-foreground">
            <CardHeader>
              <CardTitle className="text-primary-foreground">
                Ready to Start?
              </CardTitle>
              <CardDescription className="text-primary-foreground/80">
                Begin your DORA assessment today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/audits/new">
                <Button variant="secondary" className="w-full">
                  Create New Audit
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Key Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "336 Questions",
              description: "Comprehensive coverage of all DORA requirements",
            },
            {
              title: "Evidence Upload",
              description: "Attach supporting documents to each response",
            },
            {
              title: "Export Reports",
              description: "Generate PDF, Excel, and CSV reports",
            },
            {
              title: "Track Progress",
              description: "Monitor compliance progress in real-time",
            },
          ].map((feature, idx) => (
            <div key={idx} className="text-center">
              <h3 className="text-2xl font-bold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>DORA Maturity Audit Tool - Digital Operational Resilience Assessment</p>
          <p className="mt-2">
            Based on Regulation (EU) 2022/2554 - Digital Operational Resilience Act
          </p>
        </div>
      </footer>
    </div>
  );
}
