"use client"
import Link from 'next/link'
import React, { Fragment, useEffect, useState, useCallback } from 'react';
import { ThemeChanger } from "../../redux/action";
import { connect } from 'react-redux';
import store from '@/shared/redux/store';
import Modalsearch from '../modal-search/modalsearch';
import { basePath } from '@/next.config';
import { useAuth } from '@/shared/contexts/auth-context';
import { ROUTES } from '@/shared/lib/constants';
import { isPublicLayoutPath } from '@/shared/lib/public-layout-paths';
import { usePathname } from 'next/navigation';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  openNotificationStream,
  type Notification,
} from '@/shared/lib/api/notifications';

const Header = ({ local_varaiable, ThemeChanger }: any) => {
  const { user, impersonation, logout, stopImpersonation } = useAuth();
  const pathname = usePathname();
  const guestPublicLayout = !user && isPublicLayoutPath(pathname ?? "");


  const data=  <span className="font-[600] py-[0.25rem] px-[0.45rem] rounded-[0.25rem] bg-pinkmain/10 text-pinkmain text-[0.625rem]">Free shipping</span>

  const cartProduct = [
    {
      id: 1,
      src: "/assets/images/ecommerce/jpg/1.jpg",
      name: 'SomeThing Phone',
      price: '$1,299.00',
      color: 'Metallic Blue',
      text: '6gb Ram',
      class: '',
    },
    {
      id: 2,
      src: "/assets/images/ecommerce/jpg/3.jpg",
      name: 'Stop Watch',
      price: '$179.29',
      color: 'Analog',
      text: data,
      class: '',
    },
    {
      id: 3,
      src: "/assets/images/ecommerce/jpg/5.jpg",
      name: 'Photo Frame',
      price: '$29.00',
      color: 'Decorative',
      text: '',
      class: '',
    },
    {
      id: 4,
      src: "/assets/images/ecommerce/jpg/4.jpg",
      name: 'Kikon Camera',
      price: '$4,999.00',
      color: 'Black',
      text: '50MM',
      class: '',
    },
    {
      id: 5,
      src: "/assets/images/ecommerce/jpg/6.jpg",
      name: 'Canvas Shoes',
      price: '$129.00',
      color: 'Gray',
      text: 'Sports',
      class: 'border-b-0',
    },
  ];

  const [cartItems, setCartItems] = useState([...cartProduct]);
  const [cartItemCount, setCartItemCount] = useState(cartProduct.length);
  const handleRemove = (itemId: number,event: { stopPropagation: () => void; }) => {
    event.stopPropagation();
    const updatedCart = cartItems.filter((item) => item.id !== itemId);
    setCartItems(updatedCart);
    setCartItemCount(updatedCart.length);
  };

  // Notifications: map API shape to existing UI shape { id, class, data, icon, class2, color, color2 }
  const typeToIcon: Record<string, string> = {
    leave: 'clock', task: 'circle-check', offer: 'gift', meeting: 'video', meeting_reminder: 'video', course: 'book',
    certificate: 'certificate', job_application: 'briefcase', project: 'folder', account: 'user-check',
    recruiter: 'user',
    assignment: 'user-plus',
    sop: 'checklist',
    general: 'bell',
  };
  const typeToColor: Record<string, string> = {
    leave: 'primary', task: 'success', offer: 'secondary', meeting: 'primary', meeting_reminder: 'primary', course: 'pinkmain',
    certificate: 'warning', job_application: 'secondary', project: 'primary', account: 'success',
    recruiter: 'pinkmain',
    assignment: 'primary',
    sop: 'primary',
    general: 'secondary',
  };
  const mapNotificationToItem = (n: Notification) => ({
    id: n._id,
    class: n.title,
    data: n.message,
    icon: typeToIcon[n.type] || 'bell',
    class2: '',
    color: `!bg-${typeToColor[n.type] || 'secondary'}/10`,
    color2: typeToColor[n.type] || 'secondary',
    _id: n._id,
  });

  const [notificationItems, setNotificationItems] = useState<Array<ReturnType<typeof mapNotificationToItem>>>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    try {
      const [listRes, count] = await Promise.all([
        getNotifications({ limit: 5, unreadOnly: true }),
        getUnreadCount(),
      ]);
      setNotificationItems((listRes.results || []).map(mapNotificationToItem));
      setUnreadCount(count);
    } catch (_) {
      setNotificationItems([]);
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setNotificationItems([]);
      setUnreadCount(0);
      return;
    }
    loadNotifications();
    const stream = openNotificationStream((event) => {
      if (event.type === 'unread_count') setUnreadCount(event.count);
      if (event.type === 'notification') {
        setNotificationItems((prev) => [mapNotificationToItem(event.notification), ...prev].slice(0, 5));
        setUnreadCount((c) => c + 1);
      }
    });
    const onUnreadUpdate = (e: CustomEvent<{ count: number }>) => {
      setUnreadCount(e.detail?.count ?? 0);
    };
    window.addEventListener('dharwin:notifications-unread-count', onUnreadUpdate as EventListener);
    return () => {
      stream.close();
      window.removeEventListener('dharwin:notifications-unread-count', onUnreadUpdate as EventListener);
    };
  }, [user?.id, loadNotifications]);

  const handleNotificationClose = async (index: number, event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    if (event) event.stopPropagation();
    const item = notificationItems[index];
    if (!item?._id) return;
    try {
      await markAsRead(item._id);
      setNotificationItems((prev) => prev.filter((_, i) => i !== index));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (_) {
      setNotificationItems((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const notifications = notificationItems;


  //full screen
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const fullscreenChangeHandler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", fullscreenChangeHandler);

    return () => {
      document.removeEventListener("fullscreenchange", fullscreenChangeHandler);
    };
  }, []);


  useEffect(() => {
    const handleResize = () => {
      const windowObject = window;
      if (windowObject.innerWidth <= 991) {
      } else {
      }
    };
    handleResize(); // Check on component mount
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);


  function menuClose() {
    const theme = store.getState();
    if (window.innerWidth <= 992) {
      ThemeChanger({ ...theme, dataToggled: "close" });
    }
    if (window.innerWidth >= 992) {
      ThemeChanger({ ...theme, dataToggled: local_varaiable.dataToggled ? local_varaiable.dataToggled : '' });
    }
  }

  const toggleSidebar = () => { 
    const theme = store.getState();
    let sidemenuType = theme.dataNavLayout;
    if (window.innerWidth >= 992) {
      if (sidemenuType === "vertical") {
        let verticalStyle = theme.dataVerticalStyle;
        const navStyle = theme.dataNavStyle;
        switch (verticalStyle) {
          // closed
          case "closed":
            ThemeChanger({ ...theme, "dataNavStyle": "" });
            if (theme.dataToggled === "close-menu-close") {
              ThemeChanger({ ...theme, "dataToggled": "" });
            } else {
              ThemeChanger({ ...theme, "dataToggled": "close-menu-close" });
            }
            break;
          // icon-overlay
          case "overlay":
            ThemeChanger({ ...theme, "dataNavStyle": "" });
            if (theme.dataToggled === "icon-overlay-close") {
              ThemeChanger({ ...theme, "dataToggled": "","iconOverlay" :''});
            } else {
              if (window.innerWidth >= 992) {
                ThemeChanger({ ...theme, "dataToggled": "icon-overlay-close","iconOverlay" :'' });
              }
            }
            break;
          // icon-text
          case "icontext":
            ThemeChanger({ ...theme, "dataNavStyle": "" });
            if (theme.dataToggled === "icon-text-close") {
              ThemeChanger({ ...theme, "dataToggled": "" });
            } else {
              ThemeChanger({ ...theme, "dataToggled": "icon-text-close" });
            }
            break;
          // doublemenu
          case "doublemenu":
            ThemeChanger({ ...theme, "dataNavStyle": "" });
            ThemeChanger({ ...theme, "dataNavStyle": "" });
              if (theme.dataToggled === "double-menu-open") {
                ThemeChanger({ ...theme, "dataToggled": "double-menu-close" });
              } else {
                let sidemenu = document.querySelector(".side-menu__item.active");
                if (sidemenu) {
                  ThemeChanger({ ...theme, "dataToggled": "double-menu-open" });
                  if (sidemenu.nextElementSibling) {
                    sidemenu.nextElementSibling.classList.add("double-menu-active");
                  } else {

                    ThemeChanger({ ...theme, "dataToggled": "double-menu-close" });
                  }
                }
              }
            break;
          // detached
          case "detached":
            if (theme.dataToggled === "detached-close") {
              ThemeChanger({ ...theme, "dataToggled": "","iconOverlay" :'' });
            } else {
              ThemeChanger({ ...theme, "dataToggled": "detached-close","iconOverlay" :'' });
            }
            
            break;

          // default
          case "default":
            ThemeChanger({ ...theme, "dataToggled": "" });
        }
        switch (navStyle) {
          case "menu-click":
            if (theme.dataToggled === "menu-click-closed") {
              ThemeChanger({ ...theme, "dataToggled": "" });
            }
            else {
              ThemeChanger({ ...theme, "dataToggled": "menu-click-closed" });
            }
            break;
          // icon-overlay
          case "menu-hover":
            if (theme.dataToggled === "menu-hover-closed") {
              ThemeChanger({ ...theme, "dataToggled": "" });
            } else {
              ThemeChanger({ ...theme, "dataToggled": "menu-hover-closed"});

            }
            break;
          case "icon-click":
            if (theme.dataToggled === "icon-click-closed") {
              ThemeChanger({ ...theme, "dataToggled": "" });
            } else {
              ThemeChanger({ ...theme, "dataToggled": "icon-click-closed" });

            }
            break;
          case "icon-hover":
            if (theme.dataToggled === "icon-hover-closed") {
              ThemeChanger({ ...theme, "dataToggled": "" });
            } else {
              ThemeChanger({ ...theme, "dataToggled": "icon-hover-closed" });

            }
            break;

        }
      }
    }
    else {
      if (theme.dataToggled === "close") {
        ThemeChanger({ ...theme, "dataToggled": "open" });

        setTimeout(() => {
          if (theme.dataToggled == "open") {
            const overlay = document.querySelector("#responsive-overlay");

            if (overlay) {
              overlay.classList.add("active");
              overlay.addEventListener("click", () => {
                const overlay = document.querySelector("#responsive-overlay");

                if (overlay) {
                  overlay.classList.remove("active");
                  menuClose();
                }
              });
            }
          }

          window.addEventListener("resize", () => {
            if (window.screen.width >= 992) {
              const overlay = document.querySelector("#responsive-overlay");

              if (overlay) {
                overlay.classList.remove("active");
              }
            }
          });
        }, 100);
      } else {
        ThemeChanger({ ...theme, "dataToggled": "close" });
      }
    }
    
   

  };
  //Dark Model

  const ToggleDark = () => {

    ThemeChanger({
      ...local_varaiable,
      "class": local_varaiable.class == 'dark' ? 'light' : 'dark',
      "dataHeaderStyles":local_varaiable.class == 'dark' ? 'light' : 'dark',
      "dataMenuStyles": local_varaiable.dataNavLayout == 'horizontal' ? local_varaiable.class == 'dark' ? 'light' : 'dark' : "dark"

    });
    const theme = store.getState();

    if (theme.class != 'dark') {

      ThemeChanger({
        ...theme,
        "bodyBg": '',
        "Light": '',
        "darkBg": '',
        "inputBorder": '',
      });
      localStorage.setItem("dharwinlighttheme", "light");
      localStorage.removeItem("dharwindarktheme");
      localStorage.removeItem("dharwinMenu");
      localStorage.removeItem("dharwinHeader");
    }
    else {
      localStorage.setItem("dharwindarktheme", "dark");
      localStorage.removeItem("dharwinlighttheme");
      localStorage.removeItem("dharwinMenu");
      localStorage.removeItem("dharwinHeader");
    }

  };


  useEffect(() => {
    const navbar = document?.querySelector(".header");
    const navbar1 = document?.querySelector(".app-sidebar");
    const sticky:any = navbar?.clientHeight;
    // const sticky1 = navbar1.clientHeight;

    function stickyFn() {
      if (window.pageYOffset >= sticky) {
        navbar?.classList.add("sticky-pin");
        navbar1?.classList.add("sticky-pin");
      } else {
        navbar?.classList.remove("sticky-pin");
        navbar1?.classList.remove("sticky-pin");
      }
    }

    window.addEventListener("scroll", stickyFn);
    window.addEventListener("DOMContentLoaded", stickyFn);

    // Cleanup event listeners when the component unmounts
    return () => {
      window.removeEventListener("scroll", stickyFn);
      window.removeEventListener("DOMContentLoaded", stickyFn);
    };
  }, []);

  return (
    <Fragment>
      <div className="app-header">
        <nav className="main-header !h-[3.75rem]" aria-label="Global">
          <div className="main-header-container ps-[0.725rem] pe-[1rem] ">

            <div className="header-content-left">
              <div className="header-element header-logo-container">
                <div className="horizontal-logo">
                  <Link href="/dashboards/projects" className="header-logo">
                    <img src={`${process.env.NODE_ENV === "production" ? basePath : ""}/assets/images/logo.png`} alt="logo" className="desktop-logo" />
                    <img src={`${process.env.NODE_ENV === "production" ? basePath : ""}/assets/images/icon.png`} alt="logo" className="toggle-logo" />
                    <img src={`${process.env.NODE_ENV === "production" ? basePath : ""}/assets/images/logo.png`} alt="logo" className="desktop-dark" />
                    <img src={`${process.env.NODE_ENV === "production" ? basePath : ""}/assets/images/logo.png`} alt="logo" className="toggle-dark" />
                    <img src={`${process.env.NODE_ENV === "production" ? basePath : ""}/assets/images/logo.png`} alt="logo" className="desktop-white" />
                    <img src={`${process.env.NODE_ENV === "production" ? basePath : ""}/assets/images/logo.png`} alt="logo" className="toggle-white" />
                  </Link>
                </div>
              </div>
              <div className="header-element md:px-[0.325rem] !items-center" onClick={() => toggleSidebar()}>
                <Link aria-label="Hide Sidebar"
                  className="sidemenu-toggle animated-arrow  hor-toggle horizontal-navtoggle inline-flex items-center" href="#!" scroll={false}><span></span></Link>
              </div>
            </div>
            <div className="header-content-right">
              {impersonation && (
                <div className="header-element py-[0.6rem] md:px-[0.85rem] px-2 flex items-center">
                  <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-300 px-3 py-1 shadow-sm">
                    <span className="inline-flex items-center gap-1 text-[0.75rem] font-medium text-amber-700">
                      <i className="ri-user-switch-line text-[0.9rem]" aria-hidden></i>
                      <span
                        className="truncate max-w-[8rem] md:max-w-[12rem]"
                        title={user?.name ?? user?.email ?? "user"}
                      >
                        Impersonating{" "}
                        <span className="font-semibold">
                          {user?.name ?? user?.email ?? "user"}
                        </span>
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => stopImpersonation()}
                      className="ti-btn ti-btn-xs ti-btn-outline-warning !py-0.5 !px-3 !text-[0.7rem] !rounded-full mt-1"
                    >
                      Exit
                    </button>
                  </div>
                </div>
              )}
              <div className="header-element py-[1rem] md:px-[0.65rem] px-2 header-search">
                <button aria-label="button" type="button" data-hs-overlay="#search-modal"
                  className="inline-flex flex-shrink-0 justify-center items-center gap-2  rounded-full font-medium focus:ring-offset-0 focus:ring-offset-white transition-all text-xs dark:bg-bgdark dark:hover:bg-black/20 dark:text-[#8c9097] dark:text-white/50 dark:hover:text-white dark:focus:ring-white/10 dark:focus:ring-offset-white/10">
                  <i className="bx bx-search-alt-2 header-link-icon"></i>
                </button>
              </div>
             
              <div className="header-element header-theme-mode hidden !items-center sm:block !py-[1rem] md:!px-[0.65rem] px-2" onClick={() => ToggleDark()}>
                <button aria-label="anchor"
                  className="hs-dark-mode-active:hidden flex hs-dark-mode group flex-shrink-0 justify-center items-center gap-2  rounded-full font-medium transition-all text-xs dark:hover:bg-black/20 dark:text-[#8c9097] dark:text-white/50 dark:hover:text-white dark:focus:ring-white/10 dark:focus:ring-offset-white/10"
                   data-hs-theme-click-value="dark">
                  <i className="bx bx-moon header-link-icon"></i>
                </button>
                <button aria-label="anchor"
                  className="hs-dark-mode-active:flex hidden hs-dark-mode group flex-shrink-0 justify-center items-center gap-2  rounded-full font-medium text-defaulttextcolor  transition-all text-xs  dark:hover:bg-black/20 dark:text-[#8c9097] dark:text-white/50 dark:hover:text-white dark:focus:ring-white/10 dark:focus:ring-offset-white/10"
                  data-hs-theme-click-value="light">
                  <i className="bx bx-sun header-link-icon"></i>
                </button>
              </div>
       
              {!guestPublicLayout && (
              <div className="header-element py-[1rem] md:px-[0.65rem] px-2 notifications-dropdown header-notification hs-dropdown ti-dropdown !hidden md:!block [--placement:bottom-right]">
                <button id="dropdown-notification" type="button"
                  className="hs-dropdown-toggle relative ti-dropdown-toggle !p-0 !border-0 flex-shrink-0  !rounded-full !shadow-none align-middle text-xs">
                  <i className="bx bx-bell header-link-icon  text-[1.125rem]"></i>
                  {unreadCount > 0 && (
                  <span className="flex absolute h-5 w-5 -top-[0.25rem] end-0  -me-[0.6rem]">
                    <span
                      className="animate-slow-ping absolute inline-flex -top-[2px] -start-[2px] h-full w-full rounded-full bg-secondary/40 opacity-75"></span>
                    <span
                      className="relative inline-flex justify-center items-center rounded-full  h-[14.7px] w-[14px] bg-secondary text-[0.625rem] text-white"
                      id="notification-icon-badge">{unreadCount}</span>
                  </span>
                  )}
                </button>
                <div
                  className="main-header-dropdown !-mt-3 !p-0 hs-dropdown-menu ti-dropdown-menu bg-white !w-[22rem] border-0 border-defaultborder hidden !m-0 flex max-h-[min(32rem,85vh)] flex-col overflow-hidden dark:bg-bgdark"
                  aria-labelledby="dropdown-notification"
                >

                  <div className="ti-dropdown-header !m-0 !p-4 !bg-transparent flex shrink-0 justify-between items-center">
                    <p className="mb-0 text-[1.0625rem] text-defaulttextcolor font-semibold ">Notifications</p>
                    <span className="text-[0.75em] py-[0.25rem/2] px-[0.45rem] font-[600] rounded-sm bg-secondary/10 text-secondary"
                      id="notifiation-data">{`${unreadCount} Unread`}</span>
                  </div>
                  <div className="dropdown-divider shrink-0"></div>
                  <ul
                    className={
                      notifications.length > 0
                        ? "list-none !m-0 !p-0 end-0 min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain"
                        : "list-none !m-0 !p-0 end-0 shrink-0"
                    }
                    id="header-notification-scroll"
                  >
                  {notifications.map((idx, index) => (
                      <li
                        className="ti-dropdown-item dropdown-item bg-white dark:bg-bgdark"
                        key={idx.id}
                      >
                        <div className="flex items-start">
                          <div className="pe-2">
                            <span
                              className={`inline-flex text-${idx.color2} justify-center items-center !w-[2.5rem] !h-[2.5rem] !leading-[2.5rem] !text-[0.8rem] ${idx.color} !rounded-[50%]`}><i
                                className={`ti ti-${idx.icon} text-[1.125rem]`}></i></span>
                          </div>
                          <div className="grow flex items-center justify-between">
                            <div>
                              <p className="mb-0 text-defaulttextcolor dark:text-white text-[0.8125rem] font-semibold"><Link
                                href="/pages/notifications/">{idx.class} {idx.class2}</Link></p>
                              <span className="text-[#8c9097] dark:text-white/50 font-normal text-[0.75rem] header-notification-text whitespace-pre-line">{idx.data}</span>
                            </div>
                            <div>
                              <Link aria-label="anchor" href="#!" scroll={false} className="min-w-fit text-[#8c9097] dark:text-white/50 me-1 dropdown-item-close1" onClick={(event) => handleNotificationClose(index, event)}><i
                                className="ti ti-x text-[1rem]"></i></Link>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className={`empty-header-item1 mt-2 shrink-0 border-t p-4 ${notifications.length > 0 ? 'block' : 'hidden'}`}>
                    <div className="grid">
                      <Link href="/pages/notifications/" className="ti-btn ti-btn-primary-full !m-0 w-full p-2">View All</Link>
                    </div>
                  </div>
                  <div className={`empty-item1 shrink-0 p-[3rem] ${notifications.length === 0 ? 'block' : 'hidden'}`}>
                    <div className="text-center">
                      <span className="!h-[4rem]  !w-[4rem] avatar !leading-[4rem] !rounded-full !bg-secondary/10 !text-secondary">
                        <i className="ri-notification-off-line text-[2rem]  "></i>
                      </span>
                      <h6 className="font-semibold mt-3 text-defaulttextcolor dark:text-[#8c9097] dark:text-white/50 text-[1rem]">No New Notifications</h6>
                    </div>
                  </div>
                </div>
              </div>
              )}
             
              {!guestPublicLayout && (
              <div className="header-element header-fullscreen py-[1rem] md:px-[0.65rem] px-2">
              <button
                  aria-label="anchor"
                  onClick={() => toggleFullscreen()}
                  className="inline-flex flex-shrink-0 justify-center items-center gap-2  !rounded-full font-medium dark:hover:bg-black/20 dark:text-[#8c9097] dark:text-white/50 dark:hover:text-white dark:focus:ring-white/10 dark:focus:ring-offset-white/10"
                >
                  {isFullscreen ? (
                    <i className="bx bx-exit-fullscreen full-screen-close header-link-icon"></i>
                  ) : (
                    <i className="bx bx-fullscreen full-screen-open header-link-icon"></i>
                  )}
                </button>
              </div>
              )}
              {guestPublicLayout ? (
              <div className="header-element flex items-center gap-2 py-[1rem] md:px-[0.65rem] px-2">
                <Link href={ROUTES.signIn} className="ti-btn ti-btn-primary !py-1.5 !px-3 !text-[0.8125rem]">
                  Sign in
                </Link>
                <Link href={ROUTES.register} className="ti-btn ti-btn-light !py-1.5 !px-3 !text-[0.8125rem]">
                  Register
                </Link>
              </div>
              ) : (
              <div className="header-element md:!px-[0.65rem] px-2 hs-dropdown !items-center ti-dropdown [--placement:bottom-left]">

                <button id="dropdown-profile" type="button"
                  className="hs-dropdown-toggle ti-dropdown-toggle !gap-2 !p-0 flex-shrink-0 sm:me-2 me-0 !rounded-full !shadow-none text-xs align-middle !border-0 !shadow-transparent ">
                  {user?.profilePicture?.url ? (
                    <img className="inline-block rounded-full object-cover" src={user.profilePicture.url} width="32" height="32" alt="" />
                  ) : (
                    <span className="inline-flex justify-center items-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-[0.875rem]">
                      {(user?.name ?? user?.email ?? "?").charAt(0).toUpperCase()}
                    </span>
                  )}
                </button>
                <div className="md:block hidden dropdown-profile">
                  <p className="font-semibold mb-0 leading-none text-[#536485] text-[0.813rem] ">{user?.name ?? user?.email ?? "User"}</p>
                  <span className="opacity-[0.7] font-normal text-[#536485] block text-[0.6875rem] ">{user?.role ?? "User"}</span>
                </div>
                <div
                  className="hs-dropdown-menu ti-dropdown-menu !-mt-3 border-0 w-[11rem] !p-0 border-defaultborder hidden main-header-dropdown  pt-0 overflow-hidden header-profile-dropdown dropdown-menu-end"
                  aria-labelledby="dropdown-profile">

                  <ul className="text-defaulttextcolor font-medium dark:text-[#8c9097] dark:text-white/50 list-none !m-0 !p-0">
                    <li>
                      <Link
                        className="w-full ti-dropdown-item !text-[0.8125rem] !gap-x-0  !p-[0.65rem]"
                        href="/ats/my-profile/"
                      >
                        <i className="ti ti-user-circle text-[1.125rem] me-2 opacity-[0.7] !inline-flex"></i>My Profile
                      </Link>
                    </li>
                    <li>
                      <Link className="w-full ti-dropdown-item !text-[0.8125rem] !gap-x-0  !p-[0.65rem]" href="/communication/email">
                        <i className="ti ti-inbox text-[1.125rem] me-2 opacity-[0.7] !inline-flex"></i>Inbox
                      </Link>
                    </li>
                    <li>
                      <Link className="w-full ti-dropdown-item !text-[0.8125rem] !gap-x-0 !p-[0.65rem]" href={user?.role === "admin" ? "/task/kanban-board" : "/task/my-tasks"}>
                        <i className="ti ti-clipboard-check text-[1.125rem] me-2 opacity-[0.7] !inline-flex"></i>Task Manager
                      </Link>
                    </li>
                    <li>
                      <Link className="w-full ti-dropdown-item !text-[0.8125rem] !gap-x-0 !p-[0.65rem]" href="/settings/">
                        <i className="ti ti-adjustments-horizontal text-[1.125rem] me-2 opacity-[0.7] !inline-flex"></i>Settings
                      </Link>
                    </li>
                    <li className="border-t border-defaultborder dark:border-defaultborder/50 my-1 !py-0 !px-0 list-none pointer-events-none" aria-hidden />
                    <li>
                      <Link className="w-full ti-dropdown-item !text-[0.8125rem] !p-[0.65rem] !gap-x-0 !inline-flex" href="/support-tickets">
                        <i className="ti ti-headset text-[1.125rem] me-2 opacity-[0.7] !inline-flex"></i>Support
                      </Link>
                    </li>
                    <li className="border-t border-defaultborder dark:border-defaultborder/50 my-1 !py-0 !px-0 list-none pointer-events-none" aria-hidden />
                    <li>
                      <button type="button" onClick={() => logout()} className="w-full ti-dropdown-item !text-[0.8125rem] !p-[0.65rem] !gap-x-0 !inline-flex !text-start !border-0 !bg-transparent"><i
                        className="ti ti-logout text-[1.125rem] me-2 opacity-[0.7] !inline-flex"></i>Log Out</button>
                    </li>
                  </ul>
                </div>
              </div>
              )}
            </div>
          </div>
        </nav>
      </div>
      <Modalsearch />
    </Fragment>
  )
}

const mapStateToProps = (state:any) => ({
  local_varaiable: state
});
export default connect(mapStateToProps, { ThemeChanger })(Header);