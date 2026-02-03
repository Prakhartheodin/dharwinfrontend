(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/shared/data/pages/profiledata.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Followersdata",
    ()=>Followersdata,
    "Friendsdata",
    ()=>Friendsdata,
    "LightboxGallery",
    ()=>LightboxGallery,
    "Personalinfodata",
    ()=>Personalinfodata,
    "RecentPostsdata",
    ()=>RecentPostsdata,
    "Skillsdata",
    ()=>Skillsdata,
    "Suggestionsdata",
    ()=>Suggestionsdata
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$yet$2d$another$2d$react$2d$lightbox$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/yet-another-react-lightbox/dist/index.js [app-client] (ecmascript) <locals>");
// import optional lightbox plugins
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$yet$2d$another$2d$react$2d$lightbox$2f$dist$2f$plugins$2f$fullscreen$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/yet-another-react-lightbox/dist/plugins/fullscreen/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$yet$2d$another$2d$react$2d$lightbox$2f$dist$2f$plugins$2f$slideshow$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/yet-another-react-lightbox/dist/plugins/slideshow/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$yet$2d$another$2d$react$2d$lightbox$2f$dist$2f$plugins$2f$thumbnails$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/yet-another-react-lightbox/dist/plugins/thumbnails/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$yet$2d$another$2d$react$2d$lightbox$2f$dist$2f$plugins$2f$zoom$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/yet-another-react-lightbox/dist/plugins/zoom/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
;
;
;
;
;
const Friendsdata = [
    {
        id: 1,
        src: "../../assets/images/faces/2.jpg",
        name: 'Samantha May',
        mail: 'samanthamay2912@gmail.com',
        badge: 'Team Member',
        color: 'info'
    },
    {
        id: 2,
        src: "../../assets/images/faces/15.jpg",
        name: 'Andrew Garfield',
        mail: 'andrewgarfield98@gmail.com',
        badge: 'Team Lead',
        color: 'success'
    },
    {
        id: 3,
        src: "../../assets/images/faces/5.jpg",
        name: 'Jessica Cashew',
        mail: 'jessicacashew143@gmail.com',
        badge: 'Team Member',
        color: 'info'
    },
    {
        id: 4,
        src: "../../assets/images/faces/11.jpg",
        name: 'Simon Cowan',
        mail: 'jessicacashew143@gmail.com',
        badge: 'Team Manager',
        color: 'warning'
    },
    {
        id: 5,
        src: "../../assets/images/faces/7.jpg",
        name: 'Amanda nunes',
        mail: 'amandanunes45@gmail.com',
        badge: 'Team Member',
        color: 'info'
    },
    {
        id: 6,
        src: "../../assets/images/faces/12.jpg",
        name: 'Mahira Hose',
        mail: 'mahirahose9456@gmail.com',
        badge: 'Team Member',
        color: 'info'
    }
];
const LightboxGallery = ()=>{
    _s();
    const [open, setOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const value = true;
    const div = value.toString(); // Convert the value to a string
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "xxl:col-span-3 xl:col-span-3 lg:col-span-3 sm:col-span-6 col-span-12",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                    href: "#!",
                    scroll: false,
                    className: "glightbox card",
                    "data-gallery": "gallery1",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                        src: "../../assets/images/media/media-40.jpg",
                        alt: "image",
                        className: "rounded-sm",
                        onClick: ()=>setOpen(true)
                    }, void 0, false, {
                        fileName: "[project]/shared/data/pages/profiledata.tsx",
                        lineNumber: 32,
                        columnNumber: 26
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/shared/data/pages/profiledata.tsx",
                    lineNumber: 31,
                    columnNumber: 22
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/shared/data/pages/profiledata.tsx",
                lineNumber: 30,
                columnNumber: 3
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "xxl:col-span-3 xl:col-span-3 lg:col-span-3 sm:col-span-6 col-span-12",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                    href: "#!",
                    scroll: false,
                    className: "glightbox card",
                    "data-gallery": "gallery1",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                        src: "../../assets/images/media/media-41.jpg",
                        alt: "image",
                        className: "rounded-sm",
                        onClick: ()=>setOpen(true)
                    }, void 0, false, {
                        fileName: "[project]/shared/data/pages/profiledata.tsx",
                        lineNumber: 37,
                        columnNumber: 26
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/shared/data/pages/profiledata.tsx",
                    lineNumber: 36,
                    columnNumber: 22
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/shared/data/pages/profiledata.tsx",
                lineNumber: 35,
                columnNumber: 18
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "xxl:col-span-3 xl:col-span-3 lg:col-span-3 sm:col-span-6 col-span-12",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                    href: "#!",
                    scroll: false,
                    className: "glightbox card",
                    "data-gallery": "gallery1",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                        src: "../../assets/images/media/media-42.jpg",
                        alt: "image",
                        className: "rounded-sm",
                        onClick: ()=>setOpen(true)
                    }, void 0, false, {
                        fileName: "[project]/shared/data/pages/profiledata.tsx",
                        lineNumber: 42,
                        columnNumber: 26
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/shared/data/pages/profiledata.tsx",
                    lineNumber: 41,
                    columnNumber: 22
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/shared/data/pages/profiledata.tsx",
                lineNumber: 40,
                columnNumber: 18
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "xxl:col-span-3 xl:col-span-3 lg:col-span-3 sm:col-span-6 col-span-12",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                    href: "#!",
                    scroll: false,
                    className: "glightbox card",
                    "data-gallery": "gallery1",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                        src: "../../assets/images/media/media-43.jpg",
                        alt: "image",
                        className: "rounded-sm",
                        onClick: ()=>setOpen(true)
                    }, void 0, false, {
                        fileName: "[project]/shared/data/pages/profiledata.tsx",
                        lineNumber: 47,
                        columnNumber: 26
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/shared/data/pages/profiledata.tsx",
                    lineNumber: 46,
                    columnNumber: 22
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/shared/data/pages/profiledata.tsx",
                lineNumber: 45,
                columnNumber: 18
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "xxl:col-span-3 xl:col-span-3 lg:col-span-3 sm:col-span-6 col-span-12",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                    href: "#!",
                    scroll: false,
                    className: "glightbox card",
                    "data-gallery": "gallery1",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                        src: "../../assets/images/media/media-44.jpg",
                        alt: "image",
                        className: "rounded-sm",
                        onClick: ()=>setOpen(true)
                    }, void 0, false, {
                        fileName: "[project]/shared/data/pages/profiledata.tsx",
                        lineNumber: 52,
                        columnNumber: 26
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/shared/data/pages/profiledata.tsx",
                    lineNumber: 51,
                    columnNumber: 22
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/shared/data/pages/profiledata.tsx",
                lineNumber: 50,
                columnNumber: 18
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "xxl:col-span-3 xl:col-span-3 lg:col-span-3 sm:col-span-6 col-span-12",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                    href: "#!",
                    scroll: false,
                    className: "glightbox card",
                    "data-gallery": "gallery1",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                        src: "../../assets/images/media/media-45.jpg",
                        alt: "image",
                        className: "rounded-sm",
                        onClick: ()=>setOpen(true)
                    }, void 0, false, {
                        fileName: "[project]/shared/data/pages/profiledata.tsx",
                        lineNumber: 57,
                        columnNumber: 26
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/shared/data/pages/profiledata.tsx",
                    lineNumber: 56,
                    columnNumber: 22
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/shared/data/pages/profiledata.tsx",
                lineNumber: 55,
                columnNumber: 18
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "xxl:col-span-3 xl:col-span-3 lg:col-span-3 sm:col-span-6 col-span-12",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                    href: "#!",
                    scroll: false,
                    className: "glightbox card",
                    "data-gallery": "gallery1",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                        src: "../../assets/images/media/media-46.jpg",
                        alt: "image",
                        className: "rounded-sm",
                        onClick: ()=>setOpen(true)
                    }, void 0, false, {
                        fileName: "[project]/shared/data/pages/profiledata.tsx",
                        lineNumber: 62,
                        columnNumber: 26
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/shared/data/pages/profiledata.tsx",
                    lineNumber: 61,
                    columnNumber: 22
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/shared/data/pages/profiledata.tsx",
                lineNumber: 60,
                columnNumber: 18
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "xxl:col-span-3 xl:col-span-3 lg:col-span-3 sm:col-span-6 col-span-12",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                    href: "#!",
                    scroll: false,
                    className: "glightbox card",
                    "data-gallery": "gallery1",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                        src: "../../assets/images/media/media-60.jpg",
                        alt: "image",
                        className: "rounded-sm",
                        onClick: ()=>setOpen(true)
                    }, void 0, false, {
                        fileName: "[project]/shared/data/pages/profiledata.tsx",
                        lineNumber: 67,
                        columnNumber: 26
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/shared/data/pages/profiledata.tsx",
                    lineNumber: 66,
                    columnNumber: 22
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/shared/data/pages/profiledata.tsx",
                lineNumber: 65,
                columnNumber: 18
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "xxl:col-span-3 xl:col-span-3 lg:col-span-3 sm:col-span-6 col-span-12",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                    href: "#!",
                    scroll: false,
                    className: "glightbox card",
                    "data-gallery": "gallery1",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                        src: "../../assets/images/media/media-26.jpg",
                        alt: "image",
                        className: "rounded-sm",
                        onClick: ()=>setOpen(true)
                    }, void 0, false, {
                        fileName: "[project]/shared/data/pages/profiledata.tsx",
                        lineNumber: 72,
                        columnNumber: 26
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/shared/data/pages/profiledata.tsx",
                    lineNumber: 71,
                    columnNumber: 22
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/shared/data/pages/profiledata.tsx",
                lineNumber: 70,
                columnNumber: 18
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "xxl:col-span-3 xl:col-span-3 lg:col-span-3 sm:col-span-6 col-span-12",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                    href: "#!",
                    scroll: false,
                    className: "glightbox card",
                    "data-gallery": "gallery1",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                        src: "../../assets/images/media/media-32.jpg",
                        alt: "image",
                        className: "rounded-sm",
                        onClick: ()=>setOpen(true)
                    }, void 0, false, {
                        fileName: "[project]/shared/data/pages/profiledata.tsx",
                        lineNumber: 77,
                        columnNumber: 26
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/shared/data/pages/profiledata.tsx",
                    lineNumber: 76,
                    columnNumber: 22
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/shared/data/pages/profiledata.tsx",
                lineNumber: 75,
                columnNumber: 18
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "xxl:col-span-3 xl:col-span-3 lg:col-span-3 sm:col-span-6 col-span-12",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                    href: "#!",
                    scroll: false,
                    className: "glightbox card",
                    "data-gallery": "gallery1",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                        src: "../../assets/images/media/media-30.jpg",
                        alt: "image",
                        className: "rounded-sm",
                        onClick: ()=>setOpen(true)
                    }, void 0, false, {
                        fileName: "[project]/shared/data/pages/profiledata.tsx",
                        lineNumber: 82,
                        columnNumber: 26
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/shared/data/pages/profiledata.tsx",
                    lineNumber: 81,
                    columnNumber: 22
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/shared/data/pages/profiledata.tsx",
                lineNumber: 80,
                columnNumber: 18
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "xxl:col-span-3 xl:col-span-3 lg:col-span-3 sm:col-span-6 col-span-12",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                    href: "#!",
                    scroll: false,
                    className: "glightbox card",
                    "data-gallery": "gallery1",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                        src: "../../assets/images/media/media-31.jpg",
                        alt: "image",
                        className: "rounded-sm",
                        onClick: ()=>setOpen(true)
                    }, void 0, false, {
                        fileName: "[project]/shared/data/pages/profiledata.tsx",
                        lineNumber: 87,
                        columnNumber: 26
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/shared/data/pages/profiledata.tsx",
                    lineNumber: 86,
                    columnNumber: 22
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/shared/data/pages/profiledata.tsx",
                lineNumber: 85,
                columnNumber: 18
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$yet$2d$another$2d$react$2d$lightbox$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"], {
                open: open,
                close: ()=>setOpen(false),
                plugins: [
                    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$yet$2d$another$2d$react$2d$lightbox$2f$dist$2f$plugins$2f$fullscreen$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"],
                    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$yet$2d$another$2d$react$2d$lightbox$2f$dist$2f$plugins$2f$slideshow$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"],
                    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$yet$2d$another$2d$react$2d$lightbox$2f$dist$2f$plugins$2f$thumbnails$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"],
                    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$yet$2d$another$2d$react$2d$lightbox$2f$dist$2f$plugins$2f$zoom$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"]
                ],
                zoom: {
                    maxZoomPixelRatio: 10,
                    scrollToZoom: true
                },
                slides: [
                    {
                        src: "../../assets/images/media/media-40.jpg"
                    },
                    {
                        src: "../../assets/images/media/media-41.jpg"
                    },
                    {
                        src: "../../assets/images/media/media-42.jpg"
                    },
                    {
                        src: "../../assets/images/media/media-43.jpg"
                    },
                    {
                        src: "../../assets/images/media/media-44.jpg"
                    },
                    {
                        src: "../../assets/images/media/media-45.jpg"
                    },
                    {
                        src: "../../assets/images/media/media-46.jpg"
                    },
                    {
                        src: "../../assets/images/media/media-60.jpg"
                    },
                    {
                        src: "../../assets/images/media/media-26.jpg"
                    },
                    {
                        src: "../../assets/images/media/media-32.jpg"
                    },
                    {
                        src: "../../assets/images/media/media-30.jpg"
                    },
                    {
                        src: "../../assets/images/media/media-31.jpg"
                    }
                ]
            }, void 0, false, {
                fileName: "[project]/shared/data/pages/profiledata.tsx",
                lineNumber: 91,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/shared/data/pages/profiledata.tsx",
        lineNumber: 29,
        columnNumber: 9
    }, ("TURBOPACK compile-time value", void 0));
};
_s(LightboxGallery, "xG1TONbKtDWtdOTrXaTAsNhPg/Q=");
_c = LightboxGallery;
const Skillsdata = [
    {
        id: 1,
        text: 'Cloud computing'
    },
    {
        id: 2,
        text: 'Data analysis'
    },
    {
        id: 3,
        text: 'DevOps'
    },
    {
        id: 4,
        text: 'Machine learning'
    },
    {
        id: 5,
        text: 'Programming'
    },
    {
        id: 6,
        text: 'Security'
    },
    {
        id: 7,
        text: 'Python'
    },
    {
        id: 8,
        text: 'JavaScript'
    },
    {
        id: 9,
        text: 'Ruby'
    },
    {
        id: 10,
        text: 'PowerShell'
    },
    {
        id: 11,
        text: 'Statistics'
    },
    {
        id: 12,
        text: 'SQL'
    }
];
const Followersdata = [
    {
        id: 1,
        src: "../../assets/images/faces/15.jpg",
        name: 'Alicia Sierra',
        mail: 'aliciasierra389@gmail.com'
    },
    {
        id: 2,
        src: "../../assets/images/faces/4.jpg",
        name: 'Samantha Mery',
        mail: 'samanthamery@gmail.com'
    },
    {
        id: 3,
        src: "../../assets/images/faces/11.jpg",
        name: 'Juliana Pena',
        mail: 'juliapena555@gmail.com'
    },
    {
        id: 4,
        src: "../../assets/images/faces/5.jpg",
        name: 'Adam Smith',
        mail: 'adamsmith99@gmail.com'
    },
    {
        id: 5,
        src: "../../assets/images/faces/7.jpg",
        name: 'Farhaan Amhed',
        mail: 'farhaanahmed989@gmail.com'
    }
];
const Personalinfodata = [
    {
        id: 1,
        text1: 'Name :',
        text2: 'Sonya Taylor'
    },
    {
        id: 2,
        text1: 'Email :',
        text2: 'sonyataylor231@gmail.com'
    },
    {
        id: 3,
        text1: 'Phone :',
        text2: '+(555) 555-1234'
    },
    {
        id: 4,
        text1: 'Designation :',
        text2: 'C.E.O'
    },
    {
        id: 5,
        text1: 'Age :',
        text2: '28'
    },
    {
        id: 6,
        text1: 'Experience :',
        text2: '10 Years'
    }
];
const RecentPostsdata = [
    {
        id: 1,
        src: "../../assets/images/media/media-39.jpg",
        name: 'Animals',
        text: 'There are many variations of passages of Lorem Ipsum available'
    },
    {
        id: 2,
        src: "../../assets/images/media/media-56.jpg",
        name: 'Travel',
        text: 'Latin words, combined with a handful of model sentence'
    },
    {
        id: 3,
        src: "../../assets/images/media/media-54.jpg",
        name: 'Interior',
        text: 'Contrary to popular belief, Lorem Ipsum is not simply random'
    },
    {
        id: 4,
        src: "../../assets/images/media/media-64.jpg",
        name: 'Nature',
        text: 'It is a long established fact that a reader will be distracted by the readable content'
    }
];
const Suggestionsdata = [
    {
        id: 1,
        src: "../../assets/images/faces/15.jpg",
        name: 'Alister'
    },
    {
        id: 2,
        src: "../../assets/images/faces/4.jpg",
        name: 'Samantha Sams'
    },
    {
        id: 3,
        src: "../../assets/images/faces/11.jpg",
        name: 'Jason Mama'
    },
    {
        id: 4,
        src: "../../assets/images/faces/5.jpg",
        name: 'Alicia Sierra'
    },
    {
        id: 5,
        src: "../../assets/images/faces/7.jpg",
        name: 'Kiara Advain'
    }
];
var _c;
__turbopack_context__.k.register(_c, "LightboxGallery");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/shared/layout-components/page-header/pageheader.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
"use client";
;
;
const Pageheader = (props)=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "block justify-between page-header md:flex",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                        className: "!text-defaulttextcolor dark:!text-defaulttextcolor/70 dark:text-white dark:hover:text-white text-[1.125rem] font-semibold",
                        children: props.currentpage
                    }, void 0, false, {
                        fileName: "[project]/shared/layout-components/page-header/pageheader.tsx",
                        lineNumber: 9,
                        columnNumber: 25
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/shared/layout-components/page-header/pageheader.tsx",
                    lineNumber: 8,
                    columnNumber: 21
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ol", {
                    className: "flex items-center whitespace-nowrap min-w-0",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                            className: "text-[0.813rem] ps-[0.5rem]",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                className: "flex items-center text-primary hover:text-primary dark:text-primary truncate",
                                href: "#!",
                                children: [
                                    props.activepage,
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                        className: "ti ti-chevrons-right flex-shrink-0 text-[#8c9097] dark:text-white/50 px-[0.5rem] overflow-visible rtl:rotate-180"
                                    }, void 0, false, {
                                        fileName: "[project]/shared/layout-components/page-header/pageheader.tsx",
                                        lineNumber: 15,
                                        columnNumber: 29
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/shared/layout-components/page-header/pageheader.tsx",
                                lineNumber: 13,
                                columnNumber: 27
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/shared/layout-components/page-header/pageheader.tsx",
                            lineNumber: 12,
                            columnNumber: 25
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                            className: "text-[0.813rem] text-defaulttextcolor font-semibold hover:text-primary dark:text-[#8c9097] dark:text-white/50 ",
                            "aria-current": "page",
                            children: props.mainpage
                        }, void 0, false, {
                            fileName: "[project]/shared/layout-components/page-header/pageheader.tsx",
                            lineNumber: 18,
                            columnNumber: 25
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/shared/layout-components/page-header/pageheader.tsx",
                    lineNumber: 11,
                    columnNumber: 21
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/shared/layout-components/page-header/pageheader.tsx",
            lineNumber: 7,
            columnNumber: 10
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/shared/layout-components/page-header/pageheader.tsx",
        lineNumber: 6,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_c = Pageheader;
const __TURBOPACK__default__export__ = Pageheader;
var _c;
__turbopack_context__.k.register(_c, "Pageheader");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/shared/layout-components/seo/seo.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
const Seo = ({ title })=>{
    _s();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Seo.useEffect": ()=>{
            document.title = `Dharwin Business Solutions - ${title}`;
        }
    }["Seo.useEffect"], []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {}, void 0, false);
};
_s(Seo, "OD7bBpZva5O2jO+Puf00hKivP7c=");
_c = Seo;
const __TURBOPACK__default__export__ = Seo;
var _c;
__turbopack_context__.k.register(_c, "Seo");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/(components)/(contentlayout)/pages/profile/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$pages$2f$profiledata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/shared/data/pages/profiledata.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$layout$2d$components$2f$page$2d$header$2f$pageheader$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/shared/layout-components/page-header/pageheader.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$layout$2d$components$2f$seo$2f$seo$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/shared/layout-components/seo/seo.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$perfect$2d$scrollbar$2f$lib$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-perfect-scrollbar/lib/index.js [app-client] (ecmascript)");
"use client";
;
;
;
;
;
;
;
;
const Profile = ()=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$layout$2d$components$2f$seo$2f$seo$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                title: "Profile"
            }, void 0, false, {
                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                lineNumber: 13,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$layout$2d$components$2f$page$2d$header$2f$pageheader$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                currentpage: "Profile",
                activepage: "Pages",
                mainpage: "Profile"
            }, void 0, false, {
                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                lineNumber: 14,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid grid-cols-12 gap-x-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "xxl:col-span-4 xl:col-span-12 col-span-12",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "box overflow-hidden",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "box-body !p-0",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "sm:flex items-start p-6      main-profile-cover",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "avatar avatar-xxl avatar-rounded online me-4",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                        src: "../../assets/images/faces/9.jpg",
                                                        alt: ""
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                        lineNumber: 22,
                                                        columnNumber: 41
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                    lineNumber: 21,
                                                    columnNumber: 37
                                                }, ("TURBOPACK compile-time value", void 0))
                                            }, void 0, false, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                lineNumber: 20,
                                                columnNumber: 33
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex-grow main-profile-info",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex items-center !justify-between",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h6", {
                                                                className: "font-semibold mb-1 text-white text-[1rem]",
                                                                children: "Json Taylor"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                lineNumber: 27,
                                                                columnNumber: 41
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                type: "button",
                                                                className: "ti-btn ti-btn-light !font-medium !gap-0",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                        className: "ri-add-line me-1 align-middle inline-block"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                        lineNumber: 28,
                                                                        columnNumber: 115
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    "Follow"
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                lineNumber: 28,
                                                                columnNumber: 41
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                        lineNumber: 26,
                                                        columnNumber: 37
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "mb-1 !text-white  opacity-[0.7]",
                                                        children: "Chief Executive Officer (C.E.O)"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                        lineNumber: 30,
                                                        columnNumber: 37
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-[0.75rem] text-white mb-6 opacity-[0.5]",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "me-4 inline-flex",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                        className: "ri-building-line me-1 align-middle"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                        lineNumber: 32,
                                                                        columnNumber: 76
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    "Georgia"
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                lineNumber: 32,
                                                                columnNumber: 41
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "inline-flex",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                        className: "ri-map-pin-line me-1 align-middle"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                        lineNumber: 33,
                                                                        columnNumber: 71
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    "Washington D.C"
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                lineNumber: 33,
                                                                columnNumber: 41
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                        lineNumber: 31,
                                                        columnNumber: 37
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex mb-0",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "me-6",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                        className: "font-bold text-[1.25rem] text-white text-shadow mb-0",
                                                                        children: "113"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                        lineNumber: 37,
                                                                        columnNumber: 45
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                        className: "mb-0 text-[.6875rem] opacity-[0.5] text-white",
                                                                        children: "Projects"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                        lineNumber: 38,
                                                                        columnNumber: 45
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                lineNumber: 36,
                                                                columnNumber: 41
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "me-6",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                        className: "font-bold text-[1.25rem] text-white text-shadow mb-0",
                                                                        children: "12.2k"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                        lineNumber: 41,
                                                                        columnNumber: 45
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                        className: "mb-0 text-[.6875rem] opacity-[0.5] text-white",
                                                                        children: "Followers"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                        lineNumber: 42,
                                                                        columnNumber: 45
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                lineNumber: 40,
                                                                columnNumber: 41
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "me-6",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                        className: "font-bold text-[1.25rem] text-white text-shadow mb-0",
                                                                        children: "128"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                        lineNumber: 45,
                                                                        columnNumber: 45
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                        className: "mb-0 text-[.6875rem] opacity-[0.5] text-white",
                                                                        children: "Following"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                        lineNumber: 46,
                                                                        columnNumber: 45
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                lineNumber: 44,
                                                                columnNumber: 41
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                        lineNumber: 35,
                                                        columnNumber: 37
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                lineNumber: 25,
                                                columnNumber: 33
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                        lineNumber: 19,
                                        columnNumber: 29
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "p-6 border-b border-dashed dark:border-defaultborder/10",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "mb-6",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-[.9375rem] mb-2 font-semibold",
                                                        children: "Professional Bio :"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                        lineNumber: 53,
                                                        columnNumber: 37
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-[0.75rem] text-[#8c9097] dark:text-white/50 opacity-[0.7] mb-0",
                                                        children: [
                                                            "I am ",
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                                className: "text-defaulttextcolor",
                                                                children: "Sonya Taylor,"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                lineNumber: 55,
                                                                columnNumber: 46
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            " here by conclude that,i am the founder and managing director of the prestigeous company name laugh at all and acts as the cheif executieve officer of the company."
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                        lineNumber: 54,
                                                        columnNumber: 37
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                lineNumber: 52,
                                                columnNumber: 33
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "mb-0",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-[.9375rem] mb-2 font-semibold",
                                                        children: "Links :"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                        lineNumber: 59,
                                                        columnNumber: 37
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "mb-0",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "mb-1",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                    href: "https://www.spruko.com/",
                                                                    target: "_blank",
                                                                    className: "text-primary",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("u", {
                                                                        children: "https://www.spruko.com/"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                        lineNumber: 62,
                                                                        columnNumber: 123
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                    lineNumber: 62,
                                                                    columnNumber: 45
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                lineNumber: 61,
                                                                columnNumber: 41
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "mb-0",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                    href: "https://themeforest.net/user/spruko/portfolio",
                                                                    target: "_blank",
                                                                    className: "text-primary",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("u", {
                                                                        children: "https://themeforest.net/user/ spruko/portfolio"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                        lineNumber: 65,
                                                                        columnNumber: 145
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                    lineNumber: 65,
                                                                    columnNumber: 45
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                lineNumber: 64,
                                                                columnNumber: 41
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                        lineNumber: 60,
                                                        columnNumber: 37
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                lineNumber: 58,
                                                columnNumber: 33
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                        lineNumber: 51,
                                        columnNumber: 29
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "p-6 border-b border-dashed dark:border-defaultborder/10",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-[.9375rem] mb-2 me-6 font-semibold",
                                                children: "Contact Information :"
                                            }, void 0, false, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                lineNumber: 71,
                                                columnNumber: 33
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-[#8c9097] dark:text-white/50",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "mb-2",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "avatar avatar-sm avatar-rounded me-2 bg-light text-[#8c9097] dark:text-white/50",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                    className: "ri-mail-line align-middle text-[.875rem] text-[#8c9097] dark:text-white/50"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                    lineNumber: 75,
                                                                    columnNumber: 45
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                lineNumber: 74,
                                                                columnNumber: 41
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            "sonyataylor2531@gmail.com"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                        lineNumber: 73,
                                                        columnNumber: 37
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "mb-2",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "avatar avatar-sm avatar-rounded me-2 bg-light text-[#8c9097] dark:text-white/50",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                    className: "ri-phone-line align-middle text-[.875rem] text-[#8c9097] dark:text-white/50"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                    lineNumber: 81,
                                                                    columnNumber: 45
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                lineNumber: 80,
                                                                columnNumber: 41
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            "+(555) 555-1234"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                        lineNumber: 79,
                                                        columnNumber: 37
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "mb-0",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "avatar avatar-sm avatar-rounded me-2 bg-light text-[#8c9097] dark:text-white/50",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                    className: "ri-map-pin-line align-middle text-[.875rem] text-[#8c9097] dark:text-white/50"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                    lineNumber: 87,
                                                                    columnNumber: 45
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                lineNumber: 86,
                                                                columnNumber: 41
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            "MIG-1-11, Monroe Street, Georgetown, Washington D.C, USA,20071"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                        lineNumber: 85,
                                                        columnNumber: 37
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                lineNumber: 72,
                                                columnNumber: 33
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                        lineNumber: 70,
                                        columnNumber: 29
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "p-6 border-b dark:border-defaultborder/10 border-dashed sm:flex items-center",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-[.9375rem] mb-2 me-6 font-semibold",
                                                children: "Social Networks :"
                                            }, void 0, false, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                lineNumber: 94,
                                                columnNumber: 33
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "btn-list mb-0",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        "aria-label": "button",
                                                        type: "button",
                                                        className: "ti-btn ti-btn-sm ti-btn-primary text-primary me-[.375rem] mb-1",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                            className: "ri-facebook-line font-semibold"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                            lineNumber: 97,
                                                            columnNumber: 41
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                        lineNumber: 96,
                                                        columnNumber: 37
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        "aria-label": "button",
                                                        type: "button",
                                                        className: "ti-btn ti-btn-sm ti-btn-secondary me-[.375rem] mb-1",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                            className: "ri-twitter-x-line font-semibold"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                            lineNumber: 100,
                                                            columnNumber: 41
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                        lineNumber: 99,
                                                        columnNumber: 37
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        "aria-label": "button",
                                                        type: "button",
                                                        className: "ti-btn ti-btn-sm ti-btn-warning me-[.375rem] mb-1",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                            className: "ri-instagram-line font-semibold"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                            lineNumber: 103,
                                                            columnNumber: 41
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                        lineNumber: 102,
                                                        columnNumber: 37
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        "aria-label": "button",
                                                        type: "button",
                                                        className: "ti-btn ti-btn-sm ti-btn-success me-[.375rem] mb-1",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                            className: "ri-github-line font-semibold"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                            lineNumber: 106,
                                                            columnNumber: 41
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                        lineNumber: 105,
                                                        columnNumber: 37
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        "aria-label": "button",
                                                        type: "button",
                                                        className: "ti-btn ti-btn-sm ti-btn-danger me-[.375rem] mb-1",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                            className: "ri-youtube-line font-semibold"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                            lineNumber: 109,
                                                            columnNumber: 41
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                        lineNumber: 108,
                                                        columnNumber: 37
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                lineNumber: 95,
                                                columnNumber: 33
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                        lineNumber: 93,
                                        columnNumber: 29
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "p-6 border-b dark:border-defaultborder/10 border-dashed",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-[.9375rem] mb-2 me-6 font-semibold",
                                                children: "Skills :"
                                            }, void 0, false, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                lineNumber: 114,
                                                columnNumber: 33
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$pages$2f$profiledata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skillsdata"].map((idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                        href: "#!",
                                                        scroll: false,
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "badge bg-light text-[#8c9097] dark:text-white/50 m-1",
                                                            children: idx.text
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                            lineNumber: 119,
                                                            columnNumber: 41
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, Math.random(), false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                        lineNumber: 118,
                                                        columnNumber: 37
                                                    }, ("TURBOPACK compile-time value", void 0)))
                                            }, void 0, false, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                lineNumber: 115,
                                                columnNumber: 33
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                        lineNumber: 113,
                                        columnNumber: 29
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "p-6",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-[.9375rem] mb-2 me-6 font-semibold",
                                                children: "Followers :"
                                            }, void 0, false, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                lineNumber: 125,
                                                columnNumber: 33
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                                className: "list-group",
                                                children: __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$pages$2f$profiledata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Followersdata"].map((idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                        className: "list-group-item",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "sm:flex items-start",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "avatar avatar-sm",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                        src: idx.src,
                                                                        alt: "img",
                                                                        className: "rounded-md"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                        lineNumber: 132,
                                                                        columnNumber: 49
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                    lineNumber: 131,
                                                                    columnNumber: 45
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "sm:ms-2 ms-0 sm:mt-0 mt-1 font-semibold flex-grow",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                            className: "mb-0 leading-none",
                                                                            children: idx.name
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                            lineNumber: 135,
                                                                            columnNumber: 49
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            className: "text-[.6875rem] text-[#8c9097] dark:text-white/50 opacity-[0.7]",
                                                                            children: idx.mail
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                            lineNumber: 136,
                                                                            columnNumber: 49
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                    lineNumber: 134,
                                                                    columnNumber: 45
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                    type: "button",
                                                                    className: "ti-btn ti-btn-light !py-1 !px-2 !text-[0.75rem]",
                                                                    children: "Follow"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                    lineNumber: 138,
                                                                    columnNumber: 45
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                            lineNumber: 130,
                                                            columnNumber: 41
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, Math.random(), false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                        lineNumber: 129,
                                                        columnNumber: 37
                                                    }, ("TURBOPACK compile-time value", void 0)))
                                            }, void 0, false, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                lineNumber: 126,
                                                columnNumber: 33
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                        lineNumber: 124,
                                        columnNumber: 29
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                lineNumber: 18,
                                columnNumber: 25
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                            lineNumber: 17,
                            columnNumber: 21
                        }, ("TURBOPACK compile-time value", void 0))
                    }, void 0, false, {
                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                        lineNumber: 16,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "xxl:col-span-8 xl:col-span-12 col-span-12",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "grid grid-cols-12 gap-x-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "xl:col-span-12 col-span-12",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "box",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "box-body !p-0",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "!p-4 border-b dark:border-defaultborder/10 border-dashed md:flex items-center justify-between",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                                                            className: "-mb-0.5 sm:flex md:space-x-4 rtl:space-x-reverse pb-2",
                                                            role: "tablist",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                    className: "w-full sm:w-auto flex active hs-tab-active:font-semibold  hs-tab-active:text-white hs-tab-active:bg-primary rounded-md py-2 px-4 text-primary text-sm",
                                                                    href: "#!",
                                                                    scroll: false,
                                                                    id: "activity-tab",
                                                                    "data-hs-tab": "#activity-tab-pane",
                                                                    "aria-controls": "activity-tab-pane",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                            className: "ri-gift-line  align-middle inline-block me-1"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                            lineNumber: 155,
                                                                            columnNumber: 49
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        "Activity"
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                    lineNumber: 154,
                                                                    columnNumber: 45
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                    className: "w-full sm:w-auto flex hs-tab-active:font-semibold  hs-tab-active:text-white hs-tab-active:bg-primary rounded-md  py-2 px-4 text-primary text-sm",
                                                                    href: "#!",
                                                                    scroll: false,
                                                                    id: "posts-tab",
                                                                    "data-hs-tab": "#posts-tab-pane",
                                                                    "aria-controls": "posts-tab-pane",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                            className: "ri-bill-line me-1 align-middle inline-block"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                            lineNumber: 158,
                                                                            columnNumber: 49
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        "Posts"
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                    lineNumber: 157,
                                                                    columnNumber: 45
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                    className: "w-full sm:w-auto flex hs-tab-active:font-semibold  hs-tab-active:text-white hs-tab-active:bg-primary rounded-md  py-2 px-4 text-primary text-sm",
                                                                    href: "#!",
                                                                    scroll: false,
                                                                    id: "followers-tab",
                                                                    "data-hs-tab": "#followers-tab-pane",
                                                                    "aria-controls": "followers-tab-pane",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                            className: "ri-money-dollar-box-line me-1 align-middle inline-block"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                            lineNumber: 161,
                                                                            columnNumber: 49
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        "Friends"
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                    lineNumber: 160,
                                                                    columnNumber: 45
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                    className: "w-full sm:w-auto flex hs-tab-active:font-semibold  hs-tab-active:text-white hs-tab-active:bg-primary rounded-md  py-2 px-4 text-primary text-sm",
                                                                    href: "#!",
                                                                    scroll: false,
                                                                    id: "gallery-tab",
                                                                    "data-hs-tab": "#gallery-tab-pane",
                                                                    "aria-controls": "gallery-tab-pane",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                            className: "ri-exchange-box-line me-1 align-middle inline-block"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                            lineNumber: 164,
                                                                            columnNumber: 49
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        "Gallery"
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                    lineNumber: 163,
                                                                    columnNumber: 45
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                            lineNumber: 153,
                                                            columnNumber: 41
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                    className: "font-semibold mb-2",
                                                                    children: [
                                                                        "Profile 60% completed - ",
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                            href: "#!",
                                                                            scroll: false,
                                                                            className: "text-primary text-[0.75rem]",
                                                                            children: "Finish now"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                            lineNumber: 168,
                                                                            columnNumber: 103
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                    lineNumber: 168,
                                                                    columnNumber: 45
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "progress progress-xs progress-animate",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "progress-bar bg-primary w-[60%]",
                                                                        role: "progressbar",
                                                                        "aria-valuenow": 60,
                                                                        "aria-valuemin": 0,
                                                                        "aria-valuemax": 100
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                        lineNumber: 170,
                                                                        columnNumber: 49
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                    lineNumber: 169,
                                                                    columnNumber: 45
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                            lineNumber: 167,
                                                            columnNumber: 41
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                    lineNumber: 152,
                                                    columnNumber: 37
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "!p-4",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "tab-content",
                                                        id: "myTabContent",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "tab-pane show active fade !p-0 !border-0",
                                                                id: "activity-tab-pane",
                                                                role: "tabpanel",
                                                                "aria-labelledby": "activity-tab",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                                                    className: "list-none profile-timeline",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                        className: "avatar avatar-sm bg-primary/10  !text-primary avatar-rounded profile-timeline-avatar",
                                                                                        children: "E"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                        lineNumber: 181,
                                                                                        columnNumber: 61
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                        className: "mb-2",
                                                                                        children: [
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                                                                children: "You"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                lineNumber: 185,
                                                                                                columnNumber: 65
                                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                                            " Commented on ",
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                                                                children: "alexander taylor"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                lineNumber: 185,
                                                                                                columnNumber: 89
                                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                                            " post ",
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                                className: "text-secondary",
                                                                                                href: "#!",
                                                                                                scroll: false,
                                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("u", {
                                                                                                    children: "#beautiful day"
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                    lineNumber: 185,
                                                                                                    columnNumber: 176
                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                lineNumber: 185,
                                                                                                columnNumber: 118
                                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                                            ".",
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                className: "ltr:float-right rtl:float-left text-[.6875rem] text-[#8c9097] dark:text-white/50",
                                                                                                children: "24,Dec 2022 - 14:34"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                lineNumber: 185,
                                                                                                columnNumber: 205
                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                        lineNumber: 184,
                                                                                        columnNumber: 61
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                        className: "profile-activity-media mb-0 flex w-full mt-2 sm:mt-0",
                                                                                        children: [
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                                "aria-label": "anchor",
                                                                                                href: "#!",
                                                                                                scroll: false,
                                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                                                    src: "../../assets/images/media/media-17.jpg",
                                                                                                    alt: ""
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                    lineNumber: 189,
                                                                                                    columnNumber: 69
                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                lineNumber: 188,
                                                                                                columnNumber: 65
                                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                                "aria-label": "anchor",
                                                                                                href: "#!",
                                                                                                scroll: false,
                                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                                                    src: "../../assets/images/media/media-18.jpg",
                                                                                                    alt: ""
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                    lineNumber: 192,
                                                                                                    columnNumber: 69
                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                lineNumber: 191,
                                                                                                columnNumber: 65
                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                        lineNumber: 187,
                                                                                        columnNumber: 61
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                lineNumber: 180,
                                                                                columnNumber: 57
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                            lineNumber: 179,
                                                                            columnNumber: 53
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                        className: "avatar avatar-sm avatar-rounded profile-timeline-avatar",
                                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                                            src: "../../assets/images/faces/11.jpg",
                                                                                            alt: ""
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                            lineNumber: 200,
                                                                                            columnNumber: 65
                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                        lineNumber: 199,
                                                                                        columnNumber: 61
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                        className: "text-[#8c9097] dark:text-white/50 mb-2",
                                                                                        children: [
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                className: "text-default",
                                                                                                children: [
                                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                                                                        children: "Json Smith"
                                                                                                    }, void 0, false, {
                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                        lineNumber: 203,
                                                                                                        columnNumber: 96
                                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                                    " reacted to the post 👍"
                                                                                                ]
                                                                                            }, void 0, true, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                lineNumber: 203,
                                                                                                columnNumber: 65
                                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                                            ".",
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                className: "ltr:float-right rtl:float-left text-[.6875rem] text-[#8c9097] dark:text-white/50",
                                                                                                children: "18,Dec 2022 - 12:16"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                lineNumber: 203,
                                                                                                columnNumber: 144
                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                        lineNumber: 202,
                                                                                        columnNumber: 61
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                        className: "text-[#8c9097] dark:text-white/50 mb-0",
                                                                                        children: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Repudiandae, repellendus rem rerum excepturi aperiam ipsam temporibus inventore ullam tempora eligendi libero sequi dignissimos cumque, et a sint tenetur consequatur omnis!"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                        lineNumber: 205,
                                                                                        columnNumber: 61
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                lineNumber: 198,
                                                                                columnNumber: 57
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                            lineNumber: 197,
                                                                            columnNumber: 53
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                        className: "avatar avatar-sm avatar-rounded profile-timeline-avatar",
                                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                                            src: "../../assets/images/faces/4.jpg",
                                                                                            alt: ""
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                            lineNumber: 213,
                                                                                            columnNumber: 65
                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                        lineNumber: 212,
                                                                                        columnNumber: 61
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                        className: "text-[#8c9097] dark:text-white/50 mb-2",
                                                                                        children: [
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                className: "text-default",
                                                                                                children: [
                                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                                                                        children: "Alicia Keys"
                                                                                                    }, void 0, false, {
                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                        lineNumber: 216,
                                                                                                        columnNumber: 96
                                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                                    " shared a document with ",
                                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                                                                        children: "you"
                                                                                                    }, void 0, false, {
                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                        lineNumber: 216,
                                                                                                        columnNumber: 138
                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                ]
                                                                                            }, void 0, true, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                lineNumber: 216,
                                                                                                columnNumber: 65
                                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                                            ".",
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                className: "ltr:float-right rtl:float-left text-[.6875rem] text-[#8c9097] dark:text-white/50",
                                                                                                children: "21,Dec 2022 - 15:32"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                lineNumber: 216,
                                                                                                columnNumber: 156
                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                        lineNumber: 215,
                                                                                        columnNumber: 61
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                        className: "profile-activity-media mb-0 flex w-full mt-2 sm:mt-0 items-center",
                                                                                        children: [
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                                "aria-label": "anchor",
                                                                                                href: "#!",
                                                                                                scroll: false,
                                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                                                    src: "../../assets/images/media/file-manager/3.png",
                                                                                                    alt: ""
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                    lineNumber: 220,
                                                                                                    columnNumber: 69
                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                lineNumber: 219,
                                                                                                columnNumber: 65
                                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                className: "text-[.6875rem] text-[#8c9097] dark:text-white/50",
                                                                                                children: "432.87KB"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                lineNumber: 222,
                                                                                                columnNumber: 65
                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                        lineNumber: 218,
                                                                                        columnNumber: 61
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                lineNumber: 211,
                                                                                columnNumber: 57
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                            lineNumber: 210,
                                                                            columnNumber: 53
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                        className: "avatar avatar-sm bg-success/10 !text-success avatar-rounded profile-timeline-avatar",
                                                                                        children: "P"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                        lineNumber: 228,
                                                                                        columnNumber: 61
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                        className: "text-[#8c9097] dark:text-white/50 mb-4",
                                                                                        children: [
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                className: "text-default",
                                                                                                children: [
                                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                                                                        children: "You"
                                                                                                    }, void 0, false, {
                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                        lineNumber: 232,
                                                                                                        columnNumber: 96
                                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                                    " shared a post with 4 people ",
                                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                                                                        children: "Simon,Sasha, Anagha,Hishen"
                                                                                                    }, void 0, false, {
                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                        lineNumber: 232,
                                                                                                        columnNumber: 135
                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                ]
                                                                                            }, void 0, true, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                lineNumber: 232,
                                                                                                columnNumber: 65
                                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                                            ".",
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                className: "ltr:float-right rtl:float-left text-[.6875rem] text-[#8c9097] dark:text-white/50",
                                                                                                children: "28,Dec 2022 - 18:46"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                lineNumber: 232,
                                                                                                columnNumber: 176
                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                        lineNumber: 231,
                                                                                        columnNumber: 61
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                        className: "profile-activity-media mb-4",
                                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                            "aria-label": "anchor",
                                                                                            href: "#!",
                                                                                            scroll: false,
                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                                                src: "../../assets/images/media/media-75.jpg",
                                                                                                alt: ""
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                lineNumber: 236,
                                                                                                columnNumber: 69
                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                            lineNumber: 235,
                                                                                            columnNumber: 65
                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                        lineNumber: 234,
                                                                                        columnNumber: 61
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                            className: "avatar-list-stacked",
                                                                                            children: [
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                    className: "avatar avatar-sm avatar-rounded",
                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                                                        src: "../../assets/images/faces/2.jpg",
                                                                                                        alt: "img"
                                                                                                    }, void 0, false, {
                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                        lineNumber: 242,
                                                                                                        columnNumber: 73
                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                    lineNumber: 241,
                                                                                                    columnNumber: 69
                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                    className: "avatar avatar-sm avatar-rounded",
                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                                                        src: "../../assets/images/faces/8.jpg",
                                                                                                        alt: "img"
                                                                                                    }, void 0, false, {
                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                        lineNumber: 245,
                                                                                                        columnNumber: 73
                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                    lineNumber: 244,
                                                                                                    columnNumber: 69
                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                    className: "avatar avatar-sm avatar-rounded",
                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                                                        src: "../../assets/images/faces/2.jpg",
                                                                                                        alt: "img"
                                                                                                    }, void 0, false, {
                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                        lineNumber: 248,
                                                                                                        columnNumber: 73
                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                    lineNumber: 247,
                                                                                                    columnNumber: 69
                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                    className: "avatar avatar-sm avatar-rounded",
                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                                                        src: "../../assets/images/faces/10.jpg",
                                                                                                        alt: "img"
                                                                                                    }, void 0, false, {
                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                        lineNumber: 251,
                                                                                                        columnNumber: 73
                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                    lineNumber: 250,
                                                                                                    columnNumber: 69
                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                            ]
                                                                                        }, void 0, true, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                            lineNumber: 240,
                                                                                            columnNumber: 65
                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                        lineNumber: 239,
                                                                                        columnNumber: 61
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                lineNumber: 227,
                                                                                columnNumber: 57
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                            lineNumber: 226,
                                                                            columnNumber: 53
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                        className: "avatar avatar-sm avatar-rounded profile-timeline-avatar",
                                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                                            src: "../../assets/images/faces/5.jpg",
                                                                                            alt: ""
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                            lineNumber: 260,
                                                                                            columnNumber: 65
                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                        lineNumber: 259,
                                                                                        columnNumber: 61
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                        className: "text-[#8c9097] dark:text-white/50 mb-1",
                                                                                        children: [
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                className: "text-default",
                                                                                                children: [
                                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                                                                        children: "Melissa Blue"
                                                                                                    }, void 0, false, {
                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                        lineNumber: 263,
                                                                                                        columnNumber: 96
                                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                                    " liked your post ",
                                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                                                                        children: "travel excites"
                                                                                                    }, void 0, false, {
                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                        lineNumber: 263,
                                                                                                        columnNumber: 132
                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                ]
                                                                                            }, void 0, true, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                lineNumber: 263,
                                                                                                columnNumber: 65
                                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                                            ".",
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                className: "ltr:float-right rtl:float-left text-[.6875rem] text-[#8c9097] dark:text-white/50",
                                                                                                children: "11,Dec 2022 - 11:18"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                lineNumber: 263,
                                                                                                columnNumber: 161
                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                        lineNumber: 262,
                                                                                        columnNumber: 61
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                        className: "text-[#8c9097] dark:text-white/50",
                                                                                        children: "you are already feeling the tense atmosphere of the video playing in the background"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                        lineNumber: 265,
                                                                                        columnNumber: 61
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                        className: "profile-activity-media sm:flex mb-0",
                                                                                        children: [
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                                "aria-label": "anchor",
                                                                                                href: "#!",
                                                                                                scroll: false,
                                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                                                    src: "../../assets/images/media/media-59.jpg",
                                                                                                    className: "m-1",
                                                                                                    alt: ""
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                    lineNumber: 268,
                                                                                                    columnNumber: 69
                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                lineNumber: 267,
                                                                                                columnNumber: 65
                                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                                "aria-label": "anchor",
                                                                                                href: "#!",
                                                                                                scroll: false,
                                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                                                    src: "../../assets/images/media/media-60.jpg",
                                                                                                    className: "m-1",
                                                                                                    alt: ""
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                    lineNumber: 271,
                                                                                                    columnNumber: 69
                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                lineNumber: 270,
                                                                                                columnNumber: 65
                                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                                "aria-label": "anchor",
                                                                                                href: "#!",
                                                                                                scroll: false,
                                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                                                    src: "../../assets/images/media/media-61.jpg",
                                                                                                    className: "m-1",
                                                                                                    alt: ""
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                    lineNumber: 274,
                                                                                                    columnNumber: 69
                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                lineNumber: 273,
                                                                                                columnNumber: 65
                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                        lineNumber: 266,
                                                                                        columnNumber: 61
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                lineNumber: 258,
                                                                                columnNumber: 57
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                            lineNumber: 257,
                                                                            columnNumber: 53
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                        className: "avatar avatar-sm avatar-rounded profile-timeline-avatar",
                                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                                            src: "../../assets/images/media/media-39.jpg",
                                                                                            alt: ""
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                            lineNumber: 282,
                                                                                            columnNumber: 65
                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                        lineNumber: 281,
                                                                                        columnNumber: 61
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                        className: "mb-1",
                                                                                        children: [
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                                                                children: "You"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                lineNumber: 285,
                                                                                                columnNumber: 65
                                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                                            " Commented on ",
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                                                                children: "Peter Engola"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                lineNumber: 285,
                                                                                                columnNumber: 89
                                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                                            " post ",
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                                className: "text-secondary",
                                                                                                href: "#!",
                                                                                                scroll: false,
                                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("u", {
                                                                                                    children: "#Mother Nature"
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                    lineNumber: 285,
                                                                                                    columnNumber: 172
                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                lineNumber: 285,
                                                                                                columnNumber: 114
                                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                                            ".",
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                className: "ltr:float-right rtl:float-left text-[.6875rem] text-[#8c9097] dark:text-white/50",
                                                                                                children: "24,Dec 2022 - 14:34"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                lineNumber: 285,
                                                                                                columnNumber: 201
                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                        lineNumber: 284,
                                                                                        columnNumber: 61
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                        className: "text-[#8c9097] dark:text-white/50",
                                                                                        children: "Technology id developing rapidly kepp uo your work 👌"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                        lineNumber: 287,
                                                                                        columnNumber: 61
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                        className: "profile-activity-media mb-0 flex w-full mt-2 sm:mt-0",
                                                                                        children: [
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                                "aria-label": "anchor",
                                                                                                href: "#!",
                                                                                                scroll: false,
                                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                                                    src: "../../assets/images/media/media-26.jpg",
                                                                                                    alt: ""
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                    lineNumber: 290,
                                                                                                    columnNumber: 69
                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                lineNumber: 289,
                                                                                                columnNumber: 65
                                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                                "aria-label": "anchor",
                                                                                                href: "#!",
                                                                                                scroll: false,
                                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                                                    src: "../../assets/images/media/media-29.jpg",
                                                                                                    alt: ""
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                    lineNumber: 293,
                                                                                                    columnNumber: 69
                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                lineNumber: 292,
                                                                                                columnNumber: 65
                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                        lineNumber: 288,
                                                                                        columnNumber: 61
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                lineNumber: 280,
                                                                                columnNumber: 57
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                            lineNumber: 279,
                                                                            columnNumber: 53
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                    lineNumber: 178,
                                                                    columnNumber: 49
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                lineNumber: 176,
                                                                columnNumber: 45
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "tab-pane fade !p-0 !border-0 hidden !rounded-md",
                                                                id: "posts-tab-pane",
                                                                role: "tabpanel",
                                                                "aria-labelledby": "posts-tab",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                                                    className: "list-group !rounded-md",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                                            className: "list-group-item",
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "sm:flex items-center leading-none",
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                        className: "me-4",
                                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                            className: "avatar avatar-md avatar-rounded",
                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                                                src: "../../assets/images/faces/9.jpg",
                                                                                                alt: ""
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                lineNumber: 307,
                                                                                                columnNumber: 69
                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                            lineNumber: 306,
                                                                                            columnNumber: 65
                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                        lineNumber: 305,
                                                                                        columnNumber: 61
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                        className: "flex-grow",
                                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                            className: "flex",
                                                                                            children: [
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                                    type: "text",
                                                                                                    className: "form-control !rounded-e-none !w-full",
                                                                                                    placeholder: "Recipient's username",
                                                                                                    "aria-label": "Recipient's username with two button addons"
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                    lineNumber: 312,
                                                                                                    columnNumber: 69
                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                                    "aria-label": "button",
                                                                                                    className: "ti-btn ti-btn-light !rounded-none !mb-0",
                                                                                                    type: "button",
                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                                                        className: "bi bi-emoji-smile"
                                                                                                    }, void 0, false, {
                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                        lineNumber: 313,
                                                                                                        columnNumber: 163
                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                    lineNumber: 313,
                                                                                                    columnNumber: 69
                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                                    "aria-label": "button",
                                                                                                    className: "ti-btn ti-btn-light !rounded-none !mb-0",
                                                                                                    type: "button",
                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                                                        className: "bi bi-paperclip"
                                                                                                    }, void 0, false, {
                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                        lineNumber: 314,
                                                                                                        columnNumber: 163
                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                    lineNumber: 314,
                                                                                                    columnNumber: 69
                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                                    "aria-label": "button",
                                                                                                    className: "ti-btn ti-btn-light !rounded-none !mb-0",
                                                                                                    type: "button",
                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                                                        className: "bi bi-camera"
                                                                                                    }, void 0, false, {
                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                        lineNumber: 315,
                                                                                                        columnNumber: 163
                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                    lineNumber: 315,
                                                                                                    columnNumber: 69
                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                                    className: "ti-btn bg-primary !mb-0 !rounded-s-none text-white",
                                                                                                    type: "button",
                                                                                                    children: "Post"
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                    lineNumber: 316,
                                                                                                    columnNumber: 69
                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                            ]
                                                                                        }, void 0, true, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                            lineNumber: 311,
                                                                                            columnNumber: 65
                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                        lineNumber: 310,
                                                                                        columnNumber: 61
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                lineNumber: 304,
                                                                                columnNumber: 57
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                            lineNumber: 303,
                                                                            columnNumber: 53
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                                            className: "list-group-item",
                                                                            id: "profile-posts-scroll",
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$perfect$2d$scrollbar$2f$lib$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "grid grid-cols-12 gap-4",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                            className: "xxl:col-span-12 xl:col-span-12 lg:col-span-12 md:col-span-12 col-span-12",
                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                className: "rounded border dark:border-defaultborder/10",
                                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                    className: "p-4 flex items-start flex-wrap",
                                                                                                    children: [
                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                            className: "me-2",
                                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                                className: "avatar avatar-sm avatar-rounded",
                                                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                                                                    src: "../../assets/images/faces/9.jpg",
                                                                                                                    alt: ""
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 329,
                                                                                                                    columnNumber: 81
                                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                                            }, void 0, false, {
                                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                lineNumber: 328,
                                                                                                                columnNumber: 77
                                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                                        }, void 0, false, {
                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                            lineNumber: 327,
                                                                                                            columnNumber: 73
                                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                            className: "flex-grow",
                                                                                                            children: [
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                                                    className: "mb-1 font-semibold leading-none",
                                                                                                                    children: "You"
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 333,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                                                    className: "text-[.6875rem] mb-2 text-[#8c9097] dark:text-white/50",
                                                                                                                    children: "24, Dec - 04:32PM"
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 334,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                                                    className: "text-[0.75rem] text-[#8c9097] dark:text-white/50 mb-0",
                                                                                                                    children: "Lorem ipsum dolor sit amet consectetur adipisicing elit."
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 335,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                                                    className: "text-[0.75rem] text-[#8c9097] dark:text-white/50 mb-4",
                                                                                                                    children: "As opposed to using 'Content here 👌"
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 336,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                    className: "flex items-center justify-between md:mb-0 mb-2",
                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                            className: "btn-list",
                                                                                                                            children: [
                                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                                                                    type: "button",
                                                                                                                                    className: "ti-btn ti-btn-primary !me-[.375rem] !py-1 !px-2 !text-[0.75rem] !font-medium btn-wave",
                                                                                                                                    children: "Comment"
                                                                                                                                }, void 0, false, {
                                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                    lineNumber: 340,
                                                                                                                                    columnNumber: 89
                                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                                                                    "aria-label": "button",
                                                                                                                                    type: "button",
                                                                                                                                    className: "ti-btn !me-[.375rem] ti-btn-sm ti-btn-success",
                                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                                                                                        className: "ri-thumb-up-line"
                                                                                                                                    }, void 0, false, {
                                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                        lineNumber: 344,
                                                                                                                                        columnNumber: 93
                                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                }, void 0, false, {
                                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                    lineNumber: 343,
                                                                                                                                    columnNumber: 89
                                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                                                                    "aria-label": "button",
                                                                                                                                    type: "button",
                                                                                                                                    className: "ti-btn ti-btn-sm ti-btn-danger",
                                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                                                                                        className: "ri-share-line"
                                                                                                                                    }, void 0, false, {
                                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                        lineNumber: 347,
                                                                                                                                        columnNumber: 93
                                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                }, void 0, false, {
                                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                    lineNumber: 346,
                                                                                                                                    columnNumber: 89
                                                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                                                            ]
                                                                                                                        }, void 0, true, {
                                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                            lineNumber: 339,
                                                                                                                            columnNumber: 85
                                                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                                                    }, void 0, false, {
                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                        lineNumber: 338,
                                                                                                                        columnNumber: 81
                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 337,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                                            ]
                                                                                                        }, void 0, true, {
                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                            lineNumber: 332,
                                                                                                            columnNumber: 73
                                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                            className: "flex items-start",
                                                                                                            children: [
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                                        className: "badge bg-primary/10 text-primary me-2",
                                                                                                                        children: "Fashion"
                                                                                                                    }, void 0, false, {
                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                        lineNumber: 355,
                                                                                                                        columnNumber: 81
                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 354,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                        className: "hs-dropdown ti-dropdown",
                                                                                                                        children: [
                                                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                                                                "aria-label": "button",
                                                                                                                                type: "button",
                                                                                                                                className: "ti-btn ti-btn-sm ti-btn-light",
                                                                                                                                "aria-expanded": "false",
                                                                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                                                                                    className: "ti ti-dots-vertical"
                                                                                                                                }, void 0, false, {
                                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                    lineNumber: 360,
                                                                                                                                    columnNumber: 89
                                                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                                                            }, void 0, false, {
                                                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                lineNumber: 359,
                                                                                                                                columnNumber: 85
                                                                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                                                                                                                className: "hs-dropdown-menu ti-dropdown-menu hidden",
                                                                                                                                children: [
                                                                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                                                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                                                                            className: "ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block",
                                                                                                                                            href: "#!",
                                                                                                                                            scroll: false,
                                                                                                                                            children: "Delete"
                                                                                                                                        }, void 0, false, {
                                                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                            lineNumber: 363,
                                                                                                                                            columnNumber: 93
                                                                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                    }, void 0, false, {
                                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                        lineNumber: 363,
                                                                                                                                        columnNumber: 89
                                                                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                                                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                                                                            className: "ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block",
                                                                                                                                            href: "#!",
                                                                                                                                            scroll: false,
                                                                                                                                            children: "Hide"
                                                                                                                                        }, void 0, false, {
                                                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                            lineNumber: 364,
                                                                                                                                            columnNumber: 93
                                                                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                    }, void 0, false, {
                                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                        lineNumber: 364,
                                                                                                                                        columnNumber: 89
                                                                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                                                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                                                                            className: "ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block",
                                                                                                                                            href: "#!",
                                                                                                                                            scroll: false,
                                                                                                                                            children: "Edit"
                                                                                                                                        }, void 0, false, {
                                                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                            lineNumber: 365,
                                                                                                                                            columnNumber: 93
                                                                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                    }, void 0, false, {
                                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                        lineNumber: 365,
                                                                                                                                        columnNumber: 89
                                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                ]
                                                                                                                            }, void 0, true, {
                                                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                lineNumber: 362,
                                                                                                                                columnNumber: 85
                                                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                                                        ]
                                                                                                                    }, void 0, true, {
                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                        lineNumber: 358,
                                                                                                                        columnNumber: 81
                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 357,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                                            ]
                                                                                                        }, void 0, true, {
                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                            lineNumber: 353,
                                                                                                            columnNumber: 73
                                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                                    ]
                                                                                                }, void 0, true, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                    lineNumber: 326,
                                                                                                    columnNumber: 69
                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                lineNumber: 325,
                                                                                                columnNumber: 65
                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                            lineNumber: 324,
                                                                                            columnNumber: 61
                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                            className: "xxl:col-span-12 xl:col-span-12 lg:col-span-12 md:col-span-12 col-span-12",
                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                className: "rounded border dark:border-defaultborder/10",
                                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                    className: "p-4 flex items-start flex-wrap",
                                                                                                    children: [
                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                            className: "me-2",
                                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                                className: "avatar avatar-sm avatar-rounded",
                                                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                                                                    src: "../../assets/images/faces/9.jpg",
                                                                                                                    alt: ""
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 378,
                                                                                                                    columnNumber: 81
                                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                                            }, void 0, false, {
                                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                lineNumber: 377,
                                                                                                                columnNumber: 77
                                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                                        }, void 0, false, {
                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                            lineNumber: 376,
                                                                                                            columnNumber: 73
                                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                            className: "flex-grow",
                                                                                                            children: [
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                                                    className: "mb-1 font-semibold leading-none",
                                                                                                                    children: "You"
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 382,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                                                    className: "text-[.6875rem] mb-2 text-[#8c9097] dark:text-white/50",
                                                                                                                    children: "26, Dec - 12:45PM"
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 383,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                                                    className: "text-[0.75rem] text-[#8c9097] dark:text-white/50 mb-1",
                                                                                                                    children: [
                                                                                                                        "Shared pictures with 4 of friends ",
                                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                                            children: "Hiren,Sasha,Biden,Thara"
                                                                                                                        }, void 0, false, {
                                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                            lineNumber: 384,
                                                                                                                            columnNumber: 180
                                                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                        "."
                                                                                                                    ]
                                                                                                                }, void 0, true, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 384,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                    className: "flex leading-none justify-between mb-4",
                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                        children: [
                                                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                                                                "aria-label": "anchor",
                                                                                                                                href: "#!",
                                                                                                                                scroll: false,
                                                                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                                                    className: "avatar avatar-md me-1",
                                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                                                                                        src: "../../assets/images/media/media-52.jpg",
                                                                                                                                        alt: ""
                                                                                                                                    }, void 0, false, {
                                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                        lineNumber: 389,
                                                                                                                                        columnNumber: 93
                                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                }, void 0, false, {
                                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                    lineNumber: 388,
                                                                                                                                    columnNumber: 89
                                                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                                                            }, void 0, false, {
                                                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                lineNumber: 387,
                                                                                                                                columnNumber: 85
                                                                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                                                                "aria-label": "anchor",
                                                                                                                                href: "#!",
                                                                                                                                scroll: false,
                                                                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                                                    className: "avatar avatar-md me-1",
                                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                                                                                        src: "../../assets/images/media/media-56.jpg",
                                                                                                                                        alt: ""
                                                                                                                                    }, void 0, false, {
                                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                        lineNumber: 394,
                                                                                                                                        columnNumber: 93
                                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                }, void 0, false, {
                                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                    lineNumber: 393,
                                                                                                                                    columnNumber: 89
                                                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                                                            }, void 0, false, {
                                                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                lineNumber: 392,
                                                                                                                                columnNumber: 85
                                                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                                                        ]
                                                                                                                    }, void 0, true, {
                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                        lineNumber: 386,
                                                                                                                        columnNumber: 81
                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 385,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                    className: "flex items-center justify-between md:mb-0 mb-2",
                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                            className: "btn-list",
                                                                                                                            children: [
                                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                                                                    type: "button",
                                                                                                                                    className: "ti-btn ti-btn-primary !me-[.375rem] !py-1 !px-2 !text-[0.75rem] !font-medium btn-wave",
                                                                                                                                    children: "Comment"
                                                                                                                                }, void 0, false, {
                                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                    lineNumber: 402,
                                                                                                                                    columnNumber: 89
                                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                                                                    "aria-label": "button",
                                                                                                                                    type: "button",
                                                                                                                                    className: "ti-btn !me-[.375rem] ti-btn-sm ti-btn-success",
                                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                                                                                        className: "ri-thumb-up-line"
                                                                                                                                    }, void 0, false, {
                                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                        lineNumber: 406,
                                                                                                                                        columnNumber: 93
                                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                }, void 0, false, {
                                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                    lineNumber: 405,
                                                                                                                                    columnNumber: 89
                                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                                                                    "aria-label": "button",
                                                                                                                                    type: "button",
                                                                                                                                    className: "ti-btn ti-btn-sm ti-btn-danger",
                                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                                                                                        className: "ri-share-line"
                                                                                                                                    }, void 0, false, {
                                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                        lineNumber: 409,
                                                                                                                                        columnNumber: 93
                                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                }, void 0, false, {
                                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                    lineNumber: 408,
                                                                                                                                    columnNumber: 89
                                                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                                                            ]
                                                                                                                        }, void 0, true, {
                                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                            lineNumber: 401,
                                                                                                                            columnNumber: 85
                                                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                                                    }, void 0, false, {
                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                        lineNumber: 400,
                                                                                                                        columnNumber: 81
                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 399,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                                            ]
                                                                                                        }, void 0, true, {
                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                            lineNumber: 381,
                                                                                                            columnNumber: 73
                                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                            children: [
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                    className: "flex items-start",
                                                                                                                    children: [
                                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                                                className: "badge bg-success/10 text-secondary me-2",
                                                                                                                                children: "Nature"
                                                                                                                            }, void 0, false, {
                                                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                lineNumber: 418,
                                                                                                                                columnNumber: 85
                                                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                                                        }, void 0, false, {
                                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                            lineNumber: 417,
                                                                                                                            columnNumber: 81
                                                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                                className: "hs-dropdown ti-dropdown",
                                                                                                                                children: [
                                                                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                                                                        "aria-label": "button",
                                                                                                                                        type: "button",
                                                                                                                                        className: "ti-btn ti-btn-sm ti-btn-light",
                                                                                                                                        "aria-expanded": "false",
                                                                                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                                                                                            className: "ti ti-dots-vertical"
                                                                                                                                        }, void 0, false, {
                                                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                            lineNumber: 423,
                                                                                                                                            columnNumber: 93
                                                                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                    }, void 0, false, {
                                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                        lineNumber: 422,
                                                                                                                                        columnNumber: 89
                                                                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                                                                                                                        className: "hs-dropdown-menu ti-dropdown-menu hidden",
                                                                                                                                        children: [
                                                                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                                                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                                                                                    className: "ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block",
                                                                                                                                                    href: "#!",
                                                                                                                                                    scroll: false,
                                                                                                                                                    children: "Delete"
                                                                                                                                                }, void 0, false, {
                                                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                                    lineNumber: 426,
                                                                                                                                                    columnNumber: 97
                                                                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                            }, void 0, false, {
                                                                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                                lineNumber: 426,
                                                                                                                                                columnNumber: 93
                                                                                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                                                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                                                                                    className: "ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block",
                                                                                                                                                    href: "#!",
                                                                                                                                                    scroll: false,
                                                                                                                                                    children: "Hide"
                                                                                                                                                }, void 0, false, {
                                                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                                    lineNumber: 427,
                                                                                                                                                    columnNumber: 97
                                                                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                            }, void 0, false, {
                                                                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                                lineNumber: 427,
                                                                                                                                                columnNumber: 93
                                                                                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                                                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                                                                                    className: "ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block",
                                                                                                                                                    href: "#!",
                                                                                                                                                    scroll: false,
                                                                                                                                                    children: "Edit"
                                                                                                                                                }, void 0, false, {
                                                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                                    lineNumber: 428,
                                                                                                                                                    columnNumber: 97
                                                                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                            }, void 0, false, {
                                                                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                                lineNumber: 428,
                                                                                                                                                columnNumber: 93
                                                                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                        ]
                                                                                                                                    }, void 0, true, {
                                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                        lineNumber: 425,
                                                                                                                                        columnNumber: 89
                                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                ]
                                                                                                                            }, void 0, true, {
                                                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                lineNumber: 421,
                                                                                                                                columnNumber: 85
                                                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                                                        }, void 0, false, {
                                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                            lineNumber: 420,
                                                                                                                            columnNumber: 81
                                                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                                                    ]
                                                                                                                }, void 0, true, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 416,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                    className: "avatar-list-stacked block mt-4 text-end",
                                                                                                                    children: [
                                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                                            className: "avatar avatar-xs avatar-rounded",
                                                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                                                                                src: "../../assets/images/faces/2.jpg",
                                                                                                                                alt: "img"
                                                                                                                            }, void 0, false, {
                                                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                lineNumber: 435,
                                                                                                                                columnNumber: 85
                                                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                                                        }, void 0, false, {
                                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                            lineNumber: 434,
                                                                                                                            columnNumber: 81
                                                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                                            className: "avatar avatar-xs avatar-rounded",
                                                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                                                                                src: "../../assets/images/faces/8.jpg",
                                                                                                                                alt: "img"
                                                                                                                            }, void 0, false, {
                                                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                lineNumber: 438,
                                                                                                                                columnNumber: 85
                                                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                                                        }, void 0, false, {
                                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                            lineNumber: 437,
                                                                                                                            columnNumber: 81
                                                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                                            className: "avatar avatar-xs avatar-rounded",
                                                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                                                                                src: "../../assets/images/faces/2.jpg",
                                                                                                                                alt: "img"
                                                                                                                            }, void 0, false, {
                                                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                lineNumber: 441,
                                                                                                                                columnNumber: 85
                                                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                                                        }, void 0, false, {
                                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                            lineNumber: 440,
                                                                                                                            columnNumber: 81
                                                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                                            className: "avatar avatar-xs avatar-rounded",
                                                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                                                                                src: "../../assets/images/faces/10.jpg",
                                                                                                                                alt: "img"
                                                                                                                            }, void 0, false, {
                                                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                lineNumber: 444,
                                                                                                                                columnNumber: 85
                                                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                                                        }, void 0, false, {
                                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                            lineNumber: 443,
                                                                                                                            columnNumber: 81
                                                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                                                    ]
                                                                                                                }, void 0, true, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 433,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                                            ]
                                                                                                        }, void 0, true, {
                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                            lineNumber: 415,
                                                                                                            columnNumber: 73
                                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                                    ]
                                                                                                }, void 0, true, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                    lineNumber: 375,
                                                                                                    columnNumber: 69
                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                lineNumber: 374,
                                                                                                columnNumber: 65
                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                            lineNumber: 373,
                                                                                            columnNumber: 61
                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                            className: "xxl:col-span-12 xl:col-span-12 lg:col-span-12 md:col-span-12 col-span-12",
                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                className: "rounded border dark:border-defaultborder/10",
                                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                    className: "p-4 flex items-start flex-wrap",
                                                                                                    children: [
                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                            className: "me-2",
                                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                                className: "avatar avatar-sm avatar-rounded",
                                                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                                                                    src: "../../assets/images/faces/9.jpg",
                                                                                                                    alt: ""
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 456,
                                                                                                                    columnNumber: 81
                                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                                            }, void 0, false, {
                                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                lineNumber: 455,
                                                                                                                columnNumber: 77
                                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                                        }, void 0, false, {
                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                            lineNumber: 454,
                                                                                                            columnNumber: 73
                                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                            className: "flex-grow",
                                                                                                            children: [
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                                                    className: "mb-1 font-semibold leading-none",
                                                                                                                    children: "You"
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 460,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                                                    className: "text-[.6875rem] mb-2 text-[#8c9097] dark:text-white/50",
                                                                                                                    children: "29, Dec - 09:53AM"
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 461,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                                                    className: "text-[0.75rem] text-[#8c9097] dark:text-white/50 mb-1",
                                                                                                                    children: "Sharing an article that excites me about nature more than what i thought."
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 462,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                                                    className: "mb-4 profile-post-link",
                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                                                        href: "#!",
                                                                                                                        scroll: false,
                                                                                                                        className: "text-[0.75rem] text-primary",
                                                                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("u", {
                                                                                                                            children: "https://www.discovery.com/ nature/caring-for-coral"
                                                                                                                        }, void 0, false, {
                                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                            lineNumber: 465,
                                                                                                                            columnNumber: 85
                                                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                                                    }, void 0, false, {
                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                        lineNumber: 464,
                                                                                                                        columnNumber: 81
                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 463,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                    className: "flex items-center justify-between md:mb-0 mb-2",
                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                            className: "btn-list",
                                                                                                                            children: [
                                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                                                                    type: "button",
                                                                                                                                    className: "ti-btn ti-btn-primary !me-[.375rem] !py-1 !px-2 !text-[0.75rem] !font-medium btn-wave",
                                                                                                                                    children: "Comment"
                                                                                                                                }, void 0, false, {
                                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                    lineNumber: 471,
                                                                                                                                    columnNumber: 89
                                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                                                                    "aria-label": "button",
                                                                                                                                    type: "button",
                                                                                                                                    className: "ti-btn !me-[.375rem] ti-btn-sm ti-btn-success",
                                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                                                                                        className: "ri-thumb-up-line"
                                                                                                                                    }, void 0, false, {
                                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                        lineNumber: 475,
                                                                                                                                        columnNumber: 93
                                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                }, void 0, false, {
                                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                    lineNumber: 474,
                                                                                                                                    columnNumber: 89
                                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                                                                    "aria-label": "button",
                                                                                                                                    type: "button",
                                                                                                                                    className: "ti-btn ti-btn-sm ti-btn-danger",
                                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                                                                                        className: "ri-share-line"
                                                                                                                                    }, void 0, false, {
                                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                        lineNumber: 478,
                                                                                                                                        columnNumber: 93
                                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                }, void 0, false, {
                                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                    lineNumber: 477,
                                                                                                                                    columnNumber: 89
                                                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                                                            ]
                                                                                                                        }, void 0, true, {
                                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                            lineNumber: 470,
                                                                                                                            columnNumber: 85
                                                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                                                    }, void 0, false, {
                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                        lineNumber: 469,
                                                                                                                        columnNumber: 81
                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 468,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                                            ]
                                                                                                        }, void 0, true, {
                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                            lineNumber: 459,
                                                                                                            columnNumber: 73
                                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                            className: "flex items-start",
                                                                                                            children: [
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                                        className: "badge bg-secondary/10 text-secondary me-2",
                                                                                                                        children: "Travel"
                                                                                                                    }, void 0, false, {
                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                        lineNumber: 486,
                                                                                                                        columnNumber: 81
                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 485,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                    className: "hs-dropdown ti-dropdown",
                                                                                                                    children: [
                                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                                                            "aria-label": "button",
                                                                                                                            type: "button",
                                                                                                                            className: "ti-btn ti-btn-sm ti-btn-light",
                                                                                                                            "aria-expanded": "false",
                                                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                                                                                className: "ti ti-dots-vertical"
                                                                                                                            }, void 0, false, {
                                                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                lineNumber: 490,
                                                                                                                                columnNumber: 85
                                                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                                                        }, void 0, false, {
                                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                            lineNumber: 489,
                                                                                                                            columnNumber: 81
                                                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                                                                                                            className: "hs-dropdown-menu ti-dropdown-menu hidden",
                                                                                                                            children: [
                                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                                                                        className: "ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block",
                                                                                                                                        href: "#!",
                                                                                                                                        scroll: false,
                                                                                                                                        children: "Delete"
                                                                                                                                    }, void 0, false, {
                                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                        lineNumber: 493,
                                                                                                                                        columnNumber: 89
                                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                }, void 0, false, {
                                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                    lineNumber: 493,
                                                                                                                                    columnNumber: 85
                                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                                                                        className: "ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block",
                                                                                                                                        href: "#!",
                                                                                                                                        scroll: false,
                                                                                                                                        children: "Hide"
                                                                                                                                    }, void 0, false, {
                                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                        lineNumber: 494,
                                                                                                                                        columnNumber: 89
                                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                }, void 0, false, {
                                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                    lineNumber: 494,
                                                                                                                                    columnNumber: 85
                                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                                                                        className: "ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block",
                                                                                                                                        href: "#!",
                                                                                                                                        scroll: false,
                                                                                                                                        children: "Edit"
                                                                                                                                    }, void 0, false, {
                                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                        lineNumber: 495,
                                                                                                                                        columnNumber: 89
                                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                }, void 0, false, {
                                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                    lineNumber: 495,
                                                                                                                                    columnNumber: 85
                                                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                                                            ]
                                                                                                                        }, void 0, true, {
                                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                            lineNumber: 492,
                                                                                                                            columnNumber: 81
                                                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                                                    ]
                                                                                                                }, void 0, true, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 488,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                                            ]
                                                                                                        }, void 0, true, {
                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                            lineNumber: 484,
                                                                                                            columnNumber: 73
                                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                                    ]
                                                                                                }, void 0, true, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                    lineNumber: 453,
                                                                                                    columnNumber: 69
                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                lineNumber: 452,
                                                                                                columnNumber: 65
                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                            lineNumber: 451,
                                                                                            columnNumber: 61
                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                            className: "xxl:col-span-12 xl:col-span-12 lg:col-span-12 md:col-span-12 col-span-12",
                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                className: "rounded border dark:border-defaultborder/10",
                                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                    className: "p-4 flex items-start flex-wrap",
                                                                                                    children: [
                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                            className: "me-2",
                                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                                className: "avatar avatar-sm avatar-rounded",
                                                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                                                                    src: "../../assets/images/faces/9.jpg",
                                                                                                                    alt: ""
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 507,
                                                                                                                    columnNumber: 81
                                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                                            }, void 0, false, {
                                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                lineNumber: 506,
                                                                                                                columnNumber: 77
                                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                                        }, void 0, false, {
                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                            lineNumber: 505,
                                                                                                            columnNumber: 73
                                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                            className: "flex-grow",
                                                                                                            children: [
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                                                    className: "mb-1 font-semibold leading-none",
                                                                                                                    children: "You"
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 511,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                                                    className: "text-[.6875rem] mb-2 text-[#8c9097] dark:text-white/50",
                                                                                                                    children: "22, Dec - 11:22PM"
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 512,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                                                    className: "text-[0.75rem] text-[#8c9097] dark:text-white/50 mb-1",
                                                                                                                    children: [
                                                                                                                        "Shared pictures with 3 of your friends ",
                                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                                            children: "Maya,Jacob,Amanda"
                                                                                                                        }, void 0, false, {
                                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                            lineNumber: 513,
                                                                                                                            columnNumber: 185
                                                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                        "."
                                                                                                                    ]
                                                                                                                }, void 0, true, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 513,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                    className: "flex leading-none justify-between mb-4",
                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                        children: [
                                                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                                                                "aria-label": "anchor",
                                                                                                                                href: "#!",
                                                                                                                                scroll: false,
                                                                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                                                    className: "avatar avatar-md me-1",
                                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                                                                                        src: "../../assets/images/media/media-40.jpg",
                                                                                                                                        alt: "",
                                                                                                                                        className: "rounded-md"
                                                                                                                                    }, void 0, false, {
                                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                        lineNumber: 518,
                                                                                                                                        columnNumber: 93
                                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                }, void 0, false, {
                                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                    lineNumber: 517,
                                                                                                                                    columnNumber: 89
                                                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                                                            }, void 0, false, {
                                                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                lineNumber: 516,
                                                                                                                                columnNumber: 85
                                                                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                                                                "aria-label": "anchor",
                                                                                                                                href: "#!",
                                                                                                                                scroll: false,
                                                                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                                                    className: "avatar avatar-md me-1",
                                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                                                                                        src: "../../assets/images/media/media-45.jpg",
                                                                                                                                        alt: "",
                                                                                                                                        className: "rounded-md"
                                                                                                                                    }, void 0, false, {
                                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                        lineNumber: 523,
                                                                                                                                        columnNumber: 93
                                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                }, void 0, false, {
                                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                    lineNumber: 522,
                                                                                                                                    columnNumber: 89
                                                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                                                            }, void 0, false, {
                                                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                lineNumber: 521,
                                                                                                                                columnNumber: 85
                                                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                                                        ]
                                                                                                                    }, void 0, true, {
                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                        lineNumber: 515,
                                                                                                                        columnNumber: 81
                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 514,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                    className: "flex items-center justify-between md:mb-0 mb-2",
                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                            className: "btn-list",
                                                                                                                            children: [
                                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                                                                    type: "button",
                                                                                                                                    className: "ti-btn ti-btn-primary !me-[.375rem] !py-1 !px-2 !text-[0.75rem] !font-medium btn-wave",
                                                                                                                                    children: "Comment"
                                                                                                                                }, void 0, false, {
                                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                    lineNumber: 531,
                                                                                                                                    columnNumber: 89
                                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                                                                    "aria-label": "button",
                                                                                                                                    type: "button",
                                                                                                                                    className: "ti-btn !me-[.375rem] ti-btn-sm ti-btn-success",
                                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                                                                                        className: "ri-thumb-up-line"
                                                                                                                                    }, void 0, false, {
                                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                        lineNumber: 535,
                                                                                                                                        columnNumber: 93
                                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                }, void 0, false, {
                                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                    lineNumber: 534,
                                                                                                                                    columnNumber: 89
                                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                                                                    "aria-label": "button",
                                                                                                                                    type: "button",
                                                                                                                                    className: "ti-btn ti-btn-sm ti-btn-danger",
                                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                                                                                        className: "ri-share-line"
                                                                                                                                    }, void 0, false, {
                                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                        lineNumber: 538,
                                                                                                                                        columnNumber: 93
                                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                }, void 0, false, {
                                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                    lineNumber: 537,
                                                                                                                                    columnNumber: 89
                                                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                                                            ]
                                                                                                                        }, void 0, true, {
                                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                            lineNumber: 530,
                                                                                                                            columnNumber: 85
                                                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                                                    }, void 0, false, {
                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                        lineNumber: 529,
                                                                                                                        columnNumber: 81
                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 528,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                                            ]
                                                                                                        }, void 0, true, {
                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                            lineNumber: 510,
                                                                                                            columnNumber: 73
                                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                            children: [
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                    className: "flex items-start",
                                                                                                                    children: [
                                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                                                className: "badge bg-success/10 text-secondary me-2",
                                                                                                                                children: "Nature"
                                                                                                                            }, void 0, false, {
                                                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                lineNumber: 547,
                                                                                                                                columnNumber: 85
                                                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                                                        }, void 0, false, {
                                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                            lineNumber: 546,
                                                                                                                            columnNumber: 81
                                                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                            className: "hs-dropdown ti-dropdown",
                                                                                                                            children: [
                                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                                                                    "aria-label": "button",
                                                                                                                                    type: "button",
                                                                                                                                    className: "ti-btn ti-btn-sm ti-btn-light",
                                                                                                                                    "aria-expanded": "false",
                                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                                                                                        className: "ti ti-dots-vertical"
                                                                                                                                    }, void 0, false, {
                                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                        lineNumber: 551,
                                                                                                                                        columnNumber: 89
                                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                }, void 0, false, {
                                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                    lineNumber: 550,
                                                                                                                                    columnNumber: 85
                                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                                                                                                                    className: "hs-dropdown-menu ti-dropdown-menu hidden",
                                                                                                                                    children: [
                                                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                                                                                className: "ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block",
                                                                                                                                                href: "#!",
                                                                                                                                                scroll: false,
                                                                                                                                                children: "Delete"
                                                                                                                                            }, void 0, false, {
                                                                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                                lineNumber: 554,
                                                                                                                                                columnNumber: 93
                                                                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                        }, void 0, false, {
                                                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                            lineNumber: 554,
                                                                                                                                            columnNumber: 89
                                                                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                                                                                className: "ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block",
                                                                                                                                                href: "#!",
                                                                                                                                                scroll: false,
                                                                                                                                                children: "Hide"
                                                                                                                                            }, void 0, false, {
                                                                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                                lineNumber: 555,
                                                                                                                                                columnNumber: 93
                                                                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                        }, void 0, false, {
                                                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                            lineNumber: 555,
                                                                                                                                            columnNumber: 89
                                                                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                                                                                className: "ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block",
                                                                                                                                                href: "#!",
                                                                                                                                                scroll: false,
                                                                                                                                                children: "Edit"
                                                                                                                                            }, void 0, false, {
                                                                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                                lineNumber: 556,
                                                                                                                                                columnNumber: 93
                                                                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                        }, void 0, false, {
                                                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                            lineNumber: 556,
                                                                                                                                            columnNumber: 89
                                                                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                    ]
                                                                                                                                }, void 0, true, {
                                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                    lineNumber: 553,
                                                                                                                                    columnNumber: 85
                                                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                                                            ]
                                                                                                                        }, void 0, true, {
                                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                            lineNumber: 549,
                                                                                                                            columnNumber: 81
                                                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                                                    ]
                                                                                                                }, void 0, true, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 545,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                    className: "avatar-list-stacked block mt-4 text-end",
                                                                                                                    children: [
                                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                                            className: "avatar avatar-xs avatar-rounded",
                                                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                                                                                src: "../../assets/images/faces/1.jpg",
                                                                                                                                alt: "img"
                                                                                                                            }, void 0, false, {
                                                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                lineNumber: 562,
                                                                                                                                columnNumber: 85
                                                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                                                        }, void 0, false, {
                                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                            lineNumber: 561,
                                                                                                                            columnNumber: 81
                                                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                                            className: "avatar avatar-xs avatar-rounded",
                                                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                                                                                src: "../../assets/images/faces/5.jpg",
                                                                                                                                alt: "img"
                                                                                                                            }, void 0, false, {
                                                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                lineNumber: 565,
                                                                                                                                columnNumber: 85
                                                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                                                        }, void 0, false, {
                                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                            lineNumber: 564,
                                                                                                                            columnNumber: 81
                                                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                                            className: "avatar avatar-xs avatar-rounded",
                                                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                                                                                src: "../../assets/images/faces/16.jpg",
                                                                                                                                alt: "img"
                                                                                                                            }, void 0, false, {
                                                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                lineNumber: 568,
                                                                                                                                columnNumber: 85
                                                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                                                        }, void 0, false, {
                                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                            lineNumber: 567,
                                                                                                                            columnNumber: 81
                                                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                                                    ]
                                                                                                                }, void 0, true, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 560,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                                            ]
                                                                                                        }, void 0, true, {
                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                            lineNumber: 544,
                                                                                                            columnNumber: 73
                                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                                    ]
                                                                                                }, void 0, true, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                    lineNumber: 504,
                                                                                                    columnNumber: 69
                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                lineNumber: 503,
                                                                                                columnNumber: 65
                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                            lineNumber: 502,
                                                                                            columnNumber: 61
                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                            className: "xxl:col-span-12 xl:col-span-12 lg:col-span-12 md:col-span-12 col-span-12",
                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                className: "rounded border dark:border-defaultborder/10",
                                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                    className: "p-4 flex items-start flex-wrap",
                                                                                                    children: [
                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                            className: "me-2",
                                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                                className: "avatar avatar-sm avatar-rounded",
                                                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                                                                    src: "../../assets/images/faces/9.jpg",
                                                                                                                    alt: ""
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 580,
                                                                                                                    columnNumber: 81
                                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                                            }, void 0, false, {
                                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                lineNumber: 579,
                                                                                                                columnNumber: 77
                                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                                        }, void 0, false, {
                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                            lineNumber: 578,
                                                                                                            columnNumber: 73
                                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                            className: "flex-grow",
                                                                                                            children: [
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                                                    className: "mb-1 font-semibold leading-none",
                                                                                                                    children: "You"
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 584,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                                                    className: "text-[.6875rem] mb-2 text-[#8c9097] dark:text-white/50",
                                                                                                                    children: "18, Dec - 12:28PM"
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 585,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                                                    className: "text-[0.75rem] text-[#8c9097] dark:text-white/50 mb-1",
                                                                                                                    children: "Followed this author for top class themes with best code you can get in the market."
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 586,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                                                    className: "mb-4 profile-post-link",
                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                                                        href: "#!",
                                                                                                                        scroll: false,
                                                                                                                        className: "text-[0.75rem] text-primary",
                                                                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("u", {
                                                                                                                            children: "https://themeforest.net/user/ spruko/portfolio"
                                                                                                                        }, void 0, false, {
                                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                            lineNumber: 589,
                                                                                                                            columnNumber: 85
                                                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                                                    }, void 0, false, {
                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                        lineNumber: 588,
                                                                                                                        columnNumber: 81
                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 587,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                    className: "flex items-center justify-between md:mb-0 mb-2",
                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                            className: "btn-list",
                                                                                                                            children: [
                                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                                                                    type: "button",
                                                                                                                                    className: "ti-btn ti-btn-primary !me-[.375rem] !py-1 !px-2 !text-[0.75rem] !font-medium btn-wave",
                                                                                                                                    children: "Comment"
                                                                                                                                }, void 0, false, {
                                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                    lineNumber: 595,
                                                                                                                                    columnNumber: 89
                                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                                                                    "aria-label": "button",
                                                                                                                                    type: "button",
                                                                                                                                    className: "ti-btn !me-[.375rem] ti-btn-sm ti-btn-success",
                                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                                                                                        className: "ri-thumb-up-line"
                                                                                                                                    }, void 0, false, {
                                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                        lineNumber: 599,
                                                                                                                                        columnNumber: 93
                                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                }, void 0, false, {
                                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                    lineNumber: 598,
                                                                                                                                    columnNumber: 89
                                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                                                                    "aria-label": "button",
                                                                                                                                    type: "button",
                                                                                                                                    className: "ti-btn ti-btn-sm ti-btn-danger",
                                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                                                                                        className: "ri-share-line"
                                                                                                                                    }, void 0, false, {
                                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                        lineNumber: 602,
                                                                                                                                        columnNumber: 93
                                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                }, void 0, false, {
                                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                    lineNumber: 601,
                                                                                                                                    columnNumber: 89
                                                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                                                            ]
                                                                                                                        }, void 0, true, {
                                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                            lineNumber: 594,
                                                                                                                            columnNumber: 85
                                                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                                                    }, void 0, false, {
                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                        lineNumber: 593,
                                                                                                                        columnNumber: 81
                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 592,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                                            ]
                                                                                                        }, void 0, true, {
                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                            lineNumber: 583,
                                                                                                            columnNumber: 73
                                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                            className: "flex items-start",
                                                                                                            children: [
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                                        className: "badge bg-secondary/10 text-secondary me-2",
                                                                                                                        children: "Travel"
                                                                                                                    }, void 0, false, {
                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                        lineNumber: 610,
                                                                                                                        columnNumber: 81
                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 609,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                    className: "hs-dropdown ti-dropdown",
                                                                                                                    children: [
                                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                                                            "aria-label": "button",
                                                                                                                            type: "button",
                                                                                                                            className: "ti-btn ti-btn-sm ti-btn-light",
                                                                                                                            "aria-expanded": "false",
                                                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                                                                                className: "ti ti-dots-vertical"
                                                                                                                            }, void 0, false, {
                                                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                lineNumber: 614,
                                                                                                                                columnNumber: 85
                                                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                                                        }, void 0, false, {
                                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                            lineNumber: 613,
                                                                                                                            columnNumber: 81
                                                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                                                                                                            className: "hs-dropdown-menu ti-dropdown-menu hidden",
                                                                                                                            children: [
                                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                                                                        className: "ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block",
                                                                                                                                        href: "#!",
                                                                                                                                        scroll: false,
                                                                                                                                        children: "Delete"
                                                                                                                                    }, void 0, false, {
                                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                        lineNumber: 617,
                                                                                                                                        columnNumber: 89
                                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                }, void 0, false, {
                                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                    lineNumber: 617,
                                                                                                                                    columnNumber: 85
                                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                                                                        className: "ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block",
                                                                                                                                        href: "#!",
                                                                                                                                        scroll: false,
                                                                                                                                        children: "Hide"
                                                                                                                                    }, void 0, false, {
                                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                        lineNumber: 618,
                                                                                                                                        columnNumber: 89
                                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                }, void 0, false, {
                                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                    lineNumber: 618,
                                                                                                                                    columnNumber: 85
                                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                                                                        className: "ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block",
                                                                                                                                        href: "#!",
                                                                                                                                        scroll: false,
                                                                                                                                        children: "Edit"
                                                                                                                                    }, void 0, false, {
                                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                        lineNumber: 619,
                                                                                                                                        columnNumber: 89
                                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                }, void 0, false, {
                                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                    lineNumber: 619,
                                                                                                                                    columnNumber: 85
                                                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                                                            ]
                                                                                                                        }, void 0, true, {
                                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                            lineNumber: 616,
                                                                                                                            columnNumber: 81
                                                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                                                    ]
                                                                                                                }, void 0, true, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 612,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                                            ]
                                                                                                        }, void 0, true, {
                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                            lineNumber: 608,
                                                                                                            columnNumber: 73
                                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                                    ]
                                                                                                }, void 0, true, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                    lineNumber: 577,
                                                                                                    columnNumber: 69
                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                lineNumber: 576,
                                                                                                columnNumber: 65
                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                            lineNumber: 575,
                                                                                            columnNumber: 61
                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                            className: "xxl:col-span-12 xl:col-span-12 lg:col-span-12 md:col-span-12 col-span-12",
                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                className: "rounded border dark:border-defaultborder/10",
                                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                    className: "p-4 flex items-start flex-wrap",
                                                                                                    children: [
                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                            className: "me-2",
                                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                                className: "avatar avatar-sm avatar-rounded",
                                                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                                                                    src: "../../assets/images/faces/9.jpg",
                                                                                                                    alt: ""
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 631,
                                                                                                                    columnNumber: 81
                                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                                            }, void 0, false, {
                                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                lineNumber: 630,
                                                                                                                columnNumber: 77
                                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                                        }, void 0, false, {
                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                            lineNumber: 629,
                                                                                                            columnNumber: 73
                                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                            className: "flex-grow",
                                                                                                            children: [
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                                                    className: "mb-1 font-semibold leading-none",
                                                                                                                    children: "You"
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 635,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                                                    className: "text-[.6875rem] mb-2 text-[#8c9097] dark:text-white/50",
                                                                                                                    children: "02, Dec - 06:32AM"
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 636,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                                                    className: "text-[0.75rem] text-[#8c9097] dark:text-white/50 mb-0",
                                                                                                                    children: "Lorem ipsum dolor sit amet consectetur adipisicing elit."
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 637,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                                                    className: "text-[0.75rem] text-[#8c9097] dark:text-white/50 mb-4",
                                                                                                                    children: "There are many variations of passages 👏😍"
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 638,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                    className: "flex items-center justify-between md:mb-0 mb-2",
                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                            className: "btn-list",
                                                                                                                            children: [
                                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                                                                    type: "button",
                                                                                                                                    className: "ti-btn ti-btn-primary !me-[.375rem] !py-1 !px-2 !text-[0.75rem] !font-medium btn-wave",
                                                                                                                                    children: "Comment"
                                                                                                                                }, void 0, false, {
                                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                    lineNumber: 642,
                                                                                                                                    columnNumber: 89
                                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                                                                    "aria-label": "button",
                                                                                                                                    type: "button",
                                                                                                                                    className: "ti-btn !me-[.375rem] ti-btn-sm ti-btn-success",
                                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                                                                                        className: "ri-thumb-up-line"
                                                                                                                                    }, void 0, false, {
                                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                        lineNumber: 646,
                                                                                                                                        columnNumber: 93
                                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                }, void 0, false, {
                                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                    lineNumber: 645,
                                                                                                                                    columnNumber: 89
                                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                                                                    "aria-label": "button",
                                                                                                                                    type: "button",
                                                                                                                                    className: "ti-btn ti-btn-sm ti-btn-danger",
                                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                                                                                        className: "ri-share-line"
                                                                                                                                    }, void 0, false, {
                                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                        lineNumber: 649,
                                                                                                                                        columnNumber: 93
                                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                }, void 0, false, {
                                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                    lineNumber: 648,
                                                                                                                                    columnNumber: 89
                                                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                                                            ]
                                                                                                                        }, void 0, true, {
                                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                            lineNumber: 641,
                                                                                                                            columnNumber: 85
                                                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                                                    }, void 0, false, {
                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                        lineNumber: 640,
                                                                                                                        columnNumber: 81
                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 639,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                                            ]
                                                                                                        }, void 0, true, {
                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                            lineNumber: 634,
                                                                                                            columnNumber: 73
                                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                            className: "flex items-start",
                                                                                                            children: [
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                                        className: "badge bg-primary/10 text-primary me-2",
                                                                                                                        children: "Fashion"
                                                                                                                    }, void 0, false, {
                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                        lineNumber: 657,
                                                                                                                        columnNumber: 81
                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 656,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                    className: "hs-dropdown ti-dropdown",
                                                                                                                    children: [
                                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                                                            "aria-label": "button",
                                                                                                                            type: "button",
                                                                                                                            className: "ti-btn ti-btn-sm ti-btn-light",
                                                                                                                            "aria-expanded": "false",
                                                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                                                                                className: "ti ti-dots-vertical"
                                                                                                                            }, void 0, false, {
                                                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                lineNumber: 661,
                                                                                                                                columnNumber: 85
                                                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                                                        }, void 0, false, {
                                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                            lineNumber: 660,
                                                                                                                            columnNumber: 81
                                                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                                                                                                            className: "hs-dropdown-menu ti-dropdown-menu hidden",
                                                                                                                            children: [
                                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                                                                        className: "ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block",
                                                                                                                                        href: "#!",
                                                                                                                                        scroll: false,
                                                                                                                                        children: "Delete"
                                                                                                                                    }, void 0, false, {
                                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                        lineNumber: 664,
                                                                                                                                        columnNumber: 89
                                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                }, void 0, false, {
                                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                    lineNumber: 664,
                                                                                                                                    columnNumber: 85
                                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                                                                        className: "ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block",
                                                                                                                                        href: "#!",
                                                                                                                                        scroll: false,
                                                                                                                                        children: "Hide"
                                                                                                                                    }, void 0, false, {
                                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                        lineNumber: 665,
                                                                                                                                        columnNumber: 89
                                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                }, void 0, false, {
                                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                    lineNumber: 665,
                                                                                                                                    columnNumber: 85
                                                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                                                                        className: "ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block",
                                                                                                                                        href: "#!",
                                                                                                                                        scroll: false,
                                                                                                                                        children: "Edit"
                                                                                                                                    }, void 0, false, {
                                                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                        lineNumber: 666,
                                                                                                                                        columnNumber: 89
                                                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                                                }, void 0, false, {
                                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                                    lineNumber: 666,
                                                                                                                                    columnNumber: 85
                                                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                                                            ]
                                                                                                                        }, void 0, true, {
                                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                            lineNumber: 663,
                                                                                                                            columnNumber: 81
                                                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                                                    ]
                                                                                                                }, void 0, true, {
                                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                    lineNumber: 659,
                                                                                                                    columnNumber: 77
                                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                                            ]
                                                                                                        }, void 0, true, {
                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                            lineNumber: 655,
                                                                                                            columnNumber: 73
                                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                                    ]
                                                                                                }, void 0, true, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                    lineNumber: 628,
                                                                                                    columnNumber: 69
                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                lineNumber: 627,
                                                                                                columnNumber: 65
                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                            lineNumber: 626,
                                                                                            columnNumber: 61
                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                    lineNumber: 323,
                                                                                    columnNumber: 57
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                lineNumber: 322,
                                                                                columnNumber: 53
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                            lineNumber: 321,
                                                                            columnNumber: 53
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                                            className: "list-group-item",
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "text-center",
                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                    type: "button",
                                                                                    className: "ti-btn ti-btn-primary !font-medium",
                                                                                    children: "Show All"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                    lineNumber: 678,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                lineNumber: 677,
                                                                                columnNumber: 57
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                            lineNumber: 676,
                                                                            columnNumber: 53
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                    lineNumber: 302,
                                                                    columnNumber: 49
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                lineNumber: 300,
                                                                columnNumber: 45
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "tab-pane fade !p-0 !border-0 hidden",
                                                                id: "followers-tab-pane",
                                                                role: "tabpanel",
                                                                "aria-labelledby": "followers-tab",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "grid grid-cols-12 sm:gap-x-6",
                                                                    children: [
                                                                        __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$pages$2f$profiledata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Friendsdata"].map((idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "xxl:col-span-4 xl:col-span-4 lg:col-span-6 md:col-span-6 col-span-12",
                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "box !shadow-none border dark:border-defaultborder/10",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                            className: "box-body p-6",
                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                className: "text-center",
                                                                                                children: [
                                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                        className: "avatar avatar-xl avatar-rounded",
                                                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                                                            src: idx.src,
                                                                                                            alt: ""
                                                                                                        }, void 0, false, {
                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                            lineNumber: 692,
                                                                                                            columnNumber: 73
                                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                                    }, void 0, false, {
                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                        lineNumber: 691,
                                                                                                        columnNumber: 69
                                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                        className: "mt-2",
                                                                                                        children: [
                                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                                                className: "mb-0 font-semibold",
                                                                                                                children: idx.name
                                                                                                            }, void 0, false, {
                                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                lineNumber: 695,
                                                                                                                columnNumber: 73
                                                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                                                className: "text-[0.75rem] opacity-[0.7] mb-1 text-[#8c9097] dark:text-white/50",
                                                                                                                children: idx.mail
                                                                                                            }, void 0, false, {
                                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                lineNumber: 696,
                                                                                                                columnNumber: 73
                                                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                                className: `badge bg-${idx.color}/10 rounded-full text-${idx.color}`,
                                                                                                                children: idx.badge
                                                                                                            }, void 0, false, {
                                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                                lineNumber: 697,
                                                                                                                columnNumber: 73
                                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                                        ]
                                                                                                    }, void 0, true, {
                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                        lineNumber: 694,
                                                                                                        columnNumber: 69
                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                ]
                                                                                            }, void 0, true, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                lineNumber: 690,
                                                                                                columnNumber: 65
                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                            lineNumber: 689,
                                                                                            columnNumber: 61
                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                            className: "box-footer text-center",
                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                className: "btn-list",
                                                                                                children: [
                                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                                        type: "button",
                                                                                                        className: "ti-btn btn-sm !py-1 !px-2 !text-[0.75rem] me-1 ti-btn-light",
                                                                                                        children: "Block"
                                                                                                    }, void 0, false, {
                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                        lineNumber: 703,
                                                                                                        columnNumber: 69
                                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                                        type: "button",
                                                                                                        className: "ti-btn btn-sm !py-1 !px-2 !text-[0.75rem] text-white bg-primary",
                                                                                                        children: "Unfollow"
                                                                                                    }, void 0, false, {
                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                        lineNumber: 704,
                                                                                                        columnNumber: 69
                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                ]
                                                                                            }, void 0, true, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                                lineNumber: 702,
                                                                                                columnNumber: 65
                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                            lineNumber: 701,
                                                                                            columnNumber: 61
                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                    lineNumber: 688,
                                                                                    columnNumber: 57
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            }, Math.random(), false, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                lineNumber: 687,
                                                                                columnNumber: 53
                                                                            }, ("TURBOPACK compile-time value", void 0))),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "col-span-12",
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "text-center !mt-4",
                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                    type: "button",
                                                                                    className: "ti-btn ti-btn-primary !font-medium btn-wave",
                                                                                    children: "Show All"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                    lineNumber: 712,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                lineNumber: 711,
                                                                                columnNumber: 57
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                            lineNumber: 710,
                                                                            columnNumber: 53
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                    lineNumber: 685,
                                                                    columnNumber: 49
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                lineNumber: 683,
                                                                columnNumber: 45
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "tab-pane fade !p-0 !border-0 hidden",
                                                                id: "gallery-tab-pane",
                                                                role: "tabpanel",
                                                                "aria-labelledby": "gallery-tab",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "grid grid-cols-12 sm:gap-x-6 gap-y-6",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$pages$2f$profiledata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LightboxGallery"], {}, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                            lineNumber: 720,
                                                                            columnNumber: 53
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "col-span-12",
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "text-center mt-6",
                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                    type: "button",
                                                                                    className: "ti-btn ti-btn-primary !font-medium",
                                                                                    children: "Show All"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                    lineNumber: 723,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                lineNumber: 722,
                                                                                columnNumber: 57
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                            lineNumber: 721,
                                                                            columnNumber: 53
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                    lineNumber: 719,
                                                                    columnNumber: 49
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                lineNumber: 717,
                                                                columnNumber: 45
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                        lineNumber: 175,
                                                        columnNumber: 41
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                    lineNumber: 174,
                                                    columnNumber: 37
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                            lineNumber: 151,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0))
                                    }, void 0, false, {
                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                        lineNumber: 150,
                                        columnNumber: 29
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                    lineNumber: 149,
                                    columnNumber: 25
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "xl:col-span-4 col-span-12",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "box",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "box-header",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "box-title",
                                                    children: "Personal Info"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                    lineNumber: 736,
                                                    columnNumber: 37
                                                }, ("TURBOPACK compile-time value", void 0))
                                            }, void 0, false, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                lineNumber: 735,
                                                columnNumber: 33
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "box-body",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                                    className: "list-group",
                                                    children: __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$pages$2f$profiledata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Personalinfodata"].map((idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                            className: "list-group-item",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "flex flex-wrap items-center",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "me-2 font-semibold",
                                                                        children: idx.text1
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                        lineNumber: 746,
                                                                        columnNumber: 49
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "text-[0.75rem] text-[#8c9097] dark:text-white/50",
                                                                        children: idx.text2
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                        lineNumber: 749,
                                                                        columnNumber: 49
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                lineNumber: 745,
                                                                columnNumber: 45
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        }, Math.random(), false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                            lineNumber: 744,
                                                            columnNumber: 41
                                                        }, ("TURBOPACK compile-time value", void 0)))
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                    lineNumber: 741,
                                                    columnNumber: 37
                                                }, ("TURBOPACK compile-time value", void 0))
                                            }, void 0, false, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                lineNumber: 740,
                                                columnNumber: 33
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                        lineNumber: 734,
                                        columnNumber: 29
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                    lineNumber: 733,
                                    columnNumber: 25
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "xl:col-span-4 col-span-12",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "box",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "box-header flex justify-between",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "box-title",
                                                        children: "Recent Posts"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                        lineNumber: 760,
                                                        columnNumber: 37
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "badge bg-primary/10 text-primary",
                                                            children: "Today"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                            lineNumber: 764,
                                                            columnNumber: 41
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                        lineNumber: 763,
                                                        columnNumber: 37
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                lineNumber: 759,
                                                columnNumber: 33
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "box-body",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                                    className: "list-group",
                                                    children: __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$pages$2f$profiledata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RecentPostsdata"].map((idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                            className: "list-group-item",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                href: "#!",
                                                                scroll: false,
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "flex flex-wrap items-center",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            className: "avatar avatar-md me-4 !mb-0",
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                                src: idx.src,
                                                                                className: "img-fluid !rounded-md",
                                                                                alt: "..."
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                lineNumber: 775,
                                                                                columnNumber: 57
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                            lineNumber: 774,
                                                                            columnNumber: 53
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "flex-grow",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                    className: "font-semibold mb-0",
                                                                                    children: idx.name
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                    lineNumber: 778,
                                                                                    columnNumber: 57
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                    className: "mb-0 text-[0.75rem] profile-recent-posts text-truncate text-[#8c9097] dark:text-white/50",
                                                                                    children: idx.text
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                    lineNumber: 779,
                                                                                    columnNumber: 57
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                            lineNumber: 777,
                                                                            columnNumber: 53
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                    lineNumber: 773,
                                                                    columnNumber: 49
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                lineNumber: 772,
                                                                columnNumber: 45
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        }, Math.random(), false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                            lineNumber: 771,
                                                            columnNumber: 41
                                                        }, ("TURBOPACK compile-time value", void 0)))
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                    lineNumber: 768,
                                                    columnNumber: 37
                                                }, ("TURBOPACK compile-time value", void 0))
                                            }, void 0, false, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                lineNumber: 767,
                                                columnNumber: 33
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                        lineNumber: 758,
                                        columnNumber: 29
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                    lineNumber: 757,
                                    columnNumber: 25
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "xl:col-span-4 col-span-12",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "box",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "box-header flex justify-between",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "box-title",
                                                        children: "Suggestions"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                        lineNumber: 794,
                                                        columnNumber: 37
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            type: "button",
                                                            className: "ti-btn !py-1 !px-2 !text-[0.75rem] !font-medium ti-btn-success",
                                                            children: "View All"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                            lineNumber: 798,
                                                            columnNumber: 41
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                        lineNumber: 797,
                                                        columnNumber: 37
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                lineNumber: 793,
                                                columnNumber: 33
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "box-body",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                                    className: "list-group",
                                                    children: __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$pages$2f$profiledata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Suggestionsdata"].map((idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                            className: "list-group-item",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "flex items-center justify-between",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "font-semibold flex items-center",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "avatar avatar-xs me-2",
                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                                    src: idx.src,
                                                                                    alt: ""
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                    lineNumber: 809,
                                                                                    columnNumber: 57
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                lineNumber: 808,
                                                                                columnNumber: 53
                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                            idx.name
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                        lineNumber: 807,
                                                                        columnNumber: 49
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                            "aria-label": "button",
                                                                            type: "button",
                                                                            className: "ti-btn ti-btn-sm ti-btn-primary !mb-0",
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                                className: "ri-add-line"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                                lineNumber: 814,
                                                                                columnNumber: 57
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                            lineNumber: 813,
                                                                            columnNumber: 53
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                        lineNumber: 812,
                                                                        columnNumber: 49
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                                lineNumber: 806,
                                                                columnNumber: 45
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        }, Math.random(), false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                            lineNumber: 805,
                                                            columnNumber: 41
                                                        }, ("TURBOPACK compile-time value", void 0)))
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                    lineNumber: 802,
                                                    columnNumber: 37
                                                }, ("TURBOPACK compile-time value", void 0))
                                            }, void 0, false, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                                lineNumber: 801,
                                                columnNumber: 33
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                        lineNumber: 792,
                                        columnNumber: 29
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                                    lineNumber: 791,
                                    columnNumber: 25
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                            lineNumber: 148,
                            columnNumber: 21
                        }, ("TURBOPACK compile-time value", void 0))
                    }, void 0, false, {
                        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                        lineNumber: 147,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
                lineNumber: 15,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/app/(components)/(contentlayout)/pages/profile/page.tsx",
        lineNumber: 12,
        columnNumber: 9
    }, ("TURBOPACK compile-time value", void 0));
};
_c = Profile;
const __TURBOPACK__default__export__ = Profile;
var _c;
__turbopack_context__.k.register(_c, "Profile");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_27223b70._.js.map