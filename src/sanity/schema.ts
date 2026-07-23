export const schemaTypes = [
  {
    name: 'course',
    title: 'Course',
    type: 'document',
    fields: [
      {
        name: 'title',
        title: 'Title',
        type: 'string',
        validation: (Rule: any) => Rule.required(),
      },
      {
        name: 'startDate',
        title: 'Start Date',
        type: 'datetime',
        description: 'If set in the future, the course will be in pre-enrollment mode and content will be locked until this date.',
      },
      {
        name: 'slug',
        title: 'Slug',
        type: 'slug',
        options: {
          source: 'title',
          maxLength: 96,
        },
      },
      {
        name: 'description',
        title: 'Short Description',
        type: 'text',
        description: 'A brief summary of the course.'
      },
      {
        name: 'details',
        title: 'Comprehensive Course Details',
        type: 'array',
        of: [{ type: 'block' }],
        description: 'Detailed information about what this course covers, requirements, etc.'
      },
      {
        name: 'learningOutcomes',
        title: 'What you\'ll learn',
        type: 'array',
        of: [{ type: 'string' }],
        description: 'Add bullet points for what students will learn in this course.'
      },
      {
        name: 'instructor',
        title: 'Instructor',
        type: 'string',
      },
      {
        name: 'instructorBio',
        title: 'Instructor Bio',
        type: 'text',
      },
      {
        name: 'skillLevel',
        title: 'Skill Level',
        type: 'string',
        options: {
          list: [
            { title: 'Beginner', value: 'Beginner' },
            { title: 'Intermediate', value: 'Intermediate' },
            { title: 'Advanced', value: 'Advanced' },
          ],
        }
      },
      {
        name: 'language',
        title: 'Language',
        type: 'string',
      },
      {
        name: 'subtitles',
        title: 'Subtitles',
        type: 'array',
        of: [{ type: 'string' }],
        description: 'Available subtitles (e.g. English, Spanish)',
      },
      {
        name: 'duration',
        title: 'Duration',
        type: 'string',
      },
      {
        name: 'rating',
        title: 'Rating',
        type: 'number',
      },
      {
        name: 'enrolled',
        title: 'Enrolled Count',
        type: 'number',
      },
      {
        name: 'price',
        title: 'Price',
        type: 'object',
        fields: [
          { name: 'usd', title: 'USD', type: 'number' },
          { name: 'ngn', title: 'NGN', type: 'number' },
        ],
      },
      {
        name: 'thumbnail',
        title: 'Thumbnail',
        type: 'image',
        options: {
          hotspot: true,
        },
      },
      {
        name: 'telegramGroupLink',
        title: 'Telegram Group Link',
        type: 'url',
        description: 'Invite link to the course Telegram community',
      },
      {
        name: 'telegramGroupId',
        title: 'Telegram Group ID',
        type: 'string',
        description: 'The Chat ID of the Telegram group (used by the bot)',
      },
      {
        name: 'modules',
        title: 'Course Modules',
        type: 'array',
        of: [{ type: 'module' }],
        description: 'Add the different modules that make up this course.',
      }
    ],
  },
  {
    name: 'module',
    title: 'Module',
    type: 'object',
    fields: [
      {
        name: 'title',
        title: 'Module Title',
        type: 'string',
        validation: (Rule: any) => Rule.required(),
      },
      {
        name: 'description',
        title: 'Module Description',
        type: 'text',
      },
      {
        name: 'items',
        title: 'Lessons & Quizzes',
        type: 'array',
        of: [
          { type: 'lesson' }, { type: 'quiz' }
        ],
        description: 'Add lessons and quizzes that belong to this module.',
      }
    ]
  },
  {
    name: 'lesson',
    title: 'Lesson',
    type: 'object',
    fields: [
      {
        name: 'title',
        title: 'Lesson Title',
        type: 'string',
        validation: (Rule: any) => Rule.required(),
      },
      {
        name: 'duration',
        title: 'Duration (in minutes)',
        type: 'number',
      },
      {
        name: 'content',
        title: 'Written Content',
        type: 'array',
        of: [{ type: 'block' }],
        description: 'Text content for this lesson.',
      },
      {
        name: 'video',
        title: 'Video File',
        type: 'file',
        description: 'Upload a video file for this lesson (optional).',
      },
      {
        name: 'videoUrl',
        title: 'Video URL',
        type: 'url',
        description: 'External video URL (e.g., YouTube/Vimeo) if not uploading a file.',
      },
      {
        name: 'muxVideo',
        title: 'Mux Video',
        type: 'mux.video',
        description: 'Upload a video to Mux for high quality streaming.',
      },
      {
        name: 'resources',
        title: 'Additional Resources',
        type: 'array',
        of: [
          {
            type: 'object',
            fields: [
              { name: 'title', title: 'Title', type: 'string' },
              { name: 'file', title: 'File Upload', type: 'file' },
              { name: 'url', title: 'External URL', type: 'url' }
            ]
          }
        ],
        description: 'Add supplemental files or links for this lesson.'
      }
    ]
  },
  {
    name: 'quiz',
    title: 'Quiz',
    type: 'object',
    fields: [
      {
        name: 'title',
        title: 'Quiz Title',
        type: 'string',
        validation: (Rule: any) => Rule.required(),
      },
      {
        name: 'questions',
        title: 'Questions',
        type: 'array',
        of: [
          {
            type: 'object',
            fields: [
              {
                name: 'questionText',
                title: 'Question',
                type: 'string',
                validation: (Rule: any) => Rule.required()
              },
              {
                name: 'options',
                title: 'Options',
                type: 'array',
                of: [{ type: 'string' }],
                validation: (Rule: any) => Rule.required().min(2)
              },
              {
                name: 'correctAnswer',
                title: 'Correct Answer',
                type: 'string',
                description: 'This must exactly match one of the options you provided above.',
                validation: (Rule: any) => Rule.required()
              }
            ]
          }
        ]
      }
    ]
  },
  {
    name: 'notification',
    title: 'Notification',
    type: 'document',
    fields: [
      {
        name: 'title',
        title: 'Title',
        type: 'string',
        validation: (Rule: any) => Rule.required(),
      },
      {
        name: 'message',
        title: 'Message',
        type: 'text',
        validation: (Rule: any) => Rule.required(),
      },
      {
        name: 'link',
        title: 'Link (Optional)',
        type: 'url',
        description: 'Where should the notification take the user when clicked? (e.g. /app/catalog)',
        validation: (Rule: any) => Rule.uri({ allowRelative: true }),
      }
    ]
  }
];
