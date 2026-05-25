import { getSession } from "@/lib/auth-server";
import { getSettings, getTags } from "@/actions/recurring";
import { SettingsPanel } from "@/components/settings/settings-panel";

export default async function SettingsPage() {
  const session = await getSession();
  const [settings, tags] = await Promise.all([
    getSettings(),
    getTags(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Customize your experience
        </p>
      </div>
      <SettingsPanel
        user={session!.user}
        settings={settings}
        tags={tags}
      />
    </div>
  );
}
