"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";

const ORGANIZATION_TYPES = [
  { value: "MICROENTERPRISE", label: "Microenterprise" },
  { value: "DATA_REPORTING_SERVICE_PROVIDER", label: "Data Reporting Service Provider" },
  { value: "CENTRAL_SECURITIES_DEPOSITORY", label: "Central Securities Depository" },
  { value: "CENTRAL_COUNTERPARTY", label: "Central Counterparty" },
  { value: "PAYMENT_INSTITUTION_EXEMPTED", label: "Payment Institution (Exempted - Directive 2015/2366)" },
  { value: "INSTITUTION_EXEMPTED_2013_36", label: "Institution (Exempted - Directive 2013/36/EU)" },
  { value: "ELECTRONIC_MONEY_INSTITUTION_EXEMPTED", label: "Electronic Money Institution (Exempted)" },
  { value: "SMALL_OCCUPATIONAL_RETIREMENT", label: "Small Occupational Retirement Institution" },
  { value: "SMALL_INTERCONNECTED_INVESTMENT", label: "Small Interconnected Investment Firm" },
  { value: "SIGNIFICANT_CREDIT_INSTITUTION", label: "Significant Credit Institution" },
  { value: "STANDARD", label: "Standard Financial Entity" },
];

const APPLICABILITY_CRITERIA = [
  { key: "microenterprise", label: "Microenterprise", description: "Organization qualifies as a microenterprise" },
  { key: "dataReportingServiceProvider", label: "Data Reporting Service Provider", description: "Provides data reporting services" },
  { key: "centralSecuritiesDepository", label: "Central Securities Depository", description: "Operates as a CSD" },
  { key: "centralCounterparty", label: "Central Counterparty", description: "Operates as a CCP" },
  { key: "paymentInstitutionExempted", label: "Payment Institution (Exempted)", description: "Exempted under Directive 2015/2366" },
  { key: "institutionExempted201336", label: "Institution (Exempted)", description: "Exempted under Directive 2013/36/EU" },
  { key: "electronicMoneyInstitutionExempted", label: "E-Money Institution (Exempted)", description: "Exempted under Directive 2009/110/EC" },
  { key: "smallOccupationalRetirement", label: "Small Occupational Retirement", description: "Small retirement provision institution" },
  { key: "smallInterconnectedInvestment", label: "Small Investment Firm", description: "Small and interconnected investment firm" },
  { key: "significantCreditInstitution", label: "Significant Credit Institution", description: "Classified under Regulation 1024/2013" },
];

type ApplicabilityKey =
  | 'microenterprise'
  | 'dataReportingServiceProvider'
  | 'centralSecuritiesDepository'
  | 'centralCounterparty'
  | 'paymentInstitutionExempted'
  | 'institutionExempted201336'
  | 'electronicMoneyInstitutionExempted'
  | 'smallOccupationalRetirement'
  | 'smallInterconnectedInvestment'
  | 'significantCreditInstitution';

interface ApplicabilityState {
  [key: string]: boolean;
  microenterprise: boolean;
  dataReportingServiceProvider: boolean;
  centralSecuritiesDepository: boolean;
  centralCounterparty: boolean;
  paymentInstitutionExempted: boolean;
  institutionExempted201336: boolean;
  electronicMoneyInstitutionExempted: boolean;
  smallOccupationalRetirement: boolean;
  smallInterconnectedInvestment: boolean;
  significantCreditInstitution: boolean;
}

export default function NewAuditPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<{
    name: string;
    organizationId: string;
    newOrganizationName: string;
    organizationType: string;
    applicability: ApplicabilityState;
  }>({
    name: "",
    organizationId: "",
    newOrganizationName: "",
    organizationType: "STANDARD",
    applicability: {
      microenterprise: false,
      dataReportingServiceProvider: false,
      centralSecuritiesDepository: false,
      centralCounterparty: false,
      paymentInstitutionExempted: false,
      institutionExempted201336: false,
      electronicMoneyInstitutionExempted: false,
      smallOccupationalRetirement: false,
      smallInterconnectedInvestment: false,
      significantCreditInstitution: false,
    },
  });

  // Mock organizations - will be replaced with API call
  const organizations = [
    { id: "1", name: "Acme Financial Services" },
    { id: "2", name: "Beta Bank" },
  ];

  const handleApplicabilityChange = (key: ApplicabilityKey, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      applicability: {
        ...prev.applicability,
        [key]: checked,
      },
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // API call would go here
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Audit created successfully!");
      router.push("/audits/1"); // Would use actual audit ID
    } catch {
      toast.error("Failed to create audit");
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (step === 1) {
      return formData.name && (formData.organizationId || formData.newOrganizationName);
    }
    return true;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New DORA Audit</h1>
          <p className="text-muted-foreground">
            Create a new Digital Operational Resilience assessment
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                s < step
                  ? "bg-primary text-primary-foreground"
                  : s === step
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {s < step ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < 3 && (
              <div
                className={`w-16 h-1 mx-2 ${
                  s < step ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Enter the audit name and select or create an organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Audit Name</Label>
              <Input
                id="name"
                placeholder="e.g., Q1 2025 DORA Assessment"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Organization</Label>
              <Select
                value={formData.organizationId}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    organizationId: value,
                    newOrganizationName: value === "new" ? prev.newOrganizationName : "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="new">+ Create new organization</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.organizationId === "new" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="newOrg">New Organization Name</Label>
                  <Input
                    id="newOrg"
                    placeholder="Organization name"
                    value={formData.newOrganizationName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        newOrganizationName: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Organization Type</Label>
                  <Select
                    value={formData.organizationType}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        organizationType: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORGANIZATION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Applicability Criteria */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Applicability Criteria</CardTitle>
            <CardDescription>
              Select criteria that apply to your organization. These affect which DORA
              requirements are applicable.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {APPLICABILITY_CRITERIA.map((criteria) => (
                <div
                  key={criteria.key}
                  className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50"
                >
                  <Checkbox
                    id={criteria.key}
                    checked={formData.applicability[criteria.key]}
                    onCheckedChange={(checked) =>
                      handleApplicabilityChange(criteria.key as ApplicabilityKey, checked as boolean)
                    }
                  />
                  <div className="space-y-1">
                    <Label htmlFor={criteria.key} className="cursor-pointer">
                      {criteria.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {criteria.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Confirmation */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Confirm</CardTitle>
            <CardDescription>
              Review your audit configuration before creating
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Audit Details</h4>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Name:</span>{" "}
                    {formData.name}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Organization:</span>{" "}
                    {formData.organizationId === "new"
                      ? formData.newOrganizationName
                      : organizations.find((o) => o.id === formData.organizationId)
                          ?.name}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Applicability Criteria</h4>
                <div className="space-y-1 text-sm">
                  {Object.entries(formData.applicability).some(([, v]) => v) ? (
                    Object.entries(formData.applicability)
                      .filter(([, v]) => v)
                      .map(([k]) => {
                        const criteria = APPLICABILITY_CRITERIA.find(
                          (c) => c.key === k
                        );
                        return (
                          <p key={k} className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500" />
                            {criteria?.label}
                          </p>
                        );
                      })
                  ) : (
                    <p className="text-muted-foreground">
                      No special criteria selected (Standard assessment)
                    </p>
                  )}
                </div>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <h4 className="font-medium mb-2">Assessment Scope</h4>
                <p className="text-sm text-muted-foreground">
                  This audit will include 336 questions across 5 DORA chapters.
                  Questions will be filtered based on your applicability criteria.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        {step < 3 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating..." : "Create Audit"}
            <Check className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
