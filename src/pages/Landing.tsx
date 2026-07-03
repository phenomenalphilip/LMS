import { motion } from 'motion/react';
import { ArrowRight, PlayCircle, Shield, Globe, Award, ChevronRight, Users, TrendingUp, CheckCircle2, Quote, Star } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCourses } from '../contexts/CourseContext';
import { Logo } from '../components/Logo';

const testimonials = [
  { name: "Amina J.", role: "Chief Operating Officer", quote: "The strategic insights from the Executive Masterclass completely transformed how we approach quarterly planning. Brilliant." },
  { name: "David O.", role: "Managing Director", quote: "PDS Academy provides the exact caliber of executive education I was looking for, without having to travel abroad." },
  { name: "Sarah M.", role: "Head of Strategy", quote: "Actionable, dense, and beautifully produced. The best investment I've made in my career this year." }
];

export function Landing() {
  const { user, loading } = useAuth();
  const { courses } = useCourses();

  if (!loading && user) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white font-sans selection:bg-white/20 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#09090b]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo className="w-8 h-8 text-[#0084FF]" />
            <span className="font-semibold tracking-tight text-lg">PDS Academy</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/login" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link to="/login" className="px-5 py-2.5 bg-white text-black text-sm font-medium rounded-full hover:bg-gray-200 transition-all">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 md:pt-52 md:pb-32 px-6">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2940&auto=format&fit=crop"
            alt="Hero Background"
            className="w-full h-full object-cover opacity-20 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#09090b] via-[#09090b]/50 to-[#09090b]" />
        </div>

        <div className="max-w-5xl mx-auto relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs font-medium text-white/80 mb-8 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Enrollment now open for Q3 Masterclasses
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-semibold tracking-tight text-white mb-8 leading-[1.05] balance">
              Executive Education. <br className="hidden md:block" />
              <span className="text-white/50 text-4xl md:text-6xl lg:text-7xl block mt-2">Redefined for Africa.</span>
            </h1>
            <p className="text-lg md:text-xl text-white/60 mb-12 max-w-2xl mx-auto leading-relaxed">
              Premium cinematic masterclasses designed for the modern African executive. Learn from top industry leaders, anytime, anywhere.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/login" className="px-8 py-4 bg-white text-black font-medium rounded-full hover:bg-gray-200 transition-all flex items-center gap-2 group w-full sm:w-auto justify-center">
                Explore the Academy
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="px-8 py-4 bg-white/5 border border-white/10 text-white font-medium rounded-full hover:bg-white/10 transition-all flex items-center gap-2 w-full sm:w-auto justify-center">
                <PlayCircle size={18} /> Watch Trailer
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-10 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-xs text-white/40 mb-8 font-medium tracking-widest uppercase">Our Alumni Lead At Top Organizations</p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-50 grayscale hover:grayscale-0 transition-all duration-700">
            <span className="text-2xl font-bold font-serif tracking-tighter">Interswitch</span>
            <span className="text-xl font-bold tracking-widest">MTN</span>
            <span className="text-2xl font-semibold italic opacity-90">Dangote</span>
            <span className="text-xl font-black uppercase tracking-tighter">Paystack</span>
            <span className="text-xl font-medium tracking-wide">Access Bank</span>
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      <section className="py-32 px-6 bg-[#0a0a0c]">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4">Masterclasses.</h2>
              <p className="text-white/50 text-lg max-w-2xl">Dive deep into our premium curriculum.</p>
            </div>
            <Link to="/login" className="text-sm font-medium text-white hover:text-blue-400 transition-colors flex items-center gap-2">
              View All Courses <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.slice(0, 3).map((course, i) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="flex flex-col bg-[#111113] border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all group"
              >
                <Link to={`/course/${course.id}`} className="aspect-[16/10] relative overflow-hidden bg-white/5 block">
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
                  <Link to={`/course/${course.id}`} className="hover:text-blue-400 transition-colors">
                    <h3 className="font-semibold text-lg text-white mb-2 leading-snug">{course.title}</h3>
                  </Link>
                  <p className="text-sm text-white/50 mb-6 flex-1">Instructor: {course.instructor}</p>

                  <div className="flex items-center justify-between text-xs text-white/40 mb-6">
                    <span>{course.duration}</span>
                    <span>{course.enrolled.toLocaleString()} enrolled</span>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-white/10">
                    <div>
                      <div className="text-lg font-semibold text-white tracking-tight">${course.price.usd}</div>
                      <div className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">NGN {course.price.ngn.toLocaleString()}</div>
                    </div>
                    <Link
                      to={`/checkout/${course.id}`}
                      className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-full transition-all active:scale-95 bg-white text-black hover:bg-gray-200"
                    >
                      Enroll
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* The PDS Academy Edge (Bento Grid) */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4">The PDS Academy Edge.</h2>
            <p className="text-white/50 text-lg max-w-2xl">We bridge the gap between abstract theory and operational execution.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Big Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="md:col-span-2 bg-[#111113] border border-white/10 rounded-3xl p-8 md:p-12 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-40 transition-opacity">
                <TrendingUp size={120} className="w-48 h-48 -mr-10 -mt-10 text-white" />
              </div>
              <div className="relative z-10 max-w-md">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-6">
                  <Shield size={24} />
                </div>
                <h3 className="text-2xl md:text-3xl font-semibold mb-4 text-white">Actionable Frameworks</h3>
                <p className="text-white/60 leading-relaxed mb-8">
                  Get access to proprietary templates, diagnostic tools, and step-by-step playbooks used by top-tier consulting firms.
                </p>
                <ul className="space-y-3">
                  {['Quarterly Strategic Planning', 'Crisis Management Playbooks', 'High-Performance Team Diagnostics'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-white/80">
                      <CheckCircle2 size={16} className="text-blue-500" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {/* Small Card 1 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
              className="bg-[#111113] border border-white/10 rounded-3xl p-8 relative overflow-hidden group"
            >
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mb-6">
                <Globe size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">Optimized for You</h3>
              <p className="text-white/60 leading-relaxed text-sm">
                Experience seamless HLS adaptive bitrate streaming that adjusts to your network. Pay easily with dynamic NGN/USD checkout via Paystack.
              </p>
            </motion.div>

            {/* Small Card 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
              className="bg-[#111113] border border-white/10 rounded-3xl p-8 relative overflow-hidden group"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6">
                <Award size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">Verified Credentials</h3>
              <p className="text-white/60 leading-relaxed text-sm">
                Earn digitally verifiable certificates upon completion to showcase your commitment to executive excellence.
              </p>
            </motion.div>

            {/* Wide Bottom Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
              className="md:col-span-3 bg-white text-black border border-white/10 rounded-3xl p-8 md:p-12 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8"
            >
              <div>
                <h3 className="text-2xl md:text-3xl font-semibold mb-4">Join 15,000+ Executives</h3>
                <p className="text-black/70 max-w-lg">Become part of an elite alumni network. Discuss strategies, forge partnerships, and elevate your organizational impact.</p>
              </div>
              <div className="flex -space-x-4 shrink-0">
                {[1, 2, 3, 4, 5].map((i) => (
                  <img key={i} src={`https://api.dicebear.com/9.x/notionists/svg?seed=${i}&backgroundColor=e5e7eb`} alt="Avatar" className="w-16 h-16 rounded-full border-4 border-white bg-gray-100" />
                ))}
                <div className="w-16 h-16 rounded-full border-4 border-white bg-black text-white flex items-center justify-center text-sm font-medium pl-1">
                  +15k
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6 border-y border-white/5 bg-[#0a0a0c]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4">Word on the board.</h2>
            <p className="text-white/50 text-lg">What our alumni are saying.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="p-8 rounded-3xl bg-[#111113] border border-white/10 flex flex-col justify-between"
              >
                <Quote size={32} className="text-white/10 mb-6" />
                <p className="text-white/80 leading-relaxed mb-8">"{t.quote}"</p>
                <div>
                  <h4 className="font-semibold text-white">{t.name}</h4>
                  <p className="text-sm text-white/50">{t.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA & Links */}
      <footer className="relative bg-[#09090b] pt-32 pb-12 px-6 overflow-hidden border-t border-white/5">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-24 bg-white/[0.02] border border-white/5 p-12 rounded-3xl">
            <div>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-white mb-2">Ready to scale your impact?</h2>
              <p className="text-white/50 text-lg">Enroll today and join the next cohort.</p>
            </div>
            <Link to="/login" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black font-medium rounded-full hover:bg-gray-200 transition-all hover:scale-105 active:scale-95 whitespace-nowrap">
              Get Started <ChevronRight size={18} />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-sm text-white/50 mb-16">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <Logo className="w-6 h-6 text-[#0084FF]" />
                <span className="font-semibold tracking-tight text-white">Academy</span>
              </div>
              <p className="max-w-xs leading-relaxed">Empowering the next generation of African business leaders.</p>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Platform</h4>
              <ul className="space-y-3">
                <li><a href="#" className="hover:text-white transition-colors">Masterclasses</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Our Faculty</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Sign In</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-3">
                <li><a href="#" className="hover:text-white transition-colors">About PDS Academy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Consulting Services</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Refund Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-white/10 text-sm text-white/40">
            <p>© {new Date().getFullYear()} PDS Academy. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white transition-colors">Twitter</a>
              <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
              <a href="#" className="hover:text-white transition-colors">Instagram</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
