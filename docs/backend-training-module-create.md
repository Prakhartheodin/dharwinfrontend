# Backend Requirements: Create Training Module (Single Form)

This document defines the backend API requirements for **creating a new training module**. The frontend treats **Course Info** and **Playlist** as **one form**—not separate flows. The backend must accept **course info and playlist in a single request**.

---

## Design principle

**Course info and playlist are one form, not different.**  
The UI has two tabs (“Course Info” and “Playlist”) for layout only. Submission is a **single** create-module request that includes both course metadata and the full playlist. Do not require separate endpoints or steps for “save course” vs “save playlist.”

---

## Suggested endpoint

| Item | Value |
|------|--------|
| **Method** | `POST` |
| **Path** | `v1/training/curriculum/modules` (or equivalent) |
| **Auth** | Required (e.g. JWT via cookie or `Authorization: Bearer`) |
| **Content-Type** | See [Payload options](#payload-options) below |

---

## Payload options

Because the form includes **files** (cover image, optional video/PDF per playlist item), use one of these approaches.

### Option A – Single `multipart/form-data` (recommended)

Accept **one** `POST` with `Content-Type: multipart/form-data` containing:

- **Course info** as form fields (or as one JSON string field).
- **Playlist** as a JSON string field (see [Playlist structure](#playlist-structure)).
- **Cover image** as a file field (e.g. `coverImage`).
- **Per–playlist-item files** (e.g. `playlist[0].video`, `playlist[1].pdf`) if you support inline file uploads in the same request.

Field names and structure must be agreed with the frontend (e.g. one JSON field for non-file data + named file fields). Ensure the backend does **not** force `Content-Type: application/json` for this route so that `multipart/form-data` with boundary is sent correctly (avoid “No file provided” type errors).

### Option B – JSON + separate file uploads

1. **POST** create module with `Content-Type: application/json` and a body that includes:
   - All course info fields.
   - Full playlist array (with placeholders or empty values for not-yet-uploaded assets).
2. Frontend first uploads **cover image** (and optionally video/PDF assets) to dedicated upload endpoints and gets back URLs/IDs.
3. Frontend then sends the **single** create-module JSON including those URLs/IDs in the appropriate fields.

Either way, the **logical** contract is: **one “create module” operation** that receives **course info + playlist** together.

---

## Course info (part of the single form)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `categoryId` | string | Yes | Category ID (e.g. from a categories list). |
| `name` | string | Yes | Module name (e.g. “Introduction to Next.js”). |
| `coverImage` | file or string | Yes | Cover image: either a file in `multipart/form-data` (e.g. field name `coverImage`) or a URL/identifier if using separate upload. |
| `shortDescription` | string | Yes | Short summary of the module. |
| `studentIds` | string[] | No | IDs of students assigned to this module. |
| `mentorIds` | string[] | No | IDs of mentors assigned to this module. |

---

## Playlist (part of the same form)

The playlist is an **array of items**. Order of the array is the **course flow order**. Each item has a **content type** and type-specific fields.

### Playlist item – common fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `order` | number | Yes | 1-based index in the playlist (or use array index). |
| `type` | string | Yes | One of: `video`, `youtube`, `quiz`, `pdf`, `blog`, `test`. |
| `title` | string | Yes | Item title (e.g. lesson title). |
| `duration` | string or number | No | Duration in minutes (e.g. `"10"` or `10`). |

### Playlist item – type-specific fields

- **`video`** (uploaded video)  
  - `source`: file in multipart (e.g. `playlist[].video`) or a URL/asset ID after upload.  
  - Backend: store video file or reference; return a URL or ID for playback.

- **`youtube`**  
  - `source`: string (YouTube URL or video ID).  
  - Backend: store URL or normalized ID; optional server-side validation.

- **`pdf`** (document)  
  - `source`: file in multipart (e.g. `playlist[].pdf`) or a URL/asset ID after upload.  
  - Backend: store PDF or reference; return URL or ID for viewing.

- **`blog`**  
  - `blogContent`: string (HTML or Markdown).  
  - Backend: store rich text as-is or sanitized.

- **`quiz`**  
  - `quizData`: array of questions (see [Quiz structure](#quiz-structure)).  
  - Backend: create/update quiz entity and store reference (e.g. quiz ID) in the playlist item.  
  - Optional: support **import from CSV** (template: Question, Option1–Option4, CorrectAnswer e.g. `"2"` or `"1,3"` for multiple).

- **`test`**  
  - `source`: string (test URL or reference/description).  
  - Backend: store as external link or reference.

---

### Quiz structure (for `type: "quiz"`)

Each question:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `question` | string | Yes | Question text. |
| `multipleCorrect` | boolean | No | Whether multiple options can be correct. |
| `options` | array | Yes | List of options. |

Each option:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | string | Yes | Option text. |
| `correct` | boolean | Yes | Whether this option is correct. |

Backend should validate: at least one option marked correct; if `multipleCorrect` is false, at most one option marked correct (or normalize).

---

## Success response

- **Status:** `201 Created`
- **Body:** JSON object for the created module, including:
  - `id` (module ID)
  - All course info fields (with `coverImageUrl` or equivalent if stored)
  - `playlist`: array of created playlist items (with IDs and any stored URLs/asset IDs)

Example (minimal):

```json
{
  "id": "module_id_xxx",
  "categoryId": "cat-1",
  "name": "Introduction to Next.js",
  "coverImageUrl": "/path/or/url/to/cover.jpg",
  "shortDescription": "...",
  "studentIds": ["s1"],
  "mentorIds": ["m1"],
  "playlist": [
    {
      "id": "item_1",
      "order": 1,
      "type": "video",
      "title": "Lesson 1",
      "duration": "10",
      "sourceUrl": "..."
    },
    {
      "id": "item_2",
      "order": 2,
      "type": "quiz",
      "title": "Quiz 1",
      "quizId": "quiz_abc"
    }
  ]
}
```

---

## Error responses

| Status | When |
|--------|------|
| `400 Bad Request` | Validation failure (missing required field, invalid type, bad file type/size). For file uploads: e.g. “No file provided” when a required file is missing. |
| `401 Unauthorized` | Not authenticated. |
| `403 Forbidden` | Not allowed to create modules. |
| `404 Not Found` | Referenced category/student/mentor ID not found (if applicable). |
| `413 Payload Too Large` | File(s) exceed size limit. |
| `503` | Storage (e.g. S3) not configured or unavailable. |

---

## File upload notes

- **Cover image:** Required; recommend image types (e.g. JPEG, PNG) and max size (e.g. 5MB).
- **Video/PDF per playlist item:** Optional; validate type and size. Use consistent field names (e.g. `file` for profile picture–style endpoints, or `playlist[n].video` / `playlist[n].pdf` in one multipart).
- Do **not** set `Content-Type: application/json` for the create-module request when the client sends `multipart/form-data`; let the client send the boundary so the server receives files correctly.

---

## Summary

- **One form:** Course info + playlist are submitted together in **one** create-module request.
- **One endpoint:** `POST v1/training/curriculum/modules` (or agreed path) for that request.
- **Payload:** Either one `multipart/form-data` (course + playlist + files) or one JSON body (course + playlist) with files handled by prior uploads.
- **Playlist:** Ordered array of items; each item has `type`, `title`, `order`, `duration`, and type-specific content (file, URL, HTML, quiz data, etc.).
- **Quiz:** Nested structure of questions and options; optional CSV import aligned with the template (Question, Option1–Option4, CorrectAnswer).
