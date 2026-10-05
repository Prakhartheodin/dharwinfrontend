"use client";

// uat.dharwin.frontend/app/providers.tsx
//
// Extracted from app/layout.tsx so the root layout can stay a server
// component. The provider stack is unchanged — only its location moved.
//
// Why split: when app/layout.tsx itself was "use client", every server
// page funneled through a client wrapper at the SSR boundary. That
// inflated the shared SSR runtime chunk graph (the `[root-of-the-server]`
// bundle that Vercel was failing to find) and forced socket.io-client +
// Firebase + Redux into the SSR runtime even though they only run in
// the browser.

import { Provider } from "react-redux";
import { useState } from "react";
import store from "@/shared/redux/store";
import { Initialload } from "@/shared/contextapi";
import { AuthProvider } from "@/shared/contexts/auth-context";
import { ChatSocketProvider } from "@/shared/contexts/ChatSocketContext";
import { NotificationProvider } from "@/shared/contexts/NotificationContext";
import DeferredNotificationToastStack from "./DeferredNotificationToastStack";
import DeferredFloatingChatbot from "./DeferredFloatingChatbot";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [pageloading, setpageloading] = useState(false);
  return (
    <Provider store={store}>
      <AuthProvider>
        <ChatSocketProvider>
          <NotificationProvider>
            <DeferredNotificationToastStack />
            <Initialload.Provider value={{ pageloading, setpageloading }}>
              {children}
            </Initialload.Provider>
            <DeferredFloatingChatbot />
          </NotificationProvider>
        </ChatSocketProvider>
      </AuthProvider>
    </Provider>
  );
}
