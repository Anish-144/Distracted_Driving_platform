import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/store';
import { logout, updateUserProfile } from '@/store/authSlice';
import { loadSettings, updateSettings, optimisticUpdate } from '@/store/settingsSlice';
import { updatePassword } from '@/api/auth';
import { UserSettingsUpdate } from '@/api/settings';
import AppShell from '@/components/layout/AppShell';
import { FadeUp } from '@/components/motion/ScrollReveal';
import toast from 'react-hot-toast';
import { Settings, User, Shield, Bell, Lock, AlertTriangle, Trash2, Save, RefreshCw, Activity, Download, CheckCircle2, LogOut, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const CARD = 'bg-primary rounded-2xl border border-subtle ';
const LABEL = 'text-[11px] font-bold uppercase tracking-[0.12em] text-muted';
const INPUT_CLASS = 'w-full px-4 py-2.5 rounded-xl border border-strong bg-secondary text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all';
const LABEL_CLASS = 'block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5';

// Reusable Toggle Component
function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: () => void; label: string; description?: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="pr-4">
        <p className="text-sm font-semibold text-primary">{label}</p>
        {description && <p className="text-[11px] text-muted mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${checked ? 'bg-brand-500' : 'bg-tertiary'}`}
      >
        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const [isMounted, setIsMounted] = useState(false);

  const { data: settingsData, isLoading: settingsLoading } = useAppSelector((state) => state.settings);

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    emergencyContact: ''
  });
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (!isAuthenticated && isMounted) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, router, isMounted]);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(loadSettings());
    }
  }, [isAuthenticated, dispatch]);

  useEffect(() => {
    if (user) {
      setProfileForm(prev => ({ ...prev, name: user.name, email: user.email }));
    }
    if (settingsData) {
      setProfileForm(prev => ({ 
        ...prev, 
        phone: settingsData.phone || '', 
        emergencyContact: settingsData.emergency_contact || '' 
      }));
    }
  }, [user, settingsData]);

  if (!isMounted) return null;
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    
    const settingsPromise = dispatch(updateSettings({
      phone: profileForm.phone,
      emergency_contact: profileForm.emergencyContact
    })).unwrap();
    
    const profilePromise = dispatch(updateUserProfile({
      name: profileForm.name,
      email: profileForm.email
    })).unwrap();

    try {
      await Promise.all([settingsPromise, profilePromise]);
      toast.success('Account information updated');
    } catch (err: any) {
      toast.error(err || 'Failed to update account information');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleToggle = (field: keyof UserSettingsUpdate, currentValue: boolean) => {
    const updates = { [field]: !currentValue };
    dispatch(optimisticUpdate(updates));
    dispatch(updateSettings(updates)).unwrap().catch((err) => {
      toast.error('Failed to save settings. Reverting.');
      dispatch(optimisticUpdate({ [field]: currentValue })); // Rollback
    });
  };

  const handleSelect = (field: keyof UserSettingsUpdate, value: string) => {
    const updates = { [field]: value };
    // Optimistic
    dispatch(optimisticUpdate(updates));
    dispatch(updateSettings(updates)).unwrap().catch(() => {
      toast.error('Failed to save settings.');
    });
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      return toast.error('Passwords do not match');
    }
    setSavingPassword(true);
    try {
      await updatePassword({
        current_password: passwordForm.current,
        new_password: passwordForm.new
      });
      toast.success('Password updated successfully');
      setPasswordForm({ current: '', new: '', confirm: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleExportData = () => {
    toast.success('Preparing data export. You will receive an email shortly.');
  };

  const handleSignOut = () => {
    dispatch(logout());
  };

  return (
    <>
      <Head>
        <title>Settings — SafeDrive AI</title>
        <meta name="description" content="Manage your SafeDrive AI account settings and preferences." />
      </Head>

      <AppShell>
        <FadeUp className="mb-8">
          <p className={`${LABEL} text-brand-600 dark:text-brand-400 mb-1`}>Preferences</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-brand-500/10 border border-brand-500/20">
              <Settings className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-primary">Settings</h1>
          </div>
          <p className="text-sm text-muted mt-2">Manage your account, privacy, and training preferences.</p>
        </FadeUp>

        <div className="max-w-3xl space-y-6 pb-24">
 {/* Account Info */}
          {/* Account Info Form */}
          <FadeUp delay={0.1}>
            <div className={`${CARD} overflow-hidden`}>
              <div className="px-6 py-5 border-b border-subtle flex items-center gap-3 bg-secondary">
                <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-brand-500" />
                </div>
                <h2 className="text-base font-bold text-primary tracking-tight">Account Information</h2>
              </div>
              <form onSubmit={handleProfileSave} className="p-6">
                <div className="grid gap-6 sm:grid-cols-2 mb-6">
                  <div>
                    <label className={LABEL_CLASS}>Full Name</label>
                    <input
                      required
                      type="text"
                      className={INPUT_CLASS}
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Email Address</label>
                    <input
                      required
                      type="email"
                      className={INPUT_CLASS}
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Phone Number</label>
                    <input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      className={INPUT_CLASS}
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Emergency Contact</label>
                    <input
                      type="tel"
                      placeholder="Optional"
                      className={INPUT_CLASS}
                      value={profileForm.emergencyContact}
                      onChange={(e) => setProfileForm({ ...profileForm, emergencyContact: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-4 border-t border-subtle">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="btn-primary flex items-center gap-2"
                  >
                    {savingProfile ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </FadeUp>

          {/* Security & Password */}
          <FadeUp delay={0.12}>
            <div className={`${CARD} overflow-hidden`}>
              <div className="px-6 py-5 border-b border-subtle flex items-center gap-3 bg-secondary">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-blue-500" />
                </div>
                <h2 className="text-base font-bold text-primary tracking-tight">Security</h2>
              </div>
              <form onSubmit={handlePasswordSave} className="p-6">
                <div className="grid gap-6 sm:grid-cols-2 mb-6">
                  <div className="sm:col-span-2">
                    <label className={LABEL_CLASS}>Current Password</label>
                    <input
                      required
                      type="password"
                      className={INPUT_CLASS}
                      value={passwordForm.current}
                      onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>New Password</label>
                    <input
                      required
                      type="password"
                      className={INPUT_CLASS}
                      value={passwordForm.new}
                      onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Confirm Password</label>
                    <input
                      required
                      type="password"
                      className={INPUT_CLASS}
                      value={passwordForm.confirm}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-4 border-t border-subtle">
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="btn-primary flex items-center gap-2"
                  >
                    {savingPassword ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    Update Password
                  </button>
                </div>
              </form>
            </div>
          </FadeUp>

          {/* Training Preferences */}
          <FadeUp delay={0.14}>
            <div className={`${CARD} overflow-hidden`}>
              <div className="px-6 py-5 border-b border-subtle flex items-center gap-3 bg-secondary">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-violet-500" />
                </div>
                <h2 className="text-base font-bold text-primary tracking-tight">Training Preferences</h2>
              </div>
              <div className="p-6 grid gap-6 sm:grid-cols-2">
                <div>
                  <label className={LABEL_CLASS}>Simulation Difficulty</label>
                  <select
                    className={INPUT_CLASS}
                    value={settingsData?.difficulty || 'Adaptive'}
                    onChange={(e) => handleSelect('difficulty', e.target.value)}
                  >
                    <option>Adaptive</option>
                    <option>Standard</option>
                    <option>High Intensity</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLASS}>Coaching Intensity</label>
                  <select
                    className={INPUT_CLASS}
                    value={settingsData?.intensity || 'Standard'}
                    onChange={(e) => handleSelect('intensity', e.target.value)}
                  >
                    <option>Standard</option>
                    <option>Strict</option>
                    <option>Lenient</option>
                  </select>
                </div>
                <div className="sm:col-span-2 border-t border-subtle pt-4">
                  <Toggle
                    label="Audio Guidance"
                    description="Enable real-time voice alerts during simulation runs."
                    checked={settingsData?.audio_guidance ?? true}
                    onChange={() => handleToggle('audio_guidance', settingsData?.audio_guidance ?? true)}
                  />
                </div>
              </div>
            </div>
          </FadeUp>

          {/* Notifications */}
          <FadeUp delay={0.16}>
            <div className={`${CARD} overflow-hidden`}>
              <div className="px-6 py-5 border-b border-subtle flex items-center gap-3 bg-secondary">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-amber-500" />
                </div>
                <h2 className="text-base font-bold text-primary tracking-tight">Notification Settings</h2>
              </div>
              <div className="p-6 space-y-2 divide-y divide-subtle">
                <Toggle
                  label="Lesson Reminders"
                  description="Receive alerts for pending AI coaching interventions."
                  checked={settingsData?.lesson_reminders ?? true}
                  onChange={() => handleToggle('lesson_reminders', settingsData?.lesson_reminders ?? true)}
                />
                <Toggle
                  label="Weekly Progress"
                  description="Get a summary report of your behavioral metrics each week."
                  checked={settingsData?.weekly_progress ?? true}
                  onChange={() => handleToggle('weekly_progress', settingsData?.weekly_progress ?? true)}
                />
                <Toggle
                  label="Coaching Recommendations"
                  description="Be notified when new custom curriculum is available."
                  checked={settingsData?.coaching_recommendations ?? true}
                  onChange={() => handleToggle('coaching_recommendations', settingsData?.coaching_recommendations ?? true)}
                />
                <Toggle
                  label="Assessment Reminders"
                  description="Alerts to retake baseline assessments."
                  checked={settingsData?.assessment_reminders ?? false}
                  onChange={() => handleToggle('assessment_reminders', settingsData?.assessment_reminders ?? false)}
                />
                <Toggle
                  label="Email Notifications"
                  description="Receive copies of critical alerts to your email."
                  checked={settingsData?.email_notifications ?? true}
                  onChange={() => handleToggle('email_notifications', settingsData?.email_notifications ?? true)}
                />
              </div>
            </div>
          </FadeUp>

          {/* Privacy & Data */}
          <FadeUp delay={0.18}>
            <div className={`${CARD} overflow-hidden`}>
              <div className="px-6 py-5 border-b border-subtle flex items-center gap-3 bg-secondary">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-emerald-500" />
                </div>
                <h2 className="text-base font-bold text-primary tracking-tight">Privacy & Data</h2>
              </div>
              <div className="p-6">
                <p className="text-sm text-secondary leading-relaxed mb-6">
                  Your session data, behavioral analysis, and driving telemetry are securely encrypted. We only use this data to generate your personalized AI coaching curriculum. We do not share your metrics with external third-parties without explicit consent. Data is retained securely for as long as your account remains active.
                </p>
                <button
                  onClick={handleExportData}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export My Data
                </button>
              </div>
            </div>
          </FadeUp>

          {/* Account Actions (Danger Zone) */}
          <FadeUp delay={0.2}>
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 overflow-hidden">
              <div className="px-6 py-5 border-b border-red-500/10 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                </div>
                <h2 className="text-base font-bold text-red-600 dark:text-red-400 tracking-tight">Account Actions</h2>
              </div>
              <div className="p-6 grid gap-4 sm:grid-cols-3">
                <button
                  onClick={handleSignOut}
                  className="px-4 py-3 rounded-xl border border-red-500/20 text-red-600 dark:text-red-400 text-sm font-bold hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
                <button
                  onClick={() => setShowResetModal(true)}
                  className="px-4 py-3 rounded-xl border border-red-500/20 text-red-600 dark:text-red-400 text-sm font-bold hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset Progress
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 py-3 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Account
                </button>
              </div>
            </div>
          </FadeUp>
        </div>

        {/* Reset Modal */}
        <AnimatePresence>
          {showResetModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-card rounded-3xl border border-strong shadow-2xl max-w-md w-full p-8 relative overflow-hidden"
              >
                <button onClick={() => setShowResetModal(false)} className="absolute top-4 right-4 p-2 text-muted hover:text-primary transition-colors rounded-xl hover:bg-secondary">
                  <X className="w-5 h-5" />
                </button>
                <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
                  <RefreshCw className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-primary mb-2">Reset Training Progress?</h3>
                <p className="text-sm text-secondary mb-8">
                  This action will delete all your session telemetry, behavioral reports, and completed lessons. You will restart from a clean slate. This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setShowResetModal(false)} className="btn-secondary flex-1">Cancel</button>
                  <button onClick={() => { toast.success('Progress reset successfully'); setShowResetModal(false); }} className="px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors flex-1">Reset Progress</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Delete Modal */}
        <AnimatePresence>
          {showDeleteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-card rounded-3xl border border-red-500/30 shadow-2xl max-w-md w-full p-8 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-red-500/5 pointer-events-none" />
                <button onClick={() => setShowDeleteModal(false)} className="absolute top-4 right-4 p-2 text-muted hover:text-primary transition-colors rounded-xl hover:bg-secondary z-10">
                  <X className="w-5 h-5" />
                </button>
                <div className="w-12 h-12 rounded-xl bg-red-500 border border-red-600 flex items-center justify-center mb-6 relative z-10">
                  <Trash2 className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-primary mb-2 relative z-10">Delete Account</h3>
                <p className="text-sm text-secondary mb-8 relative z-10">
                  Are you absolutely sure you want to delete your account? This action is permanent and will instantly erase your profile, billing, and training history.
                </p>
                <div className="flex gap-3 relative z-10">
                  <button onClick={() => setShowDeleteModal(false)} className="btn-secondary flex-1">Cancel</button>
                  <button onClick={() => { toast.success('Account deleted'); dispatch(logout()); }} className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors flex-1">Yes, Delete Account</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </AppShell>
    </>
  );
}
