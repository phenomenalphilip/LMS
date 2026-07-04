import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Users, Send, ExternalLink, MessageCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCourses } from '../contexts/CourseContext';
import { supabase } from '../lib/supabase';
import { TelegramLoginWidget } from '../components/TelegramLoginWidget';

interface TelegramMessage {
  id: string;
  telegram_message_id: string;
  sender_name: string;
  sender_username: string | null;
  text_content: string;
  created_at: string;
}

export function Community() {
  const { user } = useAuth();
  const { courses } = useCourses();

  const [hasConnectedTelegram, setHasConnectedTelegram] = useState<boolean | null>(null);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);

  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeCourse = courses.find(c => c.id === activeCourseId);

  useEffect(() => {
    if (!user) return;

    // Check if user has connected telegram
    supabase
      .from('profiles')
      .select('telegram_chat_id')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setHasConnectedTelegram(!!data?.telegram_chat_id);
      });

    // Get enrolled courses
    supabase
      .from('enrollments')
      .select('course_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        const ids = data?.map(e => e.course_id) || [];
        setEnrolledCourseIds(ids);

        // Auto-select first course that has a telegram group
        const coursesWithGroups = courses.filter(c => ids.includes(c.id) && c.telegramGroupId);
        if (coursesWithGroups.length > 0) {
          setActiveCourseId(coursesWithGroups[0].id);
        }
      });
  }, [user, courses]);

  // Load messages when active course changes
  useEffect(() => {
    if (!activeCourseId) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('course_telegram_messages')
        .select('*')
        .eq('course_id', activeCourseId)
        .order('created_at', { ascending: true })
        .limit(100); // Last 100 messages

      if (data) {
        setMessages(data as TelegramMessage[]);
        setTimeout(scrollToBottom, 100);
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`community_${activeCourseId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'course_telegram_messages',
          filter: `course_id=eq.${activeCourseId}`,
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as TelegramMessage]);
          setTimeout(scrollToBottom, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeCourseId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTelegramAuth = async (userData: any) => {
    if (!user) return;

    try {
      const res = await fetch('/api/telegram/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          telegram_data: userData,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('Telegram connect failed:', res.status, text);
        alert(`Failed to connect Telegram (${res.status}): ${text}`);
        return;
      }

      const data = await res.json();
      if (data.ok) {
        setHasConnectedTelegram(true);
      } else {
        alert(data.error || 'Failed to connect Telegram');
      }
    } catch (err: any) {
      console.error('Telegram connect network error:', err);
      alert(`Network error: ${err.message}`);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !activeCourseId || !activeCourse?.telegramGroupId || !hasConnectedTelegram) return;

    setIsSending(true);
    try {
      const res = await fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          course_id: activeCourseId,
          telegram_group_id: activeCourse.telegramGroupId,
          text: newMessage,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setNewMessage('');
        // We do not need to optimistically append since the webhook/realtime will catch it,
        // but the API also inserts it so realtime might double or we'll get it instantly.
        // Waiting for realtime is usually safer to avoid duplicates.
      } else {
        alert(data.error || 'Failed to send message');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while sending message.');
    } finally {
      setIsSending(false);
    }
  };

  // Filter courses user is enrolled in
  const userCourses = courses.filter(c => enrolledCourseIds.includes(c.id));
  const coursesWithGroups = userCourses.filter(c => c.telegramGroupId);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-full flex flex-col">
      <div className="mb-8 shrink-0">
        <h1 className="text-3xl font-bold text-white mb-2">Community</h1>
        <p className="text-white/60">Connect with other learners and stay updated.</p>
      </div>

      {hasConnectedTelegram === false && (
        <div className="bg-[#111113] border border-blue-500/30 p-6 rounded-2xl mb-8 shrink-0 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
            <MessageCircle className="text-blue-500 w-8 h-8" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Connect Your Telegram</h2>
          <p className="text-white/60 mb-6 max-w-md">
            Link your Telegram account to join course groups, view updates, and chat with the community right from your dashboard.
          </p>

          <TelegramLoginWidget onAuth={handleTelegramAuth} />
        </div>
      )}

      {coursesWithGroups.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
            <Users className="text-white/20 w-10 h-10" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">No Communities Yet</h2>
          <p className="text-white/50 max-w-sm">
            You are not enrolled in any courses that have an active Telegram community.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
          {/* Sidebar */}
          <div className="w-full md:w-64 shrink-0 flex flex-col gap-2 overflow-y-auto pr-2 hide-scrollbar">
            <h3 className="text-sm font-semibold text-white/50 px-2 mb-2 uppercase tracking-wider">Your Groups</h3>
            {coursesWithGroups.map(course => (
              <button
                key={course.id}
                onClick={() => setActiveCourseId(course.id)}
                className={`w-full text-left p-3 rounded-xl transition-colors flex items-center gap-3 ${activeCourseId === course.id
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    : 'text-white hover:bg-white/5 border border-transparent'
                  }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${activeCourseId === course.id ? 'bg-blue-500/20' : 'bg-white/10'
                  }`}>
                  <Users size={16} />
                </div>
                <span className="font-medium truncate">{course.title}</span>
              </button>
            ))}
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 bg-[#111113] border border-white/5 rounded-2xl flex flex-col overflow-hidden">
            {/* Chat Header */}
            {activeCourse && (
              <div className="h-16 border-b border-white/5 px-6 flex items-center justify-between shrink-0 bg-[#0a0a0c]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center">
                    <Users className="text-blue-500" size={20} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-white">{activeCourse.title} Community</h2>
                    <p className="text-xs text-white/50">Telegram Updates</p>
                  </div>
                </div>

                {activeCourse.telegramGroupLink && (
                  <a
                    href={activeCourse.telegramGroupLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <ExternalLink size={16} />
                    <span className="hidden sm:inline">Join Group</span>
                  </a>
                )}
              </div>
            )}

            {/* Chat Messages */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-white/40 text-sm">
                  No messages yet. Send a message to start the conversation!
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="flex gap-4 group">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 overflow-hidden text-white/50 font-bold">
                      {msg.sender_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-medium text-white text-sm">{msg.sender_name}</span>
                        <span className="text-xs text-white/40">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap bg-white/5 p-3 rounded-2xl rounded-tl-sm inline-block">
                        {msg.text_content}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-white/5 bg-[#0a0a0c]">
              <form onSubmit={handleSendMessage} className="relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={hasConnectedTelegram ? "Send a message to the Telegram group..." : "Connect Telegram to send messages"}
                  disabled={!hasConnectedTelegram || isSending}
                  className="w-full bg-[#111113] border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 transition-all"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || !hasConnectedTelegram || isSending}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-white/10 disabled:text-white/30 text-white rounded-lg transition-colors"
                >
                  <Send size={16} className={isSending ? 'opacity-50' : ''} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
