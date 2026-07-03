import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, Lock, ArrowRight, CheckCircle2, Mail, Eye, EyeOff, ChevronRight, Shield } from 'lucide-react';
import { useState, FormEvent, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { usePaystackPayment } from 'react-paystack';
import { useFlutterwave, closePaymentModal } from 'flutterwave-react-v3';
import { useCourses } from '../contexts/CourseContext';

export function PublicCheckout() {
  const { courseId } = useParams();
  const { courses, loading: coursesLoading } = useCourses();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [currency, setCurrency] = useState<'USD' | 'NGN'>('NGN');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Auth form state
  const [view, setView] = useState<'signup' | 'login'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoadingState, setAuthLoadingState] = useState(false);

  const course = courses.find(c => c.id === courseId);

  // Payment configs
  const paystackConfig = {
    reference: (new Date()).getTime().toString(),
    email: user?.email || '',
    amount: (course?.price?.ngn || 0) * 100,
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '',
    currency: 'NGN',
    metadata: {
      custom_fields: [
        { display_name: "Course ID", variable_name: "course_id", value: course?.id || "" },
        { display_name: "User ID", variable_name: "user_id", value: user?.id || "" }
      ],
      user_id: user?.id || "",
      course_id: course?.id || ""
    }
  };

  const flutterwaveConfig = {
    public_key: import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY || '',
    tx_ref: (new Date()).getTime().toString(),
    amount: course?.price?.usd || 0,
    currency: 'USD',
    payment_options: 'card,mobilemoney,ussd',
    customer: {
      email: user?.email || '',
      name: user?.user_metadata?.full_name || '',
      phone_number: '',
    },
    customizations: {
      title: 'PDS Academy',
      description: `Payment for ${course?.title}`,
      logo: 'https://st2.depositphotos.com/4403291/7418/v/450/depositphotos_74189661-stock-illustration-online-shop-log.jpg',
    },
    meta: {
      user_id: user?.id || "",
      course_id: course?.id || ""
    }
  };

  const initializePaystack = usePaystackPayment(paystackConfig);
  const handleFlutterwavePayment = useFlutterwave(flutterwaveConfig);

  const handleSuccess = (reference: any) => {
    setIsProcessing(false);
    setIsSuccess(true);
    
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 6);
    supabase.from('enrollments').insert({
      user_id: user!.id,
      course_id: course?.id || '',
      progress: 0,
      expires_at: expiresAt.toISOString(),
    }).then(({ error }) => {
      if (error) console.error(error);
      setTimeout(() => {
        navigate('/app/my-courses');
      }, 2000);
    });
  };

  const handlePaymentClose = () => {
    setIsProcessing(false);
  };

  const handleCheckout = () => {
    if (!user) return;
    setIsProcessing(true);

    if (currency === 'NGN') {
      if (!import.meta.env.VITE_PAYSTACK_PUBLIC_KEY) {
        alert("Paystack payment gateway not configured.");
        setIsProcessing(false);
        return;
      }
      initializePaystack({ onSuccess: handleSuccess, onClose: handlePaymentClose });
    } else {
      if (!import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY) {
        alert("Flutterwave payment gateway not configured.");
        setIsProcessing(false);
        return;
      }
      handleFlutterwavePayment({
        callback: (response) => {
          handleSuccess(response);
          closePaymentModal();
        },
        onClose: handlePaymentClose,
      });
    }
  };

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthLoadingState(true);
    setAuthError(null);

    try {
      if (view === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (view === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          }
        });
        if (error) throw error;
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setAuthError(err.message || 'An error occurred during authentication.');
    } finally {
      setAuthLoadingState(false);
    }
  };

  if (coursesLoading || authLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Course not found</h2>
          <button onClick={() => navigate('/')} className="text-blue-400 hover:underline">Return home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex font-sans overflow-hidden text-white selection:bg-white/20">
      {/* Left panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative overflow-y-auto">
        <div className="w-full max-w-md my-auto">
          <div className="mb-8 cursor-pointer w-fit" onClick={() => navigate('/')}>
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-black font-bold text-xl mb-2">
              P
            </div>
            <span className="font-medium tracking-tight text-white/50 text-sm">PDS Academy</span>
          </div>

          <AnimatePresence mode="wait">
            {isSuccess ? (
              <motion.div 
                key="success"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full py-12 flex flex-col items-center justify-center text-center"
              >
                <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 size={32} />
                </div>
                <h2 className="text-2xl font-semibold text-white mb-2">Payment Successful</h2>
                <p className="text-white/50 mb-8 max-w-sm">You now have access to {course?.title}. Redirecting you to your dashboard...</p>
              </motion.div>
            ) : user ? (
              <motion.div
                key="payment"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <h2 className="text-3xl font-semibold text-white mb-2 tracking-tight">Complete Payment</h2>
                <p className="text-white/50 text-sm mb-8">
                  You're logged in as <b>{user.email}</b>.{' '}
                  <button onClick={() => supabase.auth.signOut()} className="text-blue-400 hover:underline">Not you?</button>
                </p>

                <h3 className="text-sm font-medium text-white mb-4">Select Currency</h3>
                <div className="flex bg-white/5 p-1 rounded-lg border border-white/10 mb-8">
                  <button 
                    onClick={() => setCurrency('NGN')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${currency === 'NGN' ? 'bg-white/10 text-white shadow-sm border border-white/5' : 'text-white/50 hover:text-white/80'}`}
                  >
                    NGN (₦)
                  </button>
                  <button 
                    onClick={() => setCurrency('USD')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${currency === 'USD' ? 'bg-white/10 text-white shadow-sm border border-white/5' : 'text-white/50 hover:text-white/80'}`}
                  >
                    USD ($)
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="p-4 rounded-xl border-dashed border border-blue-500/30 bg-blue-500/5 text-blue-200/80 text-sm text-center leading-relaxed">
                    Secure checkout powered by <b>{currency === 'NGN' ? 'Paystack' : 'Flutterwave'}</b>. You will be redirected to complete your {currency} payment securely.
                  </div>

                  <button 
                    onClick={handleCheckout}
                    disabled={isProcessing}
                    className="w-full py-4 bg-white text-black font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 active:scale-[0.98] transition-all disabled:opacity-70 disabled:active:scale-100"
                  >
                    {isProcessing ? (
                      <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    ) : (
                      <>Pay {currency === 'NGN' ? `₦${course?.price?.ngn?.toLocaleString()}` : `$${course?.price?.usd}`} <ArrowRight size={18} /></>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-2 text-xs text-white/40">
                    <Lock size={12} />
                    Secured via SSL • AES-256 Encryption
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="auth"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-3xl font-semibold text-white tracking-tight">
                    {view === 'signup' ? 'Create Account' : 'Log In'}
                  </h2>
                </div>
                <p className="text-white/50 text-sm mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
                  {view === 'signup' ? 'Create an account to enroll in this course.' : 'Log in to continue to checkout.'}
                  <button 
                    onClick={() => setView(view === 'login' ? 'signup' : 'login')}
                    className="text-blue-400 hover:underline"
                  >
                    {view === 'login' ? "Sign up instead" : "Log in instead"}
                  </button>
                </p>

                {authError && (
                  <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {authError}
                  </div>
                )}

                <form onSubmit={handleAuthSubmit} className="space-y-5">
                  {view === 'signup' && (
                    <div>
                      <label className="block text-xs font-medium text-white/60 mb-2">Full Name</label>
                      <input 
                        type="text" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-white/30 transition-colors"
                        placeholder="Jane Doe"
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-2">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-white/30 transition-colors"
                        placeholder="name@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-2">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                      <input 
                        type={showPassword ? "text" : "password"}
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

                  <button 
                    type="submit"
                    disabled={authLoadingState}
                    className="w-full flex items-center justify-center gap-2 bg-white text-black py-3.5 rounded-xl font-medium hover:bg-gray-200 transition-all active:scale-[0.98] disabled:opacity-70 mt-4"
                  >
                    {authLoadingState ? (
                      <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    ) : (
                      <>
                        {view === 'login' ? 'Log In' : 'Create Account'}
                        <ChevronRight size={18} />
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right panel - Order Summary */}
      <div className="hidden lg:flex w-1/2 relative bg-[#111113] items-center justify-center border-l border-white/5 p-12 overflow-y-auto">
        <div className="w-full max-w-md">
          <h3 className="text-sm font-medium text-white/50 tracking-wider uppercase mb-8">Order Summary</h3>
          <div className="aspect-video rounded-xl overflow-hidden mb-8 relative border border-white/10 shadow-2xl">
            <img src={course?.thumbnail} alt={course?.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-semibold text-white uppercase tracking-wider mb-2 inline-block">
                {course?.category || 'Masterclass'}
              </span>
            </div>
          </div>
          
          <h2 className="text-2xl font-semibold text-white mb-2 leading-snug">{course?.title}</h2>
          <p className="text-white/50 text-sm mb-8 leading-relaxed">
            By completing this enrollment, you get 6 months access to all modules, downloadable resources, and updates within this masterclass.
          </p>

          <div className="space-y-4 pt-8 border-t border-white/10">
            <div className="flex justify-between text-sm text-white/60">
              <span>Subtotal</span>
              <span>{currency === 'NGN' ? `₦${course?.price?.ngn?.toLocaleString()}` : `$${course?.price?.usd}`}</span>
            </div>
            <div className="flex justify-between text-sm text-white/60">
              <span>Taxes</span>
              <span>Included</span>
            </div>
            <div className="flex justify-between text-lg font-semibold text-white pt-4 border-t border-white/10">
              <span>Total</span>
              <span>{currency === 'NGN' ? `₦${course?.price?.ngn?.toLocaleString()}` : `$${course?.price?.usd}`}</span>
            </div>
          </div>
          
          <div className="mt-12 flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
             <div className="mt-0.5"><Shield className="text-blue-400" size={18} /></div>
             <div>
               <h4 className="text-sm font-medium text-white mb-1">Money-Back Guarantee</h4>
               <p className="text-xs text-white/50">If you're not satisfied, we offer a 14-day money-back guarantee, no questions asked.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
