import { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import { BookOpen, LayoutDashboard, Award, LogOut, Bell, Library, Menu, User, CreditCard, Globe, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

export function DashboardLayout() {
  const location = useLocation();
  const { user, loading, signOut } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      import('../lib/supabase').then(({ supabase }) => {
        supabase.from('profiles').select('avatar_url').eq('id', user.id).single().then(({ data }) => {
          if (data?.avatar_url) {
            setAvatarUrl(data.avatar_url);
          } else if (user.user_metadata?.avatar_url) {
            setAvatarUrl(user.user_metadata.avatar_url);
          }
        });
      });
    }
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/login${location.hash}`} replace />;
  }

  const navItems = [
    { name: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
    { name: 'Course Catalog', path: '/app/catalog', icon: Library },
    { name: 'My Courses', path: '/app/my-courses', icon: BookOpen },
    { name: 'Certifications', path: '/app/certifications', icon: Award },
  ];

  return (
    <div className="flex h-screen bg-[#09090b] text-white overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} transition-all duration-300 border-r border-white/5 bg-[#0a0a0c] flex flex-col hide-scrollbar shrink-0 z-20 relative`}>
        <div className={`p-6 h-20 flex items-center shrink-0 ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-between'}`}>
          <Link to="/app/dashboard" className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-black font-bold text-lg shrink-0">
              L
            </div>
            {!isSidebarCollapsed && <span className="font-semibold tracking-tight text-lg whitespace-nowrap overflow-hidden">Academy</span>}
          </Link>
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={`p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors focus:outline-none shrink-0 ${isSidebarCollapsed ? 'absolute -right-3 top-6 bg-[#111113] border border-white/10 rounded-full' : ''}`}
            aria-label="Toggle Sidebar"
          >
            <Menu size={18} />
          </button>
        </div>

        <nav className={`flex-1 ${isSidebarCollapsed ? 'px-3' : 'px-4'} py-6 space-y-1 overflow-y-auto`}>
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                title={isSidebarCollapsed ? item.name : undefined}
                className={`relative flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? 'text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 bg-white/10 rounded-xl"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon size={18} className="relative z-10 shrink-0" />
                {!isSidebarCollapsed && <span className="relative z-10 whitespace-nowrap overflow-hidden">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={`p-4 mt-auto border-t border-white/5 shrink-0 ${isSidebarCollapsed ? 'px-3' : ''}`}>
          <button 
            onClick={signOut} 
            title={isSidebarCollapsed ? "Sign Out" : undefined}
            className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 w-full rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-white/5 transition-colors`}
          >
            <LogOut size={18} className="shrink-0" />
            {!isSidebarCollapsed && <span className="whitespace-nowrap overflow-hidden">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-20 border-b border-white/5 bg-[#09090b]/80 backdrop-blur-md flex items-center justify-end px-8 shrink-0 z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <button className="relative w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-colors">
              <Bell size={20} />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-blue-500 border-2 border-[#09090b]" />
            </button>
            <div className="w-px h-6 bg-white/10 mx-2" />
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-3 hover:bg-white/5 p-2 rounded-xl transition-colors"
              >
                <div className="text-right hidden md:block">
                  <p className="text-sm font-medium text-white">{user.user_metadata?.full_name || 'Executive Member'}</p>
                  <p className="text-xs text-white/40">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full border border-white/10 bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold shrink-0 overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      user.user_metadata?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'
                    )}
                  </div>
                  <ChevronDown size={16} className={`text-white/50 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-56 bg-[#111113] border border-white/10 rounded-xl shadow-2xl overflow-hidden py-2 z-50"
                  >
                    <div className="px-4 py-2 border-b border-white/5 mb-2 block md:hidden">
                      <p className="text-sm font-medium text-white truncate">{user.user_metadata?.full_name || 'Executive Member'}</p>
                      <p className="text-xs text-white/40 truncate">{user.email}</p>
                    </div>
                    
                    <Link 
                      to="/app/account" 
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <User size={16} />
                      Account
                    </Link>
                    <Link 
                      to="/app/billing" 
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <CreditCard size={16} />
                      Billing
                    </Link>
                    <Link 
                      to="/app/portfolio" 
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <Globe size={16} />
                      Portfolio
                    </Link>
                    
                    <div className="w-full h-px bg-white/5 my-2" />
                    
                    <button 
                      onClick={() => {
                        setIsDropdownOpen(false);
                        signOut();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-white/5 transition-colors"
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto hide-scrollbar relative">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
