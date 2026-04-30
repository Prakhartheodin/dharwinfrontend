
"use client"
import "./globals.scss";
import { Provider } from "react-redux";
import store from "@/shared/redux/store";
import PrelineScript from "./PrelineScript";
import { useState } from "react";
import { Initialload } from "@/shared/contextapi";
import { AuthProvider } from "@/shared/contexts/auth-context";
import { ChatSocketProvider } from "@/shared/contexts/ChatSocketContext";
import { NotificationToastStack } from "@/shared/components/NotificationToastStack";

const RootLayout = ({ children }: any) => {
  const [pageloading, setpageloading] = useState(false);
  return (
    <>
      <Provider store={store}>
        <AuthProvider>
          <ChatSocketProvider>
            <NotificationToastStack />
            <Initialload.Provider value={{ pageloading, setpageloading }}>
              {children}
            </Initialload.Provider>
          </ChatSocketProvider>
        </AuthProvider>
      </Provider>
      <PrelineScript />
    </>
  );
};
export default RootLayout;
