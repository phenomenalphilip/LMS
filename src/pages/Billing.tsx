import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CreditCard, Receipt, Clock, Plus, Trash2, CheckCircle2,
  X, Star, AlertCircle, Shield, Lock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaymentMethod {
  id: string;
  label: string;
  provider: string;
  cardholder_name: string | null;
  card_last4: string | null;
  card_expiry: string | null;
  card_type: string | null;
  is_default: boolean;
  is_tokenized: boolean;
  last_used_at: string;
  created_at: string;
}

interface PaymentTransaction {
  id: string;
  course_id: string;
  course_title: string;
  amount: number;
  currency: string;
  provider: string;
  reference: string;
  status: string;
  created_at: string;
}

// ─── Card helpers ─────────────────────────────────────────────────────────────

function detectCardType(number: string): string {
  const n = number.replace(/\s/g, '');
  if (/^4/.test(n)) return 'Visa';
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'Mastercard';
  if (/^3[47]/.test(n)) return 'Amex';
  if (/^6(011|5|22)/.test(n)) return 'Discover';
  if (/^(5061|6304|6759|676[1-3])/.test(n)) return 'Maestro';
  if (/^(6[^05])|(^60[^4])/.test(n)) return 'Verve';
  return 'Card';
}

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

const CARD_COLORS: Record<string, string> = {
  Visa: 'from-[#1a237e] to-[#283593]',
  Mastercard: 'from-[#880e4f] to-[#6a1b4d]',
  Amex: 'from-[#004d40] to-[#00695c]',
  Discover: 'from-[#e65100] to-[#bf360c]',
  Maestro: 'from-[#1a237e] to-[#4a148c]',
  Verve: 'from-[#1b5e20] to-[#2e7d32]',
  Card: 'from-[#212121] to-[#424242]',
};

const CARD_LOGOS: Record<string, React.ReactElement> = {
  Visa: <span className="text-white font-extrabold italic text-xl tracking-tight">VISA</span>,
  Mastercard: (
    <div className="flex">
      <div className="w-7 h-7 rounded-full bg-red-500 opacity-90" />
      <div className="w-7 h-7 rounded-full bg-yellow-400 opacity-90 -ml-3" />
    </div>
  ),
  Amex: <span className="text-white font-extrabold text-sm tracking-widest">AMEX</span>,
  Discover: <span className="text-white font-bold text-sm tracking-wide">DISCOVER</span>,
  Maestro: <span className="text-white font-bold text-sm">MAESTRO</span>,
  Verve: <span className="text-white font-bold text-sm tracking-wide">VERVE</span>,
  Card: <CreditCard size={22} className="text-white/60" />,
};

