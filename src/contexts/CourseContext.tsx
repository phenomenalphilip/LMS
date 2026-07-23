import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCourses, sanityClient } from '../lib/sanity';
import { courses as defaultCourses } from '../data/courses';
import { supabase } from '../lib/supabase';

export type QuizQuestion = {
  questionText: string;
  options: string[];
  correctAnswer: string;
};

export type LessonItem = {
  _type: 'lesson';
  title: string;
  duration?: number;
  content?: any;
  videoUrl?: string;
  video?: string;
  muxPlaybackId?: string;
  muxPolicy?: string;
  resources?: { title: string; url?: string; file?: string }[];
};

export type QuizItem = {
  _type: 'quiz';
  title: string;
  questions?: QuizQuestion[];
};

export type Module = {
  title: string;
  description?: string;
  items?: (LessonItem | QuizItem)[];
};

export type Course = {
  id: string;
  slug?: string;
  startDate?: string;
  category?: string;
  description?: string;
  details?: any;
  learningOutcomes?: string[];
  title: string;
  instructor: string;
  instructorBio?: string;
  skillLevel?: string;
  language?: string;
  subtitles?: string[];
  duration: string;
  rating: number;
  enrolled: number;
  price: { usd: number; ngn: number };
  thumbnail: string;
  nextModule?: string;
  muxPlaybackId?: string;
  telegramGroupId?: string;
  telegramGroupLink?: string;
  modules?: Module[];
};

interface CourseContextType {
  courses: Course[];
  loading: boolean;
}

const CourseContext = createContext<CourseContextType>({
  courses: defaultCourses as unknown as Course[],
  loading: true,
});

export function CourseProvider({ children }: { children: React.ReactNode }) {
  const [courses, setCourses] = useState<Course[]>(defaultCourses as unknown as Course[]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSanityCourses() {
      try {
        const [sanityCourses, enrollmentsRes] = await Promise.all([
          getCourses(),
          supabase.from('enrollments').select('course_id')
        ]);
        
        const enrollments = enrollmentsRes.data || [];
        const enrollmentCounts = enrollments.reduce((acc: any, curr: any) => {
          acc[curr.course_id] = (acc[curr.course_id] || 0) + 1;
          return acc;
        }, {});

        if (sanityCourses && sanityCourses.length > 0) {
          const mapped: Course[] = sanityCourses.map((c: any) => ({
            id: c._id,
            slug: c.slug,
            startDate: c.startDate,
            category: c.category,
            description: c.description,
            details: c.details,
            learningOutcomes: c.learningOutcomes,
            title: c.title || 'Untitled Course',
            instructor: c.instructor || 'Unknown Instructor',
            instructorBio: c.instructorBio,
            skillLevel: c.skillLevel,
            language: c.language,
            subtitles: c.subtitles,
            duration: c.duration || 'Flexible',
            rating: Number(c.rating) || 0,
            enrolled: enrollmentCounts[c._id] || 0,
            price: c.price || { usd: 0, ngn: 0 },
            thumbnail: c.thumbnail || 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2940&auto=format&fit=crop',
            nextModule: c.nextModule,
            muxPlaybackId: c.muxPlaybackId,
            telegramGroupId: c.telegramGroupId,
            telegramGroupLink: c.telegramGroupLink,
            modules: c.modules || []
          }));
          setCourses(mapped);
        }
      } catch (err) {
        console.error("Error loading courses from Sanity:", err);
      } finally {
        setLoading(false);
      }
    }
    
    loadSanityCourses();

    // Listen for live updates via Sanity
    const subscription = sanityClient.listen('*[_type in ["course", "module", "lesson", "quiz"]]').subscribe((update) => {
      console.log('Sanity content updated:', update);
      setTimeout(() => {
        loadSanityCourses();
      }, 1500);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <CourseContext.Provider value={{ courses, loading }}>
      {children}
    </CourseContext.Provider>
  );
}

export function useCourses() {
  return useContext(CourseContext);
}
