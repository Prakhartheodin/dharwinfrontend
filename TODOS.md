# TODOS

## Deferred from plan-ceo-review (2026-04-30)

### Shared NotificationContext — eliminate dual SSE connections
**Priority:** Medium
**Effort:** CC ~90 min / human ~half-day

Currently both `header.tsx` and `NotificationToastStack.tsx` independently call `openNotificationStream()`, creating two SSE connections to `/notifications/sse` per browser tab.

Refactor: create `shared/contexts/NotificationContext.tsx` with a single SSE connection. Both header and toast stack consume from `useNotifications()` hook. This centralizes notification state, eliminates the dual connection, and makes future features (preference center, bulk actions) easier to add.

```
New file: shared/contexts/NotificationContext.tsx
  - Single SSE connection
  - Exports: useNotifications() → { items, unreadCount, toastQueue, markAsRead, markAllAsRead }

Modified:
  - app/layout.tsx → wrap with <NotificationProvider>
  - header.tsx → replace local SSE state with useNotifications()
  - NotificationToastStack.tsx → replace openNotificationStream with useNotifications()
```
