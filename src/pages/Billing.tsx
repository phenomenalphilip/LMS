import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CreditCard, Receipt, Clock, Plus, Trash2, CheckCircle2,
  X, ChevronDown, Landmark, Smartphone, Star, AlertCircle,
  ArrowUpRight, Shield
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaymentMethod {
  id: string;
  label: string;
  provider: string;
  is_default: boolean;
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

// ─── Provider meta helpers ────────────────────────────────────────────────────

const PROVIDER_META: Record<string, { icon: React.ReactElement; color: string; bg: string }> = {
  Paystack: {
    icon: <Landmark size={14} />,
    color: 'text-green-400',
    bg: 'bg-green-500/10 border-green-500/20',
  },
  Flutterwave: {
    icon: <Smartphone size={14} />,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/20',
  },
  Card: {
    icon: <CreditCard size={14} />,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
  },
  Other: {
    icon: <CreditCard size={14} />,
    color: 'text-white/60',
    bg: 'bg-white/5 border-white/10',
  },
};

function providerMeta(provider: string) {
  return PROVIDER_META[provider] ?? PROVIDER_META['Other'];
}

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

// ─── Add Payment Method Modal ─────────────────────────────────────────────────

function AddMethodModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (m: PaymentMethod) => void;
}) {
  const { user } = useAuth();
  const [label, setLabel] = useState('');
  const [provider, setProvider] = useState('Card');
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const providers = ['Card', 'Paystack', 'Flutterwave', 'Other'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !label.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: insertErr } = await supabase
        .from('payment_methods')
        .insert({
          user_id: user.id,
          label: label.trim(),
          provider,
          is_default: isDefault,
          last_used_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertErr) throw insertErr;
      onAdded(data as PaymentMethod);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save payment method.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 20, stiffness: 260 }}
        className="bg-[#111113] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Add Payment Method</h2>
            <p className="text-xs text-white/40 mt-0.5">Save a preferred payment method</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Label */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-2">Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
              placeholder="e.g. GTBank Mastercard"
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>

          {/* Provider */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-2">Provider / Type</label>
            <div className="relative">
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-white/30 transition-colors"
              >
                {providers.map(p => <option key={p} value={p} className="bg-[#1a1a1c]">{p}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            </div>
          </div>

          {/* Default toggle */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <div
              onClick={() => setIsDefault(!isDefault)}
              className={`w-10 h-5.5 rounded-full flex items-center transition-colors relative ${isDefault ? 'bg-blue-500' : 'bg-white/10'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white absolute transition-all ${isDefault ? 'left-[22px]' : 'left-[3px]'}`} />
            </div>
            <span className="text-sm text-white/60 group-hover:text-white/80 transition-colors select-none">Set as default</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !label.trim()}
              className="flex-1 py-3 rounded-xl bg-white text-black text-sm font-medium hover:bg-gray-200 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> : <><Plus size={16} /> Add Method</>}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
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

  // ── Fetch data ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;

    async function load() {
      setLoadingMethods(true);
      setLoadingTx(true);

      const [{ data: methodData }, { data: txData }] = await Promise.all([
        supabase
          .from('payment_methods')
          .select('*')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('payment_transactions')
          .select('*')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false }),
      ]);

      setMethods((methodData as PaymentMethod[]) || []);
      setTransactions((txData as PaymentTransaction[]) || []);
      setLoadingMethods(false);
      setLoadingTx(false);
    }

    load();
  }, [user]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from('payment_methods').delete().eq('id', id);
    if (!error) setMethods(prev => prev.filter(m => m.id !== id));
    setDeletingId(null);
  };

  const handleSetDefault = async (id: string) => {
    // Unset all, then set the selected one
    const updates = methods.map(m =>
      supabase.from('payment_methods').update({ is_default: m.id === id }).eq('id', m.id)
    );
    await Promise.all(updates);
    setMethods(prev => prev.map(m => ({ ...m, is_default: m.id === id })));
  };

  const handleAdded = (m: PaymentMethod) => {
    setMethods(prev => [m, ...prev]);
  };

  // ── Totals ────────────────────────────────────────────────────────────────

  const totalSpentNGN = transactions
    .filter(t => t.currency === 'NGN' && t.status === 'success')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSpentUSD = transactions
    .filter(t => t.currency === 'USD' && t.status === 'success')
    .reduce((sum, t) => sum + t.amount, 0);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-5xl mx-auto py-10 space-y-10">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">Billing</h1>
        <p className="text-white/50 text-sm">Manage payment methods and view your purchase history.</p>
      </motion.div>

      {/* Summary cards */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        {[
          { label: 'Total Purchases', value: transactions.length, suffix: transactions.length === 1 ? 'course' : 'courses' },
          { label: 'Total Spent (NGN)', value: totalSpentNGN ? `₦${totalSpentNGN.toLocaleString()}` : '—', suffix: null },
          { label: 'Total Spent (USD)', value: totalSpentUSD ? `$${totalSpentUSD.toLocaleString()}` : '—', suffix: null },
        ].map((stat, i) => (
          <div key={i} className="bg-[#111113] border border-white/10 rounded-2xl p-5">
            <p className="text-xs text-white/40 mb-1 uppercase tracking-wider">{stat.label}</p>
            <p className="text-2xl font-semibold text-white tracking-tight">
              {stat.value}{stat.suffix && <span className="text-sm font-normal text-white/40 ml-1.5">{stat.suffix}</span>}
            </p>
          </div>
        ))}
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
            <h2 className="font-medium text-white">Payment Methods</h2>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/5 border border-white/10 text-white/70 text-sm rounded-xl hover:bg-white/10 hover:text-white transition-all"
          >
            <Plus size={15} /> Add Method
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
              <p className="text-white/50 text-sm mb-1">No payment methods saved</p>
              <p className="text-white/30 text-xs">Methods are auto-saved when you make a purchase, or you can add one manually.</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              <AnimatePresence initial={false}>
                {methods.map((method) => {
                  const meta = providerMeta(method.provider);
                  return (
                    <motion.li
                      key={method.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-4 px-6 py-4 group hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Provider icon */}
                      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${meta.bg} ${meta.color}`}>
                        {meta.icon}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white truncate">{method.label}</p>
                          {method.is_default && (
                            <span className="px-2 py-0.5 bg-blue-500/15 text-blue-400 text-[10px] font-semibold rounded-full border border-blue-500/20 uppercase tracking-wider shrink-0">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white/40 mt-0.5">
                          {method.provider} · Last used {formatDate(method.last_used_at)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
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
                  );
                })}
              </AnimatePresence>
            </ul>
          )}
        </div>

        {/* Security note */}
        <div className="mt-3 flex items-start gap-2.5 text-xs text-white/30">
          <Shield size={13} className="mt-0.5 shrink-0" />
          <span>Payment methods store labels only. Card numbers are never saved — all transactions are processed securely via Paystack or Flutterwave.</span>
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
              {/* Table header */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-6 py-3 border-b border-white/5 text-xs font-medium text-white/30 uppercase tracking-wider">
                <span>Course</span>
                <span className="text-right">Amount</span>
                <span className="hidden sm:block text-right">Provider</span>
                <span className="text-right">Date</span>
              </div>

              {/* Rows */}
              <ul className="divide-y divide-white/5">
                <AnimatePresence initial={false}>
                  {transactions.map((tx, i) => {
                    const meta = providerMeta(tx.provider);
                    return (
                      <motion.li
                        key={tx.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.04 }}
                        className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-6 py-4 hover:bg-white/[0.02] transition-colors group"
                      >
                        {/* Course */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-white/30 shrink-0">
                            {tx.status === 'success'
                              ? <CheckCircle2 size={15} className="text-emerald-400" />
                              : <AlertCircle size={15} className="text-red-400" />
                            }
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm text-white font-medium truncate">{tx.course_title}</p>
                            {tx.reference && (
                              <p className="text-[11px] text-white/30 truncate font-mono mt-0.5">Ref: {tx.reference.slice(0, 20)}{tx.reference.length > 20 ? '…' : ''}</p>
                            )}
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="text-right">
                          <p className="text-sm font-semibold text-white">{formatCurrency(tx.amount, tx.currency)}</p>
                          <p className="text-[11px] text-white/30">{tx.currency}</p>
                        </div>

                        {/* Provider */}
                        <div className="hidden sm:flex justify-end">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${meta.bg} ${meta.color}`}>
                            {meta.icon} {tx.provider}
                          </span>
                        </div>

                        {/* Date */}
                        <div className="text-right">
                          <p className="text-xs text-white/50">{formatDate(tx.created_at)}</p>
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            </>
          )}
        </div>
      </motion.div>

      {/* Add Method Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddMethodModal
            onClose={() => setShowAddModal(false)}
            onAdded={handleAdded}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
