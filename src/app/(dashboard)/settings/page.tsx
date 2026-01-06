"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Bell, Shield, Database, Loader2, Save, Eye, EyeOff, Key } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeySet, setApiKeySet] = useState(false);
  const [settings, setSettings] = useState({
    // Profile settings
    name: "Admin User",
    email: "admin@company.com",
    // Notification settings
    emailNotifications: true,
    auditReminders: true,
    weeklyReports: false,
    // AI settings
    aiProvider: "anthropic",
    aiModel: "claude-sonnet-4-20250514",
    anthropicApiKey: "",
    autoSuggestAnswers: true,
    confidenceThreshold: "0.7",
  });

  // Fetch existing settings on mount
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) return;
      const data = await res.json();

      // Find the Anthropic API key setting
      const apiKeySetting = data.find((s: { key: string; isSet?: boolean }) => s.key === "anthropic_api_key");
      if (apiKeySetting?.isSet) {
        setApiKeySet(true);
        setSettings(prev => ({
          ...prev,
          anthropicApiKey: apiKeySetting.value, // This will be masked
        }));
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSaveAI = async () => {
    setSaving(true);
    try {
      // Save the API key
      if (settings.anthropicApiKey && !settings.anthropicApiKey.startsWith("********")) {
        const res = await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: "anthropic_api_key",
            value: settings.anthropicApiKey,
          }),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to save API key");
        }

        setApiKeySet(true);
        // Mask the key after saving
        setSettings(prev => ({
          ...prev,
          anthropicApiKey: "********" + settings.anthropicApiKey.slice(-4),
        }));
      }

      toast.success("AI settings saved successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call for other settings (profile, notifications)
    await new Promise((resolve) => setTimeout(resolve, 500));
    toast.success("Settings saved successfully");
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and application preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Database className="h-4 w-4" />
            AI Configuration
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your account information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={settings.name}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.email}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>
              <Separator className="my-4" />
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to be notified
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email updates about your audits
                  </p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({
                      ...prev,
                      emailNotifications: checked,
                    }))
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Audit Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Get reminded about pending audit questions
                  </p>
                </div>
                <Switch
                  checked={settings.auditReminders}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({
                      ...prev,
                      auditReminders: checked,
                    }))
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Weekly Reports</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive weekly compliance summary reports
                  </p>
                </div>
                <Switch
                  checked={settings.weeklyReports}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({
                      ...prev,
                      weeklyReports: checked,
                    }))
                  }
                />
              </div>
              <Separator className="my-4" />
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle>AI Configuration</CardTitle>
              <CardDescription>
                Configure AI-powered document analysis and answer suggestions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="ai-provider">AI Provider</Label>
                <Select
                  value={settings.aiProvider}
                  onValueChange={(value) =>
                    setSettings((prev) => ({ ...prev, aiProvider: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anthropic">Anthropic Claude (Recommended)</SelectItem>
                    <SelectItem value="azure-openai">Azure OpenAI</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {settings.aiProvider === "anthropic" && (
                <div className="space-y-2">
                  <Label htmlFor="anthropic-api-key">Anthropic API Key</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="anthropic-api-key"
                      type={showApiKey ? "text" : "password"}
                      placeholder="sk-ant-api03-..."
                      value={settings.anthropicApiKey}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          anthropicApiKey: e.target.value,
                        }))
                      }
                      className="pl-10 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your API key is stored securely and used for document analysis
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="ai-model">AI Model</Label>
                <Select
                  value={settings.aiModel}
                  onValueChange={(value) =>
                    setSettings((prev) => ({ ...prev, aiModel: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {settings.aiProvider === "anthropic" ? (
                      <>
                        <SelectItem value="claude-sonnet-4-20250514">Claude Sonnet 4 (Recommended)</SelectItem>
                        <SelectItem value="claude-opus-4-20250514">Claude Opus 4</SelectItem>
                        <SelectItem value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (Faster)</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="gpt-4o">GPT-4o (Recommended)</SelectItem>
                        <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                        <SelectItem value="gpt-35-turbo">GPT-3.5 Turbo</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Suggest Answers</Label>
                  <p className="text-sm text-muted-foreground">
                    Let AI analyze documents and suggest answers to DORA questions
                  </p>
                </div>
                <Switch
                  checked={settings.autoSuggestAnswers}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({
                      ...prev,
                      autoSuggestAnswers: checked,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confidence">Confidence Threshold</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Only show AI suggestions with confidence above this threshold
                </p>
                <Select
                  value={settings.confidenceThreshold}
                  onValueChange={(value) =>
                    setSettings((prev) => ({
                      ...prev,
                      confidenceThreshold: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.5">50% - Show more suggestions</SelectItem>
                    <SelectItem value="0.7">70% - Balanced</SelectItem>
                    <SelectItem value="0.9">90% - High confidence only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator className="my-4" />
              {apiKeySet && (
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg mb-4">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    API key is configured. Enter a new key to update it.
                  </p>
                </div>
              )}
              <Button onClick={handleSaveAI} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save AI Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your account security preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Change Password</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Password management is handled through Azure AD
                </p>
                <Button variant="outline" disabled>
                  Managed by Azure AD
                </Button>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  MFA is enforced through Azure AD policies
                </p>
                <Button variant="outline" disabled>
                  Managed by Azure AD
                </Button>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Active Sessions</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  View and manage your active sessions
                </p>
                <Button variant="outline">View Sessions</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
