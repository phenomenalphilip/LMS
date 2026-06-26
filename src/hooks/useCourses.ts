import { useState, useEffect } from 'react';
import { getCourses } from '../lib/sanity';
import { courses as defaultCourses } from '../data/courses';

export function useCourses() {
  const [courses, setCourses] = useState(defaultCourses);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSanityCourses() {
      try {
        const sanityCourses = await getCourses();
        if (sanityCourses && sanityCourses.length > 0) {
          // Map Sanity schema to local schema fields
          const mapped = sanityCourses.map((c: any) => ({
            id: c._id,
            title: c.title || 'Untitled Course',
            instructor: c.instructor,
            duration: c.duration,
            rating: c.rating,
            enrolled: c.enrolled,
            price: c.price || { usd: 0, ngn: 0 },
            thumbnail: c.thumbnail,
            nextModule: c.nextModule,
            muxPlaybackId: c.muxPlaybackId
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
  }, []);

  return { courses, loading };
}
