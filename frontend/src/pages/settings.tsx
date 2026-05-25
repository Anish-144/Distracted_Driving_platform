import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAppSelector } from '@/store';
import AppShell from '@/components/layout/AppShell';
import { FadeUp } from '@/components/motion/ScrollReveal';
import { Settings, User, Shield, Bell } from 'lucide-react';

const CARD = 'bg-primary rounded-2xl border border-subtle ';
const LABEL = 'text-[11px] font-bold uppercase tracking-[0.12em] text-muted';

export default function SettingsPage() {
 const router = useRouter();
 const { isAuthenticated, user } = useAppSelector((state) => state.auth);
 const [isMounted, setIsMounted] = useState(false);

 useEffect(() => { setIsMounted(true); }, []);

 useEffect(() => {
 if (!isAuthenticated && isMounted) {
 router.replace('/auth/login');
 }
 }, [isAuthenticated, router, isMounted]);

 if (!isMounted) return null;
 if (!isAuthenticated || !user) {
 return (
 <div className="min-h-screen flex items-center justify-center" style={{ background: '#f0fdf9' }}>
 <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
 </div>
 );
 }

 return (
 <>
 <Head>
 <title>Settings — SafeDrive AI</title>
 <meta name="description" content="Manage your SafeDrive AI account settings and preferences." />
 </Head>

 <AppShell>
 <FadeUp className="mb-8">
 <p className={`${LABEL} text-emerald-600 mb-1`}>Preferences</p>
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#ecfdf5', border: '1px solid #d1fae5' }}>
 <Settings className="w-5 h-5 text-emerald-600" />
 </div>
 <h1 className="text-2xl font-bold tracking-tight text-primary">Settings</h1>
 </div>
 <p className="text-sm text-muted mt-2">Manage your account and privacy preferences.</p>
 </FadeUp>

 <div className="max-w-3xl space-y-6">
 {/* Account Info */}
 <FadeUp delay={0.1}>
 <div className={`${CARD} overflow-hidden`}>
 <div className="px-6 py-5 border-b border-subtle flex items-center gap-3 bg-secondary">
 <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
 <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
 </div>
 <h2 className="text-base font-bold text-primary tracking-tight">Account Information</h2>
 </div>
 <div className="p-6 grid gap-6 sm:grid-cols-2">
 <div>
 <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Full Name</label>
 <p className="text-primary font-medium text-sm">{user.name}</p>
 </div>
 <div>
 <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Email Address</label>
 <p className="text-primary font-medium text-sm">{user.email}</p>
 </div>
 <div className="sm:col-span-2">
 <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Driver Profile</label>
 <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
 <p className="text-emerald-700 font-semibold text-sm capitalize">
 {user.profile_type === 'unknown' ? 'Not assessed yet — complete a simulation' : user.profile_type.replace('_', ' ')}
 </p>
 </div>
 </div>
 </div>
 </div>
 </FadeUp>

 {/* Privacy */}
 <FadeUp delay={0.15}>
 <div className={`${CARD} overflow-hidden`}>
 <div className="px-6 py-5 border-b border-subtle flex items-center gap-3 bg-secondary">
 <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
 <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
 </div>
 <h2 className="text-base font-bold text-primary tracking-tight">Privacy & Safety</h2>
 </div>
 <div className="p-6">
 <p className="text-sm text-secondary leading-relaxed max-w-2xl">
 Your session data and behavioral analysis are stored securely and used only to personalize
 your training experience. No data is shared with third parties.
 </p>
 </div>
 </div>
 </FadeUp>

 {/* Notifications */}
 <FadeUp delay={0.2}>
 <div className={`${CARD} overflow-hidden`}>
 <div className="px-6 py-5 border-b border-subtle flex items-center gap-3 bg-secondary">
 <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
 <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400" />
 </div>
 <h2 className="text-base font-bold text-primary tracking-tight">Notifications</h2>
 </div>
 <div className="p-6">
 <p className="text-sm text-muted max-w-2xl">
 Notification preferences will be available in a future update.
 </p>
 </div>
 </div>
 </FadeUp>
 </div>
 </AppShell>
 </>
 );
}
