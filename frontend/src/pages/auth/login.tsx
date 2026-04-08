import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAppDispatch } from '@/store';
import { loginSuccess, setLoading, setError } from '@/store/authSlice';
import { login } from '@/api/auth';
import { ShieldCheck, Mail, Lock, Loader2 } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setIsSubmitting(true);
    dispatch(setLoading(true));
    try {
      const response = await login(data.email, data.password);
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
      toast.success(`Welcome back, ${response.name}! 🚗`);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login attempt failed:', err);
      const msg = err?.response?.data?.detail || 'Login failed. Please check your credentials.';
      dispatch(setError(msg));
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBypass = () => {
    dispatch(
      loginSuccess({
        user: {
          id: 'dev-user-id',
          name: 'Developer Test',
          email: 'test@example.com',
          profile_type: 'moderate',
        },
        token: 'mock-dev-token',
      })
    );
    toast.success('Bypassing login for testing purposes! ⚡');
    router.push('/dashboard');
  };

  return (
    <>
      <Head>
        <title>Login — SafeDrive AI</title>
        <meta name="description" content="Sign in to your SafeDrive AI account to continue your training." />
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-surface-900 px-4">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/8 rounded-full blur-3xl" />
        </div>

        <div className="w-full max-w-md animate-slide-up relative z-10">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mb-4 shadow-brand animate-pulse-glow">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">SafeDrive AI</h1>
            <p className="text-gray-400 text-sm mt-1">Sign in to your account</p>
          </div>

          {/* Card */}
          <div className="card">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
                {errors.email && (
                  <p className="mt-1.5 text-sm text-red-400">{errors.email.message}</p>
                )}
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
                    placeholder="••••••••"
                    className="input-field pl-10"
                    {...register('password')}
                  />
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-sm text-red-400">{errors.password.message}</p>
                )}
              </div>

              {/* Submit */}
              <button
                id="login-submit-btn"
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>

              <button
                type="button"
                onClick={handleBypass}
                className="w-full py-2.5 px-4 text-sm font-medium text-brand-400 bg-brand-400/10 border border-brand-400/20 rounded-xl hover:bg-brand-400/20 transition-all duration-300"
              >
                Bypass (Dev Test)
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-surface-500" />
              <span className="text-gray-500 text-sm">or</span>
              <div className="flex-1 h-px bg-surface-500" />
            </div>

            <p className="text-center text-sm text-gray-400">
              Don&apos;t have an account?{' '}
              <Link href="/auth/register" className="text-brand-400 hover:text-brand-300 font-medium">
                Create one free
              </Link>
            </p>
          </div>

          <p className="text-center text-xs text-gray-600 mt-6">
            AI-Powered Distracted Driving Training Platform
          </p>
        </div>
      </div>
    </>
  );
}
