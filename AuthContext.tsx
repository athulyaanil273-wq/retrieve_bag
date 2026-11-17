import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/src/lib/supabase';
import type { UserProfile } from '@/src/types/baggage';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    fullName: string,
    email: string,
    password: string
  ) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured);

  const loadOrCreateProfile = useCallback(async (authUser: User) => {
    if (!supabase) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (!error && data) {
      setProfile(data as UserProfile);
      return;
    }

    // Ensure profile exists if user signed up before profile row was inserted
    const fallbackName =
      (authUser.user_metadata?.full_name as string | undefined) ||
      authUser.email?.split('@')[0] ||
      'Traveler';

    const { data: inserted } = await supabase
      .from('profiles')
      .upsert(
        {
          id: authUser.id,
          full_name: fallbackName,
          email: authUser.email ?? '',
          role: 'passenger',
        },
        { onConflict: 'id' }
      )
      .select('*')
      .maybeSingle();

    if (inserted) {
      setProfile(inserted as UserProfile);
    } else {
      setProfile({
        id: authUser.id,
        full_name: fallbackName,
        email: authUser.email ?? '',
        role: 'passenger',
        created_at: authUser.created_at,
      });
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!isMounted) return;
        setSession(data.session);
        setUser(data.session?.user ?? null);
        if (data.session?.user) {
          await loadOrCreateProfile(data.session.user);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        void loadOrCreateProfile(nextSession.user);
      } else {
        setProfile(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadOrCreateProfile]);

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return {
        error:
          'Supabase is not configured yet. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      return { error: error.message };
    }
    return { error: null };
  };

  const signUp = async (fullName: string, email: string, password: string) => {
    if (!supabase) {
      return {
        error:
          'Supabase is not configured yet. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
        needsEmailConfirmation: false,
      };
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
      },
    });

    if (error) {
      return { error: error.message, needsEmailConfirmation: false };
    }

    if (data.user && data.session) {
      await supabase.from('profiles').upsert(
        {
          id: data.user.id,
          full_name: fullName.trim(),
          email: email.trim(),
          role: 'passenger',
        },
        { onConflict: 'id' }
      );
    }

    return {
      error: null,
      needsEmailConfirmation: Boolean(data.user && !data.session),
    };
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await loadOrCreateProfile(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        isConfigured: isSupabaseConfigured,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
