import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAppDispatch } from '@/store';
import { loginSuccess } from '@/store/authSlice';
import { register as registerUser } from '@/api/auth';
import { ShieldCheck, User, Mail, Lock, Loader2 } from 'lucide-react';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterForm) => {
    setIsSubmitting(true);
    try {
      const response = await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      dispatch(
        loginSuccess({
          user: {
            id: response.user_id,
            name: response.name,
            email: response.email,
            profile_type: response.profile_type,
          },
          token: response.access_token,
        })
      );
      toast.success(`Welcome aboard, ${response.name}! Let's get started. 🚀`);
      router.push('/dashboard');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Registration failed. Please try again.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Create Account — SafeDrive AI</title>
        <meta name="description" content="Join SafeDrive AI to start your distracted driving prevention training." />
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-surface-900 px-4 py-12">
        {/* Background glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-blue-500/8 rounded-full blur-3xl" />
        </div>

        <div className="w-full max-w-md animate-slide-up relative z-10">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mb-4 shadow-brand">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Create your account</h1>
            <p className="text-gray-400 text-sm mt-1">Start your safe driving journey today</p>
          </div>

          <div className="card">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    className="input-field pl-10"
                    {...register('name')}
                  />
                </div>
                {errors.name && <p className="mt-1.5 text-sm text-red-400">{errors.name.message}</p>}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="input-field pl-10"
                    {...register('email')}
                  />
                </div>
                {errors.email && <p className="mt-1.5 text-sm text-red-400">{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    id="password"
                    type="password"
                    placeholder="Min. 6 characters"
                    className="input-field pl-10"
                    {...register('password')}
                  />
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-sm text-red-400">{errors.password.message}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter password"
                    className="input-field pl-10"
                    {...register('confirmPassword')}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1.5 text-sm text-red-400">{errors.confirmPassword.message}</p>
                )}
              </div>

              <button
                id="register-submit-btn"
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-surface-500" />
              <span className="text-gray-500 text-sm">or</span>
              <div className="flex-1 h-px bg-surface-500" />
            </div>

            <p className="text-center text-sm text-gray-400">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-brand-400 hover:text-brand-300 font-medium">
                Sign in
              </Link>
            </p>
          </div>

          {/* Features teaser */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              { icon: '🎯', label: 'Behavioral Training' },
              { icon: '🤖', label: 'AI Voice Agents' },
              { icon: '📊', label: 'Progress Tracking' },
            ].map((feat) => (
              <div key={feat.label} className="text-center p-3 glass rounded-xl">
                <div className="text-xl mb-1">{feat.icon}</div>
                <div className="text-xs text-gray-400">{feat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
