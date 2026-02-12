# Udemy-Style Course Learning Page — AI UI Generation Prompt

Use this prompt with **ChatGPT** or any **UI-generation AI** to design a static course learning page that resembles Udemy’s course Overview section.

Copy the content below the line and paste it into your AI tool.

---

## DETAILED PROMPT (FOR AI UI GENERATION)

### Role & Context

```
You are a senior frontend UI/UX engineer.
Your task is to design a clean, modern, Udemy-inspired static course learning page UI.
This is a frontend-only project (NO backend, NO API calls).
The UI should visually resemble Udemy's course learning page, especially the "Overview" section.
```

### Objective

```
Create a static HTML + CSS UI for a course learning page similar to:
https://www.udemy.com/course/chatgpt-prompt-engineering-mastery/learn/lecture/...#overview

The page should be responsive, clean, and production-ready.
All data will be static placeholders (dummy data).
```

### Page Structure Requirements

#### 1. Header

```
- Sticky top header
- Back button (← Back to My Courses)
- Course title (short version)
- Minimal and distraction-free
```

#### 2. Course Hero Section

```
- Full-width course banner image (placeholder image)
- Overlay or below image:
  - Course Title (H1)
  - Instructor name
  - Short subtitle / tagline
```

#### 3. Course Navigation Tabs

```
Create a horizontal tab navigation bar with:
- Overview (active by default)
- Curriculum
- Q&A

Tabs are STATIC (no JS required).
The "Overview" tab should appear active.
```

#### 4. Overview Section (Main Content)

```
Include the following blocks in order:

A. About This Course
   - Heading
   - 2–3 paragraph description explaining what the course teaches

B. What You'll Learn
   - Bullet list (4–6 items)
   - Use checkmark-style bullets

C. Requirements
   - Simple bullet list (2–3 items)

D. Who This Course Is For
   - Short paragraph or bullet list
```

#### 5. Course Content Preview

```
- Section title: "Course Content"
- Static expandable-style layout (no JS needed)
- Show:
  - Section 1: Introduction
    - Lecture 1
    - Lecture 2
  - Section 2: Core Concepts
    - Lecture 1
    - Lecture 2
```

### Design & Styling Guidelines

```
- Font: clean sans-serif (Udemy-like)
- Colors:
  - White background
  - Light gray section separators
  - Black text
  - Purple or dark accent for active tab
- Card-like sections with padding and subtle borders
- Desktop-first but responsive for mobile
```

### Technical Constraints

```
- Use ONLY:
  - HTML5
  - CSS3
- No frameworks (no React, no Tailwind, no Bootstrap)
- No JavaScript (unless absolutely required)
- Clean, readable, well-structured code
```

### Deliverables

```
1. One complete HTML file
2. One CSS file
3. Placeholder images and text
4. Well-indented, readable code
```

### Quality Expectations

```
- UI should look professional and production-ready
- Spacing, alignment, and typography must be polished
- Code should be easy to convert later into React or Next.js
```

---

*This prompt is intended for generating a standalone HTML/CSS reference. The Dharwin Training Curriculum already implements a Next.js + Tailwind version at `app/(components)/(contentlayout)/training/curriculum/[id]/`.*
