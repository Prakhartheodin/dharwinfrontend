# Permission Flow: Role → API → Frontend Nav

## 1. How Permissions Are Assigned (Roles)

- **Location:** Settings → Roles → Edit role
- **Source:** `shared/lib/roles-permissions.ts` – `PERMISSION_SECTIONS` defines modules and features
- **Format:** `module.feature:action1,action2` (e.g. `ats.jobs:view`, `ats.jobs:view,create,edit,delete`)
- **Storage:** Each Role document has `permissions: [String]` in MongoDB
- **User:** Users have `roleIds: [ObjectId]` pointing to Roles. Permissions come from all assigned roles.

## 2. Backend API (GET /auth/my-permissions)

- **Service:** `getMyPermissionsForFrontend` in `permission.service.js`
- **Logic:** Loads user's `roleIds` → fetches Role docs → collects `role.permissions` from each
- **Response:** `{ permissions: string[], roleNames: string[], isAdministrator: boolean }`
- **Example:** `permissions: ["ats.jobs:view", "ats.candidates:view,create", "training.courses:view"]`

## 3. Frontend Auth Context

- **Location:** `shared/contexts/auth-context.tsx`
- **Flow:** Calls `getMyPermissions()` on login and initial load
- **State:** `permissions`, `permissionsLoaded`, `isAdministrator`

## 4. Nav / Sidebar Visibility

- **Location:** `shared/layout-components/sidebar/sidebar.tsx`
- **Mapping:** `shared/lib/route-permissions.ts` – `PATH_PERMISSION_PREFIX` maps URL path → permission prefix
- **Check:** `hasPermissionForPath(userPermissions, requiredPrefix)` → `userPermissions.some(p => p.startsWith(requiredPrefix))`
- **Example:** Path `/ats/jobs` requires `ats.jobs:`; user has `ats.jobs:view` → `"ats.jobs:view".startsWith("ats.jobs:")` ✓

## 5. Mappings (route-permissions.ts)

| Nav Path | Required Prefix |
|----------|-----------------|
| /ats/jobs | ats.jobs: |
| /ats/candidates | ats.candidates: |
| /ats/recruiters | ats.recruiters: |
| /ats/offers-placement | ats.offers: |
| /ats/pre-boarding | ats.pre-boarding: |
| /ats/onboarding | ats.onboarding: |
| /ats/analytics | ats.analytics: |
| /ats/my-profile | ats.my-profile: |
| /courses | candidate.courses: |
| /communication/email | communication.emails: |
| /communication/chats | communication.chats: |
| /communication/meetings | communication.meetings: |
| /communication/calling | communication.calling: |
| /communication/recordings | communication.meetings: |
| /communication/filemanager | communication.files-storage: |
| /training/curriculum | training.courses: |
| /training/attendance | training.attendance: |
| /training/mentors | training.mentors: |
| /training/students | training.students: |
| /training/evaluation | training.evaluation: |
| /training/analytics | training.analytics: |
| /apps/projects/* | project.projects: |
| /task/my-tasks | project.tasks: |
| /task/kanban-board | project.kanban: |
| /project-management/teams | project.teams: |
| /project-management/analytics | project.analytics: |
| /support-tickets | support.tickets: |

## 6. Paths outside the permission-prefix map (or hybrid)

- `/logs/logs-activity` – **PermissionGuard** allows **`isDesignatedSuperadmin`**, **Administrator**, **platform super user**, or **`logs.activity:`**; the prefix map still documents the role permission for consistency.
- `/logs/logs-activity/platform` – **PermissionGuard** + sidebar: **`isDesignatedSuperadmin`** only (matches `DESIGNATED_SUPERADMIN_EMAILS` on the API for export and advanced use).
- `/support/camera/host` – **`isDesignatedSuperadmin`** in **PermissionGuard**.
- `/ats/external-jobs` – visible only when `isAdministrator === true`

## 7. Known Alias (training)

- Roles UI has **training.courses**, **training.categories**, **training.modules** as separate features
- Nav path `/training/curriculum` (and children) requires `training.courses:`
- A user with only `training.modules:view` or `training.categories:view` would not see Training Curriculum
- **Fix:** Accept `training.modules:` and `training.categories:` as aliases for `training.courses:` in route-permissions
