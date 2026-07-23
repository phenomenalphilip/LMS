import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { PlayCircle, Star, ArrowLeft, Clock, Users, BookOpen, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { CheckoutModal } from '../components/CheckoutModal';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useCourses } from '../contexts/CourseContext';
import { PortableText } from '@portabletext/react';

export function CourseDetails() {
  const { courses, loading } = useCourses();
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [checkoutCourse, setCheckoutCourse] = useState<any | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [checkingEnrollment, setCheckingEnrollment] = useState(true);
  const [expandedModules, setExpandedModules] = useState<number[]>([]);
  
  const course = courses.find((c) => c.id === courseId);
  
  const isPreEnrollment = course?.startDate ? new Date(course.startDate).getTime() > Date.now() : false;
  const startDateFormatted = course?.startDate ? new Date(course.startDate).toLocaleDateString() : '';

  useEffect(() => {
    async function checkEnrollment() {
      if (!user || !course) {
        setCheckingEnrollment(false);
        return;
      }
      setCheckingEnrollment(true);
      try {
        const { data, error } = await supabase
          .from('enrollments')
          .select('expires_at')
          .eq('user_id', user.id)
          .eq('course_id', course.id)
          .order('expires_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("Error checking enrollment:", error);
        } else if (data) {
          const expiresAt = new Date(data.expires_at).getTime();
          if (expiresAt > Date.now()) {
            setIsEnrolled(true);
          }
        }
      } catch (err) {
        console.error("Error confirming enrollment status:", err);
      } finally {
        setCheckingEnrollment(false);
      }
    }
    
    checkEnrollment();
  }, [user, course]);

  if (loading || checkingEnrollment) {
    return (
      <div className="flex items-center justify-center p-20 min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-8 max-w-7xl mx-auto py-20 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Course not found</h2>
        <button onClick={() => navigate('/app/catalog')} className="text-blue-400 hover:underline">
          Return to Catalog
        </button>
      </div>
    );
  }

  const handleActionClick = () => {
    if (isEnrolled) {
      navigate(`/app/course/${course.id}`);
    } else {
      if (user) {
        setCheckoutCourse(course);
      } else {
        navigate(`/checkout/${course.id}`);
      }
    }
  };

  const getButtonText = () => {
    if (checkingEnrollment) return 'Checking...';
    if (isEnrolled) {
      return isPreEnrollment ? `Course Starts ${startDateFormatted}` : 'Continue to Class';
    }
    return isPreEnrollment ? `Pre-enroll for $${course.price.usd} (Starts ${startDateFormatted})` : `Enroll for $${course.price.usd}`;
  };

  const toggleModule = (index: number) => {
    if (expandedModules.includes(index)) {
      setExpandedModules(expandedModules.filter(i => i !== index));
    } else {
      setExpandedModules([...expandedModules, index]);
    }
  };

  return (
    <div className="pb-20 bg-[#09090b] min-h-screen">
      {/* Hero Section */}
      <div className="relative w-full h-[40vh] min-h-[400px] bg-[#0a0a0c]">
        <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/80 to-transparent" />
        
        <div className="absolute inset-0 p-8 max-w-7xl mx-auto flex flex-col justify-end pb-12">
          {user ? (
            <Link to="/app/catalog" className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-6 w-fit">
              <ArrowLeft size={16} /> Back to Catalog
            </Link>
          ) : (
            <Link to="/" className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-6 w-fit">
              <ArrowLeft size={16} /> Back to Home
            </Link>
          )}
          
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-white/90 border border-white/10 uppercase tracking-wider">
              {course.modules && course.modules.length > 0 ? 'Masterclass' : 'Course'}
            </span>
            <div className="flex items-center gap-1.5 text-sm font-medium text-orange-400">
              <Star size={14} className="fill-orange-400" /> {course.rating} Rating
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4 max-w-3xl leading-tight">
            {course.title}
          </h1>
          <p className="text-lg text-white/60 mb-8 max-w-2xl">
            {course.description || `Taught by ${course.instructor}. Master the essential skills and frameworks needed to excel in this comprehensive curriculum designed for executives.`}
          </p>
          
          <div className="flex items-center gap-6 text-sm text-white/50 mb-8">
            <div className="flex items-center gap-2"><Clock size={16} /> {course.duration}</div>
            <div className="flex items-center gap-2"><Users size={16} /> {course.enrolled.toLocaleString()} Enrolled</div>
            <div className="flex items-center gap-2"><BookOpen size={16} /> Certificate of Completion</div>
          </div>
          
          <div className="flex items-center gap-6">
            <button 
              onClick={handleActionClick}
              disabled={checkingEnrollment}
              className="px-8 py-3.5 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlayCircle size={18} /> {getButtonText()}
            </button>
            <div className="text-white/40 text-sm">
              6 Months Flexible Access
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12 mt-8">
        <div className="lg:col-span-2 space-y-12">
          {course.details ? (
            <section>
              <h2 className="text-2xl font-semibold text-white mb-6">About this Masterclass</h2>
              <div className="prose prose-invert max-w-none text-white/60 leading-relaxed font-light">
                <PortableText value={course.details} />
              </div>
            </section>
          ) : (
            <section>
              <h2 className="text-2xl font-semibold text-white mb-6">About this Masterclass</h2>
              <div className="prose prose-invert max-w-none text-white/60 leading-relaxed font-light">
                <p className="mb-4">
                  This program is tailored for professionals seeking to elevate their strategic capabilities and leadership presence. 
                  You will deep dive into advanced frameworks, real-world case studies, and actionable techniques used by top executives globally.
                </p>
              </div>
            </section>
          )}

          {course.learningOutcomes && course.learningOutcomes.length > 0 && (
            <section>
              <h2 className="text-2xl font-semibold text-white mb-6">What you'll learn</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {course.learningOutcomes.map((item: string, i: number) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="text-emerald-400 mt-1 shrink-0" />
                    <span className="text-white/70 text-sm leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {course.modules && course.modules.length > 0 && (
            <section>
              <h2 className="text-2xl font-semibold text-white mb-6">Curriculum Overview</h2>
              <div className="space-y-4">
                {course.modules.map((module, i) => (
                  <div key={i} className="rounded-2xl bg-[#111113] border border-white/5 overflow-hidden transition-colors">
                    <button 
                      onClick={() => toggleModule(i)}
                      className="w-full p-5 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                    >
                      <div className="flex gap-4 items-center">
                        <div className="w-10 h-10 rounded-full bg-white/5 text-white flex items-center justify-center font-semibold text-sm">
                          {i + 1}
                        </div>
                        <div>
                          <h4 className="text-white font-medium mb-1 transition-colors">{module.title}</h4>
                          {module.description && (
                            <p className="text-xs text-white/40 max-w-md line-clamp-1">{module.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-white/30 hidden md:block">
                          {module.items ? `${module.items.length} items` : '0 items'}
                        </div>
                        {expandedModules.includes(i) ? <ChevronUp size={18} className="text-white/40" /> : <ChevronDown size={18} className="text-white/40" />}
                      </div>
                    </button>
                    
                    {expandedModules.includes(i) && module.items && module.items.length > 0 && (
                      <div className="px-5 pb-5 pt-2 border-t border-white/5 bg-[#0a0a0c]/50">
                        <div className="space-y-2 mt-4">
                          {module.items.map((item, j) => (
                            <div key={j} className="flex justify-between items-center py-2 px-3 rounded-lg hover:bg-white/5 text-sm text-white/70">
                              <div className="flex items-center gap-3">
                                {item._type === 'lesson' ? <PlayCircle size={16} className="text-blue-400" /> : <CheckCircle2 size={16} className="text-orange-400" />}
                                <span>{item.title}</span>
                              </div>
                              {item._type === 'lesson' && item.duration && (
                                <span className="text-white/30 text-xs">{item.duration}m</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#111113] border border-white/5 sticky top-8">
            <h3 className="text-lg font-semibold text-white mb-4">Instructor</h3>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-white/10 uppercase font-bold text-xl text-white/40 flex items-center justify-center shrink-0">
                {course.instructor.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <div className="text-white font-medium">{course.instructor}</div>
                <div className="text-sm text-white/40">Industry Expert & Thought Leader</div>
              </div>
            </div>
            <p className="text-sm text-white/50 leading-relaxed font-light mb-6">
              {course.instructorBio || `${course.instructor} brings decades of unparalleled experience working with Fortune 500 companies. Their unique approach combines academic rigor with practical, battle-tested strategies.`}
            </p>
            
            <hr className="border-white/5 mb-6" />
            
            <div className="space-y-4 mb-8 text-sm text-white/60">
              <div className="flex justify-between"><span>Skill Level</span><span className="text-white">{course.skillLevel || 'Beginner'}</span></div>
              <div className="flex justify-between"><span>Language</span><span className="text-white">{course.language || 'English'}</span></div>
              <div className="flex justify-between"><span>Subtitles</span><span className="text-white">{course.subtitles?.join(', ') || 'None'}</span></div>
            </div>

            <button 
              onClick={handleActionClick}
              disabled={checkingEnrollment}
              className="w-full py-3.5 bg-white text-black font-semibold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checkingEnrollment ? 'Checking...' : isEnrolled ? 'Continue to Class' : 'Enroll Now'}
            </button>
          </div>
        </div>
      </div>

      <CheckoutModal 
        isOpen={!!checkoutCourse} 
        onClose={() => setCheckoutCourse(null)} 
        course={checkoutCourse!} 
      />
    </div>
  );
}
