(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/shared/layout-components/switcher/switcher.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$redux$2f$es$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/react-redux/es/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$redux$2f$es$2f$exports$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-redux/es/exports.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$redux$2f$action$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/shared/redux/action.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/shared/data/switcherdata/switcherdata.tsx [app-client] (ecmascript)");
"use client";
;
;
;
;
;
const Switcher = ({ local_varaiable, ThemeChanger })=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            id: "hs-overlay-switcher",
            className: "hs-overlay hidden ti-offcanvas ti-offcanvas-right",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "ti-offcanvas-header z-10 relative",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h5", {
                            className: "ti-offcanvas-title !text-[1.25rem]",
                            children: "Switcher"
                        }, void 0, false, {
                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                            lineNumber: 15,
                            columnNumber: 13
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            type: "button",
                            className: "ti-btn flex-shrink-0 p-0  transition-none text-defaulttextcolor dark:text-defaulttextcolor/70 hover:text-gray-700 focus:ring-gray-400 focus:ring-offset-white  dark:hover:text-white/80 dark:focus:ring-white/10 dark:focus:ring-offset-white/10",
                            "data-hs-overlay": "#hs-overlay-switcher",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "sr-only",
                                    children: "Close modal"
                                }, void 0, false, {
                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                    lineNumber: 21,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                    className: "ri-close-circle-line leading-none text-lg"
                                }, void 0, false, {
                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                    lineNumber: 22,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                            lineNumber: 18,
                            columnNumber: 13
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                    lineNumber: 14,
                    columnNumber: 11
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "ti-offcanvas-body !p-0 !border-b dark:border-white/10 z-10 relative !h-auto",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex rtl:space-x-reverse",
                        "aria-label": "Tabs",
                        role: "tablist",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                className: "hs-tab-active:bg-success/20 w-full !py-2 !px-4 hs-tab-active:border-b-transparent text-defaultsize border-0 hs-tab-active:text-success dark:hs-tab-active:bg-success/20 dark:hs-tab-active:border-b-white/10 dark:hs-tab-active:text-success -mb-px bg-white font-semibold text-center  text-defaulttextcolor dark:text-defaulttextcolor/70 rounded-none hover:text-gray-700 dark:bg-bodybg dark:border-white/10  active",
                                id: "switcher-item-1",
                                "data-hs-tab": "#switcher-1",
                                "aria-controls": "switcher-1",
                                role: "tab",
                                children: "Theme Style"
                            }, void 0, false, {
                                fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                lineNumber: 27,
                                columnNumber: 15
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                className: "hs-tab-active:bg-success/20 w-full !py-2 !px-4 hs-tab-active:border-b-transparent text-defaultsize border-0 hs-tab-active:text-success dark:hs-tab-active:bg-success/20 dark:hs-tab-active:border-b-white/10 dark:hs-tab-active:text-success -mb-px  bg-white font-semibold text-center  text-defaulttextcolor dark:text-defaulttextcolor/70 rounded-none hover:text-gray-700 dark:bg-bodybg dark:border-white/10  dark:hover:text-gray-300",
                                id: "switcher-item-2",
                                "data-hs-tab": "#switcher-2",
                                "aria-controls": "switcher-2",
                                role: "tab",
                                children: "Theme Colors"
                            }, void 0, false, {
                                fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                lineNumber: 32,
                                columnNumber: 15
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                        lineNumber: 26,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                    lineNumber: 25,
                    columnNumber: 11
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "ti-offcanvas-body !px-0",
                    id: "switcher-body",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            id: "switcher-1",
                            role: "tabpanel",
                            "aria-labelledby": "switcher-item-1",
                            className: "",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "switcher-style-head",
                                            children: "Theme Color Mode:"
                                        }, void 0, false, {
                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                            lineNumber: 42,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "grid grid-cols-3 switcher-style",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-center",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "radio",
                                                            name: "theme-style",
                                                            className: "ti-form-radio",
                                                            id: "switcher-light-theme",
                                                            checked: local_varaiable.class != "dark",
                                                            onChange: (_e)=>{},
                                                            onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Light"](ThemeChanger)
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 45,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            htmlFor: "switcher-light-theme",
                                                            className: "text-defaultsize text-defaulttextcolor dark:text-defaulttextcolor/70 ms-2  font-semibold",
                                                            children: "Light"
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 47,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 44,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-center",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "radio",
                                                            name: "theme-style",
                                                            className: "ti-form-radio",
                                                            id: "switcher-dark-theme",
                                                            checked: local_varaiable.class == "dark",
                                                            onChange: (_e)=>{},
                                                            onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Dark"](ThemeChanger)
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 51,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            htmlFor: "switcher-dark-theme",
                                                            className: "text-defaultsize text-defaulttextcolor dark:text-defaulttextcolor/70 ms-2  font-semibold",
                                                            children: "Dark"
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 53,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 50,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                            lineNumber: 43,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                    lineNumber: 41,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "switcher-style-head",
                                            children: "Directions:"
                                        }, void 0, false, {
                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                            lineNumber: 59,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "grid grid-cols-3  switcher-style",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-center",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "radio",
                                                            name: "direction",
                                                            className: "ti-form-radio",
                                                            id: "switcher-ltr",
                                                            checked: local_varaiable.dir == "ltr",
                                                            onChange: (_e)=>{},
                                                            onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Ltr"](ThemeChanger)
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 62,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            htmlFor: "switcher-ltr",
                                                            className: "text-defaultsize text-defaulttextcolor dark:text-defaulttextcolor/70 ms-2  font-semibold",
                                                            children: "LTR"
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 64,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 61,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-center",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "radio",
                                                            name: "direction",
                                                            className: "ti-form-radio",
                                                            id: "switcher-rtl",
                                                            checked: local_varaiable.dir == "rtl",
                                                            onChange: (_e)=>{},
                                                            onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Rtl"](ThemeChanger)
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 67,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            htmlFor: "switcher-rtl",
                                                            className: "text-defaultsize text-defaulttextcolor dark:text-defaulttextcolor/70 ms-2  font-semibold",
                                                            children: "RTL"
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 69,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 66,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                            lineNumber: 60,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                    lineNumber: 58,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "switcher-style-head",
                                            children: "Navigation Styles:"
                                        }, void 0, false, {
                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                            lineNumber: 74,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "grid grid-cols-3  switcher-style",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-center",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "radio",
                                                            name: "navigation-style",
                                                            className: "ti-form-radio",
                                                            id: "switcher-vertical",
                                                            checked: local_varaiable.dataNavLayout == "vertical",
                                                            onChange: (_e)=>{},
                                                            onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Vertical"](ThemeChanger)
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 77,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            htmlFor: "switcher-vertical",
                                                            className: "text-defaultsize text-defaulttextcolor dark:text-defaulttextcolor/70 ms-2  font-semibold",
                                                            children: "Vertical"
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 79,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 76,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-center",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "radio",
                                                            name: "navigation-style",
                                                            className: "ti-form-radio",
                                                            id: "switcher-horizontal",
                                                            checked: local_varaiable.dataNavLayout == "horizontal",
                                                            onChange: (_e)=>{},
                                                            onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["HorizontalClick"](ThemeChanger)
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 83,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            htmlFor: "switcher-horizontal",
                                                            className: "text-defaultsize text-defaulttextcolor dark:text-defaulttextcolor/70 ms-2  font-semibold",
                                                            children: "Horizontal"
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 85,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 82,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                            lineNumber: 75,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                    lineNumber: 73,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "switcher-style-head",
                                            children: "Navigation Menu Style:"
                                        }, void 0, false, {
                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                            lineNumber: 91,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "grid grid-cols-2 gap-2 switcher-style",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "radio",
                                                            name: "navigation-data-menu-styles",
                                                            className: "ti-form-radio",
                                                            id: "switcher-menu-click",
                                                            checked: local_varaiable.dataNavStyle == "menu-click",
                                                            onChange: (_e)=>{},
                                                            onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Menuclick"](ThemeChanger)
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 94,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            htmlFor: "switcher-menu-click",
                                                            className: "text-defaultsize text-defaulttextcolor dark:text-defaulttextcolor/70 ms-2  font-semibold",
                                                            children: "Menu Click"
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 97,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 93,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "radio",
                                                            name: "navigation-data-menu-styles",
                                                            className: "ti-form-radio",
                                                            id: "switcher-menu-hover",
                                                            checked: local_varaiable.dataNavStyle == "menu-hover",
                                                            onChange: (_e)=>{},
                                                            onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MenuHover"](ThemeChanger)
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 101,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            htmlFor: "switcher-menu-hover",
                                                            className: "text-defaultsize text-defaulttextcolor dark:text-defaulttextcolor/70 ms-2  font-semibold",
                                                            children: "Menu Hover"
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 103,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 100,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "radio",
                                                            name: "navigation-data-menu-styles",
                                                            className: "ti-form-radio",
                                                            id: "switcher-icon-click",
                                                            checked: local_varaiable.dataNavStyle == "icon-click",
                                                            onChange: (_e)=>{},
                                                            onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["IconClick"](ThemeChanger)
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 107,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            htmlFor: "switcher-icon-click",
                                                            className: "text-defaultsize text-defaulttextcolor dark:text-defaulttextcolor/70 ms-2  font-semibold",
                                                            children: "Icon Click"
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 109,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 106,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "radio",
                                                            name: "navigation-data-menu-styles",
                                                            className: "ti-form-radio",
                                                            id: "switcher-icon-hover",
                                                            checked: local_varaiable.dataNavStyle == "icon-hover",
                                                            onChange: (_e)=>{},
                                                            onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["IconHover"](ThemeChanger)
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 113,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            htmlFor: "switcher-icon-hover",
                                                            className: "text-defaultsize text-defaulttextcolor dark:text-defaulttextcolor/70 ms-2  font-semibold",
                                                            children: "Icon Hover"
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 115,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 112,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                            lineNumber: 92,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "px-4 text-secondary text-xs",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                    className: "me-2",
                                                    children: "Note:"
                                                }, void 0, false, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 119,
                                                    columnNumber: 62
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                "Works same for both Vertical and Horizontal"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                            lineNumber: 119,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                    lineNumber: 90,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: " sidemenu-layout-styles",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "switcher-style-head",
                                            children: "Sidemenu Layout Syles:"
                                        }, void 0, false, {
                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                            lineNumber: 124,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "grid grid-cols-2 gap-2 switcher-style",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "radio",
                                                            name: "sidemenu-layout-styles",
                                                            className: "ti-form-radio",
                                                            id: "switcher-default-menu",
                                                            defaultChecked: true,
                                                            onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Defaultmenu"](ThemeChanger)
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 127,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            htmlFor: "switcher-default-menu",
                                                            className: "text-defaultsize text-defaulttextcolor dark:text-defaulttextcolor/70 ms-2  font-semibold ",
                                                            children: "Default Menu"
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 129,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 126,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "radio",
                                                            name: "sidemenu-layout-styles",
                                                            className: "ti-form-radio",
                                                            id: "switcher-closed-menu",
                                                            checked: local_varaiable.dataToggled == "close-menu-close",
                                                            onChange: (_e)=>{},
                                                            onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Closedmenu"](ThemeChanger)
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 134,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            htmlFor: "switcher-closed-menu",
                                                            className: "text-defaultsize text-defaulttextcolor dark:text-defaulttextcolor/70 ms-2  font-semibold ",
                                                            children: "Closed Menu"
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 136,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 133,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "radio",
                                                            name: "sidemenu-layout-styles",
                                                            className: "ti-form-radio",
                                                            id: "switcher-icontext-menu",
                                                            checked: local_varaiable.dataToggled == "icon-text-close",
                                                            onChange: (_e)=>{},
                                                            onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["iconText"](ThemeChanger)
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 141,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            htmlFor: "switcher-icontext-menu",
                                                            className: "text-defaultsize text-defaulttextcolor dark:text-defaulttextcolor/70 ms-2  font-semibold ",
                                                            children: "Icon Text"
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 143,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 140,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "radio",
                                                            name: "sidemenu-layout-styles",
                                                            className: "ti-form-radio",
                                                            id: "switcher-icon-overlay",
                                                            onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["iconOverayFn"](ThemeChanger)
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 147,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            htmlFor: "switcher-icon-overlay",
                                                            className: "text-defaultsize text-defaulttextcolor dark:text-defaulttextcolor/70 ms-2  font-semibold ",
                                                            children: "Icon Overlay"
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 149,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 146,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "radio",
                                                            name: "sidemenu-layout-styles",
                                                            className: "ti-form-radio",
                                                            id: "switcher-detached",
                                                            checked: local_varaiable.dataToggled == "detached-close",
                                                            onChange: (_e)=>{},
                                                            onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DetachedFn"](ThemeChanger)
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 152,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            htmlFor: "switcher-detached",
                                                            className: "text-defaultsize text-defaulttextcolor dark:text-defaulttextcolor/70 ms-2  font-semibold ",
                                                            children: "Detached"
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 154,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 151,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "radio",
                                                            name: "sidemenu-layout-styles",
                                                            className: "ti-form-radio",
                                                            id: "switcher-double-menu",
                                                            checked: local_varaiable.dataVerticalStyle == "doublemenu",
                                                            onChange: (_e)=>{},
                                                            onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DoubletFn"](ThemeChanger)
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 158,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            htmlFor: "switcher-double-menu",
                                                            className: "text-defaultsize text-defaulttextcolor dark:text-defaulttextcolor/70 ms-2  font-semibold",
                                                            children: "Double Menu"
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 160,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 157,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                            lineNumber: 125,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "px-4 text-secondary text-xs",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                    className: "me-2",
                                                    children: "Note:"
                                                }, void 0, false, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 164,
                                                    columnNumber: 62
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                "Navigation menu styles won't work here."
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                            lineNumber: 164,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                    lineNumber: 123,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "switcher-style-head",
                                            children: "Page Styles:"
                                        }, void 0, false, {
                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                            lineNumber: 168,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "grid grid-cols-3  switcher-style",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "radio",
                                                            name: "data-page-styles",
                                                            className: "ti-form-radio",
                                                            id: "switcher-regular",
                                                            checked: local_varaiable.dataPageStyle == "regular",
                                                            onChange: (_e)=>{},
                                                            onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Regular"](ThemeChanger)
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 171,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            htmlFor: "switcher-regular",
                                                            className: "text-defaultsize text-defaulttextcolor dark:text-defaulttextcolor/70 ms-2  font-semibold",
                                                            children: "Regular"
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 173,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 170,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "radio",
                                                            name: "data-page-styles",
                                                            className: "ti-form-radio",
                                                            id: "switcher-classic",
                                                            checked: local_varaiable.dataPageStyle == "classic",
                                                            onChange: (_e)=>{},
                                                            onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Classic"](ThemeChanger)
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 177,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            htmlFor: "switcher-classic",
                                                            className: "text-defaultsize text-defaulttextcolor dark:text-defaulttextcolor/70 ms-2  font-semibold",
                                                            children: "Classic"
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 179,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 176,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "radio",
                                                            name: "data-page-styles",
                                                            className: "ti-form-radio",
                                                            id: "switcher-modern",
                                                            checked: local_varaiable.dataPageStyle == "modern",
                                                            onChange: (_e)=>{},
                                                            onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Modern"](ThemeChanger)
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 183,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            htmlFor: "switcher-modern",
                                                            className: "text-defaultsize text-defaulttextcolor dark:text-defaulttextcolor/70 ms-2  font-semibold",
                                                            children: " Modern"
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 185,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 182,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                            lineNumber: 169,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                    lineNumber: 167,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "switcher-style-head",
                                            children: "Layout Width Styles:"
                                        }, void 0, false, {
                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                            lineNumber: 191,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "grid grid-cols-3 switcher-style",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "radio",
                                                            name: "layout-width",
                                                            className: "ti-form-radio",
                                                            id: "switcher-full-width",
                                                            checked: local_varaiable.dataWidth == "fullwidth",
                                                            onChange: (_e)=>{},
                                                            onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fullwidth"](ThemeChanger)
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 194,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            htmlFor: "switcher-full-width",
                                                            className: "text-defaultsize text-defaulttextcolor dark:text-defaulttextcolor/70 ms-2  font-semibold",
                                                            children: "FullWidth"
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 196,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 193,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "radio",
                                                            name: "layout-width",
                                                            className: "ti-form-radio",
                                                            id: "switcher-boxed",
                                                            checked: local_varaiable.dataWidth == "boxed",
                                                            onChange: (_e)=>{},
                                                            onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Boxed"](ThemeChanger)
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 200,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            htmlFor: "switcher-boxed",
                                                            className: "text-defaultsize text-defaulttextcolor dark:text-defaulttextcolor/70 ms-2  font-semibold",
                                                            children: "Boxed"
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 202,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 199,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                            lineNumber: 192,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                    lineNumber: 190,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "switcher-style-head",
                                            children: "Menu Positions:"
                                        }, void 0, false, {
                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                            lineNumber: 207,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "grid grid-cols-3  switcher-style",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "radio",
                                                            name: "data-menu-positions",
                                                            className: "ti-form-radio",
                                                            id: "switcher-menu-fixed",
                                                            checked: local_varaiable.dataMenuPosition == "fixed",
                                                            onChange: (_e)=>{},
                                                            onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FixedMenu"](ThemeChanger)
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 210,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            htmlFor: "switcher-menu-fixed",
                                                            className: "text-defaultsize text-defaulttextcolor dark:text-defaulttextcolor/70 ms-2  font-semibold",
                                                            children: "Fixed"
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 212,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 209,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "radio",
                                                            name: "data-menu-positions",
                                                            className: "ti-form-radio",
                                                            id: "switcher-menu-scroll",
                                                            checked: local_varaiable.dataMenuPosition == "scrollable",
                                                            onChange: (_e)=>{},
                                                            onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["scrollMenu"](ThemeChanger)
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 216,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            htmlFor: "switcher-menu-scroll",
                                                            className: "text-defaultsize text-defaulttextcolor dark:text-defaulttextcolor/70 ms-2  font-semibold",
                                                            children: "Scrollable "
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 218,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 215,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                            lineNumber: 208,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                    lineNumber: 206,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "switcher-style-head",
                                            children: "Header Positions:"
                                        }, void 0, false, {
                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                            lineNumber: 224,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "grid grid-cols-3 switcher-style",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "radio",
                                                            name: "data-header-positions",
                                                            className: "ti-form-radio",
                                                            id: "switcher-header-fixed",
                                                            checked: local_varaiable.dataHeaderPosition == "fixed",
                                                            onChange: (_e)=>{},
                                                            onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Headerpostionfixed"](ThemeChanger)
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 227,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            htmlFor: "switcher-header-fixed",
                                                            className: "text-defaultsize text-defaulttextcolor dark:text-defaulttextcolor/70 ms-2  font-semibold",
                                                            children: "Fixed"
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 229,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 226,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "radio",
                                                            name: "data-header-positions",
                                                            className: "ti-form-radio",
                                                            id: "switcher-header-scroll",
                                                            checked: local_varaiable.dataHeaderPosition == "scrollable",
                                                            onChange: (_e)=>{},
                                                            onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Headerpostionscroll"](ThemeChanger)
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 233,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            htmlFor: "switcher-header-scroll",
                                                            className: "text-defaultsize text-defaulttextcolor dark:text-defaulttextcolor/70 ms-2  font-semibold",
                                                            children: "Scrollable"
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 235,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 232,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                            lineNumber: 225,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                    lineNumber: 223,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                            lineNumber: 40,
                            columnNumber: 13
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            id: "switcher-2",
                            className: "hidden",
                            role: "tabpanel",
                            "aria-labelledby": "switcher-item-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "theme-colors",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "switcher-style-head",
                                            children: "Menu Colors:"
                                        }, void 0, false, {
                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                            lineNumber: 244,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex switcher-style space-x-3 rtl:space-x-reverse",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "hs-tooltip ti-main-tooltip ti-form-radio switch-select ",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            className: "hs-tooltip-toggle ti-form-radio color-input color-white",
                                                            type: "radio",
                                                            name: "menu-colors",
                                                            checked: local_varaiable.dataMenuStyles == "light",
                                                            onChange: (_e)=>{},
                                                            id: "switcher-menu-light",
                                                            onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["lightMenu"](ThemeChanger)
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 247,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "hs-tooltip-content ti-main-tooltip-content !py-1 !px-2 !bg-black text-xs font-medium !text-white shadow-sm dark:!bg-black",
                                                            role: "tooltip",
                                                            children: "Light Menu"
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 250,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 246,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "hs-tooltip ti-main-tooltip ti-form-radio switch-select ",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            className: "hs-tooltip-toggle ti-form-radio color-input color-dark",
                                                            type: "radio",
                                                            name: "menu-colors",
                                                            checked: local_varaiable.dataMenuStyles == "dark",
                                                            onChange: (_e)=>{},
                                                            id: "switcher-menu-dark",
                                                            onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["darkMenu"](ThemeChanger)
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 257,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "hs-tooltip-content ti-main-tooltip-content !py-1 !px-2 !bg-black text-xs font-medium !text-white shadow-sm dark:!bg-black",
                                                            role: "tooltip",
                                                            children: "Dark Menu"
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 260,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 256,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "hs-tooltip ti-main-tooltip ti-form-radio switch-select ",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            className: "hs-tooltip-toggle ti-form-radio color-input color-primary",
                                                            type: "radio",
                                                            name: "menu-colors",
                                                            checked: local_varaiable.dataMenuStyles == "color",
                                                            onChange: (_e)=>{},
                                                            id: "switcher-menu-primary",
                                                            onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["colorMenu"](ThemeChanger)
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 267,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "hs-tooltip-content ti-main-tooltip-content !py-1 !px-2 !bg-black text-xs font-medium !text-white shadow-sm dark:!bg-black",
                                                            role: "tooltip",
                                                            children: "Color Menu"
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 270,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 266,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "hs-tooltip ti-main-tooltip ti-form-radio switch-select ",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            className: "hs-tooltip-toggle ti-form-radio color-input color-gradient",
                                                            type: "radio",
                                                            name: "menu-colors",
                                                            checked: local_varaiable.dataMenuStyles == "gradient",
                                                            onChange: (_e)=>{},
                                                            id: "switcher-menu-gradient",
                                                            onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["gradientMenu"](ThemeChanger)
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 277,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "hs-tooltip-content ti-main-tooltip-content !py-1 !px-2 !bg-black text-xs font-medium !text-white shadow-sm dark:!bg-black",
                                                            role: "tooltip",
                                                            children: "Gradient Menu"
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 280,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 276,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "hs-tooltip ti-main-tooltip ti-form-radio switch-select ",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            className: "hs-tooltip-toggle ti-form-radio color-input color-transparent",
                                                            type: "radio",
                                                            name: "menu-colors",
                                                            checked: local_varaiable.dataMenuStyles == "transparent",
                                                            onChange: (_e)=>{},
                                                            id: "switcher-menu-transparent",
                                                            onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["transparentMenu"](ThemeChanger)
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 287,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "hs-tooltip-content ti-main-tooltip-content !py-1 !px-2 !bg-black text-xs font-medium !text-white shadow-sm dark:!bg-black",
                                                            role: "tooltip",
                                                            children: "Transparent Menu"
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 290,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 286,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                            lineNumber: 245,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "px-4 text-[#8c9097] dark:text-white/50 text-[.6875rem]",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                    className: "me-2",
                                                    children: "Note:"
                                                }, void 0, false, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 297,
                                                    columnNumber: 89
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                "If you want to change color Menu dynamically change from below Theme Primary color picker."
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                            lineNumber: 297,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                    lineNumber: 243,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "theme-colors",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "switcher-style-head",
                                            children: "Header Colors:"
                                        }, void 0, false, {
                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                            lineNumber: 302,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex switcher-style space-x-3 rtl:space-x-reverse",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "hs-tooltip ti-main-tooltip ti-form-radio switch-select ",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            className: "hs-tooltip-toggle ti-form-radio color-input color-white !border",
                                                            type: "radio",
                                                            name: "header-colors",
                                                            checked: local_varaiable.dataHeaderStyles == "light",
                                                            onChange: (_e)=>{},
                                                            id: "switcher-header-light",
                                                            onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["lightHeader"](ThemeChanger)
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 305,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "hs-tooltip-content ti-main-tooltip-content !py-1 !px-2 !bg-black text-xs font-medium !text-white shadow-sm dark:!bg-black",
                                                            role: "tooltip",
                                                            children: "Light Header"
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 308,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 304,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "hs-tooltip ti-main-tooltip ti-form-radio switch-select ",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            className: "hs-tooltip-toggle ti-form-radio color-input color-dark",
                                                            type: "radio",
                                                            name: "header-colors",
                                                            checked: local_varaiable.dataHeaderStyles == "dark",
                                                            onChange: (_e)=>{},
                                                            id: "switcher-header-dark",
                                                            onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["darkHeader"](ThemeChanger)
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 315,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "hs-tooltip-content ti-main-tooltip-content !py-1 !px-2 !bg-black text-xs font-medium !text-white shadow-sm dark:!bg-black",
                                                            role: "tooltip",
                                                            children: "Dark Header"
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 318,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 314,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "hs-tooltip ti-main-tooltip ti-form-radio switch-select ",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            className: "hs-tooltip-toggle ti-form-radio color-input color-primary",
                                                            type: "radio",
                                                            name: "header-colors",
                                                            checked: local_varaiable.dataHeaderStyles == "color",
                                                            onChange: (_e)=>{},
                                                            id: "switcher-header-primary",
                                                            onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["colorHeader"](ThemeChanger)
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 325,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "hs-tooltip-content ti-main-tooltip-content !py-1 !px-2 !bg-black text-xs font-medium !text-white shadow-sm dark:!bg-black",
                                                            role: "tooltip",
                                                            children: "Color Header"
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 328,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 324,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "hs-tooltip ti-main-tooltip ti-form-radio switch-select ",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            className: "hs-tooltip-toggle ti-form-radio color-input color-gradient",
                                                            type: "radio",
                                                            name: "header-colors",
                                                            checked: local_varaiable.dataHeaderStyles == "gradient",
                                                            onChange: (_e)=>{},
                                                            id: "switcher-header-gradient",
                                                            onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["gradientHeader"](ThemeChanger)
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 335,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "hs-tooltip-content ti-main-tooltip-content !py-1 !px-2 !bg-black text-xs font-medium !text-white shadow-sm dark:!bg-black",
                                                            role: "tooltip",
                                                            children: "Gradient Header"
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 338,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 334,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "hs-tooltip ti-main-tooltip ti-form-radio switch-select ",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            className: "hs-tooltip-toggle ti-form-radio color-input color-transparent",
                                                            type: "radio",
                                                            name: "header-colors",
                                                            id: "switcher-header-transparent",
                                                            checked: local_varaiable.dataHeaderStyles == "transparent",
                                                            onChange: (_e)=>{},
                                                            onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["transparentHeader"](ThemeChanger)
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 345,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "hs-tooltip-content ti-main-tooltip-content !py-1 !px-2 !bg-black text-xs font-medium !text-white shadow-sm dark:!bg-black",
                                                            role: "tooltip",
                                                            children: "Transparent Header"
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 348,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 344,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                            lineNumber: 303,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "px-4 text-[#8c9097] dark:text-white/50 text-[.6875rem]",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                    className: "me-2",
                                                    children: "Note:"
                                                }, void 0, false, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 355,
                                                    columnNumber: 89
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                "If you want to change color Header dynamically change from below Theme Primary color picker."
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                            lineNumber: 355,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                    lineNumber: 301,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "theme-colors",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "switcher-style-head",
                                            children: "Theme Primary:"
                                        }, void 0, false, {
                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                            lineNumber: 360,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex flex-wrap switcher-style gap-y-2 gap-x-5 rtl:gap-x-reverse",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "ti-form-radio switch-select",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        className: "ti-form-radio color-input color-primary-1",
                                                        type: "radio",
                                                        name: "theme-primary",
                                                        checked: local_varaiable.colorPrimaryRgb == '58, 88, 146',
                                                        onChange: (_e)=>{},
                                                        id: "switcher-primary",
                                                        onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["primaryColor1"](ThemeChanger)
                                                    }, void 0, false, {
                                                        fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                        lineNumber: 363,
                                                        columnNumber: 21
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                }, void 0, false, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 362,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "ti-form-radio switch-select",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        className: "ti-form-radio color-input color-primary-2",
                                                        type: "radio",
                                                        name: "theme-primary",
                                                        checked: local_varaiable.colorPrimaryRgb == '92, 144 ,163',
                                                        onChange: (_e)=>{},
                                                        id: "switcher-primary1",
                                                        onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["primaryColor2"](ThemeChanger)
                                                    }, void 0, false, {
                                                        fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                        lineNumber: 368,
                                                        columnNumber: 21
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                }, void 0, false, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 367,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "ti-form-radio switch-select",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        className: "ti-form-radio color-input color-primary-3",
                                                        type: "radio",
                                                        name: "theme-primary",
                                                        checked: local_varaiable.colorPrimaryRgb == '161, 90 ,223',
                                                        onChange: (_e)=>{},
                                                        id: "switcher-primary2",
                                                        onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["primaryColor3"](ThemeChanger)
                                                    }, void 0, false, {
                                                        fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                        lineNumber: 373,
                                                        columnNumber: 21
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                }, void 0, false, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 372,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "ti-form-radio switch-select",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        className: "ti-form-radio color-input color-primary-4",
                                                        type: "radio",
                                                        name: "theme-primary",
                                                        checked: local_varaiable.colorPrimaryRgb == '78, 172, 76',
                                                        onChange: (_e)=>{},
                                                        id: "switcher-primary3",
                                                        onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["primaryColor4"](ThemeChanger)
                                                    }, void 0, false, {
                                                        fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                        lineNumber: 378,
                                                        columnNumber: 21
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                }, void 0, false, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 377,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "ti-form-radio switch-select",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        className: "ti-form-radio color-input color-primary-5",
                                                        type: "radio",
                                                        name: "theme-primary",
                                                        checked: local_varaiable.colorPrimaryRgb == '223, 90, 90',
                                                        onChange: (_e)=>{},
                                                        id: "switcher-primary4",
                                                        onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["primaryColor5"](ThemeChanger)
                                                    }, void 0, false, {
                                                        fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                        lineNumber: 383,
                                                        columnNumber: 21
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                }, void 0, false, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 382,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "ti-form-radio switch-select ps-0 mt-1 color-primary-light",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "theme-container-primary",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                className: "",
                                                                children: "nano"
                                                            }, void 0, false, {
                                                                fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                                lineNumber: 389,
                                                                columnNumber: 21
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 388,
                                                            columnNumber: 19
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "pickr-container-primary",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "pickr",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                    className: "pcr-button",
                                                                    onClick: (ele)=>{
                                                                        if (ele.target.querySelector("input")) {
                                                                            ele.target.querySelector("input").click();
                                                                        }
                                                                    },
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                        theme: local_varaiable,
                                                                        actionfunction: ThemeChanger
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                                        lineNumber: 398,
                                                                        columnNumber: 25
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                }, void 0, false, {
                                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                                    lineNumber: 393,
                                                                    columnNumber: 23
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, void 0, false, {
                                                                fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                                lineNumber: 392,
                                                                columnNumber: 21
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 391,
                                                            columnNumber: 19
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 387,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                            lineNumber: 361,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                    lineNumber: 359,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "theme-colors",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "switcher-style-head",
                                            children: "Theme Background:"
                                        }, void 0, false, {
                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                            lineNumber: 407,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex flex-wrap switcher-style gap-y-2 gap-x-5 rtl:gap-x-reverse",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "ti-form-radio switch-select",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        className: "ti-form-radio color-input color-bg-1",
                                                        type: "radio",
                                                        name: "theme-background",
                                                        checked: local_varaiable.bodyBg == '34 44 110',
                                                        onChange: (_e)=>{},
                                                        id: "switcher-background",
                                                        onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["backgroundColor1"](ThemeChanger)
                                                    }, void 0, false, {
                                                        fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                        lineNumber: 410,
                                                        columnNumber: 21
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                }, void 0, false, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 409,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "ti-form-radio switch-select",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        className: "ti-form-radio color-input color-bg-2",
                                                        type: "radio",
                                                        name: "theme-background",
                                                        checked: local_varaiable.bodyBg == '22 92 129',
                                                        onChange: (_e)=>{},
                                                        id: "switcher-background1",
                                                        onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["backgroundColor2"](ThemeChanger)
                                                    }, void 0, false, {
                                                        fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                        lineNumber: 415,
                                                        columnNumber: 21
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                }, void 0, false, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 414,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "ti-form-radio switch-select",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        className: "ti-form-radio color-input color-bg-3",
                                                        type: "radio",
                                                        name: "theme-background",
                                                        checked: local_varaiable.bodyBg == '104 51 149',
                                                        onChange: (_e)=>{},
                                                        id: "switcher-background2",
                                                        onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["backgroundColor3"](ThemeChanger)
                                                    }, void 0, false, {
                                                        fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                        lineNumber: 420,
                                                        columnNumber: 21
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                }, void 0, false, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 419,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "ti-form-radio switch-select",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        className: "ti-form-radio color-input color-bg-4",
                                                        type: "radio",
                                                        name: "theme-background",
                                                        checked: local_varaiable.bodyBg == '29 106 56',
                                                        onChange: (_e)=>{},
                                                        id: "switcher-background3",
                                                        onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["backgroundColor4"](ThemeChanger)
                                                    }, void 0, false, {
                                                        fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                        lineNumber: 425,
                                                        columnNumber: 21
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                }, void 0, false, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 424,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "ti-form-radio switch-select",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        className: "ti-form-radio color-input color-bg-5",
                                                        type: "radio",
                                                        name: "theme-background",
                                                        checked: local_varaiable.bodyBg == '134 80 34',
                                                        onChange: (_e)=>{},
                                                        id: "switcher-background4",
                                                        onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["backgroundColor5"](ThemeChanger)
                                                    }, void 0, false, {
                                                        fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                        lineNumber: 430,
                                                        columnNumber: 21
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                }, void 0, false, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 429,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "ti-form-radio switch-select ps-0 mt-1 color-bg-transparent",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "theme-container-background",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                className: "",
                                                                children: "nano"
                                                            }, void 0, false, {
                                                                fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                                lineNumber: 436,
                                                                columnNumber: 21
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 435,
                                                            columnNumber: 19
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "pickr-container-background",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "pickr",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                    className: "pcr-button",
                                                                    onClick: (ele)=>{
                                                                        if (ele.target.querySelector("input")) {
                                                                            ele.target.querySelector("input").click();
                                                                        }
                                                                    },
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Themebackgroundcolor"], {
                                                                        theme: local_varaiable,
                                                                        actionfunction: ThemeChanger
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                                        lineNumber: 445,
                                                                        columnNumber: 25
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                }, void 0, false, {
                                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                                    lineNumber: 440,
                                                                    columnNumber: 23
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, void 0, false, {
                                                                fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                                lineNumber: 439,
                                                                columnNumber: 21
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        }, void 0, false, {
                                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                            lineNumber: 438,
                                                            columnNumber: 19
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 434,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                            lineNumber: 408,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                    lineNumber: 406,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "menu-image theme-colors",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "switcher-style-head",
                                            children: "Menu With Background Image:"
                                        }, void 0, false, {
                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                            lineNumber: 454,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex switcher-style space-x-3 rtl:space-x-reverse flex-wrap gap-3",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "ti-form-radio switch-select",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        className: "ti-form-radio bgimage-input bg-img1",
                                                        type: "radio",
                                                        name: "theme-images",
                                                        id: "switcher-bg-img",
                                                        onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["bgImage1"](ThemeChanger),
                                                        checked: local_varaiable.colorPrimaryRgb == 'bg-img',
                                                        onChange: (_e)=>{}
                                                    }, void 0, false, {
                                                        fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                        lineNumber: 457,
                                                        columnNumber: 21
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                }, void 0, false, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 456,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "ti-form-radio switch-select",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        className: "ti-form-radio bgimage-input bg-img2",
                                                        type: "radio",
                                                        name: "theme-images",
                                                        id: "switcher-bg-img1",
                                                        onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["bgImage2"](ThemeChanger),
                                                        checked: local_varaiable.colorPrimaryRgb == 'bg-img1',
                                                        onChange: (_e)=>{}
                                                    }, void 0, false, {
                                                        fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                        lineNumber: 460,
                                                        columnNumber: 21
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                }, void 0, false, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 459,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "ti-form-radio switch-select",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        className: "ti-form-radio bgimage-input bg-img3",
                                                        type: "radio",
                                                        name: "theme-images",
                                                        id: "switcher-bg-img2",
                                                        onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["bgImage3"](ThemeChanger),
                                                        checked: local_varaiable.colorPrimaryRgb == 'bg-img2',
                                                        onChange: (_e)=>{}
                                                    }, void 0, false, {
                                                        fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                        lineNumber: 463,
                                                        columnNumber: 21
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                }, void 0, false, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 462,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "ti-form-radio switch-select",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        className: "ti-form-radio bgimage-input bg-img4",
                                                        type: "radio",
                                                        name: "theme-images",
                                                        id: "switcher-bg-img3",
                                                        onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["bgImage4"](ThemeChanger),
                                                        checked: local_varaiable.colorPrimaryRgb == 'bg-img3',
                                                        onChange: (_e)=>{}
                                                    }, void 0, false, {
                                                        fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                        lineNumber: 466,
                                                        columnNumber: 21
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                }, void 0, false, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 465,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "ti-form-radio switch-select",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        className: "ti-form-radio bgimage-input bg-img5",
                                                        type: "radio",
                                                        name: "theme-images",
                                                        id: "switcher-bg-img4",
                                                        onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["bgImage5"](ThemeChanger),
                                                        checked: local_varaiable.colorPrimaryRgb == 'bg-img4',
                                                        onChange: (_e)=>{}
                                                    }, void 0, false, {
                                                        fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                        lineNumber: 469,
                                                        columnNumber: 21
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                }, void 0, false, {
                                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                                    lineNumber: 468,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                            lineNumber: 455,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                                    lineNumber: 453,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                            lineNumber: 242,
                            columnNumber: 13
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                    lineNumber: 39,
                    columnNumber: 11
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "ti-offcanvas-footer sm:flex justify-between",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                            href: "#!",
                            onClick: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$switcherdata$2f$switcherdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Reset"](ThemeChanger),
                            id: "reset-all",
                            className: "w-full ti-btn ti-btn-danger-full m-1",
                            children: "Reset"
                        }, void 0, false, {
                            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                            lineNumber: 476,
                            columnNumber: 13
                        }, ("TURBOPACK compile-time value", void 0)),
                        " "
                    ]
                }, void 0, true, {
                    fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
                    lineNumber: 475,
                    columnNumber: 11
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
            lineNumber: 13,
            columnNumber: 9
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/shared/layout-components/switcher/switcher.tsx",
        lineNumber: 12,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_c = Switcher;
const mapStateToProps = (state)=>({
        local_varaiable: state
    });
const __TURBOPACK__default__export__ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$redux$2f$es$2f$exports$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["connect"])(mapStateToProps, {
    ThemeChanger: __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$redux$2f$action$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ThemeChanger"]
})(Switcher);
var _c;
__turbopack_context__.k.register(_c, "Switcher");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/(components)/(authenticationlayout)/layout.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$layout$2d$components$2f$switcher$2f$switcher$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/shared/layout-components/switcher/switcher.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$redux$2f$es$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/react-redux/es/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$redux$2f$es$2f$exports$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-redux/es/exports.js [app-client] (ecmascript)");
"use client";
;
;
;
;
const Layout = ({ children })=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
            children: [
                children,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$layout$2d$components$2f$switcher$2f$switcher$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                    fileName: "[project]/app/(components)/(authenticationlayout)/layout.tsx",
                    lineNumber: 12,
                    columnNumber: 13
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/app/(components)/(authenticationlayout)/layout.tsx",
            lineNumber: 10,
            columnNumber: 8
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false);
};
_c = Layout;
const mapStateToProps = (state)=>({
        local_varaiable: state
    });
const __TURBOPACK__default__export__ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$redux$2f$es$2f$exports$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["connect"])(mapStateToProps, {})(Layout);
var _c;
__turbopack_context__.k.register(_c, "Layout");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_c7e3a8a5._.js.map