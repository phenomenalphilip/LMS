import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { User, Briefcase, Globe, ExternalLink, Linkedin, Twitter } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export function Portfolio() {
  const { user } = useAuth();
  
  // Need to handle view for public vs private.
  // Assuming this is the current user viewing their own portfolio.
  // Can expand to handle visiting other people's portfolios.

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const profile = user.user_metadata || {};
  const isPublic = profile.is_public;

  return (
    <div className="p-8 max-w-4xl mx-auto py-10 space-y-10">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">My Portfolio</h1>
          <p className="text-white/50 text-sm">Preview of your public portfolio.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 text-xs rounded-full border ${isPublic ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/5 text-white/50 border-white/10'}`}>
            {isPublic ? 'Publicly Visible' : 'Private'}
          </span>
          {isPublic && (
            <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors rounded-lg text-sm font-medium text-white">
              <ExternalLink size={16} />
              Share Link
            </button>
          )}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-[#111113] border border-white/10 rounded-3xl overflow-hidden relative"
      >
        <div className="h-48 bg-gradient-to-r from-blue-900/40 to-purple-900/40" />
        
        <div className="px-8 pb-8 relative">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-end -mt-16 mb-6">
            <div className="w-32 h-32 rounded-full border-4 border-[#111113] bg-black flex items-center justify-center overflow-hidden shrink-0 relative z-10">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name || 'User'} className="w-full h-full object-cover" />
              ) : (
                <User size={48} className="text-white/30" />
              )}
            </div>
            <div className="flex-1 pb-2">
              <h2 className="text-2xl font-bold text-white mb-1">{profile.full_name || 'Anonymous User'}</h2>
              {profile.industry && (
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <Briefcase size={14} />
                  <span>{profile.industry}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3 pb-2">
              {profile.linkedin && (
                <a href={profile.linkedin} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                  <Linkedin size={18} />
                </a>
              )}
              {profile.twitter && (
                <a href={profile.twitter} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                  <Twitter size={18} />
                </a>
              )}
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                  <Globe size={18} />
                </a>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-8">
              <div>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">About Me</h3>
                <p className="text-white/70 text-sm leading-relaxed">
                  {profile.bio || "No bio provided yet."}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Learning Goal</h3>
                <div className="bg-white/5 border border-white/5 rounded-xl p-4">
                  <p className="text-white/80 text-sm italic">
                    "{profile.learning_goal || "Always learning and growing."}"
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Details</h3>
                
                {profile.country && (
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">Country</span>
                    <span className="text-sm text-white/80">{profile.country}</span>
                  </div>
                )}
                
                {profile.timezone && (
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">Timezone</span>
                    <span className="text-sm text-white/80">{profile.timezone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
