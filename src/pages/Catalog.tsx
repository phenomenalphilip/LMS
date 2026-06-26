import { Search, Filter, PlayCircle, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { CheckoutModal } from '../components/CheckoutModal';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useCourses } from '../contexts/CourseContext';

export function Catalog() {
  const { courses, loading } = useCourses();
  const [checkoutCourse, setCheckoutCourse] = useState<any | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeEnrollments, setActiveEnrollments] = useState<Set<string>>(new Set());
  const [progressCounts, setProgressCounts] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Extract unique categories
  const categories = ['All', ...Array.from(new Set(courses.map(c => c.category).filter(Boolean)))];

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (course.instructor && course.instructor.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || course.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      const [{ data: envData }, { data: progData }] = await Promise.all([
        supabase.from('enrollments').select('course_id, expires_at').eq('user_id', user.id),
        supabase.from('lesson_progress').select('course_id').eq('user_id', user.id).eq('completed', true)
      ]);
        
      if (envData) {
        const active = new Set<string>();
        const now = Date.now();
        envData.forEach(env => {
          if (new Date(env.expires_at).getTime() > now) {
            active.add(env.course_id);
          }
        });
        setActiveEnrollments(active);
      }

      if (progData) {
        const counts = progData.reduce((acc: any, curr: any) => {
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
              } catch (e) {}
            }
          }
        }

        setProgressCounts(counts);
      }
    }
    loadData();
  }, [user]);

  const handleAction = (course: any) => {
    if (activeEnrollments.has(course.id)) {
      navigate(`/app/course/${course.id}`);
    } else {
      setCheckoutCourse(course);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto py-10 space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">Course Catalog</h1>
          <p className="text-white/50 text-sm">Expand your expertise with premium masterclasses.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search catalog..." 
              className="bg-[#111113] border border-white/10 rounded-full py-2 pl-9 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-colors w-64"
            />
          </div>
          <div className="relative group">
            <button className="p-2.5 bg-[#111113] border border-white/10 rounded-full text-white/70 hover:text-white transition-colors flex items-center gap-2">
              <Filter size={18} />
              <span className="text-sm pr-1">{selectedCategory}</span>
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a1c] border border-white/10 rounded-xl shadow-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              {categories.map((cat: any) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${selectedCategory === cat ? 'bg-blue-500/20 text-blue-400' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCourses.map((course, i) => {
          const isEnrolled = activeEnrollments.has(course.id);
          
          return (
            <motion.div 
              key={course.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="flex flex-col bg-[#111113] border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all group"
            >
              <Link to={`/app/catalog/${course.id}`} className="aspect-[16/10] relative overflow-hidden bg-white/5 block">
                <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111113] via-[#111113]/20 to-transparent" />
                <div className="absolute top-4 right-4 flex gap-2">
                  {course.category && (
                    <div className="px-3 py-1 bg-black/50 backdrop-blur-md rounded-full text-xs font-semibold text-white/90 border border-white/10">
                      {course.category}
                    </div>
                  )}
                  <div className="px-3 py-1 bg-black/50 backdrop-blur-md rounded-full text-xs font-semibold text-white/90 border border-white/10 flex items-center gap-1.5">
                    <Star size={12} className="text-orange-400 fill-orange-400" /> {course.rating}
                  </div>
                </div>
              </Link>
              
              <div className="p-6 flex-1 flex flex-col">
                <Link to={`/app/catalog/${course.id}`} className="hover:text-blue-400 transition-colors">
                  <h3 className="font-semibold text-lg text-white mb-2 leading-snug">{course.title}</h3>
                </Link>
                <p className="text-sm text-white/50 mb-6 flex-1">Instructor: {course.instructor}</p>
                
                {isEnrolled ? (
                  <div className="mb-6 space-y-2">
                    <div className="flex justify-between text-xs text-white/50">
                      <span>
                        {Math.min(100, Math.round(((progressCounts[course.id] || 0) / (course.modules?.reduce((acc: number, m: any) => acc + (m.items?.length || 0), 0) || 1)) * 100)) >= 100 
                          ? 'Completed' 
                          : `${Math.min(100, Math.round(((progressCounts[course.id] || 0) / (course.modules?.reduce((acc: number, m: any) => acc + (m.items?.length || 0), 0) || 1)) * 100))}% completed`
                        }
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${Math.min(100, Math.round(((progressCounts[course.id] || 0) / (course.modules?.reduce((acc: number, m: any) => acc + (m.items?.length || 0), 0) || 1)) * 100)) >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, Math.round(((progressCounts[course.id] || 0) / (course.modules?.reduce((acc: number, m: any) => acc + (m.items?.length || 0), 0) || 1)) * 100))}%` }} />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs text-white/40 mb-6">
                    <span>{course.duration}</span>
                    <span>{course.enrolled.toLocaleString()} enrolled</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-6 border-t border-white/10">
                  <div>
                    {isEnrolled ? (
                      <div className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">Enrolled</div>
                    ) : (
                      <>
                        <div className="text-lg font-semibold text-white tracking-tight">${course.price.usd}</div>
                        <div className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">NGN {course.price.ngn.toLocaleString()}</div>
                      </>
                    )}
                  </div>
                  <button 
                    onClick={() => handleAction(course)}
                    className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-full transition-all active:scale-95 ${
                      isEnrolled 
                        ? (Math.min(100, Math.round(((progressCounts[course.id] || 0) / (course.modules?.reduce((acc: number, m: any) => acc + (m.items?.length || 0), 0) || 1)) * 100)) >= 100 ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20')
                        : 'bg-white text-black hover:bg-gray-200'
                    }`}
                  >
                    <PlayCircle size={16} /> 
                    {isEnrolled 
                      ? (Math.min(100, Math.round(((progressCounts[course.id] || 0) / (course.modules?.reduce((acc: number, m: any) => acc + (m.items?.length || 0), 0) || 1)) * 100)) >= 100 ? 'Completed' : 'Continue') 
                      : 'Enroll'}
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <CheckoutModal 
        isOpen={!!checkoutCourse} 
        onClose={() => setCheckoutCourse(null)} 
        course={checkoutCourse!} 
      />
    </div>
  );
}
