# Project Management Analytics – Plan

## Goal
Turn the placeholder "Analytics page content coming soon" into a useful project management analytics dashboard using existing APIs (projects, tasks, teams).

## Available data (APIs)
- **Projects** (`listProjects`): name, status (Inprogress | On hold | completed), priority, completedTasks, totalTasks, startDate, endDate, assignedTeams
- **Tasks** (`listTasks`): title, status (new | todo | on_going | in_review | completed), projectId, dueDate
- **Teams** (`listTeamGroups`): name, count
- **Team members** (`listTeamMembers`): optional for "members per team" later

## Proposed analytics

### 1. Summary KPIs (top cards)
| Metric | Source | Description |
|--------|--------|-------------|
| Total projects | `listProjects` totalResults or results.length | Count of all projects |
| Total tasks | `listTasks` totalResults or results.length | Count of all tasks |
| Task completion % | Sum(completedTasks) / Sum(totalTasks) from projects, or tasks where status=completed | Overall completion rate |
| Total teams | `listTeamGroups` totalResults | Number of project teams |

### 2. Tasks by status
- **Chart:** Bar or pie – count of tasks per status (new, todo, on_going, in_review, completed).
- **Source:** `listTasks({ limit: 1000 })` then group by `task.status`.

### 3. Projects by status
- **Chart:** Bar or pie – count of projects per status (Inprogress, On hold, completed).
- **Source:** `listProjects({ limit: 500 })` then group by `project.status`.

### 4. Projects overview (table or cards)
- List projects with: name, status, priority, progress (completedTasks / totalTasks), due date.
- Optional: link to project edit/detail.

### 5. Overdue / at risk (optional)
- Tasks where `dueDate < today` and `status !== 'completed'`.
- Or projects where `endDate < today` and status not completed.

## Implementation order
1. **Plan doc** (this file).
2. **Fetch data:** On page load, call `listProjects`, `listTasks`, `listTeamGroups` (reasonable limits).
3. **KPI cards:** Four cards – total projects, total tasks, completion %, total teams.
4. **Tasks by status:** Simple bar chart or list of counts per status (use CSS or a small chart lib if available).
5. **Projects by status:** Same idea – counts per status.
6. **Projects overview:** Table or card list with name, status, priority, progress bar.

## Tech notes
- No new backend endpoints required; use existing list APIs.
- If the app has a chart library (e.g. recharts, chart.js), use it for pie/bar; otherwise use simple div-based bars or a minimal dependency.
- Handle loading and empty states.

## Files
- **Page:** `app/(components)/(contentlayout)/project-management/analytics/page.tsx`
- **Plan:** `docs/PROJECT_MANAGEMENT_ANALYTICS_PLAN.md`
