(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
const PERMISSION_SECTIONS = [
    {
        id: 'ats',
        label: 'ATS',
        features: [
            {
                id: 'jobs',
                label: 'Jobs'
            },
            {
                id: 'candidates',
                label: 'Candidates'
            },
            {
                id: 'recruiters',
                label: 'Recruiters'
            },
            {
                id: 'interviews',
                label: 'Interviews'
            },
            {
                id: 'offers',
                label: 'Offers'
            }
        ]
    },
    {
        id: 'communication',
        label: 'Communication',
        features: [
            {
                id: 'emails',
                label: 'Emails'
            },
            {
                id: 'templates',
                label: 'Templates'
            },
            {
                id: 'campaigns',
                label: 'Campaigns'
            }
        ]
    },
    {
        id: 'training',
        label: 'Training Management',
        features: [
            {
                id: 'courses',
                label: 'Courses'
            },
            {
                id: 'modules',
                label: 'Modules'
            },
            {
                id: 'assessments',
                label: 'Assessments'
            }
        ]
    },
    {
        id: 'project',
        label: 'Project Management',
        features: [
            {
                id: 'projects',
                label: 'Projects'
            },
            {
                id: 'tasks',
                label: 'Tasks'
            },
            {
                id: 'milestones',
                label: 'Milestones'
            }
        ]
    }
];
const getInitialPermissions = ()=>{
    const permissions = {};
    PERMISSION_SECTIONS.forEach((section)=>{
        permissions[section.id] = {};
        section.features.forEach((feature)=>{
            permissions[section.id][feature.id] = {
                view: false,
                create: false,
                delete: false,
                edit: false
            };
        });
    });
    return permissions;
};
const CreateRolePage = ()=>{
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const [newRoleName, setNewRoleName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [rolePermissions, setRolePermissions] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(getInitialPermissions());
    const [expandedSections, setExpandedSections] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(new Set(PERMISSION_SECTIONS.map({
        "CreateRolePage.useState": (s)=>s.id
    }["CreateRolePage.useState"])));
    const toggleSection = (sectionId)=>{
        setExpandedSections((prev)=>{
            const next = new Set(prev);
            if (next.has(sectionId)) {
                next.delete(sectionId);
            } else {
                next.add(sectionId);
            }
            return next;
        });
    };
    const handlePermissionChange = (sectionId, featureId, permission, checked)=>{
        setRolePermissions((prev)=>({
                ...prev,
                [sectionId]: {
                    ...prev[sectionId],
                    [featureId]: {
                        ...prev[sectionId][featureId],
                        [permission]: checked
                    }
                }
            }));
    };
    const handleFullPermission = (sectionId, e)=>{
        e.stopPropagation();
        const section = PERMISSION_SECTIONS.find((s)=>s.id === sectionId);
        if (!section) return;
        const fullPermissions = {};
        section.features.forEach((feature)=>{
            fullPermissions[feature.id] = {
                view: true,
                create: true,
                delete: true,
                edit: true
            };
        });
        setRolePermissions((prev)=>({
                ...prev,
                [sectionId]: fullPermissions
            }));
    };
    const handleSaveRole = ()=>{
        const permissionLabels = [];
        PERMISSION_SECTIONS.forEach((section)=>{
            section.features.forEach((feature)=>{
                const perms = rolePermissions[section.id]?.[feature.id];
                if (perms) {
                    if (perms.view) permissionLabels.push(`${feature.label} - View`);
                    if (perms.create) permissionLabels.push(`${feature.label} - Create`);
                    if (perms.edit) permissionLabels.push(`${feature.label} - Edit`);
                    if (perms.delete) permissionLabels.push(`${feature.label} - Delete`);
                }
            });
        });
        const newRole = {
            id: String(Date.now()),
            roleType: newRoleName || 'New Role',
            permissions: permissionLabels
        };
        if ("TURBOPACK compile-time truthy", 1) {
            sessionStorage.setItem('newly-created-role', JSON.stringify(newRole));
        }
        router.push('/pages/email/mail-settings');
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "container w-full max-w-full mx-auto",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid grid-cols-12 gap-6",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "xl:col-span-12 col-span-12",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "box",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "box-header flex items-center justify-between flex-wrap gap-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "box-title",
                                        children: "User Roles"
                                    }, void 0, false, {
                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                        lineNumber: 155,
                                        columnNumber: 17
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                        href: "/pages/email/mail-settings",
                                        className: "ti-btn ti-btn-light !py-1 !px-2 !text-[0.75rem]",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                className: "ri-arrow-left-line me-1"
                                            }, void 0, false, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                                lineNumber: 160,
                                                columnNumber: 19
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            "Back to User Roles"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                        lineNumber: 156,
                                        columnNumber: 17
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                lineNumber: 154,
                                columnNumber: 15
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "box-body",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mb-6",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                htmlFor: "role-name",
                                                className: "form-label",
                                                children: "Role Name"
                                            }, void 0, false, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                                lineNumber: 165,
                                                columnNumber: 19
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                id: "role-name",
                                                type: "text",
                                                className: "form-control",
                                                placeholder: "Enter role name",
                                                value: newRoleName,
                                                onChange: (e)=>setNewRoleName(e.target.value)
                                            }, void 0, false, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                                lineNumber: 166,
                                                columnNumber: 19
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                        lineNumber: 164,
                                        columnNumber: 17
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "hs-accordion-group space-y-2",
                                        children: PERMISSION_SECTIONS.map((section)=>{
                                            const isExpanded = expandedSections.has(section.id);
                                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: `hs-accordion border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ${isExpanded ? 'active' : ''}`,
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "hs-accordion-toggle w-full flex items-center justify-between px-4 py-3 font-semibold text-start bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 cursor-pointer",
                                                        onClick: ()=>toggleSection(section.id),
                                                        role: "button",
                                                        tabIndex: 0,
                                                        onKeyDown: (e)=>e.key === 'Enter' && toggleSection(section.id),
                                                        "aria-expanded": isExpanded,
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                children: section.label
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                                                lineNumber: 191,
                                                                columnNumber: 27
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "flex items-center gap-2 shrink-0",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                        type: "button",
                                                                        className: "ti-btn ti-btn-primary !py-0.5 !px-2 !text-[0.7rem] whitespace-nowrap",
                                                                        onClick: (e)=>handleFullPermission(section.id, e),
                                                                        children: "Full Permission"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                                                        lineNumber: 193,
                                                                        columnNumber: 29
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                        className: `ri-arrow-down-s-line text-xl transition-transform ${isExpanded ? 'rotate-180' : ''}`
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                                                        lineNumber: 200,
                                                                        columnNumber: 29
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                                                lineNumber: 192,
                                                                columnNumber: 27
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                                        lineNumber: 183,
                                                        columnNumber: 25
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: `overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[500px]' : 'max-h-0'}`,
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-bodybg",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "table-responsive overflow-x-auto",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                                                    className: "table min-w-full table-bordered border-gray-200 dark:border-gray-700",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                                className: "bg-gray-50 dark:bg-gray-800/50",
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                        className: "px-4 py-2 text-start font-medium",
                                                                                        children: "Feature"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                                                                        lineNumber: 211,
                                                                                        columnNumber: 37
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                        className: "px-4 py-2 text-center font-medium",
                                                                                        children: "View"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                                                                        lineNumber: 212,
                                                                                        columnNumber: 37
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                        className: "px-4 py-2 text-center font-medium",
                                                                                        children: "Create"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                                                                        lineNumber: 213,
                                                                                        columnNumber: 37
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                        className: "px-4 py-2 text-center font-medium",
                                                                                        children: "Edit"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                                                                        lineNumber: 214,
                                                                                        columnNumber: 37
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                        className: "px-4 py-2 text-center font-medium",
                                                                                        children: "Delete"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                                                                        lineNumber: 215,
                                                                                        columnNumber: 37
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                                                                lineNumber: 210,
                                                                                columnNumber: 35
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                                                            lineNumber: 209,
                                                                            columnNumber: 33
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                                            children: section.features.map((feature)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                                    className: "border-b border-gray-200 dark:border-gray-700",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                            className: "px-4 py-2 font-medium",
                                                                                            children: feature.label
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                                                                            lineNumber: 221,
                                                                                            columnNumber: 39
                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                            className: "px-4 py-2 text-center align-middle",
                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                className: "flex justify-center",
                                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                                    type: "checkbox",
                                                                                                    className: "form-check-input",
                                                                                                    checked: rolePermissions[section.id]?.[feature.id]?.view ?? false,
                                                                                                    onChange: (e)=>handlePermissionChange(section.id, feature.id, 'view', e.target.checked)
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                                                                                    lineNumber: 224,
                                                                                                    columnNumber: 43
                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                                                                                lineNumber: 223,
                                                                                                columnNumber: 41
                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                                                                            lineNumber: 222,
                                                                                            columnNumber: 39
                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                            className: "px-4 py-2 text-center align-middle",
                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                className: "flex justify-center",
                                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                                    type: "checkbox",
                                                                                                    className: "form-check-input",
                                                                                                    checked: rolePermissions[section.id]?.[feature.id]?.create ?? false,
                                                                                                    onChange: (e)=>handlePermissionChange(section.id, feature.id, 'create', e.target.checked)
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                                                                                    lineNumber: 234,
                                                                                                    columnNumber: 43
                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                                                                                lineNumber: 233,
                                                                                                columnNumber: 41
                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                                                                            lineNumber: 232,
                                                                                            columnNumber: 39
                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                            className: "px-4 py-2 text-center align-middle",
                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                className: "flex justify-center",
                                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                                    type: "checkbox",
                                                                                                    className: "form-check-input",
                                                                                                    checked: rolePermissions[section.id]?.[feature.id]?.edit ?? false,
                                                                                                    onChange: (e)=>handlePermissionChange(section.id, feature.id, 'edit', e.target.checked)
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                                                                                    lineNumber: 244,
                                                                                                    columnNumber: 43
                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                                                                                lineNumber: 243,
                                                                                                columnNumber: 41
                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                                                                            lineNumber: 242,
                                                                                            columnNumber: 39
                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                            className: "px-4 py-2 text-center align-middle",
                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                className: "flex justify-center",
                                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                                    type: "checkbox",
                                                                                                    className: "form-check-input",
                                                                                                    checked: rolePermissions[section.id]?.[feature.id]?.delete ?? false,
                                                                                                    onChange: (e)=>handlePermissionChange(section.id, feature.id, 'delete', e.target.checked)
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                                                                                    lineNumber: 254,
                                                                                                    columnNumber: 43
                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                                                                                lineNumber: 253,
                                                                                                columnNumber: 41
                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                                                                            lineNumber: 252,
                                                                                            columnNumber: 39
                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                    ]
                                                                                }, feature.id, true, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                                                                    lineNumber: 220,
                                                                                    columnNumber: 37
                                                                                }, ("TURBOPACK compile-time value", void 0)))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                                                            lineNumber: 218,
                                                                            columnNumber: 33
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                                                    lineNumber: 208,
                                                                    columnNumber: 31
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                                                lineNumber: 207,
                                                                columnNumber: 29
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                                            lineNumber: 206,
                                                            columnNumber: 27
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                                        lineNumber: 203,
                                                        columnNumber: 25
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, section.id, true, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                                lineNumber: 179,
                                                columnNumber: 23
                                            }, ("TURBOPACK compile-time value", void 0));
                                        })
                                    }, void 0, false, {
                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                        lineNumber: 175,
                                        columnNumber: 17
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                href: "/pages/email/mail-settings",
                                                className: "ti-btn ti-btn-light",
                                                children: "Cancel"
                                            }, void 0, false, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                                lineNumber: 274,
                                                columnNumber: 19
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                type: "button",
                                                className: "ti-btn ti-btn-primary-full",
                                                onClick: handleSaveRole,
                                                children: "Create Role"
                                            }, void 0, false, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                                lineNumber: 280,
                                                columnNumber: 19
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                        lineNumber: 273,
                                        columnNumber: 17
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                                lineNumber: 163,
                                columnNumber: 15
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                        lineNumber: 153,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                    lineNumber: 152,
                    columnNumber: 11
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
                lineNumber: 151,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0))
        }, void 0, false, {
            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
            lineNumber: 150,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/create-role/page.tsx",
        lineNumber: 148,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_s(CreateRolePage, "EUoMZXZzjAm+2LqjDUGcUuTNte8=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = CreateRolePage;
const __TURBOPACK__default__export__ = CreateRolePage;
var _c;
__turbopack_context__.k.register(_c, "CreateRolePage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=567b1_%28contentlayout%29_pages_email_mail-settings_create-role_page_tsx_d61c4fb1._.js.map