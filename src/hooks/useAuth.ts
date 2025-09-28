/**
 * Professional Authentication Hook
 * Provides secure authentication state management with automatic token refresh
 */

import { useState, useEffect, useCallback } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { User } from '@/types';
import { auth, db } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { AuthenticationError, ValidationError } from '@/types';

interface AuthState {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

interface AuthActions {
  signUp: (email: string, password: string, userData: Partial<User>) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

export function useAuth(): AuthState & AuthActions {
  const [state, setState] = useState<AuthState>({
    user: null,
    supabaseUser: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });

  // Initialize authentication state
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get current session
        const { data: { session }, error } = await auth.supabase.auth.getSession();

        if (error) {
          logger.error('Failed to get session', {
            component: 'useAuth',
            action: 'getSession',
            metadata: { error: error.message }
          });
          throw new AuthenticationError(error.message);
        }

        if (session?.user && mounted) {
          await handleAuthSuccess(session.user, session);
        } else if (mounted) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            isAuthenticated: false
          }));
        }
      } catch (error) {
        if (mounted) {
          logger.error('Authentication initialization failed', {
            component: 'useAuth',
            action: 'initialize',
            metadata: { error }
          });

          setState(prev => ({
            ...prev,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Authentication failed'
          }));
        }
      }
    };

    initializeAuth();

    // Set up auth state listener
    const { data: { subscription } } = auth.supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        logger.info('Auth state changed', {
          component: 'useAuth',
          action: 'authStateChange',
          metadata: {
            event,
            hasSession: !!session,
            userId: session?.user?.id
          }
        });

        try {
          switch (event) {
            case 'SIGNED_IN':
              if (session?.user) {
                await handleAuthSuccess(session.user, session);
              }
              break;

            case 'SIGNED_OUT':
              handleAuthSignOut();
              break;

            case 'TOKEN_REFRESHED':
              if (session?.user) {
                setState(prev => ({
                  ...prev,
                  session,
                  supabaseUser: session.user
                }));
              }
              break;

            case 'USER_UPDATED':
              if (session?.user) {
                setState(prev => ({
                  ...prev,
                  supabaseUser: session.user
                }));
                // Refresh profile data
                await loadUserProfile(session.user.id);
              }
              break;

            default:
              break;
          }
        } catch (error) {
          logger.error('Error handling auth state change', {
            component: 'useAuth',
            action: 'authStateChangeError',
            metadata: { event, error }
          });

          setState(prev => ({
            ...prev,
            error: error instanceof Error ? error.message : 'Authentication error'
          }));
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthSuccess = async (supabaseUser: SupabaseUser, session: Session) => {
    try {
      setState(prev => ({
        ...prev,
        supabaseUser,
        session,
        isAuthenticated: true,
        isLoading: true, // Still loading user profile
        error: null
      }));

      await loadUserProfile(supabaseUser.id);
    } catch (error) {
      logger.error('Failed to load user profile after auth', {
        userId: supabaseUser.id,
        component: 'useAuth',
        action: 'loadProfileAfterAuth',
        metadata: { error }
      });

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load user profile'
      }));
    }
  };

  const handleAuthSignOut = () => {
    setState({
      user: null,
      supabaseUser: null,
      session: null,
      isLoading: false,
      isAuthenticated: false,
      error: null
    });

    logger.info('User signed out', {
      component: 'useAuth',
      action: 'signOut'
    });
  };

  const loadUserProfile = async (userId: string) => {
    try {
      const userProfile = await db.getUserProfile(userId);

      setState(prev => ({
        ...prev,
        user: userProfile,
        isLoading: false,
        error: null
      }));

      logger.info('User profile loaded', {
        userId,
        component: 'useAuth',
        action: 'loadProfile'
      });
    } catch (error) {
      logger.error('Failed to load user profile', {
        userId,
        component: 'useAuth',
        action: 'loadProfile',
        metadata: { error }
      });

      // If profile doesn't exist, this might be a new user
      if (error instanceof ValidationError && error.message.includes('not found')) {
        setState(prev => ({
          ...prev,
          user: null,
          isLoading: false,
          error: 'User profile not found. Please complete setup.'
        }));
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load profile'
        }));
      }
    }
  };

  const signUp = useCallback(async (
    email: string,
    password: string,
    userData: Partial<User>
  ): Promise<void> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Validate input
      if (!email || !password) {
        throw new ValidationError('Email and password are required');
      }

      if (password.length < 6) {
        throw new ValidationError('Password must be at least 6 characters');
      }

      if (!userData.name || !userData.partner_name) {
        throw new ValidationError('Name and partner name are required');
      }

      // Sign up with Supabase Auth
      const { user: supabaseUser, session } = await auth.signUp(email, password);

      // Create user profile
      const userProfile = await db.createUserProfile({
        id: supabaseUser.id,
        email: supabaseUser.email!,
        name: userData.name!,
        partner_name: userData.partner_name!,
        partner_phone: userData.partner_phone,
        daily_call_limit: userData.daily_call_limit || 3,
        active_days: userData.active_days || 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
        morning_start: userData.morning_start || '09:00',
        evening_end: userData.evening_end || '21:00',
        preferred_platforms: userData.preferred_platforms || 'phone,whatsapp',
        timezone: userData.timezone || 'UTC',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1
      });

      setState(prev => ({
        ...prev,
        user: userProfile,
        supabaseUser,
        session,
        isAuthenticated: true,
        isLoading: false,
        error: null
      }));

      logger.info('User signed up successfully', {
        userId: supabaseUser.id,
        component: 'useAuth',
        action: 'signUp',
        metadata: { email }
      });
    } catch (error) {
      logger.error('Sign up failed', {
        component: 'useAuth',
        action: 'signUp',
        metadata: { email, error }
      });

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Sign up failed'
      }));

      throw error;
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      if (!email || !password) {
        throw new ValidationError('Email and password are required');
      }

      const { user: supabaseUser, session } = await auth.signIn(email, password);

      // Load user profile
      await loadUserProfile(supabaseUser.id);

      setState(prev => ({
        ...prev,
        supabaseUser,
        session,
        isAuthenticated: true,
        error: null
      }));

      logger.info('User signed in successfully', {
        userId: supabaseUser.id,
        component: 'useAuth',
        action: 'signIn',
        metadata: { email }
      });
    } catch (error) {
      logger.error('Sign in failed', {
        component: 'useAuth',
        action: 'signIn',
        metadata: { email, error }
      });

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Sign in failed'
      }));

      throw error;
    }
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      await auth.signOut();

      // Clear any cached data
      await db.cleanup();

      setState({
        user: null,
        supabaseUser: null,
        session: null,
        isLoading: false,
        isAuthenticated: false,
        error: null
      });

      logger.info('User signed out successfully', {
        component: 'useAuth',
        action: 'signOut'
      });
    } catch (error) {
      logger.error('Sign out failed', {
        component: 'useAuth',
        action: 'signOut',
        metadata: { error }
      });

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Sign out failed'
      }));

      throw error;
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<User>): Promise<void> => {
    if (!state.user) {
      throw new AuthenticationError('User not authenticated');
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const updatedUser = await db.updateUserProfile(
        state.user.id,
        updates,
        state.user.version
      );

      setState(prev => ({
        ...prev,
        user: updatedUser,
        isLoading: false,
        error: null
      }));

      logger.info('User profile updated successfully', {
        userId: state.user.id,
        component: 'useAuth',
        action: 'updateProfile',
        metadata: { updatedFields: Object.keys(updates) }
      });
    } catch (error) {
      logger.error('Profile update failed', {
        userId: state.user.id,
        component: 'useAuth',
        action: 'updateProfile',
        metadata: { error, updates }
      });

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Profile update failed'
      }));

      throw error;
    }
  }, [state.user]);

  const refreshProfile = useCallback(async (): Promise<void> => {
    if (!state.supabaseUser) {
      throw new AuthenticationError('User not authenticated');
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await loadUserProfile(state.supabaseUser.id);
    } catch (error) {
      logger.error('Profile refresh failed', {
        userId: state.supabaseUser.id,
        component: 'useAuth',
        action: 'refreshProfile',
        metadata: { error }
      });

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Profile refresh failed'
      }));

      throw error;
    }
  }, [state.supabaseUser]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    signUp,
    signIn,
    signOut,
    updateProfile,
    refreshProfile,
    clearError
  };
}