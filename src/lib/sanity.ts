import { createClient } from '@sanity/client';

export const sanityClient = createClient({
  projectId: 'wj0t8ags',
  dataset: 'production',
  useCdn: false, // Disable CDN to get real-time updates
  apiVersion: '2024-03-01', 
});

export const coursesQuery = `*[_type == "course"]{
  _id,
  title,
  category,
  "slug": slug.current,
  description,
  details,
  learningOutcomes,
  instructor,
  instructorBio,
  skillLevel,
  language,
  subtitles,
  duration,
  rating,
  enrolled,
  price,
  telegramGroupId,
  telegramGroupLink,
  "thumbnail": thumbnail.asset->url,
  modules[]{
    title,
    description,
    items[]{
      _type,
      title,
      duration,
      content,
      "videoUrl": videoUrl,
      "video": video.asset->url,
      "muxPlaybackId": muxVideo.asset->playbackId,
      "muxPolicy": muxVideo.asset->data.playback_ids[0].policy,
      resources[]{
        title,
        url,
        "file": file.asset->url
      },
      questions[]{
        questionText,
        options,
        correctAnswer
      }
    }
  }
}`;

export async function getCourses() {
  return sanityClient.fetch(coursesQuery);
}
