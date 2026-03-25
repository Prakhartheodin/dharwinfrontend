"use client"
import Backtotop from "@/shared/layout-components/backtotop/backtotop"
import Footer from "@/shared/layout-components/footer/footer"
import Header from "@/shared/layout-components/header/header"
import Sidebar from "@/shared/layout-components/sidebar/sidebar"
import { ThemeChanger } from "@/shared/redux/action"
import store from "@/shared/redux/store"
import { Fragment, Suspense, useState } from "react"
import CandidateSopSetupBannerHost from "@/shared/components/candidate-sop-setup-banner-host"
import { connect } from "react-redux"
import { usePathname } from "next/navigation"
import { ProtectedRoute } from "@/shared/components/protected-route"
import { PermissionGuard } from "@/shared/components/permission-guard"
import { useAuth } from "@/shared/contexts/auth-context"

const Layout = ({ children }: any) => {
  const [MyclassName, setMyClass] = useState("");
  const pathname = usePathname();
  const { isLoading, loadingMessage } = useAuth();
  const isMeetingRoom = pathname?.startsWith("/meetings/room/");

  const Bodyclickk = () => {
    const theme = store.getState();
    if (localStorage.getItem("dharwinverticalstyles") == "icontext") {
      setMyClass("");
    }
    if (window.innerWidth > 992) {
      if (theme.iconOverlay === 'open') {
        ThemeChanger({ ...theme, iconOverlay: "" });
      }
    }
  }

  if (isMeetingRoom) {
    return (
      <ProtectedRoute>
        <PermissionGuard>
          {isLoading && loadingMessage && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#0f1012]/95 backdrop-blur-sm">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent mx-auto mb-4" />
                <p className="text-white font-medium">{loadingMessage}</p>
              </div>
            </div>
          )}
          <div className="fixed inset-0 z-[9999] w-screen h-screen overflow-hidden bg-[#0f1012]">
            {children}
          </div>
        </PermissionGuard>
      </ProtectedRoute>
    );
  }

  return (
    <>
    <Fragment>
      <ProtectedRoute>
        <PermissionGuard
          renderChrome={(content) => (
            <>
              {isLoading && loadingMessage && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/90 dark:bg-bodybg/90 backdrop-blur-sm">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent mx-auto mb-4" />
                    <p className="text-defaulttextcolor dark:text-white/90 font-medium">{loadingMessage}</p>
                  </div>
                </div>
              )}
              <div className='page'>
                <Header/>
                <Sidebar/>
                <div className='content'>
                  <div className='main-content' onClick={Bodyclickk}>
                    <Suspense fallback={null}>
                      <CandidateSopSetupBannerHost />
                    </Suspense>
                    {content}
                  </div>
                </div>
                <Footer/>
              </div>
              <Backtotop/>
            </>
          )}
        >
          {children}
        </PermissionGuard>
      </ProtectedRoute>
    </Fragment>
    </>
  )
}

const mapStateToProps = (state: any) => ({
  local_varaiable: state
});

export default connect(mapStateToProps, { ThemeChanger})(Layout);
