import { useState, FormEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Mail, Lock, ChevronRight, CheckCircle2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from '../components/Logo';

export function Auth() {
  const [view, setView] = useState<'login' | 'signup' | 'forgot_password'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
    const errorDescription = hashParams.get('error_description');
    if (errorDescription) {
      setError(decodeURIComponent(errorDescription.replace(/\+/g, ' ')));
    }
  }, []);

  // If already logged in, push straight to dashboard
  if (!loading && user) {
    return <Navigate to="/app/dashboard" replace />;
  }

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/app/dashboard`
        }
      });
      if (error) throw error;
    } catch (err: any) {
      console.error('Google Auth error:', err);
      setError(err.message && err.message !== '{}' ? err.message : 'An error occurred during Google authentication. Check console for details.');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (view === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // Navigation will be handled by the context checking user state
      } else if (view === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
            emailRedirectTo: `${window.location.origin}/app/dashboard`
          }
        });
        if (error) throw error;
        
        if (!data.session) {
          setMessage('Account created! Please check your email to confirm your account before logging in.');
          setView('login');
        }
        // If data.session exists, navigation will be handled by context checking user state
      } else if (view === 'forgot_password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/app/dashboard`,
        });
        if (error) throw error;
        setMessage('Password reset link sent! Please check your email.');
        setView('login');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let errorMessage = err.message;
      if (!errorMessage || errorMessage === '{}') {
        errorMessage = typeof err === 'object' ? JSON.stringify(err) : String(err);
      }
      if (errorMessage === '{}') {
        errorMessage = 'An error occurred during authentication. Check console for details.';
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex font-sans overflow-hidden">
      {/* Left panel - Image/Brand */}
      <div className="hidden lg:flex w-1/2 relative bg-black items-center justify-center overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2940&auto=format&fit=crop" 
          alt="Leadership" 
          className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-luminosity" 
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-transparent" />
        
        <div className="relative z-10 p-16 max-w-2xl">
          <Logo className="w-12 h-12 text-[#0084FF] mb-8" />
          <h1 className="text-5xl font-semibold text-white tracking-tight mb-6 leading-tight">
            Elevate your <br/>leadership potential.
          </h1>
          <p className="text-xl text-white/50 mb-12 max-w-md">
            Join thousands of executives mastering strategic acumen through our cinematic masterclasses.
          </p>

          <div className="space-y-4">
            {['Optimized for global offline viewing', 'Real-time cross-device progress sync', 'Verified PDF certifications'].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + (i * 0.1) }}
                className="flex items-center gap-3 text-white/70"
              >
                <CheckCircle2 size={18} className="text-blue-500" />
                {feature}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
        <div className="absolute top-8 right-8">
          {view !== 'forgot_password' && (
            <button 
              onClick={() => setView(view === 'login' ? 'signup' : 'login')}
              className="text-sm font-medium text-white/50 hover:text-white transition-colors"
            >
              {view === 'login' ? "Don't have an account? Sign up" : "Already have an account? Log in"}
            </button>
          )}
        </div>

        <div className="w-full max-w-md">
          <Logo className="lg:hidden w-10 h-10 text-[#0084FF] mb-8" />
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {view === 'forgot_password' && (
              <button 
                onClick={() => setView('login')}
                className="flex items-center gap-2 text-sm text-white/50 hover:text-white mb-6 transition-colors"
              >
                <ArrowLeft size={16} /> Back to log in
              </button>
            )}

            <h2 className="text-3xl font-semibold text-white mb-2 tracking-tight">
              {view === 'login' && 'Welcome back'}
              {view === 'signup' && 'Create an account'}
              {view === 'forgot_password' && 'Reset your password'}
            </h2>
            <p className="text-white/50 text-sm mb-6">
              {view === 'login' && 'Enter your credentials to access your courses.'}
              {view === 'signup' && 'Start your journey with PDS Academy.'}
              {view === 'forgot_password' && 'Enter your email address and we will send you a link to reset your password.'}
            </p>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}
            
            {message && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {view === 'signup' && (
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-2">Full Name</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      name="name"
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-white/30 transition-colors"
                      placeholder="Jane Doe"
                    />
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-xs font-medium text-white/60 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                  <input 
                    type="email" 
                    name="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-white/30 transition-colors"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              {view !== 'forgot_password' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-white/60">Password</label>
                    {view === 'login' && (
                      <button type="button" onClick={() => setView('forgot_password')} className="text-xs text-blue-400 hover:text-blue-300">Forgot password?</button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                    <input 
                      type={showPassword ? "text" : "password"}
                      name="password"
                      autoComplete={view === 'login' ? "current-password" : "new-password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-12 text-white focus:outline-none focus:border-white/30 transition-colors"
                      placeholder="••••••••"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-white text-black py-3.5 rounded-xl font-medium hover:bg-gray-200 transition-all active:scale-[0.98] disabled:opacity-70 mt-4"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    {view === 'login' && 'Log In'}
                    {view === 'signup' && 'Create Account'}
                    {view === 'forgot_password' && 'Send Reset Link'}
                    <ChevronRight size={18} />
                  </>
                )}
              </button>
            </form>

            {view !== 'forgot_password' && (
              <div className="mt-8 pt-8 border-t border-white/10 relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#09090b] px-4 text-xs tracking-wider text-white/40 uppercase font-medium">
                  Or continue with
                </div>
                <button type="button" onClick={handleGoogleSignIn} className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white py-3 rounded-xl transition-colors font-medium text-sm">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
