"use client"
import PrelineScript from "@/app/PrelineScript"
import Backtotop from "@/shared/layout-components/backtotop/backtotop"
import Footer from "@/shared/layout-components/footer/footer"
import Header from "@/shared/layout-components/header/header"
import Sidebar from "@/shared/layout-components/sidebar/sidebar"
import { ThemeChanger } from "@/shared/redux/action"
import store from "@/shared/redux/store"
import { Fragment, useState } from "react"
import { connect } from "react-redux"
import { usePathname } from "next/navigation"
import { ProtectedRoute } from "@/shared/components/protected-route"
import { PermissionGuard } from "@/shared/components/permission-guard"

const Layout = ({ children }: any) => {
  const [MyclassName, setMyClass] = useState("");
  const pathname = usePathname();
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
          <div className="fixed inset-0 z-[9999] w-screen h-screen overflow-hidden bg-[#0f1012]">
            {children}
          </div>
          <PrelineScript />
        </PermissionGuard>
      </ProtectedRoute>
    );
  }

  return (
    <>
    <Fragment>
      <ProtectedRoute>
        <PermissionGuard>
          <div className='page'>
            <Header/>
            <Sidebar/>
            <div className='content'>
              <div className='main-content' onClick={Bodyclickk}>
                {children}
              </div>
            </div>
            <Footer/>
          </div>
          <Backtotop/>
          <PrelineScript/>
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
