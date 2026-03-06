"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, User, Shield } from "lucide-react";

export default function AccountPage() {
  const [user, setUser] = useState<{
    id: string;
    name: string;
    email: string;
    role: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setUser(data.user));
  }, []);

  if (!user) return null;

  return (
    <>
      <PageHeader title="My Account" description="Manage your profile and notification preferences." />

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
              {[
                { label: "New competitor features", description: "Get notified when a competitor adds a new feature" },
                { label: "Feature status changes", description: "Alerts when coverage status changes" },
                { label: "Weekly digest", description: "Summary of all changes in the past 7 days" },
              ].map((pref) => (
                <label key={pref.label} className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="mt-0.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{pref.label}</p>
                    <p className="text-xs text-gray-500">{pref.description}</p>
                  </div>
                </label>
              ))}
            </div>
            <p className="mt-4 text-xs text-gray-400">
              Notification delivery (email + in-app) will be available in Phase 2.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
