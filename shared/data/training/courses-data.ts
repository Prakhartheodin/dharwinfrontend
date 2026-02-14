/**
 * Static course data for Training Curriculum (My Learning).
 * Replace with API data later.
 */
export interface CourseLesson {
  id: string
  title: string
  duration?: string
  isCompleted?: boolean
}

/** Section in "Course content" accordion (e.g. Day 1 - Module name) */
export interface CourseSection {
  id: string
  title: string
  lectures: CourseLesson[]
}

/** "This course includes" items for detail page */
export interface CourseIncludes {
  videoHours?: number
  codingExercises?: number
  assignments?: boolean
  articles?: number
  downloadableResources?: number
  accessOnMobileAndTV?: boolean
  closedCaptions?: boolean
  certificate?: boolean
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
  /** Last updated for detail page (e.g. "1/2026") */
  lastUpdated?: string
  /** Learner count for detail page */
  learnerCount?: number
  /** Related topic tags for detail page */
  relatedTopics?: string[]
  /** Preview / intro video URL (optional) */
  previewVideoUrl?: string
  /** Badges e.g. Bestseller, Highest Rated */
  badges?: string[]
  /** Display rating (e.g. 4.7) and rating count for detail page */
  ratingDisplay?: number
  ratingCount?: number
  /** "This course includes" block */
  courseIncludes?: CourseIncludes
  /** Sections for "Course content" accordion; if omitted, derived from lessons as one section */
  courseSections?: CourseSection[]
  /** Coding exercises blurb and "See a demo" */
  codingExercisesDescription?: string
  /** Structured description for Overview tab (intro, bullet sections, conclusion) */
  descriptionIntro?: string
  whatYouWillLearn?: { title: string; text: string }[]
  whyChooseThisCourse?: { title: string; text: string }[]
  whoShouldEnroll?: { title: string; text: string }[]
  descriptionConclusion?: string
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
    lastUpdated: "1/2026",
    learnerCount: 1738543,
    relatedTopics: ["JavaScript", "Node.js", "Web Development", "Databases"],
    badges: ["Bestseller", "Highest Rated"],
    ratingDisplay: 4.7,
    ratingCount: 412603,
    courseIncludes: {
      videoHours: 12,
      codingExercises: 24,
      assignments: true,
      articles: 18,
      downloadableResources: 45,
      accessOnMobileAndTV: true,
      closedCaptions: true,
      certificate: true,
    },
    courseSections: [
      { id: "s1", title: "Introduction & Setup", lectures: [{ id: "l1", title: "Welcome & course overview", duration: "5 min" }, { id: "l2", title: "Environment setup", duration: "15 min" }] },
      { id: "s2", title: "HTML & CSS Basics", lectures: [{ id: "l3", title: "HTML structure", duration: "25 min" }, { id: "l4", title: "CSS fundamentals", duration: "45 min" }, { id: "l5", title: "Responsive layout", duration: "30 min" }] },
      { id: "s3", title: "JavaScript Fundamentals", lectures: [{ id: "l6", title: "Variables and types", duration: "20 min" }, { id: "l7", title: "Functions and scope", duration: "35 min" }, { id: "l8", title: "DOM and events", duration: "40 min" }] },
      { id: "s4", title: "Backend APIs", lectures: [{ id: "l9", title: "Node.js and Express", duration: "1 hr" }, { id: "l10", title: "REST and routes", duration: "50 min" }] },
      { id: "s5", title: "Database & Deployment", lectures: [{ id: "l11", title: "Database basics", duration: "45 min" }, { id: "l12", title: "Deploy to production", duration: "50 min" }] },
    ],
    codingExercisesDescription: "This course includes updated coding exercises so you can practice your skills as you learn. Try challenges in the built-in editor and get instant feedback.",
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
    tagline: "Build modern React apps with Next.js and TypeScript.",
    learningPoints: [
      "Build production-ready React apps with Next.js App Router",
      "Use TypeScript for type-safe components and APIs",
      "Implement server and client components effectively",
      "Handle data fetching and caching with best practices",
      "Add authentication and protect routes",
    ],
    lessons: [
      { id: "l1", title: "React Basics", duration: "30 min" },
      { id: "l2", title: "Hooks & State", duration: "45 min" },
      { id: "l3", title: "Next.js App Router", duration: "1 hr" },
      { id: "l4", title: "Data Fetching", duration: "40 min" },
      { id: "l5", title: "Authentication", duration: "35 min" },
    ],
    lastUpdated: "12/2025",
    learnerCount: 89200,
    relatedTopics: ["React", "Next.js", "TypeScript", "Frontend"],
    courseIncludes: {
      videoHours: 8,
      codingExercises: 15,
      assignments: true,
      articles: 12,
      downloadableResources: 20,
      accessOnMobileAndTV: true,
      closedCaptions: true,
      certificate: true,
    },
    courseSections: [
      { id: "s1", title: "React Basics", lectures: [{ id: "l1", title: "React Basics", duration: "30 min" }, { id: "l2", title: "Hooks & State", duration: "45 min" }] },
      { id: "s2", title: "Next.js App Router", lectures: [{ id: "l3", title: "Next.js App Router", duration: "1 hr" }, { id: "l4", title: "Data Fetching", duration: "40 min" }, { id: "l5", title: "Authentication", duration: "35 min" }] },
    ],
    codingExercisesDescription: "Practice React and Next.js with hands-on coding exercises and mini-projects throughout the course.",
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
    learningPoints: [
      "Build RESTful APIs with Express and middleware",
      "Validate requests and handle errors",
      "Integrate MongoDB with Mongoose",
      "Implement JWT authentication and protected routes",
    ],
    requirements: [
      "Basic JavaScript knowledge",
      "Node.js installed (LTS recommended)",
      "A code editor (e.g. VS Code)",
    ],
    lessons: [
      { id: "l1", title: "Setup & Basics", duration: "20 min" },
      { id: "l2", title: "Routes & Middleware", duration: "50 min" },
      { id: "l3", title: "MongoDB & Mongoose", duration: "55 min" },
      { id: "l4", title: "JWT Authentication", duration: "40 min" },
    ],
    lastUpdated: "11/2025",
    learnerCount: 45600,
    relatedTopics: ["Node.js", "Express", "MongoDB", "API"],
    courseIncludes: {
      videoHours: 3,
      codingExercises: 8,
      assignments: true,
      articles: 6,
      downloadableResources: 12,
      accessOnMobileAndTV: true,
      closedCaptions: true,
      certificate: true,
    },
    courseSections: [
      { id: "s1", title: "Setup & API basics", lectures: [{ id: "l1", title: "Setup & Basics", duration: "20 min" }, { id: "l2", title: "Routes & Middleware", duration: "50 min" }] },
      { id: "s2", title: "Database & Auth", lectures: [{ id: "l3", title: "MongoDB & Mongoose", duration: "55 min" }, { id: "l4", title: "JWT Authentication", duration: "40 min" }] },
    ],
    codingExercisesDescription: "Build and test API endpoints with guided coding exercises and Postman collections.",
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
    learningPoints: [
      "Use types and interfaces for safer code",
      "Apply generics for reusable logic",
      "Enable strict mode and fix common pitfalls",
      "Integrate TypeScript with existing JavaScript projects",
    ],
    requirements: [
      "Familiarity with JavaScript (ES6+)",
      "A code editor with TypeScript support",
    ],
    lastUpdated: "10/2025",
    learnerCount: 124000,
    relatedTopics: ["TypeScript", "JavaScript", "Frontend"],
    lessons: [
      { id: "l1", title: "Types & Interfaces", duration: "35 min" },
      { id: "l2", title: "Generics", duration: "30 min" },
      { id: "l3", title: "Strict Mode", duration: "25 min" },
    ],
    courseIncludes: {
      videoHours: 1.5,
      codingExercises: 10,
      assignments: true,
      articles: 8,
      downloadableResources: 5,
      accessOnMobileAndTV: true,
      closedCaptions: true,
      certificate: true,
    },
    courseSections: [
      { id: "s1", title: "Types & Interfaces", lectures: [{ id: "l1", title: "Types & Interfaces", duration: "35 min" }] },
      { id: "s2", title: "Generics & strict mode", lectures: [{ id: "l2", title: "Generics", duration: "30 min" }, { id: "l3", title: "Strict Mode", duration: "25 min" }] },
    ],
    codingExercisesDescription: "Reinforce types and generics with short coding exercises and refactoring challenges.",
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
    learningPoints: [
      "Apply core design principles and visual hierarchy",
      "Use Figma for wireframes and prototypes",
      "Design accessible interfaces (WCAG basics)",
      "Collaborate with developers on handoff",
    ],
    requirements: [
      "A computer with internet access",
      "Figma account (free tier is fine)",
      "No prior design experience required",
    ],
    lastUpdated: "9/2025",
    learnerCount: 67000,
    relatedTopics: ["UI", "UX", "Figma", "Design"],
    lessons: [
      { id: "l1", title: "Design Principles", duration: "40 min" },
      { id: "l2", title: "Figma Basics", duration: "50 min" },
      { id: "l3", title: "Accessibility", duration: "35 min" },
    ],
    courseIncludes: {
      videoHours: 2,
      assignments: true,
      articles: 15,
      downloadableResources: 25,
      accessOnMobileAndTV: true,
      closedCaptions: true,
      certificate: true,
    },
    courseSections: [
      { id: "s1", title: "Design foundations", lectures: [{ id: "l1", title: "Design Principles", duration: "40 min" }] },
      { id: "s2", title: "Figma & accessibility", lectures: [{ id: "l2", title: "Figma Basics", duration: "50 min" }, { id: "l3", title: "Accessibility", duration: "35 min" }] },
    ],
    codingExercisesDescription: "Hands-on design exercises and Figma activities throughout the course. See a demo of the project files.",
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
    learningPoints: [
      "Containerize apps with Docker and Docker Compose",
      "Set up CI/CD with GitHub Actions",
      "Deploy to cloud and manage environments",
      "Monitor and troubleshoot pipelines",
    ],
    requirements: [
      "Basic command-line and Git knowledge",
      "A GitHub account",
      "Docker Desktop (or Docker Engine) installed",
    ],
    lastUpdated: "8/2025",
    learnerCount: 52000,
    relatedTopics: ["DevOps", "Docker", "CI/CD", "GitHub Actions"],
    lessons: [
      { id: "l1", title: "Docker Basics", duration: "45 min" },
      { id: "l2", title: "GitHub Actions", duration: "40 min" },
      { id: "l3", title: "Deployment", duration: "35 min" },
    ],
    courseIncludes: {
      videoHours: 2,
      codingExercises: 6,
      assignments: true,
      articles: 10,
      downloadableResources: 15,
      accessOnMobileAndTV: true,
      closedCaptions: true,
      certificate: true,
    },
    courseSections: [
      { id: "s1", title: "Docker", lectures: [{ id: "l1", title: "Docker Basics", duration: "45 min" }] },
      { id: "s2", title: "CI/CD & deployment", lectures: [{ id: "l2", title: "GitHub Actions", duration: "40 min" }, { id: "l3", title: "Deployment", duration: "35 min" }] },
    ],
    codingExercisesDescription: "Practice with Docker and GitHub Actions in guided labs. See a demo of a sample pipeline.",
  },
]

export function getCourseById(id: string): Course | undefined {
  return MY_COURSES.find((c) => c.id === id)
}
