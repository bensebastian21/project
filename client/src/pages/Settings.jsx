// src/pages/Settings.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../utils/api";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("Profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      eventReminders: true,
      newFromFollowedHosts: true,
      friendRequests: true,
      weeklyDigest: false,
      marketing: false
    },
    privacy: {
      onlyFriendsCanViewProfile: false,
      allowFriendRequests: true,
      searchableByEmail: true,
      showBadgesPublic: true
    },
    ui: {
      theme: "system",
      density: "compact",
      sidebarCollapsedDefault: false
    },
    recommendations: {
      personalizeUsingOnboarding: true,
      showTrendingFirst: true
    },
    connectedApps: { googleLinked: false }
  });
  const [verify, setVerify] = useState({ emailVerified: false, phoneVerified: false });
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get("/api/auth/settings");
        const s = data?.settings || {};
        setSettings({
          notifications: {
            email: !!s?.notifications?.email,
            eventReminders: !!s?.notifications?.eventReminders,
            newFromFollowedHosts: !!s?.notifications?.newFromFollowedHosts,
            friendRequests: !!s?.notifications?.friendRequests,
            weeklyDigest: !!s?.notifications?.weeklyDigest,
            marketing: !!s?.notifications?.marketing
          },
          privacy: {
            onlyFriendsCanViewProfile: !!s?.privacy?.onlyFriendsCanViewProfile,
            allowFriendRequests: s?.privacy?.allowFriendRequests !== false,
            searchableByEmail: s?.privacy?.searchableByEmail !== false,
            showBadgesPublic: s?.privacy?.showBadgesPublic !== false
          },
          ui: {
            theme: s?.ui?.theme || "system",
            density: s?.ui?.density || "compact",
            sidebarCollapsedDefault: !!s?.ui?.sidebarCollapsedDefault
          },
          recommendations: {
            personalizeUsingOnboarding: s?.recommendations?.personalizeUsingOnboarding !== false,
            showTrendingFirst: s?.recommendations?.showTrendingFirst !== false
          },
          connectedApps: { googleLinked: !!s?.connectedApps?.googleLinked }
        });
        // Apply and persist density immediately on load
        const density = s?.ui?.density || "compact";
        document.documentElement.setAttribute('data-density', density);
        try { localStorage.setItem('ui_density', density); } catch {}
        try { localStorage.setItem('ui_sidebar_collapsed_default', String(!!s?.ui?.sidebarCollapsedDefault)); } catch {}
        setVerify({ emailVerified: !!data?.emailVerified, phoneVerified: !!data?.phoneVerified });
      } catch (e) {
        toast.error(e?.response?.data?.error || "Failed to load settings");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const saveSettings = async (partial) => {
    try {
      setSaving(true);
      await api.put("/api/auth/settings", partial);
      setSettings((prev) => {
        const merged = JSON.parse(JSON.stringify(prev));
        if (partial.notifications) Object.assign(merged.notifications, partial.notifications);
        if (partial.privacy) Object.assign(merged.privacy, partial.privacy);
        if (partial.ui) Object.assign(merged.ui, partial.ui);
        if (partial.recommendations) Object.assign(merged.recommendations, partial.recommendations);
        return merged;
      });
      // Apply density immediately; theme is system-based now
      if (partial.ui && typeof partial.ui.density === 'string') {
        document.documentElement.setAttribute('data-density', partial.ui.density || 'compact');
        try { localStorage.setItem('ui_density', partial.ui.density || 'compact'); } catch {}
      }
      if (partial.ui && typeof partial.ui.sidebarCollapsedDefault === 'boolean') {
        try { localStorage.setItem('ui_sidebar_collapsed_default', String(!!partial.ui.sidebarCollapsedDefault)); } catch {}
      }
      toast.success("Settings saved");
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 text-slate-800">
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-600 text-sm">Manage your account preferences.</p>
        </div>
      </header>
      <main className="max-w-5xl mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <aside className="md:col-span-2 lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-3 h-fit">
            <div className="space-y-1">
              {["Profile","Notifications","Privacy","Preferences","Recommendations","Security","Connected Apps"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm ${activeTab===tab?"bg-blue-100 text-blue-700":"hover:bg-slate-50 text-slate-700"}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </aside>

          <section className="md:col-span-3 lg:col-span-4">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm min-h-[300px]">
              {loading ? (
                <div className="text-sm text-slate-600">Loading settings...</div>
              ) : (
                <>
                  {activeTab === "Profile" && (
                    <div className="space-y-4">
                      <h2 className="text-lg font-semibold text-slate-900">Profile</h2>
                      <div className="text-sm text-slate-600">Manage profile details in the Profile page.</div>
                      <button onClick={() => navigate("/profile")} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">Go to Profile</button>
                    </div>
                  )}

                  {activeTab === "Notifications" && (
                    <div className="space-y-4">
                      <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
                      {[
                        { key: "email", label: "General emails", desc: "Product updates and important notices" },
                        { key: "eventReminders", label: "Event reminders", desc: "Reminders for registered events" },
                        { key: "newFromFollowedHosts", label: "Followed hosts", desc: "New events from hosts you follow" },
                        { key: "friendRequests", label: "Friend requests", desc: "Requests and activity from friends" },
                        { key: "weeklyDigest", label: "Weekly digest", desc: "Summary of events and activity" },
                        { key: "marketing", label: "Promotions", desc: "Offers and sponsored content" }
                      ].map(opt => (
                        <div key={opt.key} className="flex items-center justify-between py-2">
                          <div>
                            <div className="font-medium text-sm">{opt.label}</div>
                            <div className="text-xs text-slate-500">{opt.desc}</div>
                          </div>
                          <input
                            type="checkbox"
                            className="w-5 h-5"
                            checked={!!settings.notifications[opt.key]}
                            onChange={(e)=> saveSettings({ notifications: { [opt.key]: e.target.checked } })}
                            disabled={saving}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === "Privacy" && (
                    <div className="space-y-4">
                      <h2 className="text-lg font-semibold text-slate-900">Privacy</h2>
                      {[
                        { key: "onlyFriendsCanViewProfile", label: "Only friends can view my profile", desc: "Restrict profile visibility" },
                        { key: "allowFriendRequests", label: "Allow friend requests", desc: "Receive requests from other users" },
                        { key: "searchableByEmail", label: "Searchable by email", desc: "Allow others to find you by email" },
                        { key: "showBadgesPublic", label: "Show badges publicly", desc: "Display your badges on profile" }
                      ].map(opt => (
                        <div key={opt.key} className="flex items-center justify-between py-2">
                          <div>
                            <div className="font-medium text-sm">{opt.label}</div>
                            <div className="text-xs text-slate-500">{opt.desc}</div>
                          </div>
                          <input
                            type="checkbox"
                            className="w-5 h-5"
                            checked={!!settings.privacy[opt.key]}
                            onChange={(e)=> saveSettings({ privacy: { [opt.key]: e.target.checked } })}
                            disabled={saving}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === "Preferences" && (
                    <div className="space-y-6">
                      <h2 className="text-lg font-semibold text-slate-900">Preferences</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-medium mb-1">Density</div>
                          <select
                            value={settings.ui.density}
                            onChange={(e)=> saveSettings({ ui: { density: e.target.value } })}
                            disabled={saving}
                            className="w-full px-3 py-2 border rounded-lg"
                          >
                            <option value="comfortable">Comfortable</option>
                            <option value="compact">Compact</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <div className="font-medium text-sm">Collapse sidebar by default</div>
                          <div className="text-xs text-slate-500">Useful for smaller screens</div>
                        </div>
                        <input
                          type="checkbox"
                          className="w-5 h-5"
                          checked={!!settings.ui.sidebarCollapsedDefault}
                          onChange={(e)=> saveSettings({ ui: { sidebarCollapsedDefault: e.target.checked } })}
                          disabled={saving}
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === "Recommendations" && (
                    <div className="space-y-4">
                      <h2 className="text-lg font-semibold text-slate-900">Recommendations</h2>
                      {[
                        { key: "personalizeUsingOnboarding", label: "Personalize using onboarding", desc: "Use your onboarding preferences for recommendations" },
                        { key: "showTrendingFirst", label: "Show trending first", desc: "Prioritize trending events in Explore" }
                      ].map(opt => (
                        <div key={opt.key} className="flex items-center justify-between py-2">
                          <div>
                            <div className="font-medium text-sm">{opt.label}</div>
                            <div className="text-xs text-slate-500">{opt.desc}</div>
                          </div>
                          <input
                            type="checkbox"
                            className="w-5 h-5"
                            checked={!!settings.recommendations[opt.key]}
                            onChange={(e)=> saveSettings({ recommendations: { [opt.key]: e.target.checked } })}
                            disabled={saving}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === "Security" && (
                    <div className="space-y-4">
                      <h2 className="text-lg font-semibold text-slate-900">Security</h2>
                      <div className="text-sm text-slate-700">Email verified: <span className={verify.emailVerified?"text-green-600":"text-red-600"}>{verify.emailVerified?"Yes":"No"}</span></div>
                      <div className="text-sm text-slate-700">Phone verified: <span className={verify.phoneVerified?"text-green-600":"text-red-600"}>{verify.phoneVerified?"Yes":"No"}</span></div>
                      <div className="flex gap-3">
                        <button onClick={() => navigate("/profile?tab=otp")} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">Verify Credentials</button>
                        <button onClick={() => navigate("/reset-password")} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg text-sm">Change Password</button>
                      </div>
                    </div>
                  )}

                  {activeTab === "Connected Apps" && (
                    <div className="space-y-4">
                      <h2 className="text-lg font-semibold text-slate-900">Connected Apps</h2>
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <div className="font-medium text-sm">Google</div>
                          <div className="text-xs text-slate-500">Linked for OAuth login</div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${settings.connectedApps.googleLinked?"bg-green-100 text-green-700":"bg-slate-100 text-slate-700"}`}>
                          {settings.connectedApps.googleLinked?"Linked":"Not linked"}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
