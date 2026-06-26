import { Award, Download, Clock, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCourses } from '../contexts/CourseContext';
import { Link, useNavigate } from 'react-router-dom';

export function Certifications() {
  const { user } = useAuth();
  const { courses } = useCourses();
  const navigate = useNavigate();
  const [completedCourses, setCompletedCourses] = useState<any[]>([]);

  useEffect(() => {
    async function loadCertificates() {
      if (!user) return;
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

  return (
    <div className="p-8 max-w-6xl mx-auto py-10 space-y-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">My Certifications</h1>
        <p className="text-white/50 text-sm">Download and share your completed masterclass certificates.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {completedCourses.map((cert, i) => (
          <motion.div 
            key={cert.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="flex flex-col bg-[#111113] border border-white/10 rounded-2xl overflow-hidden group"
          >
            <div className="aspect-[1.4] relative overflow-hidden bg-white/5 p-8 flex items-center justify-center cursor-pointer" onClick={() => navigate(`/app/certificate/${cert.id}`)}>
              <img src={cert.thumbnail} alt="Certificate Background" className="absolute inset-0 w-full h-full object-cover opacity-20 grayscale group-hover:opacity-30 group-hover:grayscale-0 transition-all duration-700" />
              <div className="absolute inset-0 bg-gradient-to-tr from-[#09090b] via-transparent to-transparent" />
              
              {/* Virtual Certificate Mock */}
              <div className="relative z-10 w-full max-w-sm aspect-[1.4] bg-white text-black p-6 flex flex-col items-center justify-center text-center rounded shadow-2xl border border-black/10 origin-center group-hover:scale-[1.02] transition-transform duration-500">
                 <Award className="text-blue-600 mb-4" size={32} />
                 <h4 className="font-serif text-lg text-black/80 uppercase tracking-widest mb-1">Certificate of Completion</h4>
                 <h3 className="font-serif text-xl font-bold mb-4 line-clamp-2">{cert.title}</h3>
                 <div className="w-12 h-[1px] bg-black/20 mb-4" />
                 <p className="text-[10px] text-black/60 font-mono">Issued to: {user?.user_metadata?.full_name || user?.email?.split('@')[0]}</p>
              </div>
            </div>
            
            <div className="p-6 flex items-center justify-between border-t border-white/10 bg-[#0a0a0c]">
              <div>
                <h3 className="font-semibold text-white tracking-tight leading-tight mb-1">{cert.title}</h3>
                <div className="flex items-center gap-4 text-xs text-white/40">
                  <span className="flex items-center gap-1"><Clock size={14} /> Completed</span>
                  <span className="font-mono">ID: {cert.id.substring(0, 8).toUpperCase()}</span>
                </div>
              </div>
              <button onClick={() => navigate(`/app/certificate/${cert.id}`)} className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 hover:bg-white text-white hover:text-black transition-colors shrink-0">
                <Download size={18} />
              </button>
            </div>
          </motion.div>
        ))}
        
        {completedCourses.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, border: '1px dashed rgba(255,255,255,0.1)' }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col items-center justify-center bg-transparent border border-dashed border-white/10 text-white/30 rounded-2xl p-12 min-h-[300px] col-span-1 lg:col-span-2"
          >
            <Award size={48} className="mb-4 text-white/10" />
            <p className="text-sm font-medium text-white">No certificates yet</p>
            <p className="text-xs mt-1 text-center max-w-[200px] mb-4">Complete more courses to earn certificates.</p>
            <Link to="/app/catalog" className="text-blue-400 hover:underline flex items-center gap-2 text-sm">
              Explore Catalog <ArrowRight size={14} />
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
