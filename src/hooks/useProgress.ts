import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useProgress(courseId: string) {
  const { user } = useAuth();
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user || !courseId) return;

    const fetchProgress = async () => {
      const { data, error } = await supabase
        .from('lesson_progress')
        .select('item_id')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .eq('completed', true);

      if (!error && data) {
        setCompletedLessons(new Set(data.map(d => d.item_id)));
      } else if (error) {
        // Fallback to local storage if table doesn't exist
        const local = localStorage.getItem(`progress_${user.id}_${courseId}`);
        if (local) {
          setCompletedLessons(new Set(JSON.parse(local)));
        }
      }
    };

    fetchProgress();
  }, [user, courseId]);

  const markCompleted = async (itemId: string) => {
    if (!user || !courseId) return;

    setCompletedLessons(prev => {
      const next = new Set(prev).add(itemId);
      
      // Update enrollment progress percentage in background
      // Note: In a real app we'd need the total items count here, 
      // but since we only have `itemId` we'll just increment progress
      // or we can let the parent component handle the overall progress update
      
      return next;
    });

    // Try Supabase first
    const { error } = await supabase
      .from('lesson_progress')
      .upsert({
        user_id: user.id,
        course_id: courseId,
        item_id: itemId,
        completed: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,course_id,item_id' });

    if (error) {
      console.error("Error upserting lesson_progress:", error);
    }

    // Always keep local storage updated as fallback
    const local = localStorage.getItem(`progress_${user.id}_${courseId}`);
    const items = local ? JSON.parse(local) : [];
    if (!items.includes(itemId)) {
      items.push(itemId);
      localStorage.setItem(`progress_${user.id}_${courseId}`, JSON.stringify(items));
    }
  };

  const getPlaybackPosition = async (itemId: string): Promise<number> => {
    if (!user || !courseId) return 0;
    const { data, error } = await supabase
      .from('lesson_progress')
      .select('playback_position')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('item_id', itemId)
      .single();

    if (!error && data) return data.playback_position || 0;

    const local = localStorage.getItem(`position_${user.id}_${courseId}_${itemId}`);
    return local ? parseFloat(local) : 0;
  };

  const savePlaybackPosition = async (itemId: string, position: number) => {
    if (!user || !courseId) return;
    
    // Save locally immediately
    localStorage.setItem(`position_${user.id}_${courseId}_${itemId}`, position.toString());

    // Sync to DB (we might want to debounce this in the component)
    await supabase
      .from('lesson_progress')
      .upsert({
        user_id: user.id,
        course_id: courseId,
        item_id: itemId,
        playback_position: Math.floor(position),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,course_id,item_id' });
  };

  return { completedLessons, markCompleted, getPlaybackPosition, savePlaybackPosition };
}
