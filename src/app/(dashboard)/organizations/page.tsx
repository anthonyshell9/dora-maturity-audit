"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Building2, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

const ORGANIZATION_TYPES = [
  { value: "MICROENTERPRISE", label: "Microenterprise" },
  { value: "DATA_REPORTING_SERVICE_PROVIDER", label: "Data Reporting Service Provider" },
  { value: "CENTRAL_SECURITIES_DEPOSITORY", label: "Central Securities Depository" },
  { value: "CENTRAL_COUNTERPARTY", label: "Central Counterparty" },
  { value: "PAYMENT_INSTITUTION_EXEMPTED", label: "Payment Institution (Exempted)" },
  { value: "INSTITUTION_EXEMPTED_2013_36", label: "Institution (Exempted - 2013/36/EU)" },
  { value: "ELECTRONIC_MONEY_INSTITUTION_EXEMPTED", label: "E-Money Institution (Exempted)" },
  { value: "SMALL_OCCUPATIONAL_RETIREMENT", label: "Small Occupational Retirement" },
  { value: "SMALL_INTERCONNECTED_INVESTMENT", label: "Small Investment Firm" },
  { value: "SIGNIFICANT_CREDIT_INSTITUTION", label: "Significant Credit Institution" },
  { value: "STANDARD", label: "Standard Financial Entity" },
];

interface Organization {
  id: string;
  name: string;
  type: string;
  description?: string;
  _count: { audits: number };
  createdAt: string;
}

export default function OrganizationsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "STANDARD",
    description: "",
  });

  // Mock data
  const organizations: Organization[] = [
    {
      id: "1",
      name: "Acme Financial Services",
      type: "STANDARD",
      description: "Leading financial services provider",
      _count: { audits: 2 },
      createdAt: "2024-01-01",
    },
    {
      id: "2",
      name: "Beta Bank",
      type: "SIGNIFICANT_CREDIT_INSTITUTION",
      description: "Major European bank",
      _count: { audits: 1 },
      createdAt: "2024-01-04",
    },
  ];

  const filteredOrganizations = organizations.filter((org) =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async () => {
    // API call would go here
    toast.success("Organization created successfully");
    setDialogOpen(false);
    setFormData({ name: "", type: "STANDARD", description: "" });
  };

  const getTypeLabel = (type: string) => {
    return ORGANIZATION_TYPES.find((t) => t.value === type)?.label || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Organizations</h1>
          <p className="text-muted-foreground">
            Manage organizations being audited for DORA compliance
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Organization
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Organization</DialogTitle>
              <DialogDescription>
                Enter the details for the new organization
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  placeholder="Enter organization name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Organization Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, type: value }))
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
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the organization"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!formData.name}>
                Create Organization
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Organizations</CardTitle>
              <CardDescription>
                {filteredOrganizations.length} organization(s) registered
              </CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Audits</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrganizations.map((org) => (
                <TableRow key={org.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{org.name}</p>
                        {org.description && (
                          <p className="text-sm text-muted-foreground">
                            {org.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{getTypeLabel(org.type)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/audits?organizationId=${org.id}`}
                      className="text-primary hover:underline"
                    >
                      {org._count.audits} audit(s)
                    </Link>
                  </TableCell>
                  <TableCell>
                    {new Date(org.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
