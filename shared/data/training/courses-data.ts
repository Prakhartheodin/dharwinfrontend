/**
 * Static course data for Training Curriculum (My Learning).
 * Replace with API data later.
 */
export interface CourseLesson {
  id: string
  title: string
  duration?: string
}

export interface Course {
  id: string
  title: string
  instructor: string
  thumbnail: string
  progress: number
  description: string
  lessons: CourseLesson[]
  rating?: number
  category?: string
  /** Overview: what you'll learn (checkmark bullets) */
  learningPoints?: string[]
  /** Overview: requirements */
  requirements?: string[]
  /** Overview: who this course is for */
  whoIsFor?: string
  /** Short tagline for hero */
  tagline?: string
}

export const MY_COURSES: Course[] = [
  {
    id: "1",
    title: "Full Stack Web Development",
    instructor: "John Doe",
    thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=220&fit=crop",
    progress: 40,
    rating: 5,
    category: "Development",
    description:
      "Learn frontend and backend development using real-world projects. Covers HTML, CSS, JavaScript, Node.js, and databases. By the end of this course you will be able to build and deploy full-stack web applications from scratch. We use a project-based approach so you can apply what you learn immediately.",
    tagline: "From zero to deploy — build real web applications.",
    learningPoints: [
      "Build responsive frontends with HTML, CSS, and JavaScript",
      "Create RESTful APIs with Node.js and Express",
      "Work with databases and deploy to production",
      "Use version control and modern development workflows",
      "Debug and test your applications effectively",
    ],
    requirements: [
      "A computer with a code editor (e.g. VS Code)",
      "Basic familiarity with using the command line",
    ],
    whoIsFor:
      "Beginners who want to become web developers, or developers who want to add full-stack skills. No prior programming experience required.",
    lessons: [
      { id: "l1", title: "Introduction", duration: "5 min" },
      { id: "l2", title: "HTML & CSS Basics", duration: "45 min" },
      { id: "l3", title: "JavaScript Fundamentals", duration: "1 hr" },
      { id: "l4", title: "Backend APIs", duration: "1 hr 20 min" },
      { id: "l5", title: "Database & Deployment", duration: "50 min" },
    ],
  },
  {
    id: "2",
    title: "React & Next.js Masterclass",
    instructor: "Jane Smith",
    thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=220&fit=crop",
    progress: 75,
    rating: 5,
    category: "Development",
    description:
      "Build modern React applications with Next.js, TypeScript, and best practices for performance and SEO.",
    lessons: [
      { id: "l1", title: "React Basics", duration: "30 min" },
      { id: "l2", title: "Hooks & State", duration: "45 min" },
      { id: "l3", title: "Next.js App Router", duration: "1 hr" },
      { id: "l4", title: "Data Fetching", duration: "40 min" },
      { id: "l5", title: "Authentication", duration: "35 min" },
    ],
  },
  {
    id: "3",
    title: "Node.js & Express APIs",
    instructor: "Mike Johnson",
    thumbnail: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=220&fit=crop",
    progress: 0,
    rating: 4,
    category: "Development",
    description:
      "Create RESTful APIs with Node.js and Express. Includes validation, auth, and MongoDB integration.",
    lessons: [
      { id: "l1", title: "Setup & Basics", duration: "20 min" },
      { id: "l2", title: "Routes & Middleware", duration: "50 min" },
      { id: "l3", title: "MongoDB & Mongoose", duration: "55 min" },
      { id: "l4", title: "JWT Authentication", duration: "40 min" },
    ],
  },
  {
    id: "4",
    title: "TypeScript for JavaScript Developers",
    instructor: "Sarah Williams",
    thumbnail: "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=400&h=220&fit=crop",
    progress: 100,
    rating: 5,
    category: "Development",
    description:
      "Level up your JavaScript with TypeScript: types, interfaces, generics, and strict mode.",
    lessons: [
      { id: "l1", title: "Types & Interfaces", duration: "35 min" },
      { id: "l2", title: "Generics", duration: "30 min" },
      { id: "l3", title: "Strict Mode", duration: "25 min" },
    ],
  },
  {
    id: "5",
    title: "UI/UX Design Fundamentals",
    instructor: "Alex Chen",
    thumbnail: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=220&fit=crop",
    progress: 20,
    rating: 5,
    category: "Design",
    description:
      "Design principles, Figma basics, and building accessible, user-friendly interfaces.",
    lessons: [
      { id: "l1", title: "Design Principles", duration: "40 min" },
      { id: "l2", title: "Figma Basics", duration: "50 min" },
      { id: "l3", title: "Accessibility", duration: "35 min" },
    ],
  },
  {
    id: "6",
    title: "DevOps & CI/CD",
    instructor: "Chris Brown",
    thumbnail: "https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=400&h=220&fit=crop",
    progress: 55,
    rating: 4,
    category: "DevOps",
    description:
      "Docker, GitHub Actions, and deployment pipelines for modern web apps.",
    lessons: [
      { id: "l1", title: "Docker Basics", duration: "45 min" },
      { id: "l2", title: "GitHub Actions", duration: "40 min" },
      { id: "l3", title: "Deployment", duration: "35 min" },
    ],
  },
]

export function getCourseById(id: string): Course | undefined {
  return MY_COURSES.find((c) => c.id === id)
}
