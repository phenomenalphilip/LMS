import { motion } from 'motion/react';
import { CreditCard, Receipt, Clock } from 'lucide-react';

export function Billing() {
  return (
    <div className="p-8 max-w-4xl mx-auto py-10 space-y-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">Billing</h1>
        <p className="text-white/50 text-sm">Manage your billing information and view payment history.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-[#111113] border border-white/10 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <CreditCard size={20} />
            </div>
            <span className="px-3 py-1 bg-white/5 text-white/60 text-xs rounded-full border border-white/5">Free Plan</span>
          </div>
          <h3 className="text-lg font-medium text-white mb-1">Current Plan</h3>
          <p className="text-sm text-white/50 mb-6">You are currently on the free tier.</p>
          <button className="w-full py-2.5 bg-white text-black text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors">
            Upgrade Plan
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-[#111113] border border-white/10 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/5 text-white/60 flex items-center justify-center border border-white/5">
              <Receipt size={20} />
            </div>
          </div>
          <h3 className="text-lg font-medium text-white mb-1">Payment Method</h3>
          <p className="text-sm text-white/50 mb-6">No payment methods added yet.</p>
          <button className="w-full py-2.5 bg-white/5 text-white text-sm font-medium rounded-xl hover:bg-white/10 border border-white/10 transition-colors">
            Add Payment Method
          </button>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Clock size={18} className="text-white/40" />
          <h3 className="font-medium text-white">Billing History</h3>
        </div>
        <div className="bg-[#111113] border border-white/10 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center mx-auto mb-3 text-white/30">
            <Receipt size={24} />
          </div>
          <p className="text-white/60 text-sm">No billing history available.</p>
        </div>
      </motion.div>
    </div>
  );
}
