
"use client"
import "./globals.scss";
import { Provider } from "react-redux";
import store from "@/shared/redux/store";
import PrelineScript from "./PrelineScript";
import { useState } from "react";
import { Initialload } from "@/shared/contextapi";
import { AuthProvider } from "@/shared/contexts/auth-context";
import { ChatSocketProvider } from "@/shared/contexts/ChatSocketContext";
import { NotificationProvider } from "@/shared/contexts/NotificationContext";
import { NotificationToastStack } from "@/shared/components/NotificationToastStack";
import dynamic from "next/dynamic";

const FloatingChatbot = dynamic(
  () => import("@/shared/components/FloatingChatbot"),
  { ssr: false }
);

const RootLayout = ({ children }: any) => {
  const [pageloading, setpageloading] = useState(false);
  return (
    <>
      <Provider store={store}>
        <AuthProvider>
          <ChatSocketProvider>
            <NotificationProvider>
              <NotificationToastStack />
              <Initialload.Provider value={{ pageloading, setpageloading }}>
                {children}
              </Initialload.Provider>
              <FloatingChatbot />
            </NotificationProvider>
          </ChatSocketProvider>
        </AuthProvider>
      </Provider>
      <PrelineScript />
    </>
  );
};
export default RootLayout;
