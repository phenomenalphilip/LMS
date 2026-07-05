import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Users, Send, ExternalLink, MessageCircle, Globe } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { TelegramLoginWidget } from '../components/TelegramLoginWidget';

interface Community {
  id: string;
  name: string;
  slug: string;
  community_type: 'GENERAL' | 'COURSE' | 'PRIVATE';
  description: string;
  telegram_chat_id: string | null;
  telegram_invite_link: string | null;
}

interface CommunityMessage {
  id: string;
  community_id: string;
  provider: string;
  telegram_message_id: string;
  sender_name: string;
  sender_username: string | null;
  content: string;
  created_at: string;
}

export function Community() {
  const { user } = useAuth();

  const [hasConnectedTelegram, setHasConnectedTelegram] = useState<boolean | null>(null);
  const [telegramUsername, setTelegramUsername] = useState<string | null>(null);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [activeCommunityId, setActiveCommunityId] = useState<string | null>(null);

  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeCommunity = communities.find(c => c.id === activeCommunityId);

  useEffect(() => {
    if (!user) return;

    // Check if user has connected telegram
    supabase
      .from('profiles')
      .select('telegram_chat_id, telegram_username')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setHasConnectedTelegram(!!data?.telegram_chat_id);
        if (data?.telegram_username) {
          setTelegramUsername(data.telegram_username);
        }
      });

    // Get user's communities
    const fetchCommunities = async () => {
      const { data } = await supabase
        .from('community_members')
        .select(`
          community_id,
          communities (
            id, name, slug, community_type, description, telegram_chat_id, telegram_invite_link
          )
        `)
        .eq('user_id', user.id);

      if (data) {
        // filter out null communities (in case of orphaned rows) and flatten
        const comms = data.map(d => d.communities).filter(Boolean) as unknown as Community[];
        
        // Remove duplicates if any (due to any weird joins)
        const uniqueComms = Array.from(new Map(comms.map(c => [c.id, c])).values());
        
        setCommunities(uniqueComms);

        if (uniqueComms.length > 0) {
          // Select network or first course
          const network = uniqueComms.find(c => c.community_type === 'GENERAL');
          setActiveCommunityId(network ? network.id : uniqueComms[0].id);
        }
      }
    };
    fetchCommunities();
  }, [user]);

  // Load messages when active community changes
  useEffect(() => {
    if (!activeCommunityId) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('community_messages')
        .select('*')
        .eq('community_id', activeCommunityId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (data) {
        setMessages(data as CommunityMessage[]);
        setTimeout(scrollToBottom, 100);
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`community_${activeCommunityId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_messages',
          filter: `community_id=eq.${activeCommunityId}`,
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as CommunityMessage]);
          setTimeout(scrollToBottom, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeCommunityId]);

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
        alert(`Failed to connect Telegram (${res.status}): ${text}`);
        return;
      }

      const data = await res.json();
      if (data.ok) {
        setHasConnectedTelegram(true);
        if (userData.username) setTelegramUsername(userData.username);
      } else {
        alert(data.error || 'Failed to connect Telegram');
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !activeCommunityId || !hasConnectedTelegram) return;
    
    // Check if the community has telegram linked (if not, maybe internal message? The endpoint currently assumes Telegram)
    if (!activeCommunity?.telegram_chat_id) {
      alert('This community is not linked to a Telegram group yet.');
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          community_id: activeCommunityId,
          text: newMessage,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setNewMessage('');
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

  const generalCommunities = communities.filter(c => c.community_type === 'GENERAL');
  const courseCommunities = communities.filter(c => c.community_type === 'COURSE');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-full flex flex-col">
      <div className="mb-8 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Community</h1>
          <p className="text-white/60">Connect with other learners and stay updated.</p>
        </div>
        {hasConnectedTelegram && telegramUsername && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full">
            <MessageCircle className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-blue-400">
              Connected to @{telegramUsername}
            </span>
          </div>
        )}
      </div>

      {hasConnectedTelegram === false && (
        <div className="bg-[#111113] border border-blue-500/30 p-6 rounded-2xl mb-8 shrink-0 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
            <MessageCircle className="text-blue-500 w-8 h-8" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Connect Your Telegram</h2>
          <p className="text-white/60 mb-6 max-w-md">
            Link your Telegram account to join groups, view updates, and chat with the community right from your dashboard.
          </p>
          <TelegramLoginWidget onAuth={handleTelegramAuth} />
        </div>
      )}

      {communities.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
            <Users className="text-white/20 w-10 h-10" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">No Communities Yet</h2>
          <p className="text-white/50 max-w-sm">
            You have not joined any networks or enrolled in any courses with active communities.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
          {/* Sidebar */}
          <div className="w-full md:w-64 shrink-0 flex flex-col gap-6 overflow-y-auto pr-2 hide-scrollbar">
            
            {generalCommunities.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-white/50 px-2 uppercase tracking-wider">Networks</h3>
                {generalCommunities.map(comm => (
                  <button
                    key={comm.id}
                    onClick={() => setActiveCommunityId(comm.id)}
                    className={`w-full text-left p-3 rounded-xl transition-colors flex items-center gap-3 ${activeCommunityId === comm.id
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'text-white hover:bg-white/5 border border-transparent'
                      }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${activeCommunityId === comm.id ? 'bg-blue-500/20' : 'bg-white/10'}`}>
                      <Globe size={16} />
                    </div>
                    <span className="font-medium truncate">{comm.name}</span>
                  </button>
                ))}
              </div>
            )}

            {courseCommunities.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-white/50 px-2 uppercase tracking-wider">My Course Communities</h3>
                {courseCommunities.map(comm => (
                  <button
                    key={comm.id}
                    onClick={() => setActiveCommunityId(comm.id)}
                    className={`w-full text-left p-3 rounded-xl transition-colors flex items-center gap-3 ${activeCommunityId === comm.id
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'text-white hover:bg-white/5 border border-transparent'
                      }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${activeCommunityId === comm.id ? 'bg-blue-500/20' : 'bg-white/10'}`}>
                      <Users size={16} />
                    </div>
                    <span className="font-medium truncate">{comm.name}</span>
                  </button>
                ))}
              </div>
            )}

          </div>

          {/* Main Chat Area */}
          <div className="flex-1 bg-[#111113] border border-white/5 rounded-2xl flex flex-col overflow-hidden">
            {/* Chat Header */}
            {activeCommunity && (
              <div className="h-16 border-b border-white/5 px-6 flex items-center justify-between shrink-0 bg-[#0a0a0c]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center">
                    {activeCommunity.community_type === 'GENERAL' ? <Globe className="text-blue-500" size={20} /> : <Users className="text-blue-500" size={20} />}
                  </div>
                  <div>
                    <h2 className="font-semibold text-white">{activeCommunity.name}</h2>
                    <p className="text-xs text-white/50">{activeCommunity.community_type === 'GENERAL' ? 'Global Network' : 'Course Community'}</p>
                  </div>
                </div>

                {activeCommunity.telegram_invite_link && (
                  <a
                    href={activeCommunity.telegram_invite_link}
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
                        {msg.content}
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
                  placeholder={hasConnectedTelegram ? "Send a message..." : "Connect Telegram to send messages"}
                  disabled={!hasConnectedTelegram || isSending || !activeCommunity?.telegram_chat_id}
                  className="w-full bg-[#111113] border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 transition-all"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || !hasConnectedTelegram || isSending || !activeCommunity?.telegram_chat_id}
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
