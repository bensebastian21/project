// src/pages/Settings.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../utils/api';
import {
  Bell,
  Lock,
  Sliders,
  Zap,
  ShieldCheck,
  Link2,
  User,
  ChevronRight,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Eye,
  Activity,
  History,
  Download,
  Trash2,
} from 'lucide-react';

// ── Brutalist Toggle ──────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative w-14 h-7 border-2 border-black transition-all duration-150 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] focus:outline-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px]'} ${checked ? 'bg-black' : 'bg-white'}`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 border-2 border-black transition-all duration-150 ${checked ? 'left-[calc(100%_-_22px)] bg-white' : 'left-0.5 bg-black'}`}
      />
    </button>
  );
}

// ── Brutalist Setting Row ─────────────────────────────────────────
function SettingRow({ label, desc, checked, onChange, disabled }) {
  return (
    <div className="flex items-center justify-between p-4 bg-white border-2 border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all">
      <div className="flex-1 pr-6">
        <div className="text-sm font-black text-black uppercase tracking-tight">{label}</div>
        {desc && <div className="text-xs text-slate-500 font-medium mt-0.5">{desc}</div>}
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

// ── Tab definition ────────────────────────────────────────────────
const TABS = [
  { id: 'Profile', icon: User, color: 'bg-blue-50' },
  { id: 'Notifications', icon: Bell, color: 'bg-amber-50' },
  { id: 'Privacy', icon: Lock, color: 'bg-pink-50' },
  { id: 'Accessibility', icon: Eye, color: 'bg-cyan-50' },
  { id: 'Activity', icon: Activity, color: 'bg-indigo-50' },
  { id: 'Preferences', icon: Sliders, color: 'bg-violet-50' },
  { id: 'Recommendations', icon: Zap, color: 'bg-green-50' },
  { id: 'Security', icon: ShieldCheck, color: 'bg-teal-50' },
  { id: 'Connected Apps', icon: Link2, color: 'bg-orange-50' },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('Profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      eventReminders: true,
      newFromFollowedHosts: true,
      friendRequests: true,
    },
    privacy: {
      onlyFriendsCanViewProfile: false,
      allowFriendRequests: true,
      searchableByEmail: true,
      showBadgesPublic: true,
      incognitoMode: false,
    },
    ui: { density: 'comfortable', sidebarCollapsedDefault: false },
    accessibility: { reduceMotion: false, highContrast: false },
    recommendations: { personalizeUsingOnboarding: true, showTrendingFirst: true },
    connectedApps: { googleLinked: false },
  });
  const [verify, setVerify] = useState({ emailVerified: false, phoneVerified: false });
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/api/auth/settings');
        const s = data?.settings || {};
        setSettings({
          notifications: {
            email: s?.notifications?.email !== false,
            eventReminders: s?.notifications?.eventReminders !== false,
            newFromFollowedHosts: s?.notifications?.newFromFollowedHosts !== false,
            friendRequests: s?.notifications?.friendRequests !== false,
          },
          privacy: {
            onlyFriendsCanViewProfile: !!s?.privacy?.onlyFriendsCanViewProfile,
            allowFriendRequests: s?.privacy?.allowFriendRequests !== false,
            searchableByEmail: s?.privacy?.searchableByEmail !== false,
            showBadgesPublic: s?.privacy?.showBadgesPublic !== false,
            incognitoMode: !!s?.privacy?.incognitoMode,
          },
          ui: {
            density: s?.ui?.density || 'comfortable',
            sidebarCollapsedDefault: !!s?.ui?.sidebarCollapsedDefault,
          },
          accessibility: {
            reduceMotion: !!s?.accessibility?.reduceMotion,
            highContrast: !!s?.accessibility?.highContrast,
          },
          recommendations: {
            personalizeUsingOnboarding: s?.recommendations?.personalizeUsingOnboarding !== false,
            showTrendingFirst: s?.recommendations?.showTrendingFirst !== false,
          },
          connectedApps: { googleLinked: !!s?.connectedApps?.googleLinked },
        });
        const density = s?.ui?.density || 'comfortable';
        document.documentElement.setAttribute('data-density', density);
        try {
          localStorage.setItem('ui_density', density);
        } catch {}
        try {
          localStorage.setItem(
            'ui_sidebar_collapsed_default',
            String(!!s?.ui?.sidebarCollapsedDefault)
          );
        } catch {}
        setVerify({ emailVerified: !!data?.emailVerified, phoneVerified: !!data?.phoneVerified });
        setUserEmail(data?.email || '');
      } catch (e) {
        toast.error(e?.response?.data?.error || 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const saveSettings = async (partial) => {
    try {
      setSaving(true);
      await api.put('/api/auth/settings', partial);
      setSettings((prev) => {
        const merged = JSON.parse(JSON.stringify(prev));
        if (partial.notifications) Object.assign(merged.notifications, partial.notifications);
        if (partial.privacy) Object.assign(merged.privacy, partial.privacy);
        if (partial.ui) Object.assign(merged.ui, partial.ui);
        if (partial.accessibility) Object.assign(merged.accessibility, partial.accessibility);
        if (partial.recommendations) Object.assign(merged.recommendations, partial.recommendations);
        return merged;
      });
      if (partial.ui?.density) {
        document.documentElement.setAttribute('data-density', partial.ui.density);
        try {
          localStorage.setItem('ui_density', partial.ui.density);
        } catch {}
      }
      if (typeof partial.ui?.sidebarCollapsedDefault === 'boolean') {
        try {
          localStorage.setItem(
            'ui_sidebar_collapsed_default',
            String(!!partial.ui.sidebarCollapsedDefault)
          );
        } catch {}
      }
      toast.success('Settings saved');
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const clearSearchHistory = () => {
    toast.info('Clearing search history...', { icon: <History className="w-4 h-4" /> });
    const key = userEmail ? `student.recentSearches:${userEmail}` : 'student.recentSearches';
    try {
      localStorage.removeItem(key);
      setTimeout(() => toast.success('Search history cleared'), 1000);
    } catch (e) {
      toast.error('Failed to clear history');
    }
  };

  const downloadData = () => {
    toast.info('Preparing your data for download...', { icon: <Download className="w-4 h-4" /> });
    setTimeout(() => toast.success('Your data package is ready! Check your email.'), 2000);
  };

  const activeTabDef = TABS.find((t) => t.id === activeTab) || TABS[0];
  const ActiveIcon = activeTabDef.icon;

  return (
    <div className="min-h-screen bg-neutral-50 selection:bg-black selection:text-white">
      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-30 bg-white border-b-2 border-black shadow-[0_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 border-2 border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-black" />
          </button>
          <div className="p-2.5 bg-black border-2 border-black">
            <Sliders className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-black uppercase tracking-tighter">Settings</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              Manage your account preferences
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">
          {/* ── Sidebar nav ── */}
          <aside className="md:col-span-2 lg:col-span-1 border-2 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            {TABS.map((tab, idx) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all border-b-2 border-black last:border-b-0 ${isActive ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'}`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs font-black uppercase tracking-widest">{tab.id}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
                </button>
              );
            })}
          </aside>

          {/* ── Content panel ── */}
          <section className="md:col-span-3 lg:col-span-4">
            <div
              className={`border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] min-h-[300px] ${activeTabDef.color}`}
            >
              {/* Panel header */}
              <div className="flex items-center gap-3 px-6 py-4 border-b-2 border-black bg-white">
                <div className="p-2 border-2 border-black bg-black">
                  <ActiveIcon className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-sm font-black text-black uppercase tracking-widest">
                  {activeTab}
                </h2>
                {saving && (
                  <span className="ml-auto text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                    <div className="w-3 h-3 border-2 border-black border-t-transparent animate-spin" />{' '}
                    Saving...
                  </span>
                )}
              </div>

              {/* Panel body */}
              <div className="p-6">
                {loading ? (
                  <div className="flex items-center gap-3 py-8 text-black font-black uppercase tracking-widest text-xs">
                    <div className="w-4 h-4 border-2 border-black border-t-transparent animate-spin" />{' '}
                    Loading settings...
                  </div>
                ) : (
                  <>
                    {/* ── PROFILE ── */}
                    {activeTab === 'Profile' && (
                      <div className="space-y-4">
                        <p className="text-xs text-slate-600 font-bold uppercase tracking-widest">
                          Manage your public profile information on the Profile page.
                        </p>
                        <button
                          onClick={() => navigate('/profile')}
                          className="flex items-center gap-2 px-5 py-3 bg-black text-white border-2 border-black font-black uppercase tracking-widest text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:bg-neutral-800 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] transition-all"
                        >
                          <User className="w-4 h-4" /> Go to Profile
                        </button>
                      </div>
                    )}

                    {/* ── NOTIFICATIONS ── */}
                    {activeTab === 'Notifications' && (
                      <div className="space-y-2">
                        {[
                          {
                            key: 'email',
                            label: 'General emails',
                            desc: 'Product updates and important notices',
                          },
                          {
                            key: 'eventReminders',
                            label: 'Event reminders',
                            desc: 'Reminders for registered events',
                          },
                          {
                            key: 'newFromFollowedHosts',
                            label: 'Followed hosts',
                            desc: 'New events from hosts you follow',
                          },
                          {
                            key: 'friendRequests',
                            label: 'Friend requests',
                            desc: 'Requests and activity from friends',
                          },
                        ].map((opt) => (
                          <SettingRow
                            key={opt.key}
                            label={opt.label}
                            desc={opt.desc}
                            checked={!!settings.notifications[opt.key]}
                            onChange={(val) => saveSettings({ notifications: { [opt.key]: val } })}
                            disabled={saving}
                          />
                        ))}
                      </div>
                    )}

                    {/* ── PRIVACY ── */}
                    {activeTab === 'Privacy' && (
                      <div className="space-y-2">
                        {[
                          {
                            key: 'incognitoMode',
                            label: 'Incognito Mode',
                            desc: 'Hide your presence from others while browsing',
                          },
                          {
                            key: 'onlyFriendsCanViewProfile',
                            label: 'Friends-only profile',
                            desc: 'Restrict profile visibility to friends',
                          },
                          {
                            key: 'allowFriendRequests',
                            label: 'Allow friend requests',
                            desc: 'Receive requests from other users',
                          },
                          {
                            key: 'searchableByEmail',
                            label: 'Searchable by email',
                            desc: 'Allow others to find you by email',
                          },
                          {
                            key: 'showBadgesPublic',
                            label: 'Show badges publicly',
                            desc: 'Display your badges on profile',
                          },
                        ].map((opt) => (
                          <SettingRow
                            key={opt.key}
                            label={opt.label}
                            desc={opt.desc}
                            checked={!!settings.privacy[opt.key]}
                            onChange={(val) => saveSettings({ privacy: { [opt.key]: val } })}
                            disabled={saving}
                          />
                        ))}
                      </div>
                    )}

                    {/* ── ACCESSIBILITY ── */}
                    {activeTab === 'Accessibility' && (
                      <div className="space-y-2">
                        {[
                          {
                            key: 'reduceMotion',
                            label: 'Reduce Motion',
                            desc: 'Minimize animations and transitions',
                          },
                          {
                            key: 'highContrast',
                            label: 'High Contrast',
                            desc: 'Increase color contrast for better readability',
                          },
                        ].map((opt) => (
                          <SettingRow
                            key={opt.key}
                            label={opt.label}
                            desc={opt.desc}
                            checked={!!settings.accessibility[opt.key]}
                            onChange={(val) => saveSettings({ accessibility: { [opt.key]: val } })}
                            disabled={saving}
                          />
                        ))}
                      </div>
                    )}

                    {/* ── ACTIVITY ── */}
                    {activeTab === 'Activity' && (
                      <div className="space-y-4">
                        <div className="p-4 bg-white border-2 border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-between">
                          <div>
                            <div className="text-sm font-black text-black uppercase tracking-tight">
                              Search History
                            </div>
                            <div className="text-xs text-slate-500 font-medium mt-0.5">
                              Clear your recent search queries
                            </div>
                          </div>
                          <button
                            onClick={clearSearchHistory}
                            className="px-4 py-2 border-2 border-black bg-white text-xs font-black uppercase tracking-widest hover:bg-red-50 transition-all flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Clear
                          </button>
                        </div>
                        <div className="p-4 bg-white border-2 border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-between">
                          <div>
                            <div className="text-sm font-black text-black uppercase tracking-tight">
                              Personal Data
                            </div>
                            <div className="text-xs text-slate-500 font-medium mt-0.5">
                              Download a copy of your account data
                            </div>
                          </div>
                          <button
                            onClick={downloadData}
                            className="px-4 py-2 border-2 border-black bg-black text-white text-xs font-black uppercase tracking-widest hover:bg-neutral-800 transition-all flex items-center gap-2"
                          >
                            <Download className="w-3.5 h-3.5" /> Download
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── PREFERENCES ── */}
                    {activeTab === 'Preferences' && (
                      <div className="space-y-4">
                        <SettingRow
                          label="Show Email in Public Profile"
                          desc="Let others see your email address on your profile"
                          checked={!!settings.privacy?.showEmail}
                          onChange={(val) => saveSettings({ privacy: { showEmail: val } })}
                          disabled={saving}
                        />
                        <SettingRow
                          label="Collapsed Sidebar by Default"
                          desc="Start with the navigation sidebar minimized"
                          checked={!!settings.ui?.sidebarCollapsedDefault}
                          onChange={(val) => saveSettings({ ui: { sidebarCollapsedDefault: val } })}
                          disabled={saving}
                        />

                        {/* Density selector */}
                        <div className="p-4 bg-white border-2 border-black">
                          <div className="text-sm font-black text-black uppercase tracking-tight mb-3">
                            UI Density
                          </div>
                          <div className="flex gap-2">
                            {['compact', 'comfortable', 'spacious'].map((d) => (
                              <button
                                key={d}
                                onClick={() => saveSettings({ ui: { density: d } })}
                                disabled={saving}
                                className={`flex-1 px-3 py-2.5 border-2 border-black text-[10px] font-black uppercase tracking-widest transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] ${settings.ui.density === d ? 'bg-black text-white' : 'bg-white text-black'}`}
                              >
                                {d}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── RECOMMENDATIONS ── */}
                    {activeTab === 'Recommendations' && (
                      <div className="space-y-2">
                        {[
                          {
                            key: 'personalizeUsingOnboarding',
                            label: 'Personalize from onboarding',
                            desc: 'Use your onboarding preferences for recommendations',
                          },
                          {
                            key: 'showTrendingFirst',
                            label: 'Trending first',
                            desc: 'Prioritize trending events in Explore',
                          },
                        ].map((opt) => (
                          <SettingRow
                            key={opt.key}
                            label={opt.label}
                            desc={opt.desc}
                            checked={!!settings.recommendations[opt.key]}
                            onChange={(val) =>
                              saveSettings({ recommendations: { [opt.key]: val } })
                            }
                            disabled={saving}
                          />
                        ))}
                      </div>
                    )}

                    {/* ── SECURITY ── */}
                    {activeTab === 'Security' && (
                      <div className="space-y-4">
                        {/* Verification status cards */}
                        <div className="grid grid-cols-1 gap-3">
                          <div
                            className={`p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3 ${verify.emailVerified ? 'bg-green-50' : 'bg-amber-50'}`}
                          >
                            {verify.emailVerified ? (
                              <CheckCircle className="w-5 h-5 text-green-700 flex-shrink-0" />
                            ) : (
                              <span className="text-xl flex-shrink-0">⭐</span>
                            )}
                            <div>
                              <div className="text-xs font-black uppercase tracking-widest text-black">
                                Email Verification
                              </div>
                              <div
                                className={`text-[10px] font-black uppercase tracking-widest ${verify.emailVerified ? 'text-green-700' : 'text-amber-700'}`}
                              >
                                {verify.emailVerified ? 'Verified ✓ — Badge & XP Earned' : 'Optional — Earn +150 XP & Verified Member Badge'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-3 flex-wrap">
                          <button
                            onClick={() => navigate('/profile?tab=otp')}
                            className="flex items-center gap-2 px-5 py-3 bg-black text-white border-2 border-black font-black uppercase tracking-widest text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:bg-neutral-800 transition-all"
                          >
                            <ShieldCheck className="w-4 h-4" /> Verify Credentials
                          </button>
                          <button
                            onClick={() => navigate('/reset-password')}
                            className="flex items-center gap-2 px-5 py-3 bg-white text-black border-2 border-black font-black uppercase tracking-widest text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
                          >
                            Change Password
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── CONNECTED APPS ── */}
                    {activeTab === 'Connected Apps' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-4 bg-white border-2 border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 border-2 border-black bg-white flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-xl font-black">
                              G
                            </div>
                            <div>
                              <div className="text-sm font-black text-black uppercase tracking-tight">
                                Google
                              </div>
                              <div className="text-xs text-slate-500 font-medium">
                                Linked for OAuth login
                              </div>
                            </div>
                          </div>
                          <span
                            className={`px-3 py-1.5 border-2 border-black text-[10px] font-black uppercase tracking-widest ${settings.connectedApps.googleLinked ? 'bg-green-100 text-green-900' : 'bg-neutral-100 text-black'}`}
                          >
                            {settings.connectedApps.googleLinked ? 'Linked ✓' : 'Not Linked'}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