function formatCurrency(amount: number, currency: string) {
  if (currency === 'NGN') return `₦${amount.toLocaleString()}`;
  if (currency === 'USD') return `$${amount.toLocaleString()}`;
  return `${amount.toLocaleString()} ${currency}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ─── Live Card Preview ────────────────────────────────────────────────────────

function CardPreview({
  cardNumber, cardHolder, expiry, cardType, flipped,
}: {
  cardNumber: string; cardHolder: string; expiry: string; cardType: string; flipped: boolean;
}) {
  const displayNumber = cardNumber
    ? cardNumber.padEnd(19, ' ').slice(0, 19)
    : '•••• •••• •••• ••••';

  const gradient = CARD_COLORS[cardType] || CARD_COLORS['Card'];
  const logo = CARD_LOGOS[cardType] || CARD_LOGOS['Card'];

  return (
    <div className="relative w-full aspect-[1.586/1] select-none" style={{ perspective: '1000px' }}>
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.5, type: 'spring', stiffness: 120, damping: 18 }}
        style={{ transformStyle: 'preserve-3d' }}
        className="relative w-full h-full"
      >
        {/* Front */}
        <div
          className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} p-6 flex flex-col justify-between shadow-2xl overflow-hidden`}
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Glare */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent pointer-events-none" />
          {/* Chip + logo */}
          <div className="flex items-center justify-between">
            <div className="w-10 h-7 rounded-md bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center">
              <div className="grid grid-cols-2 gap-0.5 p-1 w-full h-full">
                {[...Array(4)].map((_, i) => <div key={i} className="bg-yellow-700/40 rounded-sm" />)}
              </div>
            </div>
            {logo}
          </div>
          {/* Number */}
          <div className="font-mono text-lg tracking-[0.18em] text-white/90 font-medium">
            {cardNumber || '•••• •••• •••• ••••'}
          </div>
          {/* Bottom row */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-white/40 text-[9px] uppercase tracking-widest mb-0.5">Card Holder</p>
              <p className="text-white text-sm font-medium tracking-wide truncate max-w-[180px]">
                {cardHolder || 'FULL NAME'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-white/40 text-[9px] uppercase tracking-widest mb-0.5">Expires</p>
              <p className="text-white text-sm font-medium">{expiry || 'MM/YY'}</p>
            </div>
          </div>
        </div>

        {/* Back */}
        <div
          className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} flex flex-col justify-center shadow-2xl overflow-hidden`}
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent pointer-events-none" />
          <div className="w-full h-10 bg-black/40 mb-6 mt-4" />
          <div className="px-6">
            <p className="text-white/40 text-[9px] uppercase tracking-widest mb-2">CVV</p>
            <div className="bg-white/20 rounded h-8 flex items-center justify-end px-3">
              <span className="font-mono text-white/80 tracking-widest text-sm">•••</span>
            </div>
            <p className="text-white/30 text-[9px] mt-4 text-center">
              For your security, CVV is never stored
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Add Card Modal ───────────────────────────────────────────────────────────

function AddCardModal({
  onClose, onAdded,
}: {
  onClose: () => void;
  onAdded: (m: PaymentMethod) => void;
}) {
  const { user } = useAuth();
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cvvFocused, setCvvFocused] = useState(false);

  const cardType = detectCardType(cardNumber);
  const last4 = cardNumber.replace(/\s/g, '').slice(-4) || null;

  const validateExpiry = (val: string) => {
    const [mm, yy] = val.split('/');
    if (!mm || !yy || mm.length < 2 || yy.length < 2) return false;
    const month = parseInt(mm);
    const year = parseInt('20' + yy);
    const now = new Date();
    if (month < 1 || month > 12) return false;
    if (year < now.getFullYear()) return false;
    if (year === now.getFullYear() && month < now.getMonth() + 1) return false;
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const rawNumber = cardNumber.replace(/\s/g, '');
    if (rawNumber.length < 13) { setError('Please enter a valid card number.'); return; }
    if (!validateExpiry(expiry)) { setError('Please enter a valid expiry date.'); return; }
    if (cvv.length < 3) { setError('Please enter a valid CVV.'); return; }

    setLoading(true);
    setError(null);

    // CVV is intentionally NOT stored
    const label = `${cardType} •••• ${last4}`;

    try {
      const { data, error: insertErr } = await supabase
        .from('payment_methods')
        .insert({
          user_id: user.id,
          label,
          provider: 'Card',
          cardholder_name: cardholderName.trim(),
          card_last4: last4,
          card_expiry: expiry,
          card_type: cardType,
          is_default: isDefault,
          last_used_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertErr) throw insertErr;
      onAdded(data as PaymentMethod);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save card.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 24 }}
        transition={{ type: 'spring', damping: 22, stiffness: 260 }}
        className="bg-[#0e0e10] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-y-auto overflow-x-hidden max-h-[95vh] sm:max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Add Card</h2>
            <p className="text-xs text-white/40 mt-0.5">Your card details are saved securely</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Card Preview */}
        <div className="px-6 pb-5">
          <CardPreview
            cardNumber={cardNumber}
            cardHolder={cardholderName.toUpperCase()}
            expiry={expiry}
            cardType={cardType}
            flipped={cvvFocused}
          />
        </div>

        {/* Form */}
        <div className="px-6 pb-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={15} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Cardholder Name */}
            <div>
              <label className="block text-[11px] font-medium text-white/40 uppercase tracking-wider mb-1.5">Cardholder Name</label>
              <input
                type="text"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                required
                placeholder="Jane Doe"
                autoComplete="cc-name"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>

            {/* Card Number */}
            <div>
              <label className="block text-[11px] font-medium text-white/40 uppercase tracking-wider mb-1.5">Card Number</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  required
                  placeholder="1234 5678 9012 3456"
                  autoComplete="cc-number"
                  maxLength={19}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-14 text-white text-sm font-mono placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors tracking-wider"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/40 font-medium">
                  {cardType !== 'Card' ? cardType : <CreditCard size={16} className="text-white/20" />}
                </div>
              </div>
            </div>

            {/* Expiry + CVV */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-white/40 uppercase tracking-wider mb-1.5">Expiry Date</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  required
                  placeholder="MM/YY"
                  autoComplete="cc-exp"
                  maxLength={5}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm font-mono placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-white/40 uppercase tracking-wider mb-1.5">CVV</label>
                <div className="relative">
                  <input
                    type="password"
                    inputMode="numeric"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    onFocus={() => setCvvFocused(true)}
                    onBlur={() => setCvvFocused(false)}
                    required
                    placeholder="•••"
                    autoComplete="cc-csc"
                    maxLength={4}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-9 text-white text-sm font-mono placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors"
                  />
                  <Lock size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20" />
                </div>
              </div>
            </div>

            {/* Default toggle */}
            <label className="flex items-center gap-3 cursor-pointer group pt-1">
              <button
                type="button"
                onClick={() => setIsDefault(!isDefault)}
                className={`w-10 h-5 rounded-full relative transition-colors flex-shrink-0 ${isDefault ? 'bg-blue-500' : 'bg-white/10'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${isDefault ? 'left-[22px]' : 'left-[2px]'}`} />
              </button>
              <span className="text-sm text-white/50 group-hover:text-white/70 transition-colors select-none">Set as default card</span>
            </label>

            {/* Security note */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <Shield size={13} className="text-white/30 mt-0.5 shrink-0" />
              <p className="text-[11px] text-white/30 leading-relaxed">
                Your CVV is never stored. Card details are saved locally for display only — all payments are processed securely via Paystack or Flutterwave.
              </p>
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 text-sm hover:bg-white/5 transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-white text-black text-sm font-semibold hover:bg-gray-200 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading
                  ? <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  : <><Plus size={16} /> Save Card</>
                }
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Card display in list ─────────────────────────────────────────────────────

function CardNetworkBadge({ cardType }: { cardType: string | null }) {
  if (!cardType || cardType === 'Card') return <CreditCard size={15} className="text-blue-400" />;
  const colors: Record<string, string> = {
    Visa: 'text-blue-300',
    Mastercard: 'text-red-400',
    Amex: 'text-emerald-400',
    Verve: 'text-green-400',
    Discover: 'text-orange-400',
  };
  return <span className={`text-xs font-bold ${colors[cardType] ?? 'text-white/50'}`}>{cardType.toUpperCase()}</span>;
}

// ─── Main Billing Page ────────────────────────────────────────────────────────

export function Billing() {
  const { user } = useAuth();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [loadingTx, setLoadingTx] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    async function load() {
      setLoadingMethods(true);
      setLoadingTx(true);
      const [{ data: methodData }, { data: txData }] = await Promise.all([
        supabase.from('payment_methods').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
        supabase.from('payment_transactions').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
      ]);
      setMethods((methodData as PaymentMethod[]) || []);
      setTransactions((txData as PaymentTransaction[]) || []);
      setLoadingMethods(false);
      setLoadingTx(false);
    }
    load();
  }, [user]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from('payment_methods').delete().eq('id', id);
    if (!error) setMethods(prev => prev.filter(m => m.id !== id));
    setDeletingId(null);
  };

  const handleSetDefault = async (id: string) => {
    const updates = methods.map(m =>
      supabase.from('payment_methods').update({ is_default: m.id === id }).eq('id', m.id)
    );
    await Promise.all(updates);
    setMethods(prev => prev.map(m => ({ ...m, is_default: m.id === id })));
  };

  const handleAdded = (m: PaymentMethod) => setMethods(prev => [m, ...prev]);

  const totalPurchases = transactions.length;

  return (
    <div className="p-8 max-w-5xl mx-auto py-10 space-y-10">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">Billing</h1>
        <p className="text-white/50 text-sm">Manage payment methods and view your purchase history.</p>
      </motion.div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="bg-[#111113] border border-white/10 rounded-2xl p-5 flex items-center gap-4"
      >
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
          <Receipt size={18} />
        </div>
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wider">Total Purchases</p>
          <p className="text-2xl font-semibold text-white tracking-tight">
            {totalPurchases}
            <span className="text-sm font-normal text-white/40 ml-1.5">{totalPurchases === 1 ? 'course' : 'courses'}</span>
          </p>
        </div>
      </motion.div>

      {/* Payment Methods */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <CreditCard size={15} />
            </div>
            <h2 className="font-medium text-white">Saved Cards</h2>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/5 border border-white/10 text-white/70 text-sm rounded-xl hover:bg-white/10 hover:text-white transition-all"
          >
            <Plus size={15} /> Add Card
          </button>
        </div>

        <div className="bg-[#111113] border border-white/10 rounded-2xl overflow-hidden">
          {loadingMethods ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          ) : methods.length === 0 ? (
            <div className="py-12 px-6 text-center">
              <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center mx-auto mb-3 text-white/20">
                <CreditCard size={22} />
              </div>
              <p className="text-white/50 text-sm">No cards saved</p>
              <p className="text-white/30 text-xs mt-1">Add a card to keep it on file for future reference.</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              <AnimatePresence initial={false}>
                {methods.map((method) => (
                  <motion.li
                    key={method.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-4 px-6 py-4 group hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Card icon */}
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                      <CardNetworkBadge cardType={method.card_type} />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white">
                          {method.card_type || 'Card'} •••• {method.card_last4 || '????'}
                        </p>
                        {method.is_default && (
                          <span className="px-2 py-0.5 bg-blue-500/15 text-blue-400 text-[10px] font-semibold rounded-full border border-blue-500/20 uppercase tracking-wider shrink-0">
                            Default
                          </span>
                        )}
                        {method.is_tokenized && (
                          <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold rounded-full border border-emerald-500/20 uppercase tracking-wider shrink-0">
                            ✓ Verified
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/40 mt-0.5">
                        {method.cardholder_name && <span>{method.cardholder_name} · </span>}
                        {method.card_expiry ? `Expires ${method.card_expiry}` : 'No expiry'}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {!method.is_default && (
                        <button
                          onClick={() => handleSetDefault(method.id)}
                          title="Set as default"
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                        >
                          <Star size={15} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(method.id)}
                        disabled={deletingId === method.id}
                        title="Remove"
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                      >
                        {deletingId === method.id
                          ? <div className="w-3.5 h-3.5 border border-white/30 border-t-white rounded-full animate-spin" />
                          : <Trash2 size={15} />
                        }
                      </button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>

        <div className="mt-3 flex items-start gap-2 text-xs text-white/25">
          <Shield size={12} className="mt-0.5 shrink-0" />
          <span>CVV is never stored. All payments are processed securely via Paystack or Flutterwave.</span>
        </div>
      </motion.div>

      {/* Payment History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-7 h-7 rounded-lg bg-white/5 text-white/50 flex items-center justify-center border border-white/10">
            <Clock size={15} />
          </div>
          <h2 className="font-medium text-white">Payment History</h2>
        </div>

        <div className="bg-[#111113] border border-white/10 rounded-2xl overflow-hidden">
          {loadingTx ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-12 px-6 text-center">
              <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center mx-auto mb-3 text-white/20">
                <Receipt size={22} />
              </div>
              <p className="text-white/50 text-sm">No purchases yet</p>
              <p className="text-white/30 text-xs mt-1">Your payment history will appear here after you enrol in a course.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-6 py-3 border-b border-white/5 text-xs font-medium text-white/30 uppercase tracking-wider">
                <span>Course</span>
                <span className="text-right">Amount</span>
                <span className="hidden sm:block text-right">Provider</span>
                <span className="text-right">Date</span>
              </div>
              <ul className="divide-y divide-white/5">
                <AnimatePresence initial={false}>
                  {transactions.map((tx, i) => (
                    <motion.li
                      key={tx.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.04 }}
                      className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-6 py-4 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
                          {tx.status === 'success'
                            ? <CheckCircle2 size={15} className="text-emerald-400" />
                            : <AlertCircle size={15} className="text-red-400" />
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-white font-medium truncate">{tx.course_title}</p>
                          {tx.reference && (
                            <p className="text-[11px] text-white/25 truncate font-mono mt-0.5">
                              {tx.reference.slice(0, 22)}{tx.reference.length > 22 ? '…' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-white">{formatCurrency(tx.amount, tx.currency)}</p>
                        <p className="text-[11px] text-white/30">{tx.currency}</p>
                      </div>
                      <div className="hidden sm:flex justify-end">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border bg-white/5 border-white/10 text-white/50">
                          {tx.provider}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-white/40">{formatDate(tx.created_at)}</p>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </>
          )}
        </div>
      </motion.div>

      {/* Add Card Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddCardModal onClose={() => setShowAddModal(false)} onAdded={handleAdded} />
        )}
      </AnimatePresence>
    </div>
  );
}
