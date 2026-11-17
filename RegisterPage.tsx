import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
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

export function RegisterPage() {
  const { signUp, isConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from || '/dashboard';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);

  const nameError =
    touched && fullName.trim().length < 2
      ? 'Please enter your full name.'
      : undefined;
  const emailError =
    touched && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ? 'Enter a valid email address.'
      : undefined;
  const passwordError =
    touched && password.length < 6
      ? 'Password must be at least 6 characters.'
      : undefined;
  const confirmError =
    touched && confirmPassword !== password
      ? 'Passwords do not match.'
      : undefined;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setServerError(null);
    setConfirmationMessage(null);

    if (
      fullName.trim().length < 2 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      password.length < 6 ||
      confirmPassword !== password
    ) {
      return;
    }

    setSubmitting(true);
    const { error, needsEmailConfirmation } = await signUp(fullName, email, password);
    setSubmitting(false);

    if (error) {
      setServerError(error);
      return;
    }

    if (needsEmailConfirmation) {
      setConfirmationMessage(
        'Account created! Please check your inbox and verify your email address before signing in.'
      );
      return;
    }

    navigate(redirectTo, { replace: true });
  };

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-4">
      <div className="lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-left gap-4">
        <PinkSuitcaseMascot mood="helper" size="lg" />
        <h1 className="text-3xl font-bold font-display text-slate-50">
          Create your Retrieve Bag account
        </h1>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
          Register once to submit baggage reports, receive automated match alerts, and approve
          safe passenger communication.
        </p>
      </div>

      <Card padding="lg" className="lg:col-span-7">
        <CardHeader>
          <CardTitle className="text-2xl">Passenger Registration</CardTitle>
          <CardDescription>
            Your contact details stay hidden until you approve a match connection.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!isConfigured && (
            <Alert
              tone="warning"
              className="mb-5"
              title="Supabase environment variables missing"
              description="Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable registration."
            />
          )}

          {serverError && (
            <Alert
              tone="error"
              className="mb-5"
              title="Registration failed"
              description={serverError}
            />
          )}

          {confirmationMessage ? (
            <div className="flex flex-col gap-5">
              <Alert
                tone="success"
                title="Verification email sent"
                description={confirmationMessage}
              />
              <Button variant="primary" onClick={() => navigate('/login')}>
                Go to Sign In
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <Input
                label="Full Name"
                type="text"
                required
                autoComplete="name"
                placeholder="Athulya Anil"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                leftIcon={<User className="w-4 h-4" />}
                error={nameError}
              />

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
                autoComplete="new-password"
                placeholder="At least 6 characters"
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

              <Input
                label="Confirm Password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                error={confirmError}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-2"
                isLoading={submitting}
                disabled={!isConfigured}
              >
                Create Account
              </Button>
            </form>
          )}

          <div className="mt-6 pt-5 border-t border-lavender-300/12 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-300">
            <span>Already have an account?</span>
            <Link
              to="/login"
              state={{ from: redirectTo }}
              className="font-semibold text-pink-300 hover:text-pink-200 underline underline-offset-4"
            >
              Sign in instead
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
