export const roadmapPhases = [
  {
    phase: "Phase 1: Environment Setup & Scaffolding",
    description: "Initialize the Vercel + Next.js (App Router) environment. Set up the Tailwind CSS design system inheriting typography and colors from pdsacademy.com. Deploy initial staging domain.",
    duration: "Week 1",
  },
  {
    phase: "Phase 2: Auth & Database Modeling",
    description: "Integrate Auth.js / Clerk for seamless user onboarding. Connect to Supabase/Neon PostgreSQL. Design schema for users, enrollments, and real-time progress states.",
    duration: "Week 2",
  },
  {
    phase: "Phase 3: CMS & Multi-Currency Modeling",
    description: "Initialize Sanity Studio. Implement GROQ schemas for Courses, Modules, Lessons, and Quizzes. Configure dual-currency (NGN/USD) fields for product checkout.",
    duration: "Week 3",
  },
  {
    phase: "Phase 4: Frontend Build & State Syncing",
    description: "Construct the cinematic user dashboard. Build the Optimistic UI wrappers and WebSocket/Supabase Realtime listeners for instant cross-device progress synchronization.",
    duration: "Week 4-5",
  },
  {
    phase: "Phase 5: Video Delivery & Interactivity",
    description: "Integrate Mux or AWS MediaConvert for HLS adaptive streaming. Build a custom, brand-aligned video player. Connect dynamic quiz modules from Sanity into the lesson flow.",
    duration: "Week 6-7",
  },
  {
    phase: "Phase 6: Payments & Certification",
    description: "Integrate Paystack checkout and set up secure webhook listeners in Next.js to verify transactions and unlock content. Implement automated PDF certificate generation (jsPDF/Puppeteer) on course completion.",
    duration: "Week 8",
  }
];

export const sanitySchemas = `// schemas/course.ts
export default {
  name: 'course',
  title: 'Course',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title', type: 'string' },
    { name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title' } },
    { name: 'author', title: 'Author', type: 'reference', to: [{ type: 'author' }] },
    { name: 'description', title: 'Description', type: 'text' },
    { name: 'coverImage', title: 'Cover Image', type: 'image', options: { hotspot: true } },
    { 
      name: 'pricing', 
      title: 'Pricing', 
      type: 'object',
      fields: [
        { name: 'ngn', title: 'Price (NGN)', type: 'number' },
        { name: 'usd', title: 'Price (USD)', type: 'number' }
      ]
    },
    { 
      name: 'modules', 
      title: 'Modules', 
      type: 'array', 
      of: [{ type: 'reference', to: [{ type: 'module' }] }] 
    }
  ]
}

// schemas/lesson.ts
export default {
  name: 'lesson',
  title: 'Lesson',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title', type: 'string' },
    { name: 'videoUrl', title: 'HLS Video Stream URL (Mux)', type: 'url' },
    { name: 'duration', title: 'Duration (seconds)', type: 'number' },
    { name: 'content', title: 'Text Content', type: 'array', of: [{type: 'block'}] },
    { name: 'resources', title: 'Downloadable Resources', type: 'array', of: [{type: 'file'}] }
  ]
}

// schemas/quiz.ts
export default {
  name: 'quiz',
  title: 'Quiz',
  type: 'document',
  fields: [
    { name: 'title', title: 'Quiz Title', type: 'string' },
    { name: 'passingScore', title: 'Passing Score (%)', type: 'number' },
    { 
      name: 'questions', 
      title: 'Questions', 
      type: 'array', 
      of: [{
        type: 'object',
        fields: [
          { name: 'questionText', title: 'Question', type: 'string' },
          { name: 'options', title: 'Options', type: 'array', of: [{type: 'string'}] },
          { name: 'correctAnswer', title: 'Correct Answer (Index)', type: 'number' }
        ]
      }]
    }
  ]
}

// schemas/author.ts
export default {
  name: 'author',
  title: 'Author',
  type: 'document',
  fields: [
    { name: 'name', title: 'Name', type: 'string' },
    { name: 'bio', title: 'Biography', type: 'text' },
    { name: 'avatar', title: 'Avatar', type: 'image' }
  ]
}`;
