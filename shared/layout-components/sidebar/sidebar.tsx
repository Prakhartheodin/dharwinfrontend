"use client"
import React, { Fragment, useState, useEffect, useMemo } from "react";
import { connect } from "react-redux";
import { ThemeChanger } from "../../redux/action";
import Link from "next/link";
import { basePath } from "@/next.config";
import store from "@/shared/redux/store";
import SimpleBar from 'simplebar-react';
import Menuloop from "./menuloop";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MenuItems } from "./nav";
import { useAuth } from "@/shared/contexts/auth-context";
import { hasPermission } from "@/shared/lib/permissions";
import {
	PATH_PERMISSION_PREFIX,
	canAccessPath,
	getRequiredPermissionForPath,
	hasPermissionForPath,
} from "@/shared/lib/route-permissions";

function normalizeMenuPath(path: string): string {
	const pathOnly = path.split("?")[0] ?? path;
	return pathOnly.endsWith("/") && pathOnly.length > 1 ? pathOnly.slice(0, -1) : pathOnly;
}

function menuPathMatchesItem(
	item: { path?: string },
	currentPath: string,
	searchParams?: URLSearchParams
): boolean {
	if (!item.path) return false;

	const itemPath = normalizeMenuPath(item.path);
	const normalizedCurrent = normalizeMenuPath(currentPath);
	if (itemPath !== normalizedCurrent) return false;

	const queryIndex = item.path.indexOf("?");
	if (queryIndex === -1) return true;

	// One nav entry covers all tabs on this route.
	if (itemPath === "/training/curriculum/setup") return true;

	const itemParams = new URLSearchParams(item.path.slice(queryIndex + 1));
	for (const [key, value] of itemParams.entries()) {
		if ((searchParams?.get(key) ?? "") !== value) return false;
	}
	return true;
}

type MenuSection = { title: string; items: any[] };

const SIDEBAR_SECTIONS_STORAGE_KEY = "dharwin.sidebar.sectionsCollapsed";

function groupMenuIntoSections(items: any[]): MenuSection[] {
	const sections: MenuSection[] = [];
	let current: MenuSection | null = null;

	for (const item of items) {
		if (item.menutitle) {
			current = { title: String(item.menutitle), items: [] };
			sections.push(current);
			continue;
		}
		if (!current) {
			current = { title: "GENERAL", items: [] };
			sections.push(current);
		}
		current.items.push(item);
	}

	return sections.filter((section) => section.items.length > 0);
}

function menuItemMatchesPath(item: any, currentPath: string, searchParams?: URLSearchParams): boolean {
	if (menuPathMatchesItem(item, currentPath, searchParams)) return true;
	if (!Array.isArray(item.children)) return false;
	return item.children.some(
		(child: any) => !child?.hidden && menuItemMatchesPath(child, currentPath, searchParams)
	);
}

function loadCollapsedSections(): Record<string, boolean> {
	if (typeof window === "undefined") return {};
	try {
		const raw = window.localStorage.getItem(SIDEBAR_SECTIONS_STORAGE_KEY);
		if (!raw) return {};
		const parsed = JSON.parse(raw);
		return typeof parsed === "object" && parsed ? parsed : {};
	} catch {
		return {};
	}
}

/** `false` = expanded; `true` = collapsed. Only one section may be expanded at a time. */
function buildSectionCollapseState(
	sections: MenuSection[],
	expandedTitle: string | null
): Record<string, boolean> {
	const next: Record<string, boolean> = {};
	for (const section of sections) {
		next[section.title] = expandedTitle === null || section.title !== expandedTitle;
	}
	return next;
}

