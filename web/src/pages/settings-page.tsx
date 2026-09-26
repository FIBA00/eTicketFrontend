import React, { useState } from "react";
import {
  AUTO_SYNC_KEY,
  isAutoSyncEnabled,
  STATION_CODE,
  STATION_NAME,
  useOnlineStatus,
  useQueueCount,
} from "../lib/utils";
import PageHeader from "../components/page-header";
import {
  Check,
  CircleHelp,
  Cloud,
  CloudOff,
  Landmark,
  Languages,
  ShieldCheck,
  Wifi,
} from "lucide-react";
import SettingValue from "../components/settings-value";

export default function SettingsPage() {
  const online = useOnlineStatus();
  const queueCount = useQueueCount();
  const [language, setLanguage] = useState("English");
  const [autoSync, setAutoSync] = useState(isAutoSyncEnabled());
  const [saved, setSaved] = useState(false);
  const save = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2400);
  };
  const toggleAutoSync = () => {
    const next = !autoSync;
    setAutoSync(next);
    window.localStorage.setItem(AUTO_SYNC_KEY, String(next));
    window.dispatchEvent(new Event("transit-settings-changed"));
  };
  return (
    <div className="app-enter">
      <PageHeader
        eyebrow="Configuration · Station controls"
        title="Settings"
        description="Review the station identity and local reliability controls used by this counter."
      />
      <div className="grid max-w-5xl gap-8 lg:grid-cols-[1fr_310px]">
        <div className="space-y-6">
          <section className="rounded-sm border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <Landmark size={17} className="text-primary" />
                <div>
                  <h2 className="text-sm font-semibold">Station identity</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Printed on every passenger receipt and settlement view.
                  </p>
                </div>
              </div>
            </div>
            <div className="grid gap-5 p-5 sm:grid-cols-2">
              <SettingValue label="Station name" value={STATION_NAME} />
              <SettingValue label="Station code" value={STATION_CODE} mono />
              <SettingValue label="Counter" value="04 · Main ticket desk" />
              <SettingValue label="Region" value="Addis Ababa" />
            </div>
          </section>
          <section className="rounded-sm border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <Languages size={17} className="text-primary" />
                <div>
                  <h2 className="text-sm font-semibold">Language & display</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Choose the working language for counter labels.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-5">
              <label className="block max-w-xs">
                <span className="mb-2 block text-xs font-semibold">
                  Interface language
                </span>
                <select
                  data-testid="select-language"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  className="w-full rounded-sm border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                >
                  <option>English</option>
                  <option>Amharic</option>
                  <option>Afaan Oromo</option>
                </select>
              </label>
            </div>
          </section>
          <section className="rounded-sm border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <Cloud size={17} className="text-primary" />
                <div>
                  <h2 className="text-sm font-semibold">
                    Connection & queued tickets
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Local-first operation protects tickets during a network
                    drop.
                  </p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-border">
              <div className="flex items-center justify-between gap-4 p-5">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full ${online ? "bg-primary/10 text-primary" : "bg-accent/15 text-accent-foreground"}`}
                  >
                    {online ? <Wifi size={17} /> : <CloudOff size={17} />}
                  </span>
                  <div>
                    <div className="text-sm font-medium">
                      Station connection
                    </div>
                    <div
                      data-testid="text-settings-connection"
                      className="mt-1 text-xs text-muted-foreground"
                    >
                      {online
                        ? "Online · ready to synchronize"
                        : "Offline · local queue active"}
                    </div>
                  </div>
                </div>
                <span
                  className={`font-mono text-[10px] uppercase tracking-wider ${online ? "text-primary" : "text-accent-foreground"}`}
                >
                  {online ? "Connected" : "Offline"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 p-5">
                <div>
                  <div className="text-sm font-medium">
                    Automatic synchronization
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Send queued tickets as soon as the network returns.
                  </div>
                </div>
                <button
                  data-testid="button-toggle-auto-sync"
                  role="switch"
                  aria-checked={autoSync}
                  onClick={toggleAutoSync}
                  className={`relative h-6 w-11 rounded-full transition-colors ${autoSync ? "bg-primary" : "bg-muted-foreground/35"}`}
                >
                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-card transition-transform ${autoSync ? "left-6" : "left-1"}`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between gap-4 p-5">
                <div>
                  <div className="text-sm font-medium">
                    Tickets waiting to sync
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Stored only on this device until recorded.
                  </div>
                </div>
                <span
                  data-testid="text-settings-queue-count"
                  className={`font-mono text-sm font-semibold ${queueCount ? "text-accent-foreground" : "text-primary"}`}
                >
                  {queueCount}
                </span>
              </div>
            </div>
          </section>
          <div className="flex items-center justify-between gap-4">
            <div>
              {saved && (
                <span
                  data-testid="status-settings-saved"
                  className="flex items-center gap-2 text-xs text-primary"
                >
                  <Check size={14} />
                  Settings saved on this counter
                </span>
              )}
            </div>
            <button
              data-testid="button-save-settings"
              onClick={save}
              className="flex items-center gap-2 rounded-sm bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:-translate-y-0.5"
            >
              <Check size={16} />
              Save settings
            </button>
          </div>
        </div>
        <aside className="space-y-4">
          <div className="rounded-sm border border-border bg-muted/45 p-5">
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold">
              <ShieldCheck size={16} className="text-primary" />
              Reliability notes
            </div>
            <ul className="space-y-4 text-xs leading-5 text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-mono text-primary">01</span>
                Each receipt has a unique idempotency key.
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-primary">02</span>
                Offline tickets remain available after closing the browser.
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-primary">03</span>
                Sync retries quietly when connectivity returns.
              </li>
            </ul>
          </div>
          <div className="rounded-sm border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <CircleHelp size={15} className="text-muted-foreground" />
              Need help?
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Contact the station supervisor before changing counter
              configuration.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
