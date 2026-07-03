import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, Lock, ArrowRight, CheckCircle2, Mail, Eye, EyeOff, ChevronRight, Shield, Star, AlertCircle } from 'lucide-react';
import { useState, FormEvent, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { usePaystackPayment } from 'react-paystack';
import { useFlutterwave, closePaymentModal } from 'flutterwave-react-v3';
import { useCourses } from '../contexts/CourseContext';
import { Logo } from '../components/Logo';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SavedCard {
  id: string;
  label: string;
  provider: string;
  card_last4: string | null;
  card_type: string | null;
  card_expiry: string | null;
  cardholder_name: string | null;
  is_default: boolean;
  is_tokenized: boolean;
}

// ─── Saved Card Item ──────────────────────────────────────────────────────────

function SavedCardItem({
  card,
  selected,
  onSelect,
}: {
  card: SavedCard;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
        selected
          ? 'border-blue-500/50 bg-blue-500/10'
          : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/5'
      }`}
    >
      {/* Radio indicator */}
      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
        selected ? 'border-blue-400' : 'border-white/30'
      }`}>
        {selected && <div className="w-2 h-2 rounded-full bg-blue-400" />}
      </div>

      {/* Card icon */}
      <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
        <CreditCard size={15} className="text-blue-400" />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-white">
            {card.card_type || 'Card'} •••• {card.card_last4 || '????'}
          </p>
          {card.is_default && (
            <span className="px-1.5 py-0.5 bg-blue-500/15 text-blue-400 text-[9px] font-bold rounded border border-blue-500/20 uppercase tracking-wider shrink-0">
              Default
            </span>
          )}
        </div>
        <p className="text-xs text-white/40 mt-0.5">
          {card.cardholder_name && <span>{card.cardholder_name} · </span>}
          {card.card_expiry ? `Expires ${card.card_expiry}` : card.provider}
        </p>
      </div>

      {selected && (
        <CheckCircle2 size={16} className="text-blue-400 shrink-0" />
      )}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PublicCheckout() {
  const { courseId } = useParams();
  const { courses, loading: coursesLoading } = useCourses();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [currency, setCurrency] = useState<'USD' | 'NGN'>('NGN');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [chargeError, setChargeError] = useState<string | null>(null);

  // Saved cards
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [useNewCard, setUseNewCard] = useState(false);

  // Auth form state
  const [view, setView] = useState<'signup' | 'login'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoadingState, setAuthLoadingState] = useState(false);

  const course = courses.find(c => c.id === courseId);

  // ── Fetch saved tokenized cards ─────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    supabase
      .from('payment_methods')
      .select('id, label, provider, card_last4, card_type, card_expiry, cardholder_name, is_default, is_tokenized')
      .eq('user_id', user.id)
      .eq('is_tokenized', true)
      .order('is_default', { ascending: false })
      .then(({ data }) => {
        const cards = (data as SavedCard[]) || [];
        setSavedCards(cards);
        // Pre-select default card that matches current currency
        const matchingDefault = cards.find(c =>
          (currency === 'NGN' ? c.provider === 'Paystack' : c.provider === 'Flutterwave') && c.is_default
        ) || cards.find(c =>
          currency === 'NGN' ? c.provider === 'Paystack' : c.provider === 'Flutterwave'
        );
        if (matchingDefault) setSelectedCardId(matchingDefault.id);
      });
  }, [user, currency]);

  // Filter cards by currency/provider
  const compatibleCards = savedCards.filter(c =>
    currency === 'NGN' ? c.provider === 'Paystack' : c.provider === 'Flutterwave'
  );
  const hasSavedCards = compatibleCards.length > 0;

  // ── Payment configs ─────────────────────────────────────────────────────────
  const paystackConfig = {
    reference: (new Date()).getTime().toString(),
    email: user?.email || '',
    amount: (course?.price?.ngn || 0) * 100,
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '',
    currency: 'NGN',
    metadata: {
      custom_fields: [
        { display_name: 'Course ID', variable_name: 'course_id', value: course?.id || '' },
        { display_name: 'User ID', variable_name: 'user_id', value: user?.id || '' },
      ],
      user_id: user?.id || '',
      course_id: course?.id || '',
      course_title: course?.title || '',
    },
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
      logo: '',
    },
    meta: { user_id: user?.id || '', course_id: course?.id || '' },
  };

  const initializePaystack = usePaystackPayment(paystackConfig);
  const handleFlutterwavePayment = useFlutterwave(flutterwaveConfig);

  // ── Success handler (new card via popup) ────────────────────────────────────
  const handleSuccess = async (reference: any) => {
    setIsProcessing(false);
    setIsSuccess(true);
    setChargeError(null);

    const provider = currency === 'NGN' ? 'Paystack' : 'Flutterwave';
    const amount = currency === 'NGN' ? (course?.price?.ngn || 0) : (course?.price?.usd || 0);
    const ref = typeof reference === 'string'
      ? reference
      : (reference?.reference || reference?.transaction_id || reference?.tx_ref || '');

    // For Flutterwave: call backend to verify & capture token
    if (provider === 'Flutterwave') {
      const txId = reference?.transaction_id || reference?.id;
      if (txId) {
        try {
          await fetch('/api/flutterwave/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transaction_id: txId,
              user_id: user!.id,
              course_id: course?.id || '',
              course_title: course?.title || '',
              amount,
              currency,
            }),
          });
          // Webhook handles enrollment + transaction + token capture
        } catch (err) {
          console.error('Flutterwave verify error:', err);
          // Fallback: create enrollment directly
          await createEnrollmentFallback(amount, currency, provider, ref);
        }
      } else {
        await createEnrollmentFallback(amount, currency, provider, ref);
      }
    }
    // For Paystack: webhook handles enrollment + token capture automatically
    // (frontend just shows success)

    setTimeout(() => navigate('/app/my-courses'), 2000);
  };

  // Fallback if webhook/verify fails
  const createEnrollmentFallback = async (
    amount: number, currency: string, provider: string, ref: string
  ) => {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 6);
    await supabase.from('enrollments').insert({
      user_id: user!.id,
      course_id: course?.id || '',
      progress: 0,
      expires_at: expiresAt.toISOString(),
    });
    await supabase.from('payment_transactions').insert({
      user_id: user!.id,
      course_id: course?.id || '',
      course_title: course?.title || '',
      amount,
      currency,
      provider,
      reference: ref,
      status: 'success',
    });
  };

  // ── Charge saved card ───────────────────────────────────────────────────────
  const handleSavedCardCharge = async () => {
    if (!selectedCardId || !user) return;
    setIsProcessing(true);
    setChargeError(null);

    const amount = currency === 'NGN' ? (course?.price?.ngn || 0) : (course?.price?.usd || 0);

    try {
      const res = await fetch('/api/charge/saved-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_method_id: selectedCardId,
          course_id: course?.id || '',
          course_title: course?.title || '',
          amount,
          currency,
          user_id: user.id,
          email: user.email,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Payment failed. Please try again.');
      }

      setIsSuccess(true);
      setTimeout(() => navigate('/app/my-courses'), 2000);
    } catch (err: any) {
      setChargeError(err.message || 'Payment failed.');
      setIsProcessing(false);
    }
  };

  // ── Launch new card popup ───────────────────────────────────────────────────
  const handleNewCardCheckout = () => {
    if (!user) return;
    setIsProcessing(true);
    setChargeError(null);

    if (currency === 'NGN') {
      if (!import.meta.env.VITE_PAYSTACK_PUBLIC_KEY) {
        alert('Paystack payment gateway not configured.');
        setIsProcessing(false);
        return;
      }
      initializePaystack({ onSuccess: handleSuccess, onClose: () => setIsProcessing(false) });
    } else {
      if (!import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY) {
        alert('Flutterwave payment gateway not configured.');
        setIsProcessing(false);
        return;
      }
      handleFlutterwavePayment({
        callback: (response) => { handleSuccess(response); closePaymentModal(); },
        onClose: () => setIsProcessing(false),
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
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setAuthError(err.message || 'An error occurred.');
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

  // ── Payment panel ─────────────────────────────────────────────────────────

  const paymentPanel = (
    <motion.div
      key="payment"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <h2 className="text-3xl font-semibold text-white mb-2 tracking-tight">Complete Payment</h2>
      <p className="text-white/50 text-sm mb-8">
        You're logged in as <b>{user?.email}</b>.{' '}
        <button onClick={() => supabase.auth.signOut()} className="text-blue-400 hover:underline">Not you?</button>
      </p>

      {/* Currency toggle */}
      <h3 className="text-sm font-medium text-white mb-3">Select Currency</h3>
      <div className="flex bg-white/5 p-1 rounded-lg border border-white/10 mb-7">
        {(['NGN', 'USD'] as const).map(c => (
          <button
            key={c}
            onClick={() => { setCurrency(c); setSelectedCardId(null); setUseNewCard(false); setChargeError(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              currency === c ? 'bg-white/10 text-white border border-white/5' : 'text-white/50 hover:text-white/80'
            }`}
          >
            {c === 'NGN' ? 'NGN (₦)' : 'USD ($)'}
          </button>
        ))}
      </div>

      {/* Error */}
      {chargeError && (
        <div className="mb-5 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle size={15} /> {chargeError}
        </div>
      )}

      <div className="space-y-4">
        {/* ── Saved cards section ── */}
        {hasSavedCards && !useNewCard && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Saved Cards</p>
            {compatibleCards.map(card => (
              <div key={card.id}>
                <SavedCardItem
                  card={card}
                  selected={selectedCardId === card.id}
                  onSelect={() => setSelectedCardId(card.id)}
                />
              </div>

            ))}

            {/* Pay with saved card button */}
            <button
              onClick={handleSavedCardCharge}
              disabled={isProcessing || !selectedCardId}
              className="w-full py-4 mt-2 bg-white text-black font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {isProcessing ? (
                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <CreditCard size={17} />
                  Pay {currency === 'NGN' ? `₦${course.price?.ngn?.toLocaleString()}` : `$${course.price?.usd}`} with saved card
                </>
              )}
            </button>

            {/* Use new card instead */}
            <button
              onClick={() => { setUseNewCard(true); setSelectedCardId(null); }}
              className="w-full text-center text-sm text-white/40 hover:text-white/60 transition-colors pt-1"
            >
              + Use a different card
            </button>
          </div>
        )}

        {/* ── New card / no saved cards ── */}
        {(!hasSavedCards || useNewCard) && (
          <div className="space-y-4">
            {useNewCard && (
              <button
                onClick={() => setUseNewCard(false)}
                className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                ← Back to saved cards
              </button>
            )}
            <div className="p-4 rounded-xl border-dashed border border-blue-500/30 bg-blue-500/5 text-blue-200/80 text-sm text-center leading-relaxed">
              Secure checkout powered by <b>{currency === 'NGN' ? 'Paystack' : 'Flutterwave'}</b>.
              Your card will be saved for future purchases.
            </div>

            <button
              onClick={handleNewCardCheckout}
              disabled={isProcessing}
              className="w-full py-4 bg-white text-black font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 active:scale-[0.98] transition-all disabled:opacity-70"
            >
              {isProcessing ? (
                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <>Pay {currency === 'NGN' ? `₦${course.price?.ngn?.toLocaleString()}` : `$${course.price?.usd}`} <ArrowRight size={18} /></>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-white/40">
              <Lock size={12} /> Secured via SSL • AES-256 Encryption
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-[#09090b] flex font-sans overflow-hidden text-white selection:bg-white/20">
      {/* Left panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative overflow-y-auto">
        <div className="w-full max-w-md my-auto">
          <div className="mb-8 cursor-pointer w-fit" onClick={() => navigate('/')}>
            <Logo className="w-10 h-10 text-[#0084FF] mb-2" />
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
                <p className="text-white/50 mb-8 max-w-sm">
                  You now have access to {course?.title}. Redirecting you to your dashboard...
                </p>
              </motion.div>
            ) : user ? (
              paymentPanel
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
                  <button onClick={() => setView(view === 'login' ? 'signup' : 'login')} className="text-blue-400 hover:underline">
                    {view === 'login' ? 'Sign up instead' : 'Log in instead'}
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
                        type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
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
                        type="email" value={email} onChange={e => setEmail(e.target.value)} required
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
                        type={showPassword ? 'text' : 'password'} value={password}
                        onChange={e => setPassword(e.target.value)} required
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-12 text-white focus:outline-none focus:border-white/30 transition-colors"
                        placeholder="••••••••"
                      />
                      <button
                        type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors focus:outline-none"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit" disabled={authLoadingState}
                    className="w-full flex items-center justify-center gap-2 bg-white text-black py-3.5 rounded-xl font-medium hover:bg-gray-200 transition-all active:scale-[0.98] disabled:opacity-70 mt-4"
                  >
                    {authLoadingState
                      ? <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                      : <>{view === 'login' ? 'Log In' : 'Create Account'}<ChevronRight size={18} /></>
                    }
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right panel — Order summary */}
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
              <span>Taxes</span><span>Included</span>
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