const Sidebar = ({ local_varaiable, ThemeChanger }: any) => {
	const [menuitems, setMenuitems] = useState(MenuItems);
	const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() =>
		loadCollapsedSections()
	);
	const {
		user,
		permissions: userPermissions,
		permissionsLoaded,
		isDesignatedSuperadmin,
	} = useAuth();

	const path = usePathname();
	const searchParams = useSearchParams();

	const isPathAllowed = (menuPath?: string) => {
		// Signed-out guests on public layout: only job seeker links (avoid a full app menu).
		if (!user && menuPath) {
			if (menuPath === "/ats/browse-jobs" || menuPath.startsWith("/ats/browse-jobs/")) return true;
			if (menuPath === "/ats/my-applications") return true;
			return false;
		}

		// Until permissions are loaded, show all items so users with permission see the sidebar.
		// PermissionGuard will block access to pages they can't visit.
		if (!permissionsLoaded) return true;

		if (
			menuPath &&
			(menuPath === "/logs/logs-activity/platform" || menuPath.startsWith("/logs/logs-activity/platform/"))
		) {
			if (!isDesignatedSuperadmin) return false;
			return true;
		}
		if (menuPath === "/logs/logs-activity") {
			if (!permissionsLoaded) return true;
			return (
				isDesignatedSuperadmin ||
				hasPermissionForPath(userPermissions, "logs.activity:")
			);
		}

		if (!menuPath) return true;
		return canAccessPath(userPermissions, menuPath);
	};

	const filteredMenuItems = useMemo(() => {
		// Training Curriculum: label the Categories/Positions nav child by the user's view permissions.
		// Mutates the original child (refs preserved so submenu toggle + active highlight keep working).
		if (permissionsLoaded) {
			const authView = { permissions: userPermissions, isPlatformSuperUser: isDesignatedSuperadmin };
			const catView = hasPermission(authView, "view_training_categories");
			const posView = hasPermission(authView, "view_training_positions");
			const modView = hasPermission(authView, "view_training_modules");
			const tc = (MenuItems as any[]).find((m) => m?.path === "/training/curriculum");
			const setupChild = tc?.children?.find(
				(c: any) => typeof c?.path === "string" && c.path.startsWith("/training/curriculum/setup")
			);
			if (setupChild) {
				if (posView && !catView) {
					setupChild.title = "Positions";
					setupChild.path = "/training/curriculum/setup?tab=positions";
				} else if (catView && !posView) {
					setupChild.title = "Categories";
					setupChild.path = "/training/curriculum/setup?tab=categories";
				} else {
					setupChild.title = "Categories & Positions";
					setupChild.path = "/training/curriculum/setup?tab=categories";
				}
				// Hide the Categories/Positions link entirely when the user can view neither.
				setupChild.hidden = !(catView || posView);
			}
			const modulesChild = tc?.children?.find(
				(c: any) => c?.path === "/training/curriculum/modules"
			);
			if (modulesChild) {
				modulesChild.hidden = !modView;
			}
		}

		// Build menu from MenuItems: section titles only shown if they have at least one visible child.
		const result: any[] = [];

		for (let i = 0; i < MenuItems.length; i++) {
			const item: any = MenuItems[i];

			if (item.menutitle) {
				// Look ahead until the next section title to see
				// whether any link is allowed.
				let hasAllowedChild = false;
				for (let j = i + 1; j < MenuItems.length; j++) {
					const next: any = MenuItems[j];
					if (next.menutitle) break;
					if (isPathAllowed(next.path)) {
						hasAllowedChild = true;
						break;
					}
				}
				if (hasAllowedChild) {
					result.push(item);
				}
			} else if (isPathAllowed(item.path)) {
				result.push(item);
			}
		}

		return result;
	}, [
		permissionsLoaded,
		userPermissions,
		isDesignatedSuperadmin,
		user,
	]);

	const menuSections = useMemo(() => groupMenuIntoSections(filteredMenuItems), [filteredMenuItems]);

	const toggleSection = (title: string) => {
		setCollapsedSections((prev) => {
			const isCurrentlyExpanded = prev[title] === false;
			const next = buildSectionCollapseState(
				menuSections,
				isCurrentlyExpanded ? null : title
			);
			if (typeof window !== "undefined") {
				window.localStorage.setItem(SIDEBAR_SECTIONS_STORAGE_KEY, JSON.stringify(next));
			}
			return next;
		});
	};

	useEffect(() => {
		const currentPath = path.endsWith("/") ? path.slice(0, -1) : path;
		const sp = new URLSearchParams(searchParams?.toString() || "");
		const match = menuSections.find((section) =>
			section.items.some((item) => menuItemMatchesPath(item, currentPath, sp))
		);
		if (!match) return;
		setCollapsedSections((prev) => {
			const next = buildSectionCollapseState(menuSections, match.title);
			const unchanged =
				prev[match.title] === false &&
				menuSections.every((section) => prev[section.title] === next[section.title]);
			if (unchanged) return prev;
			if (typeof window !== "undefined") {
				window.localStorage.setItem(SIDEBAR_SECTIONS_STORAGE_KEY, JSON.stringify(next));
			}
			return next;
		});
	}, [path, menuSections, searchParams]);

	function closeMenu() {
		const closeMenudata = (items: any) => {
			items?.forEach((item: any) => {
				item.active = false;
				closeMenudata(item.children);
			});
		};
		closeMenudata(MenuItems);
		setMenuitems((arr: any) => [...arr]);
	}

	useEffect(() => {

		window.addEventListener('resize', menuResizeFn);
		window.addEventListener('resize', checkHoriMenu);
		const mainContent = document.querySelector(".main-content");
		if (window.innerWidth <= 992) {
			if (mainContent) {
				const theme = store.getState();
				ThemeChanger({ ...theme, dataToggled: "close" });
			}
			else if (document.documentElement.getAttribute('data-nav-layout') == 'horizontal') {
				closeMenu();
			}
		}
		mainContent!.addEventListener('click', menuClose);
		return () => {
			window.removeEventListener("resize", menuResizeFn);
			window.removeEventListener('resize', checkHoriMenu);
		};
	}, []);

	const router = useRouter();

	function Onhover() {

		const theme = store.getState();
		if ((theme.dataToggled == 'icon-overlay-close' || theme.dataToggled == 'detached-close') && theme.iconOverlay != 'open') {
			ThemeChanger({ ...theme, "iconOverlay": "open" });
		}
	}
	function Outhover() {

		const theme = store.getState();
		if ((theme.dataToggled == 'icon-overlay-close' || theme.dataToggled == 'detached-close') && theme.iconOverlay == 'open') {
			ThemeChanger({ ...theme, "iconOverlay": "" });
		}
	}

	function menuClose() {
		;
		const theme = store.getState();
		if (window.innerWidth <= 992) {
			ThemeChanger({ ...theme, dataToggled: "close" });
		}
		const overlayElement = document.querySelector("#responsive-overlay") as HTMLElement | null;
		if (overlayElement) {
			overlayElement.classList.remove("active");
		}
		if (theme.dataNavLayout == "horizontal" || theme.dataNavStyle == "menu-click" || theme.dataNavStyle == "icon-click") {
			closeMenu();
		}
	}

	const WindowPreSize = typeof window !== 'undefined' ? [window.innerWidth] : [];

	function menuResizeFn() {

		if (typeof window === 'undefined') {
			// Handle the case where window is not available (server-side rendering)
			return;
		}

		WindowPreSize.push(window.innerWidth);
		if (WindowPreSize.length > 2) { WindowPreSize.shift() }

		const theme = store.getState();
		const currentWidth = WindowPreSize[WindowPreSize.length - 1];
		const prevWidth = WindowPreSize[WindowPreSize.length - 2];


		if (WindowPreSize.length > 1) {
			if (currentWidth < 992 && prevWidth >= 992) {
				// less than 992;
				ThemeChanger({ ...theme, dataToggled: "close" });
			}

			if (currentWidth >= 992 && prevWidth < 992) {
				// greater than 992
				ThemeChanger({ ...theme, dataToggled: theme.dataVerticalStyle === "doublemenu" ? "double-menu-open" : "" });

			}
		}
	}

	function switcherArrowFn(): void {

		// Used to remove is-expanded class and remove class on clicking arrow buttons
		function slideClick(): void {
			const slide = document.querySelectorAll<HTMLElement>(".slide");
			const slideMenu = document.querySelectorAll<HTMLElement>(".slide-menu");

			slide.forEach((element) => {
				if (element.classList.contains("is-expanded")) {
					element.classList.remove("is-expanded");
				}
			});

			slideMenu.forEach((element) => {
				if (element.classList.contains("open")) {
					element.classList.remove("open");
					element.style.display = "none";
				}
			});
		}

		slideClick();
	}

	const checkHoriMenu = () => {
		const menuNav = document.querySelector(".main-menu") as HTMLElement;
		const mainContainer1 = document.querySelector(".main-sidebar") as HTMLElement;

		const marginLeftValue = Math.ceil(
			Number(window.getComputedStyle(menuNav).marginLeft.split("px")[0])
		);
		const marginRightValue = Math.ceil(
			Number(window.getComputedStyle(menuNav).marginRight.split("px")[0])
		);
		const check = menuNav.scrollWidth - mainContainer1.offsetWidth;

		// Show/Hide the arrows
		if (menuNav.scrollWidth > mainContainer1.offsetWidth) {
		} else {
			menuNav.style.marginLeft = "0px";
			menuNav.style.marginRight = "0px";
			menuNav.style.marginInlineStart = "0px";
		}

		if (!(document.querySelector("html")?.getAttribute("dir") === "rtl")) {
			// LTR check the width and adjust the menu in screen
			if (menuNav.scrollWidth > mainContainer1.offsetWidth) {
				if (Math.abs(check) < Math.abs(marginLeftValue)) {
					menuNav.style.marginLeft = -check + "px";
				}
			}

		} else {
			// RTL check the width and adjust the menu in screen
			if (menuNav.scrollWidth > mainContainer1.offsetWidth) {
				if (Math.abs(check) < Math.abs(marginRightValue)) {
					menuNav.style.marginRight = -check + "px";
				}
			}

		}

	};

	function slideRight(): void {
		const menuNav = document.querySelector<HTMLElement>(".main-menu");
		const mainContainer1 = document.querySelector<HTMLElement>(".main-sidebar");

		if (menuNav && mainContainer1) {
			const marginLeftValue = Math.ceil(
				Number(window.getComputedStyle(menuNav).marginInlineStart.split("px")[0])
			);
			const marginRightValue = Math.ceil(
				Number(window.getComputedStyle(menuNav).marginInlineEnd.split("px")[0])
			);
			const check = menuNav.scrollWidth - mainContainer1.offsetWidth;
			let mainContainer1Width = mainContainer1.offsetWidth;

			if (menuNav.scrollWidth > mainContainer1.offsetWidth) {
				if (!(local_varaiable.dataVerticalStyle.dir === "rtl")) {
					if (Math.abs(check) > Math.abs(marginLeftValue)) {
						menuNav.style.marginInlineEnd = "0";

						if (!(Math.abs(check) > Math.abs(marginLeftValue) + mainContainer1Width)) {
							mainContainer1Width = Math.abs(check) - Math.abs(marginLeftValue);
							const slideRightButton = document.querySelector<HTMLElement>("#slide-right");
							if (slideRightButton) {
								slideRightButton.classList.add("hidden");
							}
						}

						menuNav.style.marginInlineStart =
							(Number(menuNav.style.marginInlineStart.split("px")[0]) -
								Math.abs(mainContainer1Width)) +
							"px";

						const slideRightButton = document.querySelector<HTMLElement>("#slide-right");
						if (slideRightButton) {
							slideRightButton.classList.remove("hidden");
						}
					}
				} else {
					if (Math.abs(check) > Math.abs(marginRightValue)) {
						menuNav.style.marginInlineEnd = "0";

						if (!(Math.abs(check) > Math.abs(marginRightValue) + mainContainer1Width)) {
							mainContainer1Width = Math.abs(check) - Math.abs(marginRightValue);
							const slideRightButton = document.querySelector<HTMLElement>("#slide-right");
							if (slideRightButton) {
								slideRightButton.classList.add("hidden");
							}
						}

						menuNav.style.marginInlineStart =
							(Number(menuNav.style.marginInlineStart.split("px")[0]) -
								Math.abs(mainContainer1Width)) +
							"px";

						const slideLeftButton = document.querySelector<HTMLElement>("#slide-left");
						if (slideLeftButton) {
							slideLeftButton.classList.remove("hidden");
						}
					}
				}
			}

			const element = document.querySelector<HTMLElement>(".main-menu > .slide.open");
			const element1 = document.querySelector<HTMLElement>(".main-menu > .slide.open > ul");
			if (element) {
				element.classList.remove("active");
			}
			if (element1) {
				element1.style.display = "none";
			}
		}

		switcherArrowFn();
		checkHoriMenu();
	}

	function slideLeft(): void {
		const menuNav = document.querySelector<HTMLElement>(".main-menu");
		const mainContainer1 = document.querySelector<HTMLElement>(".main-sidebar");

		if (menuNav && mainContainer1) {
			const marginLeftValue = Math.ceil(
				Number(window.getComputedStyle(menuNav).marginInlineStart.split("px")[0])
			);
			const marginRightValue = Math.ceil(
				Number(window.getComputedStyle(menuNav).marginInlineEnd.split("px")[0])
			);
			const check = menuNav.scrollWidth - mainContainer1.offsetWidth;
			let mainContainer1Width = mainContainer1.offsetWidth;

			if (menuNav.scrollWidth > mainContainer1.offsetWidth) {
				if (!(local_varaiable.dataVerticalStyle.dir === "rtl")) {
					if (Math.abs(check) <= Math.abs(marginLeftValue)) {
						menuNav.style.marginInlineStart = "0px";
					}
				} else {
					if (Math.abs(check) > Math.abs(marginRightValue)) {
						menuNav.style.marginInlineStart = "0";

						if (!(Math.abs(check) > Math.abs(marginRightValue) + mainContainer1Width)) {
							mainContainer1Width = Math.abs(check) - Math.abs(marginRightValue);
							const slideRightButton = document.querySelector<HTMLElement>("#slide-right");
							if (slideRightButton) {
								slideRightButton.classList.add("hidden");
							}
						}

						menuNav.style.marginInlineStart =
							(Number(menuNav.style.marginInlineStart.split("px")[0]) -
								Math.abs(mainContainer1Width)) +
							"px";

						const slideLeftButton = document.querySelector<HTMLElement>("#slide-left");
						if (slideLeftButton) {
							slideLeftButton.classList.remove("hidden");
						}
					}
				}
			}

			const element = document.querySelector<HTMLElement>(".main-menu > .slide.open");
			const element1 = document.querySelector<HTMLElement>(".main-menu > .slide.open > ul");
			if (element) {
				element.classList.remove("active");
			}
			if (element1) {
				element1.style.display = "none";
			}
		}

		switcherArrowFn();
	}

	const Topup = () => {
		if (typeof window !== 'undefined') {
			if (window.scrollY > 30 && document.querySelector(".app-sidebar")) {
				const Scolls = document.querySelectorAll(".app-sidebar");
				Scolls.forEach((e) => {
					e.classList.add("sticky-pin");
				});
			} else {
				const Scolls = document.querySelectorAll(".app-sidebar");
				Scolls.forEach((e) => {
					e.classList.remove("sticky-pin");
				});
			}
		}
	};
	if (typeof window !== 'undefined') {
		window.addEventListener("scroll", Topup);
	}


	const level = 0;
	let hasParent = false;
	let hasParentLevel = 0;

	function setSubmenu(event: any, targetObject: any, MenuItems = menuitems) {
		const theme = store.getState();
		if ((window.screen.availWidth <= 992 || theme.dataNavStyle != "icon-hover") && (window.screen.availWidth <= 992 || theme.dataNavStyle != "menu-hover")) {
		if (!event?.ctrlKey) {
			for (const item of MenuItems) {
				if (item === targetObject) {
					item.active = true;
					item.selected = true;
					setMenuAncestorsActive(item);
				} else if (!item.active && !item.selected) {
					item.active = false; // Set active to false for items not matching the target
					item.selected = false; // Set active to false for items not matching the target
				} else {
					removeActiveOtherMenus(item);
				}
				if (item.children && item.children.length > 0) {
					setSubmenu(event, targetObject, item.children);
				}
			}
		}
	}
		setMenuitems((arr: any) => [...arr]);
	}

	function getParentObject(items: any, childObject: any): any {
		if (!Array.isArray(items)) return null;
		for (const item of items) {
			if (!item || typeof item !== 'object') continue;
			if (item === childObject) continue;
			const children = item.children;
			if (Array.isArray(children)) {
				if (children.includes(childObject)) {
					return item;
				}
				const found = getParentObject(children, childObject);
				if (found !== null) return found;
			}
		}
		return null;
	}

	function setMenuAncestorsActive(targetObject: any) {
		const parent = getParentObject(menuitems, targetObject);
		const theme = store.getState();
		if (parent) {
			if (hasParentLevel > 2) {
				hasParent = true;
			}
			parent.active = true;
			parent.selected = true;
			hasParentLevel += 1;
			setMenuAncestorsActive(parent);
		}
		else if (!hasParent) {
			if (theme.dataVerticalStyle == 'doublemenu') {
				ThemeChanger({ ...theme, dataToggled: "double-menu-close" });
			}
		}
	}

	function removeActiveOtherMenus(item: any) {
		if (item) {
			if (Array.isArray(item)) {
				for (const val of item) {
					val.active = false;
					val.selected = false;
				}
			}
			item.active = false;
			item.selected = false;

			if (item.children && item.children.length > 0) {
				removeActiveOtherMenus(item.children);
			}
		}
		else {

		}
	}

	function setMenuUsingUrl(currentPath: any, sp: URLSearchParams) {
		hasParent = false;
		hasParentLevel = 1;
		// Check current url and trigger the setSidemenu method to active the menu.
		const setSubmenuRecursively = (items: any) => {

			items?.forEach((item: any) => {
				if (item.path == '') { }
				else if (menuPathMatchesItem(item, currentPath, sp)) {
					setSubmenu(null, item);
				}
				setSubmenuRecursively(item.children);
			});
		};
		setSubmenuRecursively(MenuItems);
	}
	const [previousNavKey, setPreviousNavKey] = useState("");

	useEffect(() => {

		// Select the target element
		const targetElement = document.documentElement;

		// Create a MutationObserver instance
		const observer = new MutationObserver(handleAttributeChange);

		// Configure the observer to watch for attribute changes
		const config = { attributes: true };

		// Start observing the target element
		observer.observe(targetElement, config);
		let currentPath = path.endsWith("/") ? path.slice(0, -1) : path;
		const sp = new URLSearchParams(searchParams?.toString() || "");
		const navKey = `${currentPath}?${sp.toString()}`;
		if (navKey !== previousNavKey) {
			setMenuUsingUrl(currentPath, sp);
			setPreviousNavKey(navKey);
		}
	}, [path, searchParams]);

	function toggleSidemenu(event: any, targetObject: any, MenuItems = menuitems) {
		const theme = store.getState();
		let element = event.target;
		if ((theme.dataNavStyle != "icon-hover" && theme.dataNavStyle != "menu-hover") || (window.innerWidth < 992) || (theme.dataNavLayout != "horizontal") && (theme.dataToggled != "icon-hover-closed" && theme.dataToggled != "menu-hover-closed")) {
			// {
			for (const item of MenuItems) {
				if (item === targetObject) {
					if (theme.dataVerticalStyle == 'doublemenu' && item.active) { return; }
					item.active = !item.active;

					if (item.active) {
						closeOtherMenus(MenuItems, item);
					} else {
						if (theme.dataVerticalStyle == 'doublemenu') {
							ThemeChanger({ ...theme, dataToggled: "double-menu-close" });
						}
					}
					setAncestorsActive(MenuItems, item);

				}
				else if (!item.active) {
					if (theme.dataVerticalStyle != 'doublemenu') {
						item.active = false; // Set active to false for items not matching the target
					}
				}
				if (item.children && item.children.length > 0) {
					toggleSidemenu(event, targetObject, item.children);
				}
			}
			if (targetObject?.children && targetObject.active) {
				if (theme.dataVerticalStyle == 'doublemenu' && theme.dataToggled != 'double-menu-open') {
					ThemeChanger({ ...theme, dataToggled: "double-menu-open" });
				}
			}
			if (element && theme.dataNavLayout == 'horizontal' && (theme.dataNavStyle == 'menu-click' || theme.dataNavStyle == 'icon-click')) {
				const listItem = element.closest("li");
				if (listItem) {
					// Find the first sibling <ul> element
					const siblingUL = listItem.querySelector("ul");
					let outterUlWidth = 0;
					let listItemUL = listItem.closest('ul:not(.main-menu)');
					while (listItemUL) {
						listItemUL = listItemUL.parentElement.closest('ul:not(.main-menu)');
						if (listItemUL) {
							outterUlWidth += listItemUL.clientWidth;
						}
					}
					if (siblingUL) {
						// You've found the sibling <ul> element
						let siblingULRect = listItem.getBoundingClientRect();
						if (theme.dir == 'rtl') {
							if ((siblingULRect.left - siblingULRect.width - outterUlWidth + 150 < 0 && outterUlWidth < window.innerWidth) && (outterUlWidth + siblingULRect.width + siblingULRect.width < window.innerWidth)) {
								targetObject.dirchange = true;
							} else {
								targetObject.dirchange = false;
							}
						} else {
							if ((outterUlWidth + siblingULRect.right + siblingULRect.width + 50 > window.innerWidth && siblingULRect.right >= 0) && (outterUlWidth + siblingULRect.width + siblingULRect.width < window.innerWidth)) {
								targetObject.dirchange = true;
							} else {
								targetObject.dirchange = false;
							}
						}
					}
				}
			}
		}
		setMenuitems((arr: any) => [...arr]);
	}

	function setAncestorsActive(MenuItems: any, targetObject: any) {
		const theme = store.getState();
		const parent = findParent(MenuItems, targetObject);
		if (parent) {
			parent.active = true;
			if (parent.active) {
				ThemeChanger({ ...theme, dataToggled: "double-menu-open" });
			}

			setAncestorsActive(MenuItems, parent);
		} else {
			if (theme.dataVerticalStyle == "doublemenu") {
				ThemeChanger({ ...theme, dataToggled: "double-menu-close" });
			}

		}
	}
	function closeOtherMenus(MenuItems: any, targetObject: any) {
		for (const item of MenuItems) {
			if (item !== targetObject) {
				item.active = false;
				if (item.children && item.children.length > 0) {
					closeOtherMenus(item.children, targetObject);
				}
			}
		}
	}
	function findParent(MenuItems: any, targetObject: any) {
		for (const item of MenuItems) {
			if (item.children && item.children.includes(targetObject)) {
				return item;
			}
			if (item.children && item.children.length > 0) {
				const parent: any = findParent(MenuItems = item.children, targetObject);
				if (parent) {
					return parent;
				}
			}
		}
		return null;
	}

	const Sideclick = () => {
		if (window.innerWidth > 992) {
			const	theme = store.getState()  
			if(theme.iconOverlay != "open"){
				ThemeChanger({ ...theme, iconOverlay: "open" });
			}
		}
	};

	function HoverToggleInnerMenuFn(event: any, item: any) {
		const theme = store.getState();
		let element = event.target;
		if (element && theme.dataNavLayout == "horizontal" && (theme.dataNavStyle == "menu-hover" || theme.dataNavStyle == "icon-hover")) {
			const listItem = element.closest("li");
			if (listItem) {
				// Find the first sibling <ul> element
				const siblingUL = listItem.querySelector("ul");
				let outterUlWidth = 0;
				let listItemUL = listItem.closest("ul:not(.main-menu)");
				while (listItemUL) {
					listItemUL = listItemUL.parentElement.closest("ul:not(.main-menu)");
					if (listItemUL) {
						outterUlWidth += listItemUL.clientWidth;
					}
				}
				if (siblingUL) {
					// You've found the sibling <ul> element
					let siblingULRect = listItem.getBoundingClientRect();
					if (theme.dir == "rtl") {
						if ((siblingULRect.left - siblingULRect.width - outterUlWidth + 150 < 0 && outterUlWidth < window.innerWidth) && (outterUlWidth + siblingULRect.width + siblingULRect.width < window.innerWidth)) {
							item.dirchange = true;
						} else {
							item.dirchange = false;
						}
					} else {
						if ((outterUlWidth + siblingULRect.right + siblingULRect.width + 50 > window.innerWidth && siblingULRect.right >= 0) && (outterUlWidth + siblingULRect.width + siblingULRect.width < window.innerWidth)) {
							item.dirchange = true;
						} else {
							item.dirchange = false;
						}
					}
				}
			}
		}
	}
	function handleAttributeChange(mutationsList: any) {
		for (const mutation of mutationsList) {
			if (mutation.type === 'attributes' && mutation.attributeName === 'data-nav-layout') {
				const newValue = mutation.target.getAttribute('data-nav-layout');
				if (newValue == 'vertical') {
					let currentPath = path.endsWith('/') ? path.slice(0, -1) : path;
					currentPath = !currentPath ? '/dashboard' : currentPath;
					const sp = new URLSearchParams(
						typeof window !== "undefined" ? window.location.search : searchParams?.toString() || ""
					);
					setMenuUsingUrl(currentPath, sp);
				} else {
					closeMenu();
				}
			}
		}
	}
	const handleClick = (event:any) => {
		// Your logic here
		event.preventDefault(); // Prevents the default anchor behavior (navigation)
		// ... other logic you want to perform on click
	};

	// Section accordion only applies to the expanded vertical menu. In horizontal / doublemenu /
	// icon-collapsed rails the section headers are CSS-hidden and items must all stay visible,
	// so render items flat (original DOM) and ignore per-section collapse in those modes.
	const toggledState = local_varaiable?.dataToggled || "";
	const forceExpandAll =
		local_varaiable?.dataNavLayout === "horizontal" ||
		local_varaiable?.dataVerticalStyle === "doublemenu" ||
		toggledState === "icon-overlay-close" ||
		toggledState === "icon-text-close" ||
		toggledState === "close-menu-close";

	return (

		<Fragment>
			 
			<div id="responsive-overlay"
				onClick={() => { menuClose(); }}></div>
			<aside className="app-sidebar" id="sidebar" onMouseOver={() => Onhover()}
				onMouseLeave={() => Outhover()}>
				<div className="main-sidebar-header">
					<Link href="/dashboard" className="header-logo">
						<img src={`${process.env.NODE_ENV === "production" ? basePath : ""}/assets/images/logo.png`} alt="logo" className="main-logo desktop-logo" />
						<img src={`${process.env.NODE_ENV === "production" ? basePath : ""}/assets/images/icon.png`} alt="logo" className="main-logo toggle-logo" />
						<img src={`${process.env.NODE_ENV === "production" ? basePath : ""}/assets/images/logo-dark.png`} alt="logo" className="main-logo desktop-dark" />
						<img src={`${process.env.NODE_ENV === "production" ? basePath : ""}/assets/images/icon.png`} alt="logo" className="main-logo toggle-dark" />
						<img src={`${process.env.NODE_ENV === "production" ? basePath : ""}/assets/images/logo-dark.png`} alt="logo" className="main-logo desktop-white" />
						<img src={`${process.env.NODE_ENV === "production" ? basePath : ""}/assets/images/icon.png`} alt="logo" className="main-logo toggle-white" />

					</Link>
				</div>

				<SimpleBar className="main-sidebar " id="sidebar-scroll">
						<nav className="main-menu-container nav nav-pills flex-column sub-open">
							<div className="slide-left" id="slide-left" onClick={() => { slideLeft(); }}><svg xmlns="http://www.w3.org/2000/svg" fill="#7b8191" width="24"
								height="24" viewBox="0 0 24 24">
								<path d="M13.293 6.293 7.586 12l5.707 5.707 1.414-1.414L10.414 12l4.293-4.293z"></path>
							</svg></div>

							<ul className="main-menu" onClick={() => Sideclick()}>
								{menuSections.map((section) => {
									const isCollapsed = !forceExpandAll && collapsedSections[section.title] !== false;
									const currentNavPath = path?.endsWith("/") ? path.slice(0, -1) : path;
									const currentNavSearch = new URLSearchParams(searchParams?.toString() || "");
									const sectionHasActive = section.items.some((item) =>
										menuItemMatchesPath(item, currentNavPath, currentNavSearch)
									);
									const itemsJsx = section.items.map((levelone: any, index: any) => (
													<Fragment key={`${section.title}-${index}`}>
														<li
															className={`${levelone.type === "link" ? "slide" : ""}
                                               ${levelone.type === "sub" ? "slide has-sub" : ""} ${levelone?.active ? "open" : ""} ${levelone?.selected ? "active" : ""}`}
														>
															{levelone.type === "link" ? (
																<Link
																	href={levelone.path}
																	className={`side-menu__item ${levelone.selected ? "active" : ""}`}
																>
																	<span
																		className={`hs-tooltip inline-block [--placement:right] leading-none ${local_varaiable?.dataVerticalStyle == "doublemenu" ? "" : "hidden"}`}
																	>
																		<button
																			type="button"
																			className="hs-tooltip-toggle  inline-flex justify-center items-center
															"
																		>
																			{levelone.icon}
																			<span
																				className="hs-tooltip-content hs-tooltip-shown:opacity-100 hs-tooltip-shown:visible opacity-0 transition-opacity inline-block absolute invisible z-10 py-1 px-2 bg-black text-xs font-medium text-white rounded shadow-sm dark:bg-neutral-700"
																				role="tooltip"
																			>
																				{levelone.title}
																			</span>
																		</button>
																	</span>

																	{local_varaiable.dataVerticalStyle != "doublemenu" ? levelone.icon : ""}

																	<span className="side-menu__label">
																		{levelone.title}{" "}
																		{levelone.badgetxt ? (
																			<span className={levelone.class}> {levelone.badgetxt}</span>
																		) : (
																			""
																		)}
																	</span>
																</Link>
															) : (
																""
															)}
															{levelone.type === "empty" ? (
																<Link href="#!" className="side-menu__item" onClick={handleClick}>
																	{levelone.icon}
																	<span className="">
																		{" "}
																		{levelone.title}{" "}
																		{levelone.badgetxt ? (
																			<span className={levelone.class}>{levelone.badgetxt} </span>
																		) : (
																			""
																		)}
																	</span>
																</Link>
															) : (
																""
															)}
															{levelone.type === "sub" ? (
																<Menuloop
																	MenuItems={levelone}
																	level={level + 1}
																	toggleSidemenu={toggleSidemenu}
																	HoverToggleInnerMenuFn={HoverToggleInnerMenuFn}
																/>
															) : (
																""
															)}
														</li>
													</Fragment>
												));

									return (
										<Fragment key={section.title}>
											<li className={`slide__category nav-module-section transition-opacity hover:!opacity-100${sectionHasActive ? " !opacity-100" : ""}`}>
												<button
													type="button"
													className={`category-name category-name--toggle flex w-full items-center justify-between cursor-pointer bg-transparent border-0 p-0 text-inherit uppercase rounded-md transition-colors duration-150 hover:bg-white/[0.06]${isCollapsed ? "" : " is-open"}`}
													onClick={() => toggleSection(section.title)}
													aria-expanded={!isCollapsed}
												>
													<span className="flex items-center gap-2">
														{section.title}
														{sectionHasActive && (
															<span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
														)}
													</span>
													<i className={`fe fe-chevron-right side-menu__angle text-[0.75rem] opacity-70 transition-transform duration-200 ms-2${isCollapsed ? "" : " rotate-90"}`} aria-hidden="true" />
												</button>
											</li>
											{forceExpandAll ? (
												itemsJsx
											) : (
												<li
													className={`section-group grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${isCollapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"}`}
													aria-hidden={isCollapsed}
												>
													<ul className="m-0 min-h-0 list-none overflow-hidden p-0">
														{itemsJsx}
													</ul>
												</li>
											)}
										</Fragment>
									);
								})}
							</ul>

							<div className="slide-right" onClick={() => { slideRight(); }} id="slide-right">
								<svg xmlns="http://www.w3.org/2000/svg" fill="#7b8191" width="24" height="24" viewBox="0 0 24 24"><path d="M10.707 17.707 16.414 12l-5.707-5.707-1.414 1.414L13.586 12l-4.293 4.293z"></path></svg>
							</div>
						</nav>
				</SimpleBar>
			</aside>
		</Fragment>
	);
};

const mapStateToProps = (state: any) => ({
	local_varaiable: state
});

export default connect(mapStateToProps, { ThemeChanger })(Sidebar);
