"use client";

import { useState, useTransition } from "react";
import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import {
  DecimalSeparator,
  RoundingMode,
} from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PickerField } from "@/components/ui/picker-field";
import { updateSettings, createTag, updateTag, deleteTag } from "@/actions/recurring";
import { updateProfile } from "@/actions/user";
import { recalculateBalances } from "@/actions/accounts";
import { hashPin } from "@/lib/app-lock";
import { SUPPORTED_CURRENCIES } from "@/lib/currency-format";
import { toast } from "sonner";
import { Download, Upload, LogOut, RefreshCw, Bell, Pencil, Trash2 } from "lucide-react";

const currencyOptions = SUPPORTED_CURRENCIES.map((c) => ({ value: c, label: c }));

const decimalSeparatorOptions = [
  { value: DecimalSeparator.DOT, label: "Dot (1,234.56)" },
  { value: DecimalSeparator.COMMA, label: "Comma (1.234,56)" },
];

const roundingOptions = Object.values(RoundingMode).map((m) => ({ value: m, label: m }));

const firstDayOfWeekOptions = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "6", label: "Saturday" },
];

const homePeriodOptions = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

async function getServiceWorkerRegistration() {
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  return navigator.serviceWorker.register("/sw.js");
}

type Settings = {
  defaultCurrency: string;
  decimalSeparator: DecimalSeparator;
  roundingMode: RoundingMode;
  firstDayOfWeek: number;
  financialWeekStart: number;
  homePeriod: string;
  appLockEnabled: boolean;
  appLockHash: string | null;
  locale: string;
} | null;

type Tag = { id: string; name: string; color: string };

