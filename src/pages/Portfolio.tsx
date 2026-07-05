import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { Briefcase, Globe, Linkedin, Twitter, Award, Clock, MapPin, BookOpen, Hexagon } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCourses } from '../contexts/CourseContext';

export function Portfolio() {
  const { user } = useAuth();
  const { courses } = useCourses();
  const navigate = useNavigate();
  const [completedCourses, setCompletedCourses] = useState<any[]>([]);
  const [dbProfile, setDbProfile] = useState<any>(null);

  useEffect(() => {
    async function loadCertificates() {
      if (!user) return;
      
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (profileData) setDbProfile(profileData);

      const { data: progressData } = await supabase.from('lesson_progress').select('course_id').eq('user_id', user.id).eq('completed', true);
      
      const progressCounts = (progressData || []).reduce((acc: any, curr: any) => {
        acc[curr.course_id] = (acc[curr.course_id] || 0) + 1;
        return acc;
      }, {});

      if (typeof window !== 'undefined') {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(`progress_${user.id}_`)) {
            const courseId = key.replace(`progress_${user.id}_`, '');
            try {
              const parsed = JSON.parse(localStorage.getItem(key) || '[]');
              progressCounts[courseId] = Math.max(progressCounts[courseId] || 0, parsed.length);
            } catch (e) {}
          }
        }
      }

      const completed = courses.filter(course => {
        const totalItems = course.modules?.reduce((acc: number, m: any) => acc + (m.items?.length || 0), 0) || 1;
        const completedCount = progressCounts[course.id] || 0;
        return completedCount > 0 && completedCount >= totalItems;
      });

      setCompletedCourses(completed);
    }
    loadCertificates();
  }, [user, courses]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const profile = { 
    ...(user.user_metadata || {}), 
    ...(dbProfile || {}) 
  };
  
  // If the database has null for these fields (e.g. older users), fallback to the auth metadata (Google/GitHub avatar)
  profile.avatar_url = dbProfile?.avatar_url || user.user_metadata?.avatar_url;
  profile.full_name = dbProfile?.full_name || user.user_metadata?.full_name;

  const isPublic = profile.is_public;

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-12 pb-24">
      {/* Top Banner Area */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">My Portfolio</h1>
          <p className="text-white/50 text-sm">A preview of how others see your professional profile.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-full border ${isPublic ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/5 text-white/50 border-white/10'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isPublic ? 'bg-emerald-400' : 'bg-white/30'}`} />
            {isPublic ? 'Publicly Visible' : 'Private Status'}
          </div>
          {isPublic && profile.username && (
            <button 
              onClick={() => window.open(`/p/${profile.username}`, '_blank')}
              className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-gray-200 transition-colors rounded-lg text-sm font-medium"
            >
              View Public Link
            </button>
          )}
          {isPublic && !profile.username && (
            <button 
              onClick={() => navigate('/app/account')}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 hover:bg-white/20 transition-colors rounded-lg text-sm font-medium text-white"
            >
              Set Username First
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Sidebar - Identity */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-4 space-y-8"
        >
          <div className="relative">
            <div className="w-40 h-40 rounded-3xl overflow-hidden bg-white/5 border border-white/10 shrink-0">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl text-white/20 font-bold uppercase">
                  {(profile.full_name || profile.username || 'A')[0]}
                </div>
              )}
            </div>
            <div className="mt-6 space-y-2">
              <h2 className="text-3xl font-semibold text-white tracking-tight leading-tight">
                {profile.full_name || 'Anonymous User'}
              </h2>
              <p className="text-lg text-white/50">{profile.industry || 'Student at PDS Academy'}</p>
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-white/10">
            {profile.country && (
              <div className="flex items-center gap-3 text-sm text-white/70">
                <MapPin size={16} className="text-white/40" />
                {profile.country} {profile.timezone ? `• ${profile.timezone}` : ''}
              </div>
            )}
            
            <div className="flex items-center gap-3 pt-2">
              {profile.linkedin && (
                <a href={profile.linkedin} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                  <Linkedin size={16} />
                </a>
              )}
              {profile.twitter && (
                <a href={profile.twitter} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                  <Twitter size={16} />
                </a>
              )}
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                  <Globe size={16} />
                </a>
              )}
            </div>
          </div>
        </motion.div>

        {/* Right Content - About & Certifications */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="lg:col-span-8 space-y-16"
        >
          {/* About Section */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                <BookOpen size={16} className="text-white/60" />
              </div>
              <h2 className="text-xl font-medium text-white tracking-tight">Biography</h2>
            </div>
            <div className="prose prose-invert max-w-none">
              <p className="text-white/70 leading-relaxed text-base">
                {profile.bio || "No biography provided yet. Head over to Account settings to tell your story."}
              </p>
            </div>
            {profile.learning_goal && (
              <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/10">
                <h3 className="text-xs uppercase tracking-widest text-white/40 font-semibold mb-2">Career Goal</h3>
                <p className="text-white/80 font-medium">{profile.learning_goal}</p>
              </div>
            )}
          </section>

          {/* Certifications Section */}
          <section>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Award size={16} className="text-emerald-500" />
              </div>
              <h2 className="text-xl font-medium text-white tracking-tight">Official Certifications</h2>
            </div>
            
            {completedCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completedCourses.map((cert, index) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + (index * 0.1) }}
                    key={cert.id} 
                    onClick={() => navigate(`/app/certificate/${cert.id}`)}
                    className="group cursor-pointer bg-black border border-white/10 rounded-2xl p-5 hover:border-emerald-500/30 transition-all duration-300 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-opacity group-hover:bg-emerald-500/10" />
                    <div className="relative z-10 flex flex-col h-full">
                      <Award className="text-emerald-500/80 mb-4" size={24} />
                      <h4 className="text-lg font-semibold text-white mb-2 leading-snug">{cert.title}</h4>
                      <div className="flex items-center gap-2 mt-auto text-xs text-white/40">
                        <Clock size={12} />
                        <span>Verified by PDS Academy</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="p-10 rounded-2xl border border-white/5 bg-white/[0.02] flex flex-col items-center justify-center text-center">
                <Hexagon size={32} className="text-white/20 mb-4" />
                <p className="text-white/50 text-sm mb-4">You haven't completed any certifications yet.</p>
                <button onClick={() => navigate('/app/catalog')} className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors">
                  Explore Courses
                </button>
              </div>
            )}
          </section>
        </motion.div>
      </div>
    </div>
  );
}

