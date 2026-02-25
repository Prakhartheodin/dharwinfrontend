# Task Board – Industry-Level Plan

## Current state
- **Route:** `/task/kanban-board` (sidebar: Task Board)
- **API:** listTasks, getTaskById, createTask, updateTask, updateTaskStatus, deleteTask
- **Backend:** Task has title, description, taskCode, status, dueDate, tags, assignedTo (User refs), projectId, likesCount, commentsCount, imageUrl, order, createdBy
- **Kanban:** Columns NEW / TODO / ON GOING / IN REVIEW / COMPLETED; drag-and-drop updates status
- **Card:** View / Edit (link to static task-details page) / Delete; shows created, due, taskCode, tags, title, description, assignees, likes/comments
- **Detail modal:** Read-only; Edit links to `/task/task-details?taskId=...` (page is static, doesn’t use taskId)

## Goals
1. **More data** on cards and in detail view
2. **View / Edit / Delete** clearly available and working
3. **Industry-level** filtering, assigning, and managing

---

## 1. Data & display

### Cards
- [x] Keep: title, description snippet, due label, taskCode, tags, assignees, likes/comments
- [ ] **Project:** Show project name when `projectId` is set (e.g. badge or subtitle)
- [ ] **Stable id:** Use `id ?? _id` for keys and API calls (backend toJSON returns `id`)

### Detail modal (View)
- [ ] **Project:** Show project name + link to project (e.g. `/apps/projects/edit/{projectId}`)
- [ ] **Created by:** Show creator name/email
- [ ] **Assigned to:** List with name, email (already present; ensure `id`/`_id` handled)
- [ ] **All fields:** Status, taskCode, due date (formatted), description, tags, image if any
- [ ] **Actions:** Edit (opens edit modal), Delete (with confirm), Close

### Edit
- [ ] **Edit Task modal** (from detail or card): same fields as create + status
  - Title, description, status, due date, tags (creatable), project (dropdown), assignees (user multiselect if API allowed)
- [ ] **Save** → `updateTask(id, payload)` then refresh and close
- [ ] Optional: make `/task/task-details` dynamic (load task by taskId and show edit form) for deep links

---

## 2. Functionality

### View
- [x] Open detail modal from card “View”
- [ ] Detail modal shows full task data + project link + created by + Edit/Delete buttons

### Edit
- [ ] “Edit” opens **Edit Task modal** (or inline form in detail) with:
  - Title, description, status, due date, tags, projectId, assignedTo
- [ ] Submit → PATCH `/tasks/:id` then refetch and close

### Delete
- [x] Delete from card dropdown with confirmation
- [ ] Optional: Delete button in detail modal too

---

## 3. Industry-level improvements

### Filtering
- [ ] **Project filter:** Dropdown “All projects” / specific project; `listTasks({ projectId })`
- [ ] **Search:** Already present (title/description/tags)
- [ ] Optional: filter by assignee, status (already implied by columns)

### Add Task
- [ ] **Project:** Optional project dropdown (listProjects)
- [ ] **Tags:** Creatable multi-select or comma/Enter input
- [ ] **Due date:** Already present

### Assigning
- [ ] **Edit modal:** Assignees = user multiselect (listUsers) if permission available
- [ ] **Card & detail:** Show assignee names/avatars (handle `id`/`_id` from API)

### UX
- [ ] **Empty states:** “No tasks” per column; “Add Task” CTA
- [ ] **Loading:** Skeleton or spinner for columns
- [ ] **Stable keys:** `getTaskId(task)` everywhere (id ?? _id)

---

## 4. Implementation order

1. **Ids & keys** – Use `getTaskId(task)` and `id ?? _id` in tasks API types and Kanban card/detail so all actions work with backend `id`.
2. **Detail modal** – Add project link, created by, Edit + Delete buttons; optional extra fields.
3. **Edit Task modal** – Form with title, description, status, due, tags, projectId, assignedTo; `updateTask` on submit.
4. **Project filter** – Board toolbar: project dropdown, pass `projectId` to `listTasks`.
5. **Add Task** – Add project dropdown and tags to create modal.
6. **Cards** – Show project name when present.

---

## 5. Files to touch

| Area           | Files |
|----------------|--------|
| Types / API    | `shared/lib/api/tasks.ts` (Task.id, getTaskId usage) |
| Card           | `task/kanban-board/KanbanTaskCard.tsx` (project, key, onEdit) |
| Detail modal   | `task/kanban-board/TaskDetailModal.tsx` (project link, createdBy, Edit/Delete) |
| Kanban page    | `task/kanban-board/page.tsx` (project filter, edit modal, add task project/tags) |
| Edit modal     | New or inline in page: title, description, status, due, tags, projectId, assignedTo |
