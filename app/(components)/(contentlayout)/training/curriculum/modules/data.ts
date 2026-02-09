export type ModuleSummary = {
    videos: number
    pdfs: number
    blogs: number
    quiz: number
    tests: number
  }
  
  export type Mentor = {
    id: string
    name: string
    avatar: string
  }
  
  export type TrainingModule = {
    id: string
    categoryId: string
    name: string
    coverImage: string
    shortDescription: string
    summary: ModuleSummary
    studentsEnrolled: number
    mentors: Mentor[]
  }
  
  export type Category = {
    id: string
    name: string
    modules: TrainingModule[]
  }
  
  export const MOCK_CATEGORIES: Category[] = [
    {
      id: 'cat-1',
      name: 'Technical Skills',
      modules: [
        {
          id: 'mod-1',
          categoryId: 'cat-1',
          name: 'React & Next.js Fundamentals',
          coverImage: '/assets/images/media/team-covers/1.jpg',
          shortDescription:
            'Master React hooks, Next.js App Router, and server components for modern web apps.',
          summary: { videos: 24, pdfs: 6, blogs: 8, quiz: 3, tests: 2 },
          studentsEnrolled: 142,
          mentors: [
            { id: 'm1', name: 'Alex', avatar: '/assets/images/faces/2.jpg' },
            { id: 'm2', name: 'Sam', avatar: '/assets/images/faces/8.jpg' },
          ],
        },
        {
          id: 'mod-2',
          categoryId: 'cat-1',
          name: 'Node.js & API Design',
          coverImage: '/assets/images/media/team-covers/2.jpg',
          shortDescription:
            'Build scalable REST and GraphQL APIs with Node.js, Express, and best practices.',
          summary: { videos: 18, pdfs: 4, blogs: 5, quiz: 2, tests: 1 },
          studentsEnrolled: 98,
          mentors: [{ id: 'm3', name: 'Jordan', avatar: '/assets/images/faces/12.jpg' }],
        },
        {
          id: 'mod-3',
          categoryId: 'cat-1',
          name: 'Database Design & SQL',
          coverImage: '/assets/images/media/team-covers/3.jpg',
          shortDescription:
            'Relational modeling, indexing, and writing efficient SQL queries.',
          summary: { videos: 20, pdfs: 10, blogs: 4, quiz: 4, tests: 2 },
          studentsEnrolled: 76,
          mentors: [
            { id: 'm4', name: 'Casey', avatar: '/assets/images/faces/10.jpg' },
            { id: 'm5', name: 'Morgan', avatar: '/assets/images/faces/5.jpg' },
          ],
        },
      ],
    },
    {
      id: 'cat-2',
      name: 'Leadership & Soft Skills',
      modules: [
        {
          id: 'mod-4',
          categoryId: 'cat-2',
          name: 'Leading Remote Teams',
          coverImage: '/assets/images/media/team-covers/4.jpg',
          shortDescription:
            'Communication, async workflows, and building trust in distributed teams.',
          summary: { videos: 12, pdfs: 3, blogs: 6, quiz: 2, tests: 0 },
          studentsEnrolled: 210,
          mentors: [
            { id: 'm6', name: 'Riley', avatar: '/assets/images/faces/9.jpg' },
            { id: 'm7', name: 'Quinn', avatar: '/assets/images/faces/11.jpg' },
          ],
        },
        {
          id: 'mod-5',
          categoryId: 'cat-2',
          name: 'Feedback & Performance Reviews',
          coverImage: '/assets/images/media/team-covers/5.jpg',
          shortDescription:
            'Give and receive constructive feedback and run effective 1:1s.',
          summary: { videos: 8, pdfs: 5, blogs: 4, quiz: 1, tests: 1 },
          studentsEnrolled: 165,
          mentors: [{ id: 'm8', name: 'Taylor', avatar: '/assets/images/faces/3.jpg' }],
        },
      ],
    },
    {
      id: 'cat-3',
      name: 'Product & Design',
      modules: [
        {
          id: 'mod-6',
          categoryId: 'cat-3',
          name: 'UX Research Basics',
          coverImage: '/assets/images/media/team-covers/6.jpg',
          shortDescription:
            'User interviews, usability testing, and turning insights into decisions.',
          summary: { videos: 14, pdfs: 2, blogs: 10, quiz: 2, tests: 0 },
          studentsEnrolled: 88,
          mentors: [
            { id: 'm9', name: 'Jamie', avatar: '/assets/images/faces/13.jpg' },
            { id: 'm10', name: 'Drew', avatar: '/assets/images/faces/6.jpg' },
          ],
        },
      ],
    },
  ]
  
  export function getAllModules(): TrainingModule[] {
    return MOCK_CATEGORIES.flatMap((c) => c.modules)
  }
  
  export function getModuleById(id: string): TrainingModule | undefined {
    return getAllModules().find((m) => m.id === id)
  }
  
  export function getCategoryById(id: string): Category | undefined {
    return MOCK_CATEGORIES.find((c) => c.id === id)
  }
  