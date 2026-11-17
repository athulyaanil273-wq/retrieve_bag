import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@/src/components/ui';
import { PinkSuitcaseMascot } from '@/src/components/illustrations';
import { useAuth } from '@/src/contexts/AuthContext';

export function LoginPage() {
  const { signIn, isConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const emailError =
    touched && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ? 'Enter a valid email address.'
      : undefined;

  const passwordError =
    touched && password.length < 6
      ? 'Password must be at least 6 characters.'
      : undefined;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setServerError(null);

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      password.length < 6
    ) {
      return;
    }

    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);

    if (error) {
      setServerError(error);
      return;
    }

    navigate(redirectTo, { replace: true });
  };

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-4">
      <div className="lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-left gap-4">
        <PinkSuitcaseMascot mood="greeting" size="lg" />
        <h1 className="text-3xl font-bold font-display text-slate-50">
          Welcome back to Retrieve Bag
        </h1>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
          Sign in to manage your lost, found, or exchanged baggage reports, inspect potential
          matches, and approve communication requests safely.
        </p>
      </div>

      <Card padding="lg" className="lg:col-span-7">
        <CardHeader>
          <CardTitle className="text-2xl">Passenger Sign In</CardTitle>
          <CardDescription>
            Use your Retrieve Bag account credentials to access your dashboard.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!isConfigured && (
            <Alert
              tone="warning"
              className="mb-5"
              title="Supabase environment variables missing"
              description="Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable live authentication."
            />
          )}

          {serverError && (
            <Alert
              tone="error"
              className="mb-5"
              title="Sign in failed"
              description={serverError}
            />
          )}

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            <Input
              label="Email Address"
              type="email"
              required
              autoComplete="email"
              placeholder="traveler@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              error={emailError}
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              error={passwordError}
              rightAdornment={
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="p-1 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-1"
              isLoading={submitting}
              disabled={!isConfigured}
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-lavender-300/12 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-300">
            <span>New to Retrieve Bag?</span>
            <Link
              to="/register"
              state={{ from: redirectTo }}
              className="font-semibold text-pink-300 hover:text-pink-200 underline underline-offset-4"
            >
              Create a passenger account
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
