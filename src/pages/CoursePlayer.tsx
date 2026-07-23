import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Settings, SkipForward, Maximize, FileText, CheckCircle, HelpCircle, Check, PlayCircle, CheckCircle2, Award } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import MuxPlayer from '@mux/mux-player-react';
import { useCourses } from '../contexts/CourseContext';
import { PortableText } from '@portabletext/react';
import { useProgress } from '../hooks/useProgress';

export function CoursePlayer() {
  const { courses, loading } = useCourses();
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'resources' | 'quiz'>('overview');
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  
  const course = courses.find((c) => c.id === courseId);
  const { completedLessons, markCompleted, savePlaybackPosition, getPlaybackPosition } = useProgress(courseId || '');
  const [startTime, setStartTime] = useState(0);
  const [maxWatchedTimes, setMaxWatchedTimes] = useState<Record<string, number>>({});
  
  // Flatten items to make iteration easier
  const allItems = course?.modules?.flatMap((m, moduleIdx) => 
    (m.items || []).map((item, itemIdx) => ({
      ...item,
      moduleIdx,
      itemIdx,
      moduleTitle: m.title
    }))
  ) || [];

  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const activeItem = allItems[activeItemIndex] as any;

  const [playbackToken, setPlaybackToken] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState<boolean>(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  useEffect(() => {
    if (activeItem) {
      getPlaybackPosition(activeItem.title).then(pos => {
        setStartTime(pos);
        setMaxWatchedTimes(prev => ({ ...prev, [activeItem.title]: Math.max(prev[activeItem.title] || 0, pos) }));
      });
    }
  }, [activeItemIndex]);

  useEffect(() => {
    console.log("activeItem in CoursePlayer:", activeItem);
    if (activeItem?._type === 'lesson' && (activeItem as any).muxPlaybackId) {
      if ((activeItem as any).muxPolicy === 'signed') {
        setPlaybackToken(null);
        setTokenError(null);
        setLoadingToken(true);
        fetch(`/api/mux/token/${(activeItem as any).muxPlaybackId}`)
          .then(async res => {
            const data = await res.json();
            console.log("Token response:", data);
            if (!res.ok) {
              throw new Error(data.error || "Failed to fetch token");
            }
            return data;
          })
          .then(data => {
            if (data.token) {
              setPlaybackToken(data.token);
            }
          })
          .catch(err => {
            console.error("Error fetching Mux playback token", err);
            setTokenError(err.message);
          })
          .finally(() => setLoadingToken(false));
      } else {
        // Public policy, no token needed
        setPlaybackToken(null);
        setTokenError(null);
        setLoadingToken(false);
      }
    } else {
      setPlaybackToken(null);
      setTokenError(null);
      setLoadingToken(false);
    }
  }, [activeItem?._type, (activeItem as any)?.muxPlaybackId, (activeItem as any)?.muxPolicy]);

  if (loading) {
    return (
      <div className="flex-col min-h-[calc(100vh-4rem)] flex items-center justify-center p-8 bg-black">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!course || !activeItem) {
    return (
      <div className="flex-col min-h-[calc(100vh-4rem)] flex items-center justify-center p-8 bg-black">
        <h2 className="text-2xl font-bold text-white mb-4">Course or Content not found</h2>
        <Link to="/app/my-courses" className="text-blue-400 hover:underline">
          Return to My Courses
        </Link>
      </div>
    );
  }

  const isPreEnrollment = course?.startDate ? new Date(course.startDate).getTime() > Date.now() : false;
  const startDateFormatted = course?.startDate ? new Date(course.startDate).toLocaleDateString() : '';

  if (isPreEnrollment) {
    return (
      <div className="flex-col min-h-[calc(100vh-4rem)] flex items-center justify-center p-8 bg-[#09090b]">
        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-6">
          <PlayCircle size={32} className="text-white" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-4 text-center">Course Starts Soon</h2>
        <p className="text-white/60 mb-8 max-w-md text-center leading-relaxed">
          You are successfully enrolled! This course officially begins on <span className="text-white font-medium">{startDateFormatted}</span>. 
          Please check back then to access your lessons and materials.
        </p>
        <Link to="/app/my-courses" className="px-6 py-3 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition-colors">
          Return to My Courses
        </Link>
      </div>
    );
  }

  const handleNext = () => {
    if (activeItemIndex < allItems.length - 1) {
      setActiveItemIndex(activeItemIndex + 1);
      setActiveTab('overview');
      setQuizSubmitted(false);
      setSelectedAnswers({});
    }
  };

  const handleAnswerChange = (qIndex: number, answer: string) => {
    setSelectedAnswers(prev => ({ ...prev, [qIndex]: answer }));
  };

  const checkQuiz = () => {
    setQuizSubmitted(true);
    markCompleted(activeItem.title);
  };

  return (
    <div className="flex flex-col xl:flex-row min-h-[calc(100vh-4rem)]">
      {/* Main Video Area */}
      <div className="flex-1 flex flex-col bg-black overflow-hidden relative">
        {/* Top bar */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-4">
            <Link to="/app/my-courses" className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <h1 className="text-sm font-medium text-white truncate max-w-md">
              {course.title}
            </h1>
          </div>
          <div className="flex items-center gap-3">
             <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-white/70">
               {activeItem.moduleTitle}
             </span>
          </div>
        </div>

        {/* Video Player area */}
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden xl:aspect-auto">
          {loadingToken ? (
            <div className="flex items-center justify-center text-white/50">
               <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mb-2" />
            </div>
          ) : tokenError ? (
            <div className="flex flex-col items-center justify-center text-red-400 max-w-md text-center p-6 bg-red-500/10 rounded-xl border border-red-500/20">
               <HelpCircle size={40} className="mb-4 text-red-500" />
               <h3 className="text-lg font-semibold mb-2">Video Error</h3>
               <p className="text-sm">{tokenError}</p>
            </div>
          ) : activeItem._type === 'lesson' && activeItem.muxPlaybackId ? (
            playbackToken ? (
              <MuxPlayer
                playbackId={typeof activeItem.muxPlaybackId === 'string' ? activeItem.muxPlaybackId.trim() : String(activeItem.muxPlaybackId)}
                tokens={{ playback: playbackToken }}
                metadata={{ video_title: activeItem.title }}
                startTime={startTime}
                className="w-full h-full object-contain"
                primaryColor="#ffffff"
                secondaryColor="#000000"
                poster={course.thumbnail}
                onEnded={() => {
                  markCompleted(activeItem.title);
                  handleNext();
                }}
                onTimeUpdate={(e: Event) => {
                  const target = e.target as HTMLVideoElement;
                  if (target && target.currentTime) {
                    if (!completedLessons.has(activeItem.title)) {
                      const currentMax = maxWatchedTimes[activeItem.title] || 0;
                      if (target.currentTime > currentMax + 2) {
                        target.currentTime = currentMax; // Prevent skipping forward
                        return;
                      } else {
                        setMaxWatchedTimes(prev => ({ ...prev, [activeItem.title]: target.currentTime }));
                      }
                    }
                    savePlaybackPosition(activeItem.title, target.currentTime);
                  }
                }}
                onError={(e: Event) => {
                  const errorEvent = e as ErrorEvent;
                  console.error("Mux Player Error:", errorEvent);
                  setTokenError("Failed to play video. If this video is set to 'Signed' in Mux, make sure you have added MUX_SIGNING_KEY_ID and MUX_SIGNING_KEY_SECRET to your .env file.");
                }}
              />
            ) : (
              <MuxPlayer
                playbackId={typeof activeItem.muxPlaybackId === 'string' ? activeItem.muxPlaybackId.trim() : String(activeItem.muxPlaybackId)}
                metadata={{ video_title: activeItem.title }}
                startTime={startTime}
                className="w-full h-full object-contain"
                primaryColor="#ffffff"
                secondaryColor="#000000"
                poster={course.thumbnail}
                onEnded={() => {
                  markCompleted(activeItem.title);
                  handleNext();
                }}
                onTimeUpdate={(e: Event) => {
                  const target = e.target as HTMLVideoElement;
                  if (target && target.currentTime) {
                    if (!completedLessons.has(activeItem.title)) {
                      const currentMax = maxWatchedTimes[activeItem.title] || 0;
                      if (target.currentTime > currentMax + 2) {
                        target.currentTime = currentMax;
                        return;
                      } else {
                        setMaxWatchedTimes(prev => ({ ...prev, [activeItem.title]: target.currentTime }));
                      }
                    }
                    savePlaybackPosition(activeItem.title, target.currentTime);
                  }
                }}
                onError={(e: Event) => {
                  const errorEvent = e as ErrorEvent;
                  console.error("Mux Player Error:", errorEvent);
                  setTokenError("Failed to play public video. If this video is actually 'Signed', you must configure MUX_SIGNING_KEY_ID and MUX_SIGNING_KEY_SECRET in your .env file.");
                }}
              />
            )
          ) : activeItem._type === 'lesson' && activeItem.video ? (
            <video 
              src={activeItem.video} 
              controls 
              className="w-full max-h-full object-contain" 
              poster={course.thumbnail}
              onEnded={() => {
                markCompleted(activeItem.title);
                handleNext();
              }}
              onTimeUpdate={(e: any) => {
                const target = e.target as HTMLVideoElement;
                if (target && target.currentTime) {
                  if (!completedLessons.has(activeItem.title)) {
                    const currentMax = maxWatchedTimes[activeItem.title] || 0;
                    if (target.currentTime > currentMax + 2) {
                      target.currentTime = currentMax;
                      return;
                    } else {
                      setMaxWatchedTimes(prev => ({ ...prev, [activeItem.title]: target.currentTime }));
                    }
                  }
                  savePlaybackPosition(activeItem.title, target.currentTime);
                }
              }}
            />
          ) : activeItem._type === 'lesson' && activeItem.videoUrl ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4">
               <a href={activeItem.videoUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-2 bg-white/5 p-4 rounded-xl">
                 <PlayCircle /> Watch External Video
               </a>
               {!completedLessons.has(activeItem.title) && (
                 <button onClick={() => markCompleted(activeItem.title)} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-full transition-colors text-sm">
                   Mark as Completed
                 </button>
               )}
            </div>
          ) : activeItem._type === 'quiz' ? (
             <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 bg-gradient-to-b from-[#111] to-[#000]">
                <HelpCircle size={48} className="text-orange-400 mb-6" />
                <h2 className="text-3xl font-bold text-white mb-4">{activeItem.title}</h2>
                <p className="text-white/60 mb-8 max-w-md text-lg">Test your knowledge on the concepts covered in this module.</p>
                <button onClick={() => setActiveTab('quiz')} className="px-8 py-3 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition-colors">
                  Start Quiz
                </button>
             </div>
          ) : (
             <div className="w-full flex items-center justify-center">
                <img src={course.thumbnail} className="w-full h-full object-cover opacity-20" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <FileText size={48} className="text-white/20 mb-2" />
                  <p className="text-white/50 text-lg">Read the contents in the Overview tab.</p>
                  {!completedLessons.has(activeItem.title) && (
                    <button onClick={() => markCompleted(activeItem.title)} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-full transition-colors text-sm">
                      Mark as Completed
                    </button>
                  )}
                </div>
             </div>
          )}
        </div>

        {/* Video Metadata / Tabs */}
        <div className="h-64 border-t border-white/10 bg-[#0a0a0c] flex flex-col shrink-0">
          <div className="flex items-center gap-6 px-8 border-b border-white/5 h-12 shrink-0">
            {['overview', 'resources', ...(activeItem._type === 'quiz' ? ['quiz'] : [])].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`text-sm font-medium capitalize h-full border-b-2 transition-colors ${
                  activeTab === tab ? 'border-white text-white' : 'border-transparent text-white/50 hover:text-white/80'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-8 overflow-y-auto flex-1 relative custom-scrollbar">
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <h2 className="text-xl font-semibold text-white mb-2">{activeItem.title}</h2>
                  {activeItem.content ? (
                    <div className="prose prose-invert max-w-3xl text-sm text-white/60">
                      <PortableText value={activeItem.content} />
                    </div>
                  ) : (
                    <p className="text-white/50 text-sm max-w-3xl leading-relaxed mb-6">
                      Welcome to {activeItem.title}.
                    </p>
                  )}
                </motion.div>
              )}

              {activeTab === 'resources' && (
                <motion.div key="resources" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-4">
                  {activeItem.resources && activeItem.resources.length > 0 ? (
                    <div className="flex flex-col gap-3">
                       {activeItem.resources.map((res: any, idx: number) => (
                          <a key={idx} href={res.file || res.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white transition-colors border border-white/10 w-fit">
                            <FileText size={16} /> {res.title || 'Download Resource'}
                          </a>
                       ))}
                    </div>
                  ) : (
                    <p className="text-white/50 text-sm">No resources provided for this lesson.</p>
                  )}
                </motion.div>
              )}

              {activeTab === 'quiz' && activeItem._type === 'quiz' && activeItem.questions && (
                <motion.div key="quiz" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-3xl">
                  {!quizSubmitted ? (
                    <div className="space-y-8 pb-10">
                      {activeItem.questions.map((q, qIndex) => (
                        <div key={qIndex}>
                          <h3 className="text-base font-medium text-white flex items-start gap-2 mb-4">
                            <span className="text-blue-400">{qIndex + 1}.</span> {q.questionText}
                          </h3>
                          <div className="space-y-2 pl-6">
                            {(q.options || []).map((opt, i) => (
                              <label key={i} className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors text-sm text-white/80">
                                <input 
                                  type="radio" 
                                  name={`q-${qIndex}`} 
                                  className="accent-blue-500" 
                                  onChange={() => handleAnswerChange(qIndex, opt)}
                                  checked={selectedAnswers[qIndex] === opt}
                                />
                                {opt}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                      
                      <div className="pl-6 pt-4 border-t border-white/10">
                        <button 
                           onClick={checkQuiz} 
                           disabled={Object.keys(selectedAnswers).length < activeItem.questions.length}
                           className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-full transition-colors"
                        >
                          Submit Answers
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8 pb-10">
                      {activeItem.questions.map((q, qIndex) => {
                        const isCorrect = selectedAnswers[qIndex] === q.correctAnswer;
                        return (
                          <div key={qIndex} className={`p-5 rounded-2xl border ${isCorrect ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                            <h3 className="text-base font-medium text-white flex items-start gap-2 mb-4">
                              {isCorrect ? <CheckCircle size={18} className="text-emerald-400 mt-0.5" /> : <HelpCircle size={18} className="text-red-400 mt-0.5" />}
                              {q.questionText}
                            </h3>
                            <div className="pl-6 text-sm">
                              <p className="text-white/60 mb-1">Your answer: <span className={isCorrect ? "text-emerald-400" : "text-red-400"}>{selectedAnswers[qIndex]}</span></p>
                              {!isCorrect && <p className="text-emerald-400">Correct answer: {q.correctAnswer}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Sidebar: Course Content */}
      <div className="w-full xl:w-96 border-l border-white/10 bg-[#09090b] flex flex-col shrink-0 h-[600px] xl:h-[calc(100vh-4rem)]">
        <div className="p-6 border-b border-white/10 shrink-0">
          <h3 className="text-sm font-medium text-white mb-1">Course Content</h3>
          <p className="text-xs text-white/50">{completedLessons.size}/{allItems.length} items completed ({allItems.length ? Math.round((completedLessons.size / allItems.length) * 100) : 0}%)</p>
          <div className="h-1.5 w-full bg-white/10 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${allItems.length ? (completedLessons.size / allItems.length) * 100 : 0}%` }} />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {course.modules?.map((module, mIndex) => (
             <div key={mIndex}>
               <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3 px-2 flex justify-between">
                 <span>{module.title}</span>
                 <span className="text-white/30 lowercase">{module.items?.length || 0} items</span>
               </h4>
               <div className="space-y-1">
                 {module.items?.map((item, iIndex) => {
                    const globalIdx = allItems.findIndex(x => x.moduleIdx === mIndex && x.itemIdx === iIndex);
                    const isActive = globalIdx === activeItemIndex;
                    const isCompleted = completedLessons.has(item.title);
                    const isLocked = globalIdx > 0 && !completedLessons.has(allItems[globalIdx - 1].title);
                    
                    return (
                      <button 
                        key={iIndex}
                        disabled={isLocked}
                        onClick={() => {
                          setActiveItemIndex(globalIdx);
                          setActiveTab(item._type === 'quiz' ? 'quiz' : 'overview');
                          setQuizSubmitted(false);
                          setSelectedAnswers({});
                        }}
                        className={`w-full flex items-start gap-3 p-3 rounded-xl transition-colors text-left ${
                          isActive ? 'bg-blue-500/10 text-white border border-blue-500/20' : 'text-white/70 hover:bg-white/5 border border-transparent'
                        } ${isLocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                         <div className="mt-0.5 shrink-0">
                           {isActive ? (
                              <div className="w-5 h-5 rounded-full border-2 border-blue-500 flex items-center justify-center">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"/>
                              </div>
                           ) : isCompleted ? (
                              <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                                <Check size={12} strokeWidth={3} />
                              </div>
                           ) : (
                              <div className="w-5 h-5 rounded-full border border-white/20"/>
                           )}
                         </div>
                         <div className="flex-1 min-w-0">
                           <p className={`text-sm font-medium leading-tight truncate ${isActive ? 'text-white' : 'text-white/80'}`}>{item.title}</p>
                           <p className={`text-xs mt-1.5 flex items-center gap-1 ${isActive ? 'text-blue-400' : 'text-white/40'}`}>
                              {item._type === 'quiz' ? (
                                <><HelpCircle size={10} /> Quiz</>
                              ) : (
                                <><PlayCircle size={10} /> {item.duration ? `${item.duration}m` : 'Video Lesson'}</>
                              )}
                           </p>
                         </div>
                      </button>
                    )
                 })}
               </div>
             </div>
          ))}
        </div>
        
        <div className="p-4 border-t border-white/10 shrink-0">
          {activeItemIndex >= allItems.length - 1 && completedLessons.has(activeItem.title) ? (
            <button 
              onClick={() => navigate(`/app/certificate/${course.id}`)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              Course Completed. Get Certificate. <Award size={16} />
            </button>
          ) : (
            <button 
              onClick={handleNext}
              disabled={activeItemIndex >= allItems.length - 1 || !completedLessons.has(activeItem.title)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white text-black rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next Lesson <SkipForward size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
