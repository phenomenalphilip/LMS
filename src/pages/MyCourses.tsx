import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Search, PlayCircle, Clock, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCourses } from '../contexts/CourseContext';

export function MyCourses() {
  const { user } = useAuth();
  const { courses, loading: coursesLoading } = useCourses();
  const [ongoingCourses, setOngoingCourses] = useState<any[]>([]);
  const [completedCourses, setCompletedCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user || coursesLoading) return;
    
    async function loadEnrollments() {
      try {
        const [{ data: enrollments, error }, { data: progressData }] = await Promise.all([
          supabase.from('enrollments').select('*').eq('user_id', user!.id),
          supabase.from('lesson_progress').select('course_id').eq('user_id', user!.id).eq('completed', true)
        ]);
          
        if (error) {
          console.error("Error loading enrollments:", error);
          throw error;
        }
        
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

        const ongoing: any[] = [];
        const completed: any[] = [];
        
        enrollments?.forEach(enrollment => {
          const courseData = courses.find(c => c.id === enrollment.course_id);
          if (!courseData) return;
          
          const totalItems = courseData.modules?.reduce((acc: number, m: any) => acc + (m.items?.length || 0), 0) || 1;
          const completedCount = progressCounts[courseData.id] || 0;
          const progressPct = Math.min(100, Math.round((completedCount / totalItems) * 100));

          const fullData = {
            ...courseData,
            ...enrollment,
            id: courseData.id,
            enrollmentId: enrollment.id,
            progress: progressPct,
            completedAt: enrollment.completed_at ? new Date(enrollment.completed_at).toLocaleDateString() : null
          };
          
          if (progressPct >= 100) {
            completed.push(fullData);
          } else {
            ongoing.push(fullData);
          }
        });
        
        setOngoingCourses(ongoing);
        setCompletedCourses(completed);
      } catch (err) {
        console.error("Error loading enrollments:", err);
      } finally {
        setLoading(false);
      }
    }
    
    loadEnrollments();
  }, [user, coursesLoading, courses]);

  if (loading || coursesLoading) {
    return (
      <div className="flex items-center justify-center p-20 min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const filteredOngoing = ongoingCourses.filter(course => 
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (course.instructor && course.instructor.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredCompleted = completedCourses.filter(course => 
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (course.instructor && course.instructor.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-8 max-w-7xl mx-auto py-10 space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">My Courses</h1>
          <p className="text-white/50 text-sm">Pick up where you left off and review your completed material.</p>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search my courses..." 
            className="bg-[#111113] border border-white/10 rounded-full py-2 pl-9 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-colors w-64"
          />
        </div>
      </div>

      <section>
        <h2 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
          <Clock size={18} className="text-blue-400" /> In Progress
        </h2>
        {ongoingCourses.length === 0 && completedCourses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-white/10 rounded-2xl bg-white/5 text-center">
            <h3 className="text-lg font-semibold text-white mb-2">No courses in progress</h3>
            <p className="text-white/50 text-sm mb-6 max-w-sm">You haven't enrolled in any courses yet. Explore our catalog to start your leadership journey.</p>
            <Link to="/app/catalog" className="px-5 py-2.5 bg-white text-black text-sm font-medium rounded-full hover:bg-gray-200 transition-colors">
              Browse Catalog
            </Link>
          </div>
        ) : filteredOngoing.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-white/10 rounded-2xl bg-white/5 text-center">
            <h3 className="text-lg font-semibold text-white mb-2">No courses found</h3>
            <p className="text-white/50 text-sm mb-6 max-w-sm">We couldn't find any courses matching your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredOngoing.map((course, i) => (
              <motion.div 
                key={course.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="flex bg-[#111113] border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all p-4 gap-6"
              >
                <Link to={`/app/catalog/${course.id}`} className="w-1/3 aspect-[4/3] rounded-xl overflow-hidden relative bg-white/5 shrink-0 block group/img">
                  <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500" />
                </Link>
                <div className="flex flex-col justify-center flex-1 pr-2">
                  <Link to={`/app/catalog/${course.id}`} className="hover:text-blue-400 transition-colors w-fit">
                    <h3 className="font-semibold text-lg text-white mb-1 leading-snug">{course.title}</h3>
                  </Link>
                  <p className="text-sm text-white/50 mb-6 font-medium">Instructor: {course.instructor}</p>
                  
                  <div className="mb-4 space-y-2">
                    <div className="flex justify-between text-xs text-white/50">
                      <span>{course.progress}% completed</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${course.progress}%` }} />
                    </div>
                  </div>

                  <Link 
                    to={`/app/course/${course.id}`}
                    className="inline-flex items-center gap-2 text-sm font-medium text-white hover:text-blue-400 transition-colors"
                  >
                    <PlayCircle size={16} /> Resume: {course.nextModule}
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-medium text-white mb-6 flex items-center gap-2 pt-6 border-t border-white/5">
          <CheckCircle2 size={18} className="text-emerald-400" /> Completed
        </h2>
        {completedCourses.length === 0 ? (
          <div className="text-sm text-white/40 italic">
            You haven't completed any courses yet. Keep up the good work!
          </div>
        ) : filteredCompleted.length === 0 ? (
          <div className="text-sm text-white/40 italic">
            No completed courses found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredCompleted.map((course, i) => (
              <motion.div 
                key={course.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="flex flex-col bg-[#111113] border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all group"
              >
                <Link to={`/app/catalog/${course.id}`} className="aspect-[16/10] relative overflow-hidden bg-white/5 block">
                  <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover opacity-60 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111113] via-[#111113]/20 to-transparent" />
                  <div className="absolute top-4 right-4 text-emerald-400">
                    <CheckCircle2 size={20} className="fill-emerald-400/20" />
                  </div>
                </Link>
                <div className="p-6 flex-1 flex flex-col">
                  <Link to={`/app/catalog/${course.id}`} className="hover:text-blue-400 transition-colors">
                    <h3 className="font-semibold text-lg text-white mb-2 leading-snug">{course.title}</h3>
                  </Link>
                  <p className="text-sm text-white/50 mb-6 flex-1">Instructor: {course.instructor}</p>
                  <div className="flex items-center justify-between text-xs text-white/40 pt-4 border-t border-white/10">
                    <span>Completed: {course.completedAt}</span>
                    <Link to={`/app/course/${course.id}`} className="hover:text-white transition-colors">Review</Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