export function SettingsPanel({
  user,
  settings,
  tags,
}: {
  user: { id: string; name: string; email: string; image?: string | null };
  settings: Settings;
  tags: Tag[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(user.name);
  const [pin, setPin] = useState("");
  const [newTag, setNewTag] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pendingTagDelete, setPendingTagDelete] = useState<Tag | null>(null);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [editingTagName, setEditingTagName] = useState("");
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [deletingTag, startDeleteTagTransition] = useTransition();
  const [updatingTag, startUpdateTagTransition] = useTransition();

  function saveSettings(partial: Parameters<typeof updateSettings>[0]) {
    startTransition(async () => {
      try {
        await updateSettings(partial);
        toast.success("Settings saved");
      } catch {
        toast.error("Failed to save");
      }
    });
  }

  async function enableAppLock() {
    if (pin.length < 4) {
      toast.error("PIN must be at least 4 digits");
      return;
    }
    const hash = await hashPin(pin);
    saveSettings({ appLockEnabled: true, appLockHash: hash });
    setPin("");
  }

  async function subscribePush() {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        toast.error("Push notifications not supported");
        return;
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        toast.error("VAPID public key is not configured");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      await getServiceWorkerRegistration();
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: existing.endpoint }),
        });
        await existing.unsubscribe();
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to save push subscription");
      }

      toast.success("Push notifications enabled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to enable push");
    }
  }

  async function sendTestPush() {
    try {
      const response = await fetch("/api/push/subscribe", { method: "PUT" });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "Failed to send test notification");
      }

      if (!data.sent) {
        toast.error("No push subscriptions found. Enable push first.");
        return;
      }

      toast.success("Test notification sent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send test notification");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-border/60 bg-surface">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <Button
            onClick={() =>
              startTransition(async () => {
                await updateProfile({ name });
                toast.success("Profile updated");
              })
            }
            disabled={pending}
          >
            Save Profile
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-surface">
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default Currency</Label>
            <PickerField
              value={settings?.defaultCurrency ?? "USD"}
              onValueChange={(v) => saveSettings({ defaultCurrency: v })}
              options={currencyOptions}
              placeholder="Select currency"
              title="Default currency"
            />
          </div>
          <div className="space-y-2">
            <Label>Decimal Separator</Label>
            <PickerField
              value={settings?.decimalSeparator ?? DecimalSeparator.DOT}
              onValueChange={(v) => saveSettings({ decimalSeparator: v as DecimalSeparator })}
              options={decimalSeparatorOptions}
              placeholder="Select separator"
              title="Decimal separator"
            />
          </div>
          <div className="space-y-2">
            <Label>Rounding</Label>
            <PickerField
              value={settings?.roundingMode ?? RoundingMode.NONE}
              onValueChange={(v) => saveSettings({ roundingMode: v as RoundingMode })}
              options={roundingOptions}
              placeholder="Select rounding"
              title="Rounding mode"
            />
          </div>
          <div className="space-y-2">
            <Label>First Day of Week</Label>
            <PickerField
              value={String(settings?.firstDayOfWeek ?? 1)}
              onValueChange={(v) => saveSettings({ firstDayOfWeek: parseInt(v) })}
              options={firstDayOfWeekOptions}
              placeholder="Select day"
              title="First day of week"
            />
          </div>
          <div className="space-y-2">
            <Label>Home Period</Label>
            <PickerField
              value={settings?.homePeriod ?? "month"}
              onValueChange={(v) => saveSettings({ homePeriod: v })}
              options={homePeriodOptions}
              placeholder="Select period"
              title="Home period"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-surface">
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>App Lock</Label>
            <Switch
              checked={settings?.appLockEnabled ?? false}
              onCheckedChange={(v) => {
                if (!v) saveSettings({ appLockEnabled: false, appLockHash: undefined });
              }}
            />
          </div>
          {!settings?.appLockEnabled && (
            <div className="flex gap-2">
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="Set PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              />
              <Button onClick={enableAppLock}>Set</Button>
            </div>
          )}
          <Button variant="outline" className="w-full gap-2" onClick={subscribePush}>
            <Bell className="h-4 w-4" />
            Enable Push Reminders
          </Button>
          <Button variant="outline" className="w-full gap-2" onClick={sendTestPush}>
            <Bell className="h-4 w-4" />
            Send Test Notification
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-surface">
        <CardHeader>
          <CardTitle>Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="New tag name"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
            />
            <Button
              onClick={() =>
                startTransition(async () => {
                  if (!newTag.trim()) return;
                  await createTag(newTag.trim());
                  setNewTag("");
                  toast.success("Tag created");
                  router.refresh();
                })
              }
            >
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="flex items-center gap-1 rounded-full px-3 py-1 text-xs"
                style={{ background: `${tag.color}22`, color: tag.color }}
              >
                {tag.name}
                <button
                  className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full opacity-60 hover:bg-current/10 hover:opacity-100"
                  aria-label={`Edit ${tag.name}`}
                  onClick={() => {
                    setEditingTag(tag);
                    setEditingTagName(tag.name);
                  }}
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full opacity-60 hover:bg-current/10 hover:opacity-100"
                  aria-label={`Delete ${tag.name}`}
                  onClick={() => setPendingTagDelete(tag)}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-surface lg:col-span-2">
        <CardHeader>
          <CardTitle>Data & Export</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" className="gap-2" asChild>
            <a href="/api/export/excel" download>
              <Download className="h-4 w-4" />
              Export Excel
            </a>
          </Button>
          <Button variant="outline" className="gap-2" asChild>
            <a href="/api/export/pdf" download>
              <Download className="h-4 w-4" />
              Export PDF
            </a>
          </Button>
          <Button variant="outline" className="gap-2" asChild>
            <a href="/api/export/backup" download>
              <Download className="h-4 w-4" />
              Backup JSON
            </a>
          </Button>
          <Button variant="outline" className="gap-2" asChild>
            <label className="cursor-pointer">
              <Upload className="h-4 w-4" />
              Import Excel
              <input
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setImportFile(file);
                  setImportOpen(true);
                  e.target.value = "";
                }}
              />
            </label>
          </Button>
          <Button variant="outline" className="gap-2" asChild>
            <label className="cursor-pointer">
              <Upload className="h-4 w-4" />
              Restore JSON
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setRestoreFile(file);
                  setRestoreOpen(true);
                  e.target.value = "";
                }}
              />
            </label>
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() =>
              startTransition(async () => {
                await recalculateBalances();
                toast.success("Balances recalculated");
              })
            }
          >
            <RefreshCw className="h-4 w-4" />
            Recalculate Balances
          </Button>
          <Button
            variant="destructive"
            className="gap-2"
            onClick={async () => {
              await signOut();
              router.push("/login");
            }}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Excel</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will replace all your existing accounts, categories, and
            transactions with data from{" "}
            <span className="font-medium text-foreground">
              {importFile?.name}
            </span>
            .
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setImportOpen(false);
                setImportFile(null);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={!importFile || importing}
              onClick={async () => {
                if (!importFile) return;
                setImporting(true);
                try {
                  const formData = new FormData();
                  formData.append("file", importFile);
                  const res = await fetch("/api/import/excel", {
                    method: "POST",
                    body: formData,
                  });
                  const data = await res.json();
                  if (!res.ok) {
                    throw new Error(data.error ?? "Import failed");
                  }
                  toast.success(
                    `Imported ${data.expenses} expenses, ${data.income} income, ${data.transfers} transfers (${data.format} format)`,
                  );
                  setImportOpen(false);
                  setImportFile(null);
                  window.location.reload();
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : "Import failed",
                  );
                } finally {
                  setImporting(false);
                }
              }}
            >
              {importing ? "Importing…" : "Replace & Import"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingTagDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingTagDelete(null);
        }}
        title="Delete Tag"
        description={
          pendingTagDelete ? `Delete tag "${pendingTagDelete.name}"?` : undefined
        }
        loading={deletingTag}
        onConfirm={() => {
          if (!pendingTagDelete) return;
          startDeleteTagTransition(async () => {
            await deleteTag(pendingTagDelete.id);
            setPendingTagDelete(null);
            toast.success("Tag deleted");
            router.refresh();
          });
        }}
      />

      <Dialog
        open={editingTag !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingTag(null);
            setEditingTagName("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={editingTagName}
              onChange={(e) => setEditingTagName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEditingTag(null);
                setEditingTagName("");
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={!editingTagName.trim() || updatingTag}
              onClick={() => {
                if (!editingTag) return;
                startUpdateTagTransition(async () => {
                  await updateTag(editingTag.id, editingTagName.trim());
                  setEditingTag(null);
                  setEditingTagName("");
                  toast.success("Tag updated");
                  router.refresh();
                });
              }}
            >
              {updatingTag ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={restoreOpen}
        onOpenChange={(open) => {
          setRestoreOpen(open);
          if (!open) setRestoreFile(null);
        }}
        title="Restore JSON Backup"
        description={
          restoreFile
            ? `This will replace all your existing data with the backup from ${restoreFile.name}.`
            : undefined
        }
        confirmLabel="Restore"
        loadingLabel="Restoring…"
        loading={restoring}
        onConfirm={async () => {
          if (!restoreFile) return;
          setRestoring(true);
          try {
            const text = await restoreFile.text();
            const res = await fetch("/api/restore", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: text,
            });
            if (!res.ok) {
              throw new Error("Restore failed");
            }
            toast.success("Data restored");
            setRestoreOpen(false);
            setRestoreFile(null);
            window.location.reload();
          } catch {
            toast.error("Restore failed");
          } finally {
            setRestoring(false);
          }
        }}
      />
    </div>
  );
}
