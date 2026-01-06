"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Building2, Edit, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const ORGANIZATION_TYPES = [
  { value: "CREDIT_INSTITUTION", label: "Credit Institution (Bank)" },
  { value: "PAYMENT_INSTITUTION", label: "Payment Institution" },
  { value: "ELECTRONIC_MONEY_INSTITUTION", label: "Electronic Money Institution" },
  { value: "INVESTMENT_FIRM", label: "Investment Firm" },
  { value: "CRYPTO_ASSET_SERVICE_PROVIDER", label: "Crypto-Asset Service Provider" },
  { value: "INSURANCE_UNDERTAKING", label: "Insurance Undertaking" },
  { value: "REINSURANCE_UNDERTAKING", label: "Reinsurance Undertaking" },
  { value: "PENSION_FUND", label: "Pension Fund (IORP)" },
  { value: "UCITS_MANAGEMENT_COMPANY", label: "UCITS Management Company" },
  { value: "AIFM", label: "Alternative Investment Fund Manager (AIFM)" },
  { value: "DATA_REPORTING_SERVICE_PROVIDER", label: "Data Reporting Service Provider" },
  { value: "CENTRAL_SECURITIES_DEPOSITORY", label: "Central Securities Depository" },
  { value: "CENTRAL_COUNTERPARTY", label: "Central Counterparty" },
  { value: "TRADING_VENUE", label: "Trading Venue" },
  { value: "CREDIT_RATING_AGENCY", label: "Credit Rating Agency" },
  { value: "CROWDFUNDING_SERVICE_PROVIDER", label: "Crowdfunding Service Provider" },
  { value: "SECURITISATION_REPOSITORY", label: "Securitisation Repository" },
  { value: "ICT_THIRD_PARTY_SERVICE_PROVIDER", label: "ICT Third-Party Service Provider" },
  { value: "OTHER", label: "Other Financial Entity" },
];

interface Organization {
  id: string;
  name: string;
  type: string;
  description?: string;
  _count: { audits: number; users: number };
  createdAt: string;
}

export default function OrganizationsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    type: "CREDIT_INSTITUTION",
    description: "",
  });

  const fetchOrganizations = useCallback(async () => {
    try {
      const res = await fetch("/api/organizations");
      if (!res.ok) throw new Error("Failed to fetch organizations");
      const data = await res.json();
      setOrganizations(data);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      toast.error("Failed to load organizations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const filteredOrganizations = organizations.filter((org) =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error("Organization name is required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          type: formData.type,
          description: formData.description.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create organization");
      }

      toast.success("Organization created successfully");
      setDialogOpen(false);
      setFormData({ name: "", type: "CREDIT_INSTITUTION", description: "" });
      fetchOrganizations();
    } catch (error) {
      console.error("Error creating organization:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create organization");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedOrg || !formData.name.trim()) {
      toast.error("Organization name is required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/organizations/${selectedOrg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          type: formData.type,
          description: formData.description.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update organization");
      }

      toast.success("Organization updated successfully");
      setEditDialogOpen(false);
      setSelectedOrg(null);
      setFormData({ name: "", type: "CREDIT_INSTITUTION", description: "" });
      fetchOrganizations();
    } catch (error) {
      console.error("Error updating organization:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update organization");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedOrg) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/organizations/${selectedOrg.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete organization");
      }

      toast.success("Organization deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedOrg(null);
      fetchOrganizations();
    } catch (error) {
      console.error("Error deleting organization:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete organization");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (org: Organization) => {
    setSelectedOrg(org);
    setFormData({
      name: org.name,
      type: org.type,
      description: org.description || "",
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (org: Organization) => {
    setSelectedOrg(org);
    setDeleteDialogOpen(true);
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
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!formData.name || submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Organization
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>
              Update the organization details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Organization Name</Label>
              <Input
                id="edit-name"
                placeholder="Enter organization name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-type">Organization Type</Label>
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
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
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
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={!formData.name || submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Organization</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedOrg?.name}&quot;? This action cannot be undone
              and will also delete all associated audits.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-red-500 hover:bg-red-600"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredOrganizations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "No organizations match your search" : "No organizations yet. Create one to get started."}
            </div>
          ) : (
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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(org)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(org)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
