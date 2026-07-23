import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { PlayCircle, Star, ArrowRight, Clock, Users, BookOpen, CheckCircle2, ChevronDown, ChevronUp, Shield, Award, Zap } from 'lucide-react';
import { useState } from 'react';
import { useCourses } from '../contexts/CourseContext';
import { Logo } from '../components/Logo';

export function CourseSalesPage() {
  const { slug } = useParams();
  const { courses, loading } = useCourses();
  const navigate = useNavigate();
  const [expandedModules, setExpandedModules] = useState<number[]>([0]); // First module open by default
  
  const course = courses.find((c) => c.slug === slug);
  const isPreEnrollment = course?.startDate ? new Date(course.startDate).getTime() > Date.now() : false;
  const startDateFormatted = course?.startDate ? new Date(course.startDate).toLocaleDateString() : '';

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 min-h-screen bg-[#09090b]">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex items-center justify-center p-20 min-h-screen bg-[#09090b]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Course not found</h2>
          <button onClick={() => navigate('/')} className="text-blue-400 hover:underline">
            Return Home
          </button>
        </div>
      </div>
    );
  }

  const toggleModule = (index: number) => {
    if (expandedModules.includes(index)) {
      setExpandedModules(expandedModules.filter(i => i !== index));
    } else {
      setExpandedModules([...expandedModules, index]);
    }
  };

  const getButtonText = () => {
    return isPreEnrollment ? `Pre-enroll for $${course.price.usd} (Starts ${startDateFormatted})` : `Enroll for $${course.price.usd}`;
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white font-sans selection:bg-white/20 pb-32">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#09090b]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <Logo className="w-8 h-8 text-[#0084FF]" />
            <span className="font-semibold tracking-tight text-lg">PDS Academy</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to={`/checkout/${course.id}`} className="px-5 py-2.5 bg-white text-black text-sm font-medium rounded-full hover:bg-gray-200 transition-all shadow-lg shadow-white/10">
              {isPreEnrollment ? 'Pre-enroll Now' : 'Enroll Now'}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6">
        <div className="absolute inset-0 z-0">
          <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover opacity-20 mix-blend-luminosity" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#09090b] via-[#09090b]/80 to-[#09090b]" />
        </div>

        <div className="max-w-5xl mx-auto relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            {isPreEnrollment && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-xs font-medium text-blue-400 mb-8 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                Pre-enrollment open. Course begins {startDateFormatted}.
              </div>
            )}
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.1] balance">
              {course.title}
            </h1>
            <p className="text-xl text-white/60 mb-10 max-w-2xl mx-auto leading-relaxed">
              {course.description || `Taught by ${course.instructor}. Master the essential skills and frameworks needed to excel in this comprehensive curriculum designed for executives.`}
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link to={`/checkout/${course.id}`} className="px-8 py-4 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 transition-all flex items-center gap-2 group shadow-[0_0_40px_rgba(37,99,235,0.3)]">
                {getButtonText()}
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12 text-sm text-white/50">
              <div className="flex items-center gap-2"><Clock size={18} className="text-white/30" /> {course.duration} of content</div>
              <div className="flex items-center gap-2"><Users size={18} className="text-white/30" /> {course.enrolled.toLocaleString()}+ students</div>
              <div className="flex items-center gap-2"><Star size={18} className="text-orange-400 fill-orange-400" /> {course.rating} / 5.0 Rating</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-24 px-6 bg-[#0a0a0c] border-y border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-3xl bg-[#111113] border border-white/5">
            <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-6 text-white">
              <Zap size={24} />
            </div>
            <h3 className="text-xl font-semibold mb-3">Actionable Strategies</h3>
            <p className="text-white/50 leading-relaxed">Stop wasting time on theory. This course gives you battle-tested frameworks you can apply to your business immediately.</p>
          </div>
          <div className="p-8 rounded-3xl bg-[#111113] border border-white/5">
            <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-6 text-white">
              <Award size={24} />
            </div>
            <h3 className="text-xl font-semibold mb-3">Industry-Leading Instructor</h3>
            <p className="text-white/50 leading-relaxed">Learn directly from {course.instructor}, an expert with years of experience driving real results at top organizations.</p>
          </div>
          <div className="p-8 rounded-3xl bg-[#111113] border border-white/5">
            <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-6 text-white">
              <Shield size={24} />
            </div>
            <h3 className="text-xl font-semibold mb-3">Lifetime Access</h3>
            <p className="text-white/50 leading-relaxed">Revisit the materials anytime. Your enrollment includes all future updates to this curriculum at no extra cost.</p>
          </div>
        </div>
      </section>

      {/* Main Content & Curriculum */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-semibold tracking-tight mb-4">What's inside the course?</h2>
            <p className="text-white/50 text-lg">A step-by-step breakdown of exactly what you will learn.</p>
          </div>

          <div className="space-y-4">
            {course.modules?.map((module, i) => (
              <div key={i} className="rounded-2xl bg-[#111113] border border-white/5 overflow-hidden transition-all hover:border-white/20">
                <button 
                  onClick={() => toggleModule(i)}
                  className="w-full p-6 flex items-center justify-between text-left transition-colors"
                >
                  <div className="flex gap-6 items-center">
                    <div className="w-12 h-12 rounded-full bg-white/5 text-white flex items-center justify-center font-semibold text-lg shrink-0">
                      {i + 1}
                    </div>
                    <div>
                      <h4 className="text-xl text-white font-medium mb-1">{module.title}</h4>
                      {module.description && (
                        <p className="text-sm text-white/50 line-clamp-1">{module.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-sm font-medium px-3 py-1 bg-white/5 rounded-full text-white/50 hidden sm:block">
                      {module.items ? `${module.items.length} lessons` : '0 lessons'}
                    </div>
                    {expandedModules.includes(i) ? <ChevronUp size={20} className="text-white/40" /> : <ChevronDown size={20} className="text-white/40" />}
                  </div>
                </button>
                
                {expandedModules.includes(i) && module.items && module.items.length > 0 && (
                  <div className="px-6 pb-6 pt-2">
                    <div className="space-y-2">
                      {module.items.map((item, j) => (
                        <div key={j} className="flex justify-between items-center py-3 px-4 rounded-xl hover:bg-white/5 text-sm text-white/70 transition-colors">
                          <div className="flex items-center gap-3">
                            {item._type === 'lesson' ? <PlayCircle size={18} className="text-blue-400" /> : <CheckCircle2 size={18} className="text-orange-400" />}
                            <span className="font-medium text-white/90">{item.title}</span>
                          </div>
                          {item._type === 'lesson' && item.duration && (
                            <span className="text-white/40 text-xs px-2 py-1 bg-white/5 rounded-md">{item.duration}m</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Instructor Section */}
      <section className="py-24 px-6 bg-[#111113] border-y border-white/5">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-12">
          <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-white/10 shrink-0 overflow-hidden border-4 border-[#09090b] shadow-2xl flex items-center justify-center text-4xl text-white/20 font-bold uppercase">
             {course.instructor.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-semibold mb-2">Meet Your Instructor</h2>
            <h3 className="text-xl text-blue-400 font-medium mb-6">{course.instructor}</h3>
            <p className="text-white/60 leading-relaxed text-lg">
              {course.instructorBio || `${course.instructor} brings decades of unparalleled experience working with Fortune 500 companies. Their unique approach combines academic rigor with practical, battle-tested strategies that guarantee results.`}
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-32 px-6 text-center">
        <div className="max-w-3xl mx-auto relative">
          <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full" />
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Ready to level up?</h2>
            <p className="text-xl text-white/50 mb-10">Join {course.enrolled.toLocaleString()}+ students who have already transformed their careers.</p>
            <Link to={`/checkout/${course.id}`} className="inline-flex items-center gap-2 px-10 py-5 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition-all hover:scale-105 active:scale-95 shadow-xl">
              {getButtonText()}
            </Link>
            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-white/40">
              <Shield size={16} /> 14-Day Money-Back Guarantee
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
