import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { MapPin, Globe, Linkedin, Twitter, Award, Clock, ArrowLeft, Mail, BookOpen, Hexagon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCourses } from '../contexts/CourseContext';

export function PublicPortfolio() {
  const { username } = useParams();
  const { courses } = useCourses();
  
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completedCourses, setCompletedCourses] = useState<any[]>([]);

  useEffect(() => {
    async function fetchProfile() {
      if (!username) return;
      setLoading(true);
      setError(null);

      try {
        // Attempt to fetch from profiles table
        let { data, error: sbError } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .single();

        let profileData = data;

        if (!profileData) {
          // One final check: if viewing own profile (simulated preview fallback before they log out)
          const { data: authData } = await supabase.auth.getUser();
          if (authData?.user?.user_metadata?.username === username) {
             profileData = authData.user.user_metadata;
             profileData.id = authData.user.id;
          }
        }

        if (profileData && profileData.is_public !== false) {
          setProfile(profileData);
          
          // Now fetch completed courses for this user. 
          // If we have an ID, query lesson_progress
          if (profileData.id) {
            const { data: progressData } = await supabase
              .from('lesson_progress')
              .select('course_id')
              .eq('user_id', profileData.id)
              .eq('completed', true);
              
            const progressCounts = (progressData || []).reduce((acc: any, curr: any) => {
              acc[curr.course_id] = (acc[curr.course_id] || 0) + 1;
              return acc;
            }, {});
            
            // localstorage fallback
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.startsWith(`progress_${profileData.id}_`)) {
                const courseId = key.replace(`progress_${profileData.id}_`, '');
                try {
                  const parsed = JSON.parse(localStorage.getItem(key) || '[]');
                  progressCounts[courseId] = Math.max(progressCounts[courseId] || 0, parsed.length);
                } catch (e) {}
              }
            }

            const completed = courses.filter(course => {
              const totalItems = course.modules?.reduce((acc: number, m: any) => acc + (m.items?.length || 0), 0) || 1;
              const completedCount = progressCounts[course.id] || 0;
              return completedCount > 0 && completedCount >= totalItems;
            });

            setCompletedCourses(completed);
          }
        } else {
          setError('Profile not found or is private.');
        }
      } catch (err: any) {
        setError('Error loading profile.');
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [username, courses]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center flex-col gap-4 text-white">
        <Hexagon size={48} className="text-white/20" />
        <h1 className="text-2xl font-semibold">Profile Not Found</h1>
        <p className="text-white/50">{error || "This portfolio doesn't exist or is set to private."}</p>
        <Link to="/" className="px-6 py-2 bg-white text-black font-medium rounded-lg mt-4">Go Home</Link>
      </div>
    );
  }

  // A sleek, minimal design focusing on skills and certifications
  return (
    <div className="min-h-screen bg-[#09090b] font-sans selection:bg-white/20">
      {/* Top Header */}
      <header className="fixed top-0 w-full bg-[#09090b]/80 backdrop-blur-xl border-b border-white/5 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-white font-semibold">
            <div className="w-8 h-8 rounded bg-white text-black flex items-center justify-center font-bold">L</div>
            <span className="tracking-tight">Leaders Court</span>
          </Link>
          <div className="text-xs font-medium text-white/40 tracking-widest uppercase">
            Public Portfolio
          </div>
        </div>
      </header>

      <main className="pt-32 pb-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* Left Sidebar - Identity */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="lg:col-span-4 space-y-8"
            >
              <div className="relative">
                <div className="w-32 h-32 rounded-3xl overflow-hidden bg-white/5 border border-white/10 shrink-0">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl text-white/20 font-bold uppercase">
                      {(profile.full_name || profile.username || 'A')[0]}
                    </div>
                  )}
                </div>
                <div className="mt-6 space-y-2">
                  <h1 className="text-3xl font-semibold text-white tracking-tight leading-tight">
                    {profile.full_name}
                  </h1>
                  <p className="text-lg text-white/50">{profile.industry || 'Student at Leaders Court'}</p>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-white/10">
                {profile.country && (
                  <div className="flex items-center gap-3 text-sm text-white/70">
                    <MapPin size={16} className="text-white/40" />
                    {profile.country} {profile.timezone ? `• ${profile.timezone}` : ''}
                  </div>
                )}
                {profile.email && (
                  <div className="flex items-center gap-3 text-sm text-white/70">
                    <Mail size={16} className="text-white/40" />
                    <a href={`mailto:${profile.email}`} className="hover:text-white transition-colors">{profile.email}</a>
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
                    {profile.bio || "This leader is currently charting their course. More details will be added soon as they progress through the academy."}
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
                        className="group bg-black border border-white/10 rounded-2xl p-5 hover:border-emerald-500/30 transition-all duration-300 relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-opacity group-hover:bg-emerald-500/10" />
                        <div className="relative z-10 flex flex-col h-full">
                          <Award className="text-emerald-500/80 mb-4" size={24} />
                          <h4 className="text-lg font-semibold text-white mb-2 leading-snug">{cert.title}</h4>
                          <div className="flex items-center gap-2 mt-auto text-xs text-white/40">
                            <Clock size={12} />
                            <span>Verified by Leaders Court</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 rounded-2xl border border-white/5 bg-white/[0.02] flex flex-col items-center justify-center text-center">
                    <Hexagon size={32} className="text-white/20 mb-4" />
                    <p className="text-white/50 text-sm">No certifications completed yet.</p>
                  </div>
                )}
              </section>

            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
