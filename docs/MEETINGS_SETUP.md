# LiveKit Meetings Frontend Setup

This guide explains how to use the LiveKit video meetings feature in the dharwin_new frontend.

## Overview

The frontend provides Google Meet-like video conferencing functionality using LiveKit. Users can:
- Join or create meeting rooms
- Participate in video/audio calls
- Start/stop recordings (if they have permission)
- Share screens and chat

## Environment Variables

Add the following to your `.env` file:

```env
# LiveKit Configuration
NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880
```

For production, update `NEXT_PUBLIC_LIVEKIT_URL` to your production LiveKit server URL.

## Routes

### Pre-Join Page
**Path:** `/meetings/pre-join/`

The pre-join page allows users to:
- Enter their name (pre-filled from authenticated user)
- Enter or generate a room name
- Toggle audio/video permissions
- Request browser permissions for camera/microphone

### Meeting Room Page
**Path:** `/meetings/room/[roomId]`

The meeting room page displays the full video conference interface with:
- Video grid of all participants
- Audio/video controls
- Screen sharing
- Chat (via LiveKit components)
- Recording controls (if user has permission)

## Usage Flow

1. **User navigates to pre-join page:**
   ```
   /meetings/pre-join/
   ```

2. **User enters room name and toggles media:**
   - Room name can be manually entered or auto-generated
   - Audio/video permissions are requested from browser

3. **User clicks "Join Room":**
   - Frontend calls backend `/v1/livekit/token` endpoint
   - Receives LiveKit access token
   - Redirects to `/meetings/room/[roomId]?name=...&audio=1&video=1`

4. **Meeting room loads:**
   - Connects to LiveKit server using token
   - Displays video conference interface
   - User can interact with other participants

## Components

### RecordingButton
Located at: `shared/components/livekit/recording-button.tsx`

A button component that allows users with `meetings.record` permission to:
- Start recording
- Stop recording
- View recording status

### API Client
Located at: `shared/lib/api/livekit.ts`

Provides functions for:
- `getLiveKitToken(roomName, participantName)` - Get access token
- `startRecording(roomName)` - Start recording
- `stopRecording(egressId)` - Stop recording
- `getRecordingStatus(roomName)` - Get recording status

## Integration with Existing Features

### Authentication
- Uses existing `AuthContext` to get user information
- Pre-fills participant name from authenticated user
- All API calls use existing `apiClient` with authentication cookies

### Permissions
- Recording requires `meetings.record` permission
- Backend validates permissions before allowing recording

### Styling
- Uses existing Tailwind CSS classes
- Matches dharwin_new design system
- Dark mode support via existing theme system

## Example: Adding Meeting Link to Training Module

You can add a "Start Live Session" button to training modules:

```tsx
import { useRouter } from "next/navigation";

function TrainingModulePage({ moduleId }: { moduleId: string }) {
  const router = useRouter();
  
  const handleStartMeeting = () => {
    const roomName = `training-module-${moduleId}-${Date.now()}`;
    router.push(`/meetings/pre-join/?room=${encodeURIComponent(roomName)}`);
  };
  
  return (
    <button onClick={handleStartMeeting} className="ti-btn ti-btn-primary">
      Start Live Session
    </button>
  );
}
```

## Troubleshooting

### "LiveKit URL not configured"
- Ensure `NEXT_PUBLIC_LIVEKIT_URL` is set in `.env`
- Restart the Next.js dev server after adding env variables

### "Failed to connect to room"
- Verify LiveKit server is running (check `livekit-local` Docker services)
- Check backend is running and accessible
- Verify user is authenticated

### "Recording service not available"
- Ensure LiveKit Egress service is running
- Check user has `meetings.record` permission
- Verify backend LiveKit configuration

### Camera/Microphone Permissions
- Browser will prompt for permissions on first use
- If denied, user can still join with audio-only or video-only
- Check browser settings if permissions aren't working

## Next Steps

- Add meeting history/logs (store meeting metadata in database)
- Add meeting scheduling (calendar integration)
- Add meeting invitations (email/SMS notifications)
- Add meeting recordings playback (link to stored recordings)
