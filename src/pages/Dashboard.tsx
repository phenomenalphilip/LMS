import { Play, PlayCircle, Clock, Trophy, ChevronRight, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { useCourses } from '../contexts/CourseContext';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function Dashboard() {
  const { courses, loading } = useCourses();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [progressCounts, setProgressCounts] = useState<Record<string, number>>({});
  const [enrolledCourses, setEnrolledCourses] = useState<Set<string>>(new Set());
  const [communities, setCommunities] = useState<{ id: string; name: string }[]>([]);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    async function loadProgress() {
      if (user) {
        const [{ data: enrollData }, { data: progData }] = await Promise.all([
          supabase.from('enrollments').select('course_id').eq('user_id', user.id),
          supabase.from('lesson_progress').select('course_id').eq('user_id', user.id).eq('completed', true)
        ]);

        if (enrollData) {
          setEnrolledCourses(new Set(enrollData.map((e: any) => e.course_id)));
        }

        const counts = (progData || []).reduce((acc: any, curr: any) => {
          acc[curr.course_id] = (acc[curr.course_id] || 0) + 1;
          return acc;
        }, {});

        // Fallback to localStorage
        if (typeof window !== 'undefined') {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(`progress_${user.id}_`)) {
              const courseId = key.replace(`progress_${user.id}_`, '');
              try {
                const parsed = JSON.parse(localStorage.getItem(key) || '[]');
                counts[courseId] = Math.max(counts[courseId] || 0, parsed.length);
              } catch (e) { }
            }
          }
          setProgressCounts(counts);

          const welcomeSeen = localStorage.getItem(`welcome_seen_${user.id}`);
          if (!welcomeSeen) {
            setShowWelcome(true);
            supabase.from('community_members').select('communities(id, name)').eq('user_id', user.id).then(({ data, error }) => {
              if (error) {
                console.error("Failed to load user communities for welcome banner:", error);
                return;
              }
              if (data) {
                const comms = data.map(d => d.communities).filter(Boolean);
                const uniqueComms = Array.from(new Map(comms.map((c: any) => [c.id, c])).values());
                setCommunities(uniqueComms);
              }
            });
          }
        }
      }
    }
    loadProgress();
  }, [user]);

  const dismissWelcome = () => {
    if (user) localStorage.setItem(`welcome_seen_${user.id}`, 'true');
    setShowWelcome(false);
  };

  if (loading) {
    return (
      <div className="flex-col min-h-screen flex items-center justify-center p-8 bg-black">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // Find the first enrolled course the user has started but not finished
  let ongoingCourse = courses.find(c => {
    if (!enrolledCourses.has(c.id)) return false;
    const totalItems = c.modules?.reduce((acc: number, m: any) => acc + (m.items?.length || 0), 0) || 1;
    const completedItems = progressCounts[c.id] || 0;
    return completedItems >= 0 && completedItems < totalItems;
  });

  // Fallback to the first completed course, or just first enrolled course, or courses[0]
  if (!ongoingCourse) {
    ongoingCourse = courses.find(c => enrolledCourses.has(c.id) && (progressCounts[c.id] || 0) > 0)
      || courses.find(c => enrolledCourses.has(c.id))
      || courses[0];
  }

  const recommendedCourses = courses.filter(c => c.id !== ongoingCourse?.id).slice(0, 3);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || '';
  const greeting = `${getGreeting()}${firstName ? `, ${firstName}` : ''}.`;

  if (!ongoingCourse) {
    return (
      <div className="p-8 max-w-6xl mx-auto py-10 space-y-12">
        <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">{greeting}</h1>
        <p className="text-white/50 text-sm">No courses available yet.</p>
      </div>
    );
  }

  const ongoingTotalItems = ongoingCourse.modules?.reduce((acc: number, m: any) => acc + (m.items?.length || 0), 0) || 1;
  const ongoingCompletedItems = progressCounts[ongoingCourse.id] || 0;
  const ongoingProgressPct = Math.min(100, Math.round((ongoingCompletedItems / ongoingTotalItems) * 100));

  return (
    <div className="p-8 max-w-6xl mx-auto py-10 space-y-12">

      <AnimatePresence>
        {showWelcome && communities.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center justify-between bg-blue-500/10 border border-blue-500/20 px-4 py-3 rounded-xl shrink-0"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 border border-blue-500/30">
                <CheckCircle2 size={18} className="text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-white font-medium">
                  🎉 Welcome! You've unlocked {communities.length} {communities.length === 1 ? 'community' : 'communities'}.
                </p>
                <p className="text-xs text-white/60 mt-0.5">
                  Head over to the <Link to="/app/community" className="text-blue-400 hover:text-blue-300 transition-colors">Network</Link> to introduce yourself and see your new groups.
                </p>
              </div>
            </div>
            <button onClick={dismissWelcome} aria-label="Dismiss welcome message" className="text-white/40 hover:text-white transition-colors p-2 shrink-0">
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Welcome Section */}
      <section>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">{greeting}</h1>
          <p className="text-white/50 text-sm">Pick up right where you left off and continue your leadership journey.</p>
        </motion.div>
      </section>

      {/* Continue Learning - Hero Card */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-white flex items-center gap-2">
            <PlayCircle size={18} className="text-blue-400" />
            Continue Learning
          </h2>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative rounded-2xl overflow-hidden border border-white/10 group cursor-pointer"
        >
          <div className="absolute inset-0" onClick={() => navigate(`/app/course/${ongoingCourse.id}`)}>
            <img src={ongoingCourse.thumbnail} alt={ongoingCourse.title} className="w-full h-full object-cover opacity-40 group-hover:opacity-50 transition-opacity duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/80 to-transparent" />
          </div>

          <div className="relative p-8 md:p-12 flex flex-col md:flex-row md:items-end justify-between gap-8 h-full pointer-events-none">
            <div className="max-w-xl pointer-events-auto">
              <div className="inline-block px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-medium text-white mb-4">
                {ongoingCourse.nextModule || 'Get Started'}
              </div>
              <h3 className="text-2xl md:text-4xl font-semibold text-white tracking-tight leading-tight mb-4 group-hover:text-blue-400 transition-colors pointer-events-auto">
                <Link to={`/app/course/${ongoingCourse.id}`}>{ongoingCourse.title}</Link>
              </h3>

              <div className="flex items-center gap-4 text-sm text-white/60 mb-6">
                <span className="flex items-center gap-1.5"><Clock size={16} /> {ongoingCourse.duration || 'Flexible Timing'}</span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-white">{ongoingProgressPct >= 100 ? 'Completed' : `${ongoingProgressPct}% Completed`}</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${ongoingProgressPct}%` }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className={`h-full rounded-full relative ${ongoingProgressPct >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                  >
                    <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-white/30" />
                  </motion.div>
                </div>
              </div>
            </div>

            <Link
              to={`/app/course/${ongoingCourse.id}`}
              className="group/btn flex items-center justify-center gap-2 bg-white text-black px-6 py-3.5 rounded-full font-medium hover:bg-gray-200 transition-all active:scale-95 shrink-0 pointer-events-auto"
            >
              <Play size={18} className="fill-black" />
              {ongoingProgressPct >= 100 ? 'Review Course' : 'Resume Video'}
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Recommended for you */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-white flex items-center gap-2">
            <Trophy size={18} className="text-orange-400" />
            Recommended Next Steps
          </h2>
          <Link to="/app/catalog" className="text-sm text-white/50 hover:text-white flex items-center gap-1 transition-colors">
            Browse Catalog <ChevronRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendedCourses.map((course, i) => (
            <motion.div
              key={course.id}
              onClick={() => navigate(`/app/catalog/${course.id}`)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + (i * 0.1) }}
              className="bg-[#111113] border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all group cursor-pointer hover:-translate-y-1"
            >
              <div className="aspect-video relative overflow-hidden bg-white/5">
                <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111113] to-transparent" />
              </div>
              <div className="p-5">
                <h3 className="font-medium text-white mb-1 group-hover:text-blue-400 transition-colors line-clamp-1">{course.title}</h3>
                <p className="text-sm text-white/50 mb-4">{course.instructor}</p>
                <div className="flex items-center justify-between text-xs text-white/40 border-t border-white/5 pt-4">
                  <span>{course.duration}</span>
                  <span className="flex items-center gap-1">★ {course.rating}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

    </div>
  );
}
