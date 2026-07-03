import { motion, AnimatePresence } from 'motion/react';
import { X, CreditCard, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { usePaystackPayment } from 'react-paystack';
import { useFlutterwave, closePaymentModal } from 'flutterwave-react-v3';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: {
    id: string;
    title: string;
    price: { usd: number; ngn: number };
    thumbnail: string;
  };
}

export function CheckoutModal({ isOpen, onClose, course }: CheckoutModalProps) {
  const [currency, setCurrency] = useState<'USD' | 'NGN'>('NGN');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const paystackConfig = {
    reference: (new Date()).getTime().toString(),
    email: user?.email || '',
    amount: (course?.price?.ngn || 0) * 100, // Amount is in the lowest currency unit
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '',
    currency: 'NGN',
    metadata: {
      custom_fields: [
        {
          display_name: "Course ID",
          variable_name: "course_id",
          value: course?.id || "",
        },
        {
          display_name: "User ID",
          variable_name: "user_id",
          value: user?.id || "",
        }
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
      logo: '',
    },
    meta: {
      user_id: user?.id || "",
      course_id: course?.id || ""
    }
  };

  const initializePaystack = usePaystackPayment(paystackConfig);
  const handleFlutterwavePayment = useFlutterwave(flutterwaveConfig);

  const handleSuccess = (reference: any) => {
    // The backend webhook will handle inserting the enrollment.
    // For immediate UI feedback, we'll also insert it here, Supabase RLS permitting,
    // or just show success and rely on webhook. Let's do optimistic success state.
    setIsProcessing(false);
    setIsSuccess(true);
    
    // We should do a quick insert as fallback just in case webhook is delayed.
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
        onClose();
        setIsSuccess(false);
        navigate('/app/my-courses');
      }, 2000);
    });
  };

  const handlePaymentClose = () => {
    setIsProcessing(false);
  };

  const handleCheckout = () => {
    if (!user) {
      alert("Please log in to enroll.");
      return;
    }
    
    setIsProcessing(true);

    if (currency === 'NGN') {
      if (!import.meta.env.VITE_PAYSTACK_PUBLIC_KEY) {
        alert("Paystack payment gateway not configured. Please add VITE_PAYSTACK_PUBLIC_KEY.");
        setIsProcessing(false);
        return;
      }
      initializePaystack({ onSuccess: handleSuccess, onClose: handlePaymentClose });
    } else {
      if (!import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY) {
        alert("Flutterwave payment gateway not configured. Please add VITE_FLUTTERWAVE_PUBLIC_KEY.");
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-3xl bg-[#0a0a0c] border border-white/10 rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-2xl"
          >
            {isSuccess ? (
              <div className="w-full p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
                <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 size={32} />
                </div>
                <h2 className="text-2xl font-semibold text-white mb-2">Payment Successful</h2>
                <p className="text-white/50 mb-8 max-w-sm">You now have 6 months access to {course?.title}. Check your email for your receipt.</p>
              </div>
            ) : (
              <>
                {/* Left - Course Details */}
                <div className="w-full md:w-1/2 bg-[#111113] p-8 border-r border-white/5">
                  <h3 className="text-sm font-medium text-white/50 tracking-wider uppercase mb-6">Order Summary</h3>
                  <div className="aspect-video rounded-xl overflow-hidden mb-6 relative">
                     <img src={course?.thumbnail} alt={course?.title} className="w-full h-full object-cover" />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  </div>
                  <h2 className="text-xl font-semibold text-white mb-2 leading-snug">{course?.title}</h2>
                  <p className="text-white/40 text-sm mb-6 border-b border-white/10 pb-6">6 months access to all modules and resources within this masterclass.</p>

                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-white/60">Total</span>
                    <div className="text-2xl font-semibold text-white">
                      {currency === 'NGN' ? `₦${course?.price?.ngn?.toLocaleString()}` : `$${course?.price?.usd}`}
                    </div>
                  </div>
                </div>

                {/* Right - Payment Details */}
                <div className="w-full md:w-1/2 p-8 relative">
                  <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-white/40 hover:text-white rounded-full hover:bg-white/5 transition-colors"
                  >
                    <X size={20} />
                  </button>

                  <h3 className="text-lg font-medium text-white mb-6 pt-2">Payment Details</h3>

                  {/* Currency Toggle */}
                  <div className="flex bg-white/5 p-1 rounded-lg border border-white/10 mb-8">
                    <button 
                      onClick={() => setCurrency('NGN')}
                      className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${currency === 'NGN' ? 'bg-white/10 text-white shadow-sm border border-white/5' : 'text-white/50 hover:text-white/80'}`}
                    >
                      NGN (₦)
                    </button>
                    <button 
                      onClick={() => setCurrency('USD')}
                      className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${currency === 'USD' ? 'bg-white/10 text-white shadow-sm border border-white/5' : 'text-white/50 hover:text-white/80'}`}
                    >
                      USD ($)
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Paystack Simulation Text */}
                    <div className="p-4 rounded-xl border-dashed border border-blue-500/30 bg-blue-500/5 text-blue-200/80 text-sm text-center">
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
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
