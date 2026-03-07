"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, User } from "lucide-react";

const NOTIFICATION_TYPES = [
  {
    alertType: "new_feature",
    label: "New competitor features",
    description: "Get notified when a competitor adds a new feature",
  },
  {
    alertType: "status_change",
    label: "Feature status changes",
    description: "Alerts when coverage status changes",
  },
  {
    alertType: "weekly_digest",
    label: "Weekly digest",
    description: "Summary of all changes in the past 7 days",
  },
];

export default function AccountPage() {
  const [user, setUser] = useState<{
    id: string;
    name: string;
    email: string;
    role: string;
  } | null>(null);
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setUser(data.user));
    fetch("/api/notification-preferences")
      .then((r) => r.json())
      .then(setPrefs);
  }, []);

  async function togglePref(alertType: string) {
    const newVal = !prefs[alertType];
    setPrefs((p) => ({ ...p, [alertType]: newVal }));
    await fetch("/api/notification-preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertType, enabled: newVal }),
    });
  }

  if (!user) return null;

  return (
    <>
      <PageHeader
        title="My Account"
        description="Manage your profile and notification preferences."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-gray-500" />
              <h3 className="font-semibold text-gray-900">Profile</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-gray-500">Name</p>
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-sm font-medium text-gray-900">{user.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Role</p>
              <Badge variant="info">{user.role}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-gray-500" />
              <h3 className="font-semibold text-gray-900">Notifications</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {NOTIFICATION_TYPES.map((pref) => (
                <label
                  key={pref.alertType}
                  className="flex items-start gap-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={prefs[pref.alertType] ?? true}
                    onChange={() => togglePref(pref.alertType)}
                    className="mt-0.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {pref.label}
                    </p>
                    <p className="text-xs text-gray-500">{pref.description}</p>
                  </div>
                </label>
              ))}
            </div>
            <p className="mt-4 text-xs text-gray-400">
              In-app notifications are delivered in real-time via the bell icon.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
