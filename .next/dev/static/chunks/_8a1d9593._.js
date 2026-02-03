(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/shared/data/pages/mail/mailsettingdata.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Accountoptions",
    ()=>Accountoptions,
    "Countryoptions",
    ()=>Countryoptions,
    "Languageoptions",
    ()=>Languageoptions,
    "Mailsettingslist",
    ()=>Mailsettingslist,
    "MaxLimitoptions",
    ()=>MaxLimitoptions,
    "Maximumoptions",
    ()=>Maximumoptions,
    "ProfileService",
    ()=>ProfileService
]);
"use client";
const Mailsettingslist = [
    {
        id: 1,
        class: 'bi bi-phone me-2 fs-16 align-middle text-base',
        text1: 'Mobile-LG-1023',
        text2: 'Manchester, UK-Nov 30, 04:45PM'
    },
    {
        id: 2,
        class: 'bi bi-laptop me-2 fs-16 align-middle text-base',
        text1: 'Lenovo-1291203',
        text2: 'England, UK-Aug 12, 12:25PM'
    },
    {
        id: 3,
        class: 'bi bi-laptop me-2 fs-16 align-middle text-base',
        text1: 'Macbook-Suzika',
        text2: 'Brightoon, UK-Jul 18, 8:34AM'
    },
    {
        id: 4,
        class: 'bi bi-pc-display-horizontal me-2 fs-16 align-middle text-base',
        text1: 'Apple-Desktop',
        text2: 'Darlington, UK-Jan 14, 11:14AM'
    }
];
const Languageoptions = [
    {
        value: 'English',
        label: 'English'
    },
    {
        value: 'French',
        label: 'French'
    },
    {
        value: 'Arabic',
        label: 'Arabic'
    },
    {
        value: 'Hindi',
        label: 'Hindi'
    }
];
const Countryoptions = [
    {
        value: 'Usa',
        label: 'Usa'
    },
    {
        value: 'Australia',
        label: 'Australia'
    },
    {
        value: 'Dubai',
        label: 'Dubai'
    }
];
const Maximumoptions = [
    {
        value: '10',
        label: '10'
    },
    {
        value: '50',
        label: '50'
    },
    {
        value: '100',
        label: '100'
    },
    {
        value: '200',
        label: '200'
    }
];
const MaxLimitoptions = [
    {
        value: '3 Attemps',
        label: '3 Attemps'
    },
    {
        value: '5 Attemps',
        label: '5 Attemps'
    },
    {
        value: '10 Attemps',
        label: '10 Attemps'
    },
    {
        value: '20 Attemps',
        label: '20 Attemps'
    }
];
const Accountoptions = [
    {
        value: '1 Day',
        label: '1 Day'
    },
    {
        value: '1 Hour',
        label: '1 Hour'
    },
    {
        value: '1 Month',
        label: '1 Month'
    },
    {
        value: '1 Year',
        label: '1 Year'
    }
];
class ProfileService {
    image = "../../assets/img/png-images/2.png";
    static image = null;
    static handleChange(ele) {
        const [file] = ele.target.files;
        if (file) {
            this.image = URL.createObjectURL(file);
            this.returnImage();
        }
    }
    static returnImage() {
        return this.image;
    }
    static handleChangeUrl(link) {
        this.image = link;
        this.returnImage();
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$table$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-table/index.js [app-client] (ecmascript)");
;
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
// Permission descriptions for popover explanations
const PERMISSION_DESCRIPTIONS = {
    'Full Access': 'Grants complete access to all features and settings in the system. Users with this permission can view, create, edit, and delete any content.',
    'User Management': 'Allows managing user accounts—creating new users, editing profiles, deactivating accounts, and assigning roles.',
    'Role Management': 'Enables creating, editing, and deleting roles. Users can define permission sets and assign them to roles.',
    'Settings': 'Access to system configuration and preferences. Can modify application settings, integrations, and global options.',
    'View Reports': 'Permission to view analytics, dashboards, and generated reports. Read-only access to reporting features.',
    'Edit Content': 'Allows creating and modifying content across the system. Users can add, update, and edit records.',
    'View Content': 'Read-only access to view content. Users can browse and read but cannot create, edit, or delete.'
};
const getPermissionDescription = (permission)=>{
    if (PERMISSION_DESCRIPTIONS[permission]) {
        return PERMISSION_DESCRIPTIONS[permission];
    }
    const match = permission.match(/^(.+?)\s*-\s*(.+)$/);
    if (match) {
        const [, feature, action] = match;
        const actionDesc = action === 'View' ? 'view and read records' : action === 'Create' ? 'create new records' : action === 'Edit' ? 'modify existing records' : action === 'Delete' ? 'remove records' : action.toLowerCase();
        return `Allows users to ${actionDesc} in ${feature}.`;
    }
    return `Permission to access ${permission}.`;
};
const USER_ROLES_DATA = [
    {
        id: '1',
        roleType: 'Administrator',
        permissions: [
            'Full Access',
            'User Management',
            'Role Management',
            'Settings'
        ]
    },
    {
        id: '2',
        roleType: 'Manager',
        permissions: [
            'View Reports',
            'User Management',
            'Edit Content'
        ]
    },
    {
        id: '3',
        roleType: 'Editor',
        permissions: [
            'Edit Content',
            'View Reports'
        ]
    },
    {
        id: '4',
        roleType: 'Viewer',
        permissions: [
            'View Content',
            'View Reports'
        ]
    },
    {
        id: '5',
        roleType: 'Guest',
        permissions: [
            'View Content'
        ]
    }
];
const UserRolesTable = ()=>{
    _s();
    const [selectedRows, setSelectedRows] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(new Set());
    const [editingRole, setEditingRole] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [roles, setRoles] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(USER_ROLES_DATA);
    const [permissionPopover, setPermissionPopover] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    // Close permission popover on click outside or escape
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "UserRolesTable.useEffect": ()=>{
            if (!permissionPopover) return;
            const handleClickOutside = {
                "UserRolesTable.useEffect.handleClickOutside": (e)=>{
                    const target = e.target;
                    if (!target.closest('[data-permission-popover]') && !target.closest('[data-permission-trigger]')) {
                        setPermissionPopover(null);
                    }
                }
            }["UserRolesTable.useEffect.handleClickOutside"];
            const handleEscape = {
                "UserRolesTable.useEffect.handleEscape": (e)=>{
                    if (e.key === 'Escape') setPermissionPopover(null);
                }
            }["UserRolesTable.useEffect.handleEscape"];
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
            return ({
                "UserRolesTable.useEffect": ()=>{
                    document.removeEventListener('mousedown', handleClickOutside);
                    document.removeEventListener('keydown', handleEscape);
                }
            })["UserRolesTable.useEffect"];
        }
    }["UserRolesTable.useEffect"], [
        permissionPopover
    ]);
    // Check for newly created role from create-role page
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "UserRolesTable.useEffect": ()=>{
            if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
            ;
            const stored = sessionStorage.getItem('newly-created-role');
            if (stored) {
                try {
                    const newRole = JSON.parse(stored);
                    setRoles({
                        "UserRolesTable.useEffect": (prev)=>[
                                ...prev,
                                newRole
                            ]
                    }["UserRolesTable.useEffect"]);
                    sessionStorage.removeItem('newly-created-role');
                } catch  {
                    sessionStorage.removeItem('newly-created-role');
                }
            }
        }
    }["UserRolesTable.useEffect"], []);
    // Handle row selection
    const handleRowSelect = (id)=>{
        const newSelected = new Set(selectedRows);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedRows(newSelected);
    };
    // Handle delete role
    const handleDeleteRole = (id)=>{
        if (confirm('Are you sure you want to delete this role?')) {
            setRoles(roles.filter((role)=>role.id !== id));
            setSelectedRows((prev)=>{
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
            });
        }
    };
    // Handle edit role
    const handleEditRole = (role)=>{
        setEditingRole(role);
        // TODO: Open edit modal/form
        console.log('Edit role:', role);
    };
    // Define columns
    const columns = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "UserRolesTable.useMemo[columns]": ()=>[
                {
                    Header: 'All',
                    accessor: 'checkbox',
                    disableSortBy: true,
                    Cell: {
                        "UserRolesTable.useMemo[columns]": ({ row })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                className: "form-check-input",
                                type: "checkbox",
                                checked: selectedRows.has(row.original.id),
                                onChange: {
                                    "UserRolesTable.useMemo[columns]": ()=>handleRowSelect(row.original.id)
                                }["UserRolesTable.useMemo[columns]"],
                                "aria-label": `Select ${row.original.roleType}`
                            }, void 0, false, {
                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                lineNumber: 144,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0))
                    }["UserRolesTable.useMemo[columns]"]
                },
                {
                    Header: 'S.no.',
                    accessor: 'sno',
                    disableSortBy: true,
                    Cell: {
                        "UserRolesTable.useMemo[columns]": ({ row, state })=>{
                            const { pageIndex, pageSize } = state;
                            return pageIndex * pageSize + row.index + 1;
                        }
                    }["UserRolesTable.useMemo[columns]"]
                },
                {
                    Header: 'Role Type',
                    accessor: 'roleType'
                },
                {
                    Header: 'Permissions',
                    accessor: 'permissions',
                    disableSortBy: true,
                    Cell: {
                        "UserRolesTable.useMemo[columns]": ({ row })=>{
                            const permissions = row.original.permissions;
                            if (!permissions?.length) return null;
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex flex-wrap gap-1",
                                children: permissions.map({
                                    "UserRolesTable.useMemo[columns]": (permission, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            "data-permission-trigger": true,
                                            className: "badge bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:bg-primary/20 transition-colors",
                                            role: "button",
                                            tabIndex: 0,
                                            onClick: {
                                                "UserRolesTable.useMemo[columns]": (e)=>{
                                                    e.stopPropagation();
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    setPermissionPopover({
                                                        permission,
                                                        description: getPermissionDescription(permission),
                                                        top: rect.bottom + 8,
                                                        left: rect.left
                                                    });
                                                }
                                            }["UserRolesTable.useMemo[columns]"],
                                            onKeyDown: {
                                                "UserRolesTable.useMemo[columns]": (e)=>{
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        setPermissionPopover({
                                                            permission,
                                                            description: getPermissionDescription(permission),
                                                            top: rect.bottom + 8,
                                                            left: rect.left
                                                        });
                                                    }
                                                }
                                            }["UserRolesTable.useMemo[columns]"],
                                            children: permission
                                        }, `${row.original.id}-${idx}`, false, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                            lineNumber: 176,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0))
                                }["UserRolesTable.useMemo[columns]"])
                            }, void 0, false, {
                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                lineNumber: 174,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0));
                        }
                    }["UserRolesTable.useMemo[columns]"]
                },
                {
                    Header: 'Action',
                    accessor: 'id',
                    disableSortBy: true,
                    Cell: {
                        "UserRolesTable.useMemo[columns]": ({ row })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-2",
                                children: row.original.roleType !== 'Administrator' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "hs-tooltip ti-main-tooltip",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                type: "button",
                                                onClick: {
                                                    "UserRolesTable.useMemo[columns]": ()=>handleEditRole(row.original)
                                                }["UserRolesTable.useMemo[columns]"],
                                                className: "hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-info",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                        className: "ri-pencil-line"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                                        lineNumber: 226,
                                                        columnNumber: 17
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700",
                                                        role: "tooltip",
                                                        children: "Edit Role"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                                        lineNumber: 227,
                                                        columnNumber: 17
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                                lineNumber: 221,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                            lineNumber: 220,
                                            columnNumber: 13
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "hs-tooltip ti-main-tooltip",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                type: "button",
                                                onClick: {
                                                    "UserRolesTable.useMemo[columns]": ()=>handleDeleteRole(row.original.id)
                                                }["UserRolesTable.useMemo[columns]"],
                                                className: "hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-danger",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                        className: "ri-delete-bin-line"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                                        lineNumber: 240,
                                                        columnNumber: 19
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700",
                                                        role: "tooltip",
                                                        children: "Delete Role"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                                        lineNumber: 241,
                                                        columnNumber: 19
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                                lineNumber: 235,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                            lineNumber: 234,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true)
                            }, void 0, false, {
                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                lineNumber: 217,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0))
                    }["UserRolesTable.useMemo[columns]"]
                }
            ]
    }["UserRolesTable.useMemo[columns]"], [
        selectedRows
    ]);
    const data = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "UserRolesTable.useMemo[data]": ()=>roles
    }["UserRolesTable.useMemo[data]"], [
        roles
    ]);
    const tableInstance = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$table$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTable"])({
        columns,
        data,
        initialState: {
            pageIndex: 0,
            pageSize: 10
        }
    }, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$table$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSortBy"], __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$table$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePagination"]);
    const { getTableProps, getTableBodyProps, headerGroups, prepareRow, state, page, nextPage, previousPage, canNextPage, canPreviousPage, pageOptions, gotoPage, pageCount, setPageSize } = tableInstance;
    const { pageIndex, pageSize } = state;
    // Handle select all checkbox
    const handleSelectAll = (e)=>{
        if (e.target.checked) {
            const allIds = new Set(roles.map((role)=>role.id));
            setSelectedRows(allIds);
        } else {
            setSelectedRows(new Set());
        }
    };
    // Check if all rows are selected
    const isAllSelected = selectedRows.size === roles.length && roles.length > 0;
    const isIndeterminate = selectedRows.size > 0 && selectedRows.size < roles.length;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-between flex-wrap gap-4 mb-4 px-4 pt-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "box-title",
                        children: [
                            "User Roles",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "badge bg-light text-default rounded-full ms-1 text-[0.75rem] align-middle",
                                children: roles.length
                            }, void 0, false, {
                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                lineNumber: 307,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                        lineNumber: 305,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-wrap gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                className: "form-control !w-auto !py-1 !px-4 !text-[0.75rem] me-2",
                                value: pageSize,
                                onChange: (e)=>setPageSize(Number(e.target.value)),
                                children: [
                                    10,
                                    25,
                                    50,
                                    100
                                ].map((size)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                        value: size,
                                        children: [
                                            "Show ",
                                            size
                                        ]
                                    }, size, true, {
                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                        lineNumber: 318,
                                        columnNumber: 17
                                    }, ("TURBOPACK compile-time value", void 0)))
                            }, void 0, false, {
                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                lineNumber: 312,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                href: "/pages/email/mail-settings/create-role",
                                className: "ti-btn ti-btn-primary-full !py-1 !px-2 !text-[0.75rem]",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                        className: "ri-add-line font-semibold align-middle"
                                    }, void 0, false, {
                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                        lineNumber: 327,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    "Create Role"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                lineNumber: 323,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0)),
                            selectedRows.size > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                className: "ti-btn ti-btn-danger !py-1 !px-2 !text-[0.75rem]",
                                onClick: ()=>{
                                    if (confirm(`Are you sure you want to delete ${selectedRows.size} role(s)?`)) {
                                        setRoles(roles.filter((role)=>!selectedRows.has(role.id)));
                                        setSelectedRows(new Set());
                                    }
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                        className: "ri-delete-bin-line font-semibold align-middle me-1"
                                    }, void 0, false, {
                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                        lineNumber: 340,
                                        columnNumber: 17
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    "Delete Selected (",
                                    selectedRows.size,
                                    ")"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                lineNumber: 330,
                                columnNumber: 15
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                        lineNumber: 311,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                lineNumber: 304,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "table-responsive flex-1 overflow-y-auto",
                style: {
                    minHeight: 0
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                    ...getTableProps(),
                    className: "table whitespace-nowrap min-w-full table-striped table-hover table-bordered border-gray-300 dark:border-gray-600",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                            children: headerGroups.map((headerGroup)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])("tr", {
                                    ...headerGroup.getHeaderGroupProps(),
                                    className: "bg-primary/10 dark:bg-primary/20 border-b border-gray-300 dark:border-gray-600",
                                    key: Math.random(),
                                    __source: {
                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                        lineNumber: 349,
                                        columnNumber: 17
                                    },
                                    __self: ("TURBOPACK compile-time value", void 0)
                                }, headerGroup.headers.map((column)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])("th", {
                                        ...column.getHeaderProps(column.getSortByToggleProps()),
                                        scope: "col",
                                        className: "text-start sticky top-0 z-10 bg-gray-50 dark:bg-black/20",
                                        key: Math.random(),
                                        style: {
                                            position: 'sticky',
                                            top: 0,
                                            zIndex: 10
                                        },
                                        __source: {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                            lineNumber: 351,
                                            columnNumber: 21
                                        },
                                        __self: ("TURBOPACK compile-time value", void 0)
                                    }, column.id === 'checkbox' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        className: "form-check-input",
                                        type: "checkbox",
                                        checked: isAllSelected,
                                        ref: (input)=>{
                                            if (input) input.indeterminate = isIndeterminate;
                                        },
                                        onChange: handleSelectAll,
                                        "aria-label": "Select all"
                                    }, void 0, false, {
                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                        lineNumber: 363,
                                        columnNumber: 25
                                    }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "tabletitle",
                                                children: column.render('Header')
                                            }, void 0, false, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                                lineNumber: 375,
                                                columnNumber: 27
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: column.isSorted ? column.isSortedDesc ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                    className: "ri-arrow-down-s-line text-[0.875rem]"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                                    lineNumber: 379,
                                                    columnNumber: 33
                                                }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                    className: "ri-arrow-up-s-line text-[0.875rem]"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                                    lineNumber: 381,
                                                    columnNumber: 33
                                                }, ("TURBOPACK compile-time value", void 0)) : ''
                                            }, void 0, false, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                                lineNumber: 376,
                                                columnNumber: 27
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                        lineNumber: 374,
                                        columnNumber: 25
                                    }, ("TURBOPACK compile-time value", void 0))))))
                        }, void 0, false, {
                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                            lineNumber: 347,
                            columnNumber: 13
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                            ...getTableBodyProps(),
                            children: page.map((row)=>{
                                prepareRow(row);
                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])("tr", {
                                    ...row.getRowProps(),
                                    className: "border-b border-gray-300 dark:border-gray-600",
                                    key: Math.random(),
                                    __source: {
                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                        lineNumber: 398,
                                        columnNumber: 19
                                    },
                                    __self: ("TURBOPACK compile-time value", void 0)
                                }, row.cells.map((cell)=>{
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])("td", {
                                        ...cell.getCellProps(),
                                        key: Math.random(),
                                        __source: {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                            lineNumber: 401,
                                            columnNumber: 25
                                        },
                                        __self: ("TURBOPACK compile-time value", void 0)
                                    }, cell.render('Cell'));
                                }));
                            })
                        }, void 0, false, {
                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                            lineNumber: 394,
                            columnNumber: 13
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                    lineNumber: 346,
                    columnNumber: 11
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                lineNumber: 345,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "box-footer !border-t-0",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center flex-wrap gap-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                "Showing ",
                                pageIndex * pageSize + 1,
                                " to ",
                                Math.min((pageIndex + 1) * pageSize, data.length),
                                " of ",
                                data.length,
                                " entries",
                                ' ',
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                    className: "bi bi-arrow-right ms-2 font-semibold"
                                }, void 0, false, {
                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                    lineNumber: 416,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                            lineNumber: 414,
                            columnNumber: 13
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "ms-auto",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                                "aria-label": "Page navigation",
                                className: "pagination-style-4",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                    className: "ti-pagination mb-0",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                            className: `page-item ${!canPreviousPage ? 'disabled' : ''}`,
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                className: "page-link px-3 py-[0.375rem]",
                                                onClick: ()=>previousPage(),
                                                disabled: !canPreviousPage,
                                                children: "Prev"
                                            }, void 0, false, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                                lineNumber: 422,
                                                columnNumber: 21
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                            lineNumber: 421,
                                            columnNumber: 19
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        pageOptions.length <= 7 ? pageOptions.map((page)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                className: `page-item ${pageIndex === page ? 'active' : ''}`,
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    className: "page-link px-3 py-[0.375rem]",
                                                    onClick: ()=>gotoPage(page),
                                                    children: page + 1
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                                    lineNumber: 436,
                                                    columnNumber: 25
                                                }, ("TURBOPACK compile-time value", void 0))
                                            }, page, false, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                                lineNumber: 432,
                                                columnNumber: 23
                                            }, ("TURBOPACK compile-time value", void 0))) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                            children: [
                                                pageIndex > 2 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                            className: "page-item",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                className: "page-link px-3 py-[0.375rem]",
                                                                onClick: ()=>gotoPage(0),
                                                                children: "1"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                                                lineNumber: 449,
                                                                columnNumber: 29
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                                            lineNumber: 448,
                                                            columnNumber: 27
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        pageIndex > 3 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                            className: "page-item disabled",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "page-link px-3 py-[0.375rem]",
                                                                children: "..."
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                                                lineNumber: 458,
                                                                columnNumber: 31
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                                            lineNumber: 457,
                                                            columnNumber: 29
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true),
                                                Array.from({
                                                    length: Math.min(5, pageCount)
                                                }, (_, i)=>{
                                                    let pageNum;
                                                    if (pageIndex < 3) {
                                                        pageNum = i;
                                                    } else if (pageIndex > pageCount - 4) {
                                                        pageNum = pageCount - 5 + i;
                                                    } else {
                                                        pageNum = pageIndex - 2 + i;
                                                    }
                                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                        className: `page-item ${pageIndex === pageNum ? 'active' : ''}`,
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            className: "page-link px-3 py-[0.375rem]",
                                                            onClick: ()=>gotoPage(pageNum),
                                                            children: pageNum + 1
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                                            lineNumber: 477,
                                                            columnNumber: 29
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, pageNum, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                                        lineNumber: 473,
                                                        columnNumber: 27
                                                    }, ("TURBOPACK compile-time value", void 0));
                                                }),
                                                pageIndex < pageCount - 3 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                                    children: [
                                                        pageIndex < pageCount - 4 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                            className: "page-item disabled",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "page-link px-3 py-[0.375rem]",
                                                                children: "..."
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                                                lineNumber: 490,
                                                                columnNumber: 31
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                                            lineNumber: 489,
                                                            columnNumber: 29
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                            className: "page-item",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                className: "page-link px-3 py-[0.375rem]",
                                                                onClick: ()=>gotoPage(pageCount - 1),
                                                                children: pageCount
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                                                lineNumber: 494,
                                                                columnNumber: 29
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                                            lineNumber: 493,
                                                            columnNumber: 27
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true)
                                            ]
                                        }, void 0, true),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                            className: `page-item ${!canNextPage ? 'disabled' : ''}`,
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                className: "page-link px-3 py-[0.375rem] text-primary",
                                                onClick: ()=>nextPage(),
                                                disabled: !canNextPage,
                                                children: "Next"
                                            }, void 0, false, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                                lineNumber: 506,
                                                columnNumber: 21
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                            lineNumber: 505,
                                            columnNumber: 19
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                    lineNumber: 420,
                                    columnNumber: 17
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                                lineNumber: 419,
                                columnNumber: 15
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                            lineNumber: 418,
                            columnNumber: 13
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                    lineNumber: 413,
                    columnNumber: 11
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                lineNumber: 412,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            permissionPopover && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                "data-permission-popover": true,
                className: "fixed z-[110] max-w-[280px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-bodybg shadow-xl",
                style: {
                    top: permissionPopover.top,
                    left: permissionPopover.left
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "border-b border-gray-200 dark:border-gray-700 py-2 px-4 font-semibold text-defaulttextcolor",
                        children: permissionPopover.permission
                    }, void 0, false, {
                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                        lineNumber: 527,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-defaulttextcolor text-[0.8rem] py-4 px-4",
                        children: permissionPopover.description
                    }, void 0, false, {
                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                        lineNumber: 530,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
                lineNumber: 522,
                columnNumber: 11
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx",
        lineNumber: 303,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_s(UserRolesTable, "yAZyRXh3rwrOn2pc0MfytEoCx5s=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$table$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTable"]
    ];
});
_c = UserRolesTable;
const __TURBOPACK__default__export__ = UserRolesTable;
var _c;
__turbopack_context__.k.register(_c, "UserRolesTable");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$shared$2f$lib$2f$app$2d$dynamic$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/shared/lib/app-dynamic.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$table$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-table/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$pages$2f$mail$2f$mailsettingdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/shared/data/pages/mail/mailsettingdata.tsx [app-client] (ecmascript)");
;
;
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
const Select = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$shared$2f$lib$2f$app$2d$dynamic$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])(()=>__turbopack_context__.A("[project]/node_modules/react-select/dist/react-select.esm.js [app-client] (ecmascript, next/dynamic entry, async loader)"), {
    loadableGenerated: {
        modules: [
            "[project]/node_modules/react-select/dist/react-select.esm.js [app-client] (ecmascript, next/dynamic entry)"
        ]
    },
    ssr: false
});
_c = Select;
const TIMEZONE_OPTIONS = [
    {
        value: 'UTC',
        label: 'UTC'
    },
    {
        value: 'America/New_York',
        label: 'America/New York (EST)'
    },
    {
        value: 'America/Los_Angeles',
        label: 'America/Los Angeles (PST)'
    },
    {
        value: 'Europe/London',
        label: 'Europe/London (GMT)'
    },
    {
        value: 'Asia/Dubai',
        label: 'Asia/Dubai (GST)'
    },
    {
        value: 'Asia/Kolkata',
        label: 'Asia/Kolkata (IST)'
    }
];
const ROLE_OPTIONS = [
    {
        value: 'Administrator',
        label: 'Administrator',
        permissions: [
            'Full Access',
            'User Management',
            'Role Management',
            'Settings'
        ]
    },
    {
        value: 'Manager',
        label: 'Manager',
        permissions: [
            'View Reports',
            'User Management',
            'Edit Content'
        ]
    },
    {
        value: 'Editor',
        label: 'Editor',
        permissions: [
            'Edit Content',
            'View Reports'
        ]
    },
    {
        value: 'Viewer',
        label: 'Viewer',
        permissions: [
            'View Content',
            'View Reports'
        ]
    },
    {
        value: 'Guest',
        label: 'Guest',
        permissions: [
            'View Content'
        ]
    }
];
const USERS_DATA = [
    {
        id: '1',
        userName: 'John Doe',
        role: 'Administrator',
        permissions: [
            'Full Access',
            'User Management',
            'Role Management',
            'Settings'
        ]
    },
    {
        id: '2',
        userName: 'Jane Smith',
        role: 'Manager',
        permissions: [
            'View Reports',
            'User Management',
            'Edit Content'
        ]
    },
    {
        id: '3',
        userName: 'Bob Wilson',
        role: 'Editor',
        permissions: [
            'Edit Content',
            'View Reports'
        ]
    },
    {
        id: '4',
        userName: 'Alice Brown',
        role: 'Viewer',
        permissions: [
            'View Content',
            'View Reports'
        ]
    },
    {
        id: '5',
        userName: 'Charlie Davis',
        role: 'Guest',
        permissions: [
            'View Content'
        ]
    }
];
const UsersTable = ()=>{
    _s();
    const [users, setUsers] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(USERS_DATA);
    const [showAddUserModal, setShowAddUserModal] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [formErrors, setFormErrors] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({});
    const dpInputRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    // Form state
    const [firstName, setFirstName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [lastName, setLastName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [email, setEmail] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [username, setUsername] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [contactNumber, setContactNumber] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [country, setCountry] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$pages$2f$mail$2f$mailsettingdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Countryoptions"][0]);
    const [language, setLanguage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$pages$2f$mail$2f$mailsettingdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Languageoptions"][0]);
    const [timezone, setTimezone] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(TIMEZONE_OPTIONS[0]);
    const [dpPreview, setDpPreview] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [bio, setBio] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [newPassword, setNewPassword] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [newUserRole, setNewUserRole] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(ROLE_OPTIONS[0].value);
    const resetForm = ()=>{
        setFirstName('');
        setLastName('');
        setEmail('');
        setUsername('');
        setContactNumber('');
        setCountry(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$pages$2f$mail$2f$mailsettingdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Countryoptions"][0]);
        setLanguage(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$pages$2f$mail$2f$mailsettingdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Languageoptions"][0]);
        setTimezone(TIMEZONE_OPTIONS[0]);
        setDpPreview(null);
        setBio('');
        setNewPassword('');
        setNewUserRole(ROLE_OPTIONS[0].value);
        setFormErrors({});
    };
    const handleDpChange = (e)=>{
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = ()=>setDpPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };
    const handleAddUser = ()=>{
        const errors = {};
        if (!firstName.trim()) errors.firstName = 'First name is required';
        if (!lastName.trim()) errors.lastName = 'Last name is required';
        if (!contactNumber.trim()) errors.contactNumber = 'Contact number is required';
        if (!newPassword.trim()) errors.password = 'Password is required';
        setFormErrors(errors);
        if (Object.keys(errors).length > 0) return;
        const roleConfig = ROLE_OPTIONS.find((r)=>r.value === newUserRole);
        const fullName = `${firstName.trim()} ${lastName.trim()}`;
        const newUser = {
            id: String(Date.now()),
            userName: fullName,
            role: newUserRole,
            permissions: roleConfig?.permissions ?? []
        };
        setUsers((prev)=>[
                ...prev,
                newUser
            ]);
        setShowAddUserModal(false);
        resetForm();
    };
    const columns = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "UsersTable.useMemo[columns]": ()=>[
                {
                    Header: 'User Name',
                    accessor: 'userName'
                },
                {
                    Header: 'Role',
                    accessor: 'role'
                },
                {
                    Header: 'Permissions',
                    accessor: 'permissions',
                    disableSortBy: true,
                    Cell: {
                        "UsersTable.useMemo[columns]": ({ row })=>{
                            const permissions = row.original.permissions;
                            if (!permissions?.length) return null;
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex flex-wrap gap-1",
                                children: [
                                    permissions.slice(0, 3).map({
                                        "UsersTable.useMemo[columns]": (p, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "badge bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full text-xs font-medium",
                                                children: p
                                            }, idx, false, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                lineNumber: 130,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                    }["UsersTable.useMemo[columns]"]),
                                    permissions.length > 3 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "badge bg-light text-default px-2 py-0.5 rounded-full text-xs",
                                        children: [
                                            "+",
                                            permissions.length - 3
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                        lineNumber: 138,
                                        columnNumber: 17
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                lineNumber: 128,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0));
                        }
                    }["UsersTable.useMemo[columns]"]
                },
                {
                    Header: 'Action',
                    accessor: 'id',
                    disableSortBy: true,
                    Cell: {
                        "UsersTable.useMemo[columns]": ({ row })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "hs-tooltip ti-main-tooltip",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: {
                                                "UsersTable.useMemo[columns]": ()=>console.log('Login as:', row.original)
                                            }["UsersTable.useMemo[columns]"],
                                            className: "hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-success",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                    className: "ri-login-box-line"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                    lineNumber: 158,
                                                    columnNumber: 17
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700",
                                                    role: "tooltip",
                                                    children: "Login as"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                    lineNumber: 159,
                                                    columnNumber: 17
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                            lineNumber: 153,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0))
                                    }, void 0, false, {
                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                        lineNumber: 152,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "hs-tooltip ti-main-tooltip",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: {
                                                "UsersTable.useMemo[columns]": ()=>console.log('Edit user:', row.original)
                                            }["UsersTable.useMemo[columns]"],
                                            className: "hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-info",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                    className: "ri-pencil-line"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                    lineNumber: 170,
                                                    columnNumber: 17
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700",
                                                    role: "tooltip",
                                                    children: "Edit User"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                    lineNumber: 171,
                                                    columnNumber: 17
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                            lineNumber: 165,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0))
                                    }, void 0, false, {
                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                        lineNumber: 164,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "hs-tooltip ti-main-tooltip",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: {
                                                "UsersTable.useMemo[columns]": ()=>{
                                                    if (confirm('Are you sure you want to delete this user?')) {
                                                        setUsers({
                                                            "UsersTable.useMemo[columns]": (prev)=>prev.filter({
                                                                    "UsersTable.useMemo[columns]": (u)=>u.id !== row.original.id
                                                                }["UsersTable.useMemo[columns]"])
                                                        }["UsersTable.useMemo[columns]"]);
                                                    }
                                                }
                                            }["UsersTable.useMemo[columns]"],
                                            className: "hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-danger",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                    className: "ri-delete-bin-line"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                    lineNumber: 186,
                                                    columnNumber: 17
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700",
                                                    role: "tooltip",
                                                    children: "Delete User"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                    lineNumber: 187,
                                                    columnNumber: 17
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                            lineNumber: 177,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0))
                                    }, void 0, false, {
                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                        lineNumber: 176,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                lineNumber: 151,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0))
                    }["UsersTable.useMemo[columns]"]
                }
            ]
    }["UsersTable.useMemo[columns]"], []);
    const tableInstance = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$table$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTable"])({
        columns,
        data: users,
        initialState: {
            pageIndex: 0,
            pageSize: 10
        }
    }, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$table$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSortBy"], __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$table$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePagination"]);
    const { getTableProps, getTableBodyProps, headerGroups, prepareRow, state, page, nextPage, previousPage, canNextPage, canPreviousPage, pageOptions, gotoPage, pageCount, setPageSize } = tableInstance;
    const { pageIndex, pageSize } = state;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-between flex-wrap gap-4 mb-4 px-4 pt-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "box-title",
                        children: [
                            "Users",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "badge bg-light text-default rounded-full ms-1 text-[0.75rem] align-middle",
                                children: users.length
                            }, void 0, false, {
                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                lineNumber: 233,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                        lineNumber: 231,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-wrap gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                className: "form-control !w-auto !py-1 !px-4 !text-[0.75rem] me-2",
                                value: pageSize,
                                onChange: (e)=>setPageSize(Number(e.target.value)),
                                children: [
                                    10,
                                    25,
                                    50,
                                    100
                                ].map((size)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                        value: size,
                                        children: [
                                            "Show ",
                                            size
                                        ]
                                    }, size, true, {
                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                        lineNumber: 244,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)))
                            }, void 0, false, {
                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                lineNumber: 238,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                className: "ti-btn ti-btn-primary-full !py-1 !px-2 !text-[0.75rem]",
                                onClick: ()=>setShowAddUserModal(true),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                        className: "ri-add-line font-semibold align-middle"
                                    }, void 0, false, {
                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                        lineNumber: 254,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    "Add User"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                lineNumber: 249,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                        lineNumber: 237,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                lineNumber: 230,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "table-responsive flex-1 overflow-y-auto",
                style: {
                    minHeight: 0
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                    ...getTableProps(),
                    className: "table whitespace-nowrap min-w-full table-striped table-hover table-bordered border-gray-300 dark:border-gray-600",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                            children: headerGroups.map((headerGroup)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])("tr", {
                                    ...headerGroup.getHeaderGroupProps(),
                                    className: "bg-primary/10 dark:bg-primary/20 border-b border-gray-300 dark:border-gray-600",
                                    key: Math.random(),
                                    __source: {
                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                        lineNumber: 262,
                                        columnNumber: 15
                                    },
                                    __self: ("TURBOPACK compile-time value", void 0)
                                }, headerGroup.headers.map((column)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])("th", {
                                        ...column.getHeaderProps(column.getSortByToggleProps?.() || column.getHeaderProps()),
                                        scope: "col",
                                        className: "text-start sticky top-0 z-10 bg-gray-50 dark:bg-black/20",
                                        key: Math.random(),
                                        style: {
                                            position: 'sticky',
                                            top: 0,
                                            zIndex: 10
                                        },
                                        __source: {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                            lineNumber: 264,
                                            columnNumber: 19
                                        },
                                        __self: ("TURBOPACK compile-time value", void 0)
                                    }, /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "tabletitle",
                                                children: column.render('Header')
                                            }, void 0, false, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                lineNumber: 272,
                                                columnNumber: 23
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            column.isSorted && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: column.isSortedDesc ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                    className: "ri-arrow-down-s-line text-[0.875rem]"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                    lineNumber: 276,
                                                    columnNumber: 29
                                                }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                    className: "ri-arrow-up-s-line text-[0.875rem]"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                    lineNumber: 278,
                                                    columnNumber: 29
                                                }, ("TURBOPACK compile-time value", void 0))
                                            }, void 0, false, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                lineNumber: 274,
                                                columnNumber: 25
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                        lineNumber: 271,
                                        columnNumber: 21
                                    }, ("TURBOPACK compile-time value", void 0))))))
                        }, void 0, false, {
                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                            lineNumber: 260,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                            ...getTableBodyProps(),
                            children: page.map((row)=>{
                                prepareRow(row);
                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])("tr", {
                                    ...row.getRowProps(),
                                    className: "border-b border-gray-300 dark:border-gray-600",
                                    key: Math.random(),
                                    __source: {
                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                        lineNumber: 292,
                                        columnNumber: 17
                                    },
                                    __self: ("TURBOPACK compile-time value", void 0)
                                }, row.cells.map((cell)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])("td", {
                                        ...cell.getCellProps(),
                                        key: Math.random(),
                                        __source: {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                            lineNumber: 294,
                                            columnNumber: 21
                                        },
                                        __self: ("TURBOPACK compile-time value", void 0)
                                    }, cell.render('Cell'))));
                            })
                        }, void 0, false, {
                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                            lineNumber: 288,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                    lineNumber: 259,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                lineNumber: 258,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "box-footer !border-t-0",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex flex-wrap gap-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                "Showing ",
                                pageIndex * pageSize + 1,
                                " to ",
                                Math.min((pageIndex + 1) * pageSize, users.length),
                                " of ",
                                users.length,
                                " entries"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                            lineNumber: 306,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "ms-auto",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                                "aria-label": "Page navigation",
                                className: "pagination-style-4",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                    className: "ti-pagination mb-0",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                            className: `page-item ${!canPreviousPage ? 'disabled' : ''}`,
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                className: "page-link px-3 py-[0.375rem]",
                                                onClick: ()=>previousPage(),
                                                disabled: !canPreviousPage,
                                                children: "Prev"
                                            }, void 0, false, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                lineNumber: 313,
                                                columnNumber: 19
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                            lineNumber: 312,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        pageOptions.map((p)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                className: `page-item ${pageIndex === p ? 'active' : ''}`,
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    className: "page-link px-3 py-[0.375rem]",
                                                    onClick: ()=>gotoPage(p),
                                                    children: p + 1
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                    lineNumber: 319,
                                                    columnNumber: 21
                                                }, ("TURBOPACK compile-time value", void 0))
                                            }, p, false, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                lineNumber: 318,
                                                columnNumber: 19
                                            }, ("TURBOPACK compile-time value", void 0))),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                            className: `page-item ${!canNextPage ? 'disabled' : ''}`,
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                className: "page-link px-3 py-[0.375rem] text-primary",
                                                onClick: ()=>nextPage(),
                                                disabled: !canNextPage,
                                                children: "Next"
                                            }, void 0, false, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                lineNumber: 325,
                                                columnNumber: 19
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                            lineNumber: 324,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                    lineNumber: 311,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                lineNumber: 310,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                            lineNumber: 309,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                    lineNumber: 305,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                lineNumber: 304,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            showAddUserModal && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 z-[100] flex items-center justify-center p-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute inset-0 bg-black/50 dark:bg-black/70",
                        onClick: ()=>{
                            setShowAddUserModal(false);
                            resetForm();
                        },
                        "aria-hidden": "true"
                    }, void 0, false, {
                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                        lineNumber: 338,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "relative ti-modal-content bg-white dark:bg-bodybg rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "ti-modal-header flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h6", {
                                        className: "ti-modal-title text-lg font-semibold",
                                        children: "Add User"
                                    }, void 0, false, {
                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                        lineNumber: 345,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        className: "ti-modal-close-btn p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700",
                                        onClick: ()=>{
                                            setShowAddUserModal(false);
                                            resetForm();
                                        },
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                            className: "ri-close-line text-xl"
                                        }, void 0, false, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                            lineNumber: 351,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0))
                                    }, void 0, false, {
                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                        lineNumber: 346,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                lineNumber: 344,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "ti-modal-body px-4 py-4 overflow-y-auto flex-1",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "grid grid-cols-12 gap-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "xl:col-span-6 col-span-12",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    htmlFor: "add-first-name",
                                                    className: "form-label",
                                                    children: [
                                                        "First Name ",
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-danger",
                                                            children: "*"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                            lineNumber: 357,
                                                            columnNumber: 85
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                    lineNumber: 357,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    id: "add-first-name",
                                                    type: "text",
                                                    className: `form-control ${formErrors.firstName ? 'border-danger' : ''}`,
                                                    placeholder: "Enter first name",
                                                    value: firstName,
                                                    onChange: (e)=>{
                                                        setFirstName(e.target.value);
                                                        setFormErrors((p)=>({
                                                                ...p,
                                                                firstName: ''
                                                            }));
                                                    }
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                    lineNumber: 358,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                formErrors.firstName && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-danger text-xs mt-1",
                                                    children: formErrors.firstName
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                    lineNumber: 366,
                                                    columnNumber: 44
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                            lineNumber: 356,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "xl:col-span-6 col-span-12",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    htmlFor: "add-last-name",
                                                    className: "form-label",
                                                    children: [
                                                        "Last Name ",
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-danger",
                                                            children: "*"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                            lineNumber: 369,
                                                            columnNumber: 83
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                    lineNumber: 369,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    id: "add-last-name",
                                                    type: "text",
                                                    className: `form-control ${formErrors.lastName ? 'border-danger' : ''}`,
                                                    placeholder: "Enter last name",
                                                    value: lastName,
                                                    onChange: (e)=>{
                                                        setLastName(e.target.value);
                                                        setFormErrors((p)=>({
                                                                ...p,
                                                                lastName: ''
                                                            }));
                                                    }
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                    lineNumber: 370,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                formErrors.lastName && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-danger text-xs mt-1",
                                                    children: formErrors.lastName
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                    lineNumber: 378,
                                                    columnNumber: 43
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                            lineNumber: 368,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "xl:col-span-6 col-span-12",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    htmlFor: "add-email",
                                                    className: "form-label",
                                                    children: "Email"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                    lineNumber: 381,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    id: "add-email",
                                                    type: "email",
                                                    className: "form-control",
                                                    placeholder: "Enter email",
                                                    value: email,
                                                    onChange: (e)=>setEmail(e.target.value)
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                    lineNumber: 382,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                            lineNumber: 380,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "xl:col-span-6 col-span-12",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    htmlFor: "add-username",
                                                    className: "form-label",
                                                    children: "Username"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                    lineNumber: 392,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    id: "add-username",
                                                    type: "text",
                                                    className: "form-control",
                                                    placeholder: "Enter username",
                                                    value: username,
                                                    onChange: (e)=>setUsername(e.target.value)
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                    lineNumber: 393,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                            lineNumber: 391,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "xl:col-span-6 col-span-12",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    htmlFor: "add-contact",
                                                    className: "form-label",
                                                    children: [
                                                        "Contact Number ",
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-danger",
                                                            children: "*"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                            lineNumber: 403,
                                                            columnNumber: 86
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                    lineNumber: 403,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    id: "add-contact",
                                                    type: "tel",
                                                    className: `form-control ${formErrors.contactNumber ? 'border-danger' : ''}`,
                                                    placeholder: "Enter contact number",
                                                    value: contactNumber,
                                                    onChange: (e)=>{
                                                        setContactNumber(e.target.value);
                                                        setFormErrors((p)=>({
                                                                ...p,
                                                                contactNumber: ''
                                                            }));
                                                    }
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                    lineNumber: 404,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                formErrors.contactNumber && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-danger text-xs mt-1",
                                                    children: formErrors.contactNumber
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                    lineNumber: 412,
                                                    columnNumber: 48
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                            lineNumber: 402,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "xl:col-span-6 col-span-12",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    htmlFor: "add-password",
                                                    className: "form-label",
                                                    children: [
                                                        "Password ",
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-danger",
                                                            children: "*"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                            lineNumber: 415,
                                                            columnNumber: 81
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                    lineNumber: 415,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    id: "add-password",
                                                    type: "password",
                                                    className: `form-control ${formErrors.password ? 'border-danger' : ''}`,
                                                    placeholder: "Enter password",
                                                    value: newPassword,
                                                    onChange: (e)=>{
                                                        setNewPassword(e.target.value);
                                                        setFormErrors((p)=>({
                                                                ...p,
                                                                password: ''
                                                            }));
                                                    }
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                    lineNumber: 416,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                formErrors.password && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-danger text-xs mt-1",
                                                    children: formErrors.password
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                    lineNumber: 424,
                                                    columnNumber: 43
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                            lineNumber: 414,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "xl:col-span-6 col-span-12",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "form-label",
                                                    children: "Country"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                    lineNumber: 427,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Select, {
                                                    options: __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$pages$2f$mail$2f$mailsettingdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Countryoptions"],
                                                    value: country,
                                                    onChange: (opt)=>setCountry(opt || __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$pages$2f$mail$2f$mailsettingdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Countryoptions"][0]),
                                                    className: "w-full",
                                                    classNamePrefix: "Select2",
                                                    menuPlacement: "auto"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                    lineNumber: 428,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                            lineNumber: 426,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "xl:col-span-6 col-span-12",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "form-label",
                                                    children: "Language"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                    lineNumber: 438,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Select, {
                                                    options: __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$pages$2f$mail$2f$mailsettingdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Languageoptions"],
                                                    value: language,
                                                    onChange: (opt)=>setLanguage(opt || __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$pages$2f$mail$2f$mailsettingdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Languageoptions"][0]),
                                                    className: "w-full",
                                                    classNamePrefix: "Select2",
                                                    menuPlacement: "auto"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                    lineNumber: 439,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                            lineNumber: 437,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "xl:col-span-6 col-span-12",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "form-label",
                                                    children: "Timezone"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                    lineNumber: 449,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Select, {
                                                    options: TIMEZONE_OPTIONS,
                                                    value: timezone,
                                                    onChange: (opt)=>setTimezone(opt || TIMEZONE_OPTIONS[0]),
                                                    className: "w-full",
                                                    classNamePrefix: "Select2",
                                                    menuPlacement: "auto"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                    lineNumber: 450,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                            lineNumber: 448,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "xl:col-span-6 col-span-12",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "form-label",
                                                    children: "Role"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                    lineNumber: 460,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                    className: "form-control",
                                                    value: newUserRole,
                                                    onChange: (e)=>setNewUserRole(e.target.value),
                                                    children: ROLE_OPTIONS.map((role)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                            value: role.value,
                                                            children: role.label
                                                        }, role.value, false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                            lineNumber: 467,
                                                            columnNumber: 23
                                                        }, ("TURBOPACK compile-time value", void 0)))
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                    lineNumber: 461,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                            lineNumber: 459,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "xl:col-span-12 col-span-12",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "form-label",
                                                    children: "Display Picture (DP)"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                    lineNumber: 472,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-center gap-4",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "w-16 h-16 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer overflow-hidden bg-gray-50 dark:bg-gray-800",
                                                            onClick: ()=>dpInputRef.current?.click(),
                                                            children: dpPreview ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                src: dpPreview,
                                                                alt: "Preview",
                                                                className: "w-full h-full object-cover"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                                lineNumber: 479,
                                                                columnNumber: 25
                                                            }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                className: "ri-user-add-line text-2xl text-gray-400"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                                lineNumber: 481,
                                                                columnNumber: 25
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                            lineNumber: 474,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            ref: dpInputRef,
                                                            type: "file",
                                                            accept: "image/*",
                                                            className: "hidden",
                                                            onChange: handleDpChange
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                            lineNumber: 484,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-xs text-muted",
                                                            children: "Click to upload photo"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                            lineNumber: 491,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                    lineNumber: 473,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                            lineNumber: 471,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "xl:col-span-12 col-span-12",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    htmlFor: "add-bio",
                                                    className: "form-label",
                                                    children: "Bio"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                    lineNumber: 495,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                                    id: "add-bio",
                                                    className: "form-control",
                                                    rows: 3,
                                                    placeholder: "Enter bio",
                                                    value: bio,
                                                    onChange: (e)=>setBio(e.target.value)
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                                    lineNumber: 496,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                            lineNumber: 494,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                    lineNumber: 355,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                lineNumber: 354,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "ti-modal-footer px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2 shrink-0",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        className: "ti-btn ti-btn-light",
                                        onClick: ()=>{
                                            setShowAddUserModal(false);
                                            resetForm();
                                        },
                                        children: "Cancel"
                                    }, void 0, false, {
                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                        lineNumber: 508,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        className: "ti-btn ti-btn-primary-full",
                                        onClick: handleAddUser,
                                        children: "Create User"
                                    }, void 0, false, {
                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                        lineNumber: 515,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                                lineNumber: 507,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                        lineNumber: 343,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
                lineNumber: 337,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx",
        lineNumber: 229,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_s(UsersTable, "AVt+/g8DewBqOgr3wI+3oTq3wPI=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$table$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTable"]
    ];
});
_c1 = UsersTable;
const __TURBOPACK__default__export__ = UsersTable;
var _c, _c1;
__turbopack_context__.k.register(_c, "Select");
__turbopack_context__.k.register(_c1, "UsersTable");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$pages$2f$mail$2f$mailsettingdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/shared/data/pages/mail/mailsettingdata.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$shared$2f$lib$2f$app$2d$dynamic$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/shared/lib/app-dynamic.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$components$292f28$contentlayout$292f$pages$2f$email$2f$mail$2d$settings$2f$user$2d$roles$2d$table$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/(components)/(contentlayout)/pages/email/mail-settings/user-roles-table.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$components$292f28$contentlayout$292f$pages$2f$email$2f$mail$2d$settings$2f$users$2d$table$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/(components)/(contentlayout)/pages/email/mail-settings/users-table.tsx [app-client] (ecmascript)");
;
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
const Select = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$shared$2f$lib$2f$app$2d$dynamic$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])(()=>__turbopack_context__.A("[project]/node_modules/react-select/dist/react-select.esm.js [app-client] (ecmascript, next/dynamic entry, async loader)"), {
    loadableGenerated: {
        modules: [
            "[project]/node_modules/react-select/dist/react-select.esm.js [app-client] (ecmascript, next/dynamic entry)"
        ]
    },
    ssr: false
});
_c = Select;
const Mailsettings = ()=>{
    _s();
    const [selectedImage, setSelectedImage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("../../../assets/images/faces/9.jpg"); // Set the default image URL here
    const fileInputRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const handleImageChange = (e)=>{
        const selectedFile = e.target.files && e.target.files[0];
        if (selectedFile) {
            // You can handle the file here, for example, upload it to a server.
            // Read the selected image and set it in state
            const reader = new FileReader();
            reader.onload = (event)=>{
                setSelectedImage(event.target?.result);
            };
            reader.readAsDataURL(selectedFile);
        }
    };
    const openFileInput = ()=>{
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "container w-full max-w-full mx-auto",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid grid-cols-12 gap-6 mb-[3rem]",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "xl:col-span-12 col-span-12",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "box",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "box-header sm:flex block !justify-start",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                                    "aria-label": "Tabs",
                                    className: "md:flex block !justify-start whitespace-nowrap",
                                    role: "tablist",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                            href: "#!",
                                            scroll: false,
                                            className: "m-1 block w-full hs-tab-active:bg-primary/10 hs-tab-active:text-primary cursor-pointer text-defaulttextcolor dark:text-defaulttextcolor/70 py-2 px-3 flex-grow  text-[0.75rem] font-medium rounded-md hover:text-primary active",
                                            id: "user-roles-item",
                                            "data-hs-tab": "#user-roles",
                                            "aria-controls": "user-roles",
                                            children: "User Roles"
                                        }, void 0, false, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                            lineNumber: 47,
                                            columnNumber: 37
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                            href: "#!",
                                            scroll: false,
                                            className: "m-1 block w-full hs-tab-active:bg-primary/10 hs-tab-active:text-primary cursor-pointer text-defaulttextcolor dark:text-defaulttextcolor/70 py-2 px-3 text-[0.75rem] flex-grow font-medium rounded-md hover:text-primary ",
                                            id: "users-item",
                                            "data-hs-tab": "#users",
                                            "aria-controls": "users",
                                            children: "Users"
                                        }, void 0, false, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                            lineNumber: 50,
                                            columnNumber: 37
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                            href: "#!",
                                            scroll: false,
                                            className: "m-1 block w-full hs-tab-active:bg-primary/10 hs-tab-active:text-primary cursor-pointer text-defaulttextcolor dark:text-defaulttextcolor/70 py-2 px-3 flex-grow  text-[0.75rem] font-medium rounded-md hover:text-primary ",
                                            id: "Personal-item",
                                            "data-hs-tab": "#personal-info",
                                            "aria-controls": "#personal-info",
                                            children: "Personal Information"
                                        }, void 0, false, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                            lineNumber: 53,
                                            columnNumber: 37
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                            href: "#!",
                                            scroll: false,
                                            className: "m-1 block w-full hs-tab-active:bg-primary/10 hs-tab-active:text-primary cursor-pointer text-defaulttextcolor dark:text-defaulttextcolor/70 py-2 px-3 text-[0.75rem] flex-grow font-medium rounded-md hover:text-primary hidden",
                                            id: "account-item",
                                            "data-hs-tab": "#account-settings",
                                            "aria-controls": "account-settings",
                                            children: "Account Settings"
                                        }, void 0, false, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                            lineNumber: 56,
                                            columnNumber: 37
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                            href: "#!",
                                            scroll: false,
                                            className: "m-1 block w-full hs-tab-active:bg-primary/10 hs-tab-active:text-primary cursor-pointer text-defaulttextcolor dark:text-defaulttextcolor/70 py-2 px-3 text-[0.75rem] flex-grow font-medium rounded-md hover:text-primary hidden",
                                            id: "email-item",
                                            "data-hs-tab": "#email-settings",
                                            "aria-controls": "email-settings",
                                            children: "Email"
                                        }, void 0, false, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                            lineNumber: 59,
                                            columnNumber: 37
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                            href: "#!",
                                            scroll: false,
                                            className: "m-1 block w-full hs-tab-active:bg-primary/10 hs-tab-active:text-primary cursor-pointer text-defaulttextcolor dark:text-defaulttextcolor/70 py-2 px-3 text-[0.75rem] flex-grow font-medium rounded-md hover:text-primary hidden",
                                            id: "labels-item",
                                            "data-hs-tab": "#labels",
                                            "aria-controls": "labels",
                                            children: "Labels"
                                        }, void 0, false, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                            lineNumber: 62,
                                            columnNumber: 37
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                            href: "#!",
                                            scroll: false,
                                            className: "m-1 block w-full hs-tab-active:bg-primary/10 hs-tab-active:text-primary cursor-pointer text-defaulttextcolor dark:text-defaulttextcolor/70 py-2 px-3 text-[0.75rem] flex-grow font-medium rounded-md hover:text-primary hidden",
                                            id: "notifications-item",
                                            "data-hs-tab": "#notification-settings",
                                            "aria-controls": "notification-settings",
                                            children: "Notifications"
                                        }, void 0, false, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                            lineNumber: 65,
                                            columnNumber: 37
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                            href: "#!",
                                            scroll: false,
                                            className: "m-1 block w-full hs-tab-active:bg-primary/10 hs-tab-active:text-primary cursor-pointer text-defaulttextcolor dark:text-defaulttextcolor/70 py-2 px-3 text-[0.75rem] flex-grow font-medium rounded-md hover:text-primary hidden",
                                            id: "security-item",
                                            "data-hs-tab": "#security",
                                            "aria-controls": "security",
                                            children: "Security"
                                        }, void 0, false, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                            lineNumber: 68,
                                            columnNumber: 37
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                    lineNumber: 46,
                                    columnNumber: 33
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                lineNumber: 45,
                                columnNumber: 29
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "tab-content border-none",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "tab-pane show active dark:border-defaultborder/10",
                                            id: "user-roles",
                                            "aria-labelledby": "user-roles-item",
                                            role: "tabpanel",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$components$292f28$contentlayout$292f$pages$2f$email$2f$mail$2d$settings$2f$user$2d$roles$2d$table$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                lineNumber: 76,
                                                columnNumber: 41
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                            lineNumber: 75,
                                            columnNumber: 37
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "tab-pane dark:border-defaultborder/10 hidden",
                                            id: "users",
                                            "aria-labelledby": "users-item",
                                            role: "tabpanel",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$components$292f28$contentlayout$292f$pages$2f$email$2f$mail$2d$settings$2f$users$2d$table$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                lineNumber: 79,
                                                columnNumber: 41
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                            lineNumber: 78,
                                            columnNumber: 37
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "tab-pane dark:border-defaultborder/10 hidden",
                                            id: "personal-info",
                                            "aria-labelledby": "Personal-item",
                                            role: "tabpanel",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "sm:p-4 p-0",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h6", {
                                                        className: "font-semibold mb-4 text-[1rem]",
                                                        children: "Photo :"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                        lineNumber: 83,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "mb-6 sm:flex items-center",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "mb-0 me-[3rem]",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "avatar avatar-xxl avatar-rounded",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                            src: selectedImage || '',
                                                                            alt: "",
                                                                            id: "profile-img"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 89,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            "aria-label": "anchor",
                                                                            className: "badge rounded-full bg-primary avatar-badge",
                                                                            onClick: openFileInput,
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                    type: "file",
                                                                                    name: "photo",
                                                                                    "data-hs-overlay": "#hs-small-modal",
                                                                                    ref: fileInputRef,
                                                                                    onChange: handleImageChange,
                                                                                    style: {
                                                                                        display: 'none'
                                                                                    },
                                                                                    className: "absolute w-full h-full opacity-0",
                                                                                    id: "profile-image"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 91,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                                    className: "fe fe-camera !text-[0.65rem] !text-white"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 94,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 90,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 88,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                lineNumber: 87,
                                                                columnNumber: 49
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "inline-flex",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                        type: "button",
                                                                        className: "ti-btn bg-primary text-white !rounded-e-none !font-medium",
                                                                        children: "Change"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 99,
                                                                        columnNumber: 53
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                        type: "button",
                                                                        className: "ti-btn ti-btn-light !font-medium !rounded-s-none",
                                                                        children: "Remove"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 100,
                                                                        columnNumber: 53
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                lineNumber: 98,
                                                                columnNumber: 49
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                        lineNumber: 86,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h6", {
                                                        className: "font-semibold mb-4 text-[1rem]",
                                                        children: "Profile :"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                        lineNumber: 103,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "sm:grid grid-cols-12 gap-6 mb-6",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "xl:col-span-6 col-span-12",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                        htmlFor: "first-name",
                                                                        className: "form-label",
                                                                        children: "First Name"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 108,
                                                                        columnNumber: 53
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                        type: "text",
                                                                        className: "form-control w-full !rounded-md",
                                                                        id: "first-name",
                                                                        placeholder: "First Name"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 109,
                                                                        columnNumber: 53
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                lineNumber: 107,
                                                                columnNumber: 49
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "xl:col-span-6 col-span-12",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                        htmlFor: "last-name",
                                                                        className: "form-label",
                                                                        children: "Last Name"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 112,
                                                                        columnNumber: 53
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                        type: "text",
                                                                        className: "form-control w-full !rounded-md",
                                                                        id: "last-name",
                                                                        placeholder: "Last Name"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 113,
                                                                        columnNumber: 53
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                lineNumber: 111,
                                                                columnNumber: 49
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "xl:col-span-12 col-span-12",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                        className: "form-label",
                                                                        children: "User Name"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 116,
                                                                        columnNumber: 53
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "input-group !flex-nowrap mb-3",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "input-group-text",
                                                                                id: "basic-addon3",
                                                                                children: "user2413@gmail.com"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 118,
                                                                                columnNumber: 57
                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                type: "text",
                                                                                className: "form-control w-full rounded-md",
                                                                                id: "basic-url",
                                                                                "aria-describedby": "basic-addon3"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 119,
                                                                                columnNumber: 57
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 117,
                                                                        columnNumber: 53
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                lineNumber: 115,
                                                                columnNumber: 49
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                        lineNumber: 106,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h6", {
                                                        className: "font-semibold mb-4 text-[1rem]",
                                                        children: "Personal information :"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                        lineNumber: 123,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "sm:grid grid-cols-12 gap-6 mb-6",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "xl:col-span-6 col-span-12",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                        htmlFor: "email-address",
                                                                        className: "form-label",
                                                                        children: "Email Address :"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 128,
                                                                        columnNumber: 53
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                        type: "text",
                                                                        className: "form-control w-full !rounded-md",
                                                                        id: "email-address",
                                                                        placeholder: "xyz@gmail.com"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 129,
                                                                        columnNumber: 53
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                lineNumber: 127,
                                                                columnNumber: 49
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "xl:col-span-6 col-span-12",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                        htmlFor: "Contact-Details",
                                                                        className: "form-label",
                                                                        children: "Contact Details :"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 132,
                                                                        columnNumber: 53
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                        type: "text",
                                                                        className: "form-control w-full !rounded-md",
                                                                        id: "Contact-Details",
                                                                        placeholder: "contact details"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 133,
                                                                        columnNumber: 53
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                lineNumber: 131,
                                                                columnNumber: 49
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "xl:col-span-6 col-span-12",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                        className: "form-label",
                                                                        children: "Language :"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 136,
                                                                        columnNumber: 53
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Select, {
                                                                        isMulti: true,
                                                                        name: "colors",
                                                                        options: __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$pages$2f$mail$2f$mailsettingdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Languageoptions"],
                                                                        className: "",
                                                                        menuPlacement: "auto",
                                                                        classNamePrefix: "Select2",
                                                                        defaultValue: [
                                                                            __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$pages$2f$mail$2f$mailsettingdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Languageoptions"][0]
                                                                        ]
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 137,
                                                                        columnNumber: 53
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                lineNumber: 135,
                                                                columnNumber: 49
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "xl:col-span-6 col-span-12",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                        className: "form-label",
                                                                        children: "Country :"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 142,
                                                                        columnNumber: 53
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Select, {
                                                                        name: "colors",
                                                                        options: __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$pages$2f$mail$2f$mailsettingdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Countryoptions"],
                                                                        className: "w-full !rounded-md",
                                                                        menuPlacement: "auto",
                                                                        classNamePrefix: "Select2",
                                                                        defaultValue: [
                                                                            __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$pages$2f$mail$2f$mailsettingdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Countryoptions"][0]
                                                                        ]
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 143,
                                                                        columnNumber: 53
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                lineNumber: 141,
                                                                columnNumber: 49
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "xl:col-span-12 col-span-12",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                        htmlFor: "bio",
                                                                        className: "form-label",
                                                                        children: "Bio :"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 148,
                                                                        columnNumber: 53
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                                                        className: "form-control w-full !rounded-md dark:!text-defaulttextcolor/70",
                                                                        id: "bio",
                                                                        rows: 5,
                                                                        defaultValue: "Lorem ipsum dolor sit amet consectetur adipisicing elit. At sit impedit, officiis non minima saepe voluptates a magnam enim sequi porro veniam ea suscipit dolorum vel mollitia voluptate iste nemo!"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 149,
                                                                        columnNumber: 53
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                lineNumber: 147,
                                                                columnNumber: 49
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                type: "button",
                                                                className: "ti-btn bg-primary text-white m-1",
                                                                children: "Save Changes"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                lineNumber: 156,
                                                                columnNumber: 49
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                        lineNumber: 126,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                lineNumber: 82,
                                                columnNumber: 41
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                            lineNumber: 81,
                                            columnNumber: 37
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "tab-pane dark:border-defaultborder/10 hidden",
                                            id: "account-settings",
                                            "aria-labelledby": "account-item",
                                            role: "tabpanel",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "grid grid-cols-12 gap-4",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "xl:col-span-7 col-span-12",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "box  shadow-none mb-0 border dark:border-defaultborder/10",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "box-body",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "sm:flex block items-center mb-6 justify-between",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                        className: "text-[0.875rem] mb-1 font-semibold",
                                                                                        children: "Two Step Verification"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 169,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                        className: "text-[0.75rem] text-[#8c9097] dark:text-white/50 mb-0",
                                                                                        children: "Two step verificatoin is very secured and restricts in happening faulty practices."
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 170,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 168,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "custom-toggle-switch sm:ms-2 ms-0",
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                        id: "two-step",
                                                                                        name: "toggleswitchsize",
                                                                                        type: "checkbox",
                                                                                        defaultChecked: true
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 173,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                        htmlFor: "two-step",
                                                                                        className: "label-primary mb-1"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 174,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 172,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 167,
                                                                        columnNumber: 57
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "sm:flex block items-center mb-6 justify-between",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "sm:mb-0 mb-2",
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                        className: "text-[0.875rem] mb-2 font-semibold",
                                                                                        children: "Authentication"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 179,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                        className: "mb-0",
                                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                            className: "inline-flex",
                                                                                            role: "group",
                                                                                            "aria-label": "Basic radio toggle button group",
                                                                                            children: [
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                                    type: "radio",
                                                                                                    className: "btn-check ",
                                                                                                    name: "btnradio",
                                                                                                    id: "btnradio1",
                                                                                                    defaultChecked: true
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                    lineNumber: 182,
                                                                                                    columnNumber: 73
                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                                    className: "ti-btn  bg-primary text-white !border-e-0 !rounded-e-none",
                                                                                                    htmlFor: "btnradio1",
                                                                                                    children: [
                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                                                            className: "ri-lock-unlock-line me-1 align-middle inline-block"
                                                                                                        }, void 0, false, {
                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                            lineNumber: 183,
                                                                                                            columnNumber: 170
                                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                                        "Pin"
                                                                                                    ]
                                                                                                }, void 0, true, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                    lineNumber: 183,
                                                                                                    columnNumber: 73
                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                                    type: "radio",
                                                                                                    className: "btn-check ",
                                                                                                    name: "btnradio",
                                                                                                    id: "btnradio2"
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                    lineNumber: 184,
                                                                                                    columnNumber: 73
                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                                    className: "ti-btn ti-btn-outline-primary !rounded-none !border-e-0",
                                                                                                    htmlFor: "btnradio2",
                                                                                                    children: [
                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                                                            className: "ri-lock-password-line me-1 align-middle inline-block"
                                                                                                        }, void 0, false, {
                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                            lineNumber: 185,
                                                                                                            columnNumber: 168
                                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                                        "Password"
                                                                                                    ]
                                                                                                }, void 0, true, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                    lineNumber: 185,
                                                                                                    columnNumber: 73
                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                                    type: "radio",
                                                                                                    className: "btn-check",
                                                                                                    name: "btnradio",
                                                                                                    id: "btnradio3"
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                    lineNumber: 186,
                                                                                                    columnNumber: 73
                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                                    className: "ti-btn ti-btn-outline-primary !rounded-s-none",
                                                                                                    htmlFor: "btnradio3",
                                                                                                    children: [
                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                                                            className: "ri-fingerprint-line me-1 align-middle inline-block"
                                                                                                        }, void 0, false, {
                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                            lineNumber: 187,
                                                                                                            columnNumber: 158
                                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                                        "Finger Print"
                                                                                                    ]
                                                                                                }, void 0, true, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                    lineNumber: 187,
                                                                                                    columnNumber: 73
                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                            ]
                                                                                        }, void 0, true, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 181,
                                                                                            columnNumber: 69
                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 180,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 178,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "custom-toggle-switch sm:ms-2 ms-0",
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                        id: "authentication",
                                                                                        name: "toggleswitchsize1",
                                                                                        type: "checkbox",
                                                                                        defaultChecked: true
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 192,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                        htmlFor: "authentication",
                                                                                        className: "label-primary mb-1"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 193,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 191,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 177,
                                                                        columnNumber: 57
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "sm:flex block items-center mb-6 justify-between",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                        className: "text-[0.875rem] mb-1 font-semibold",
                                                                                        children: "Recovery Mail"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 198,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                        className: "text-[0.75rem] text-[#8c9097] dark:text-white/50 mb-0",
                                                                                        children: "Incase of forgetting password mails are sent to  heifo@gmail.com"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 199,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 197,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "custom-toggle-switch sm:ms-2 ms-0",
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                        id: "recovery-mail",
                                                                                        name: "toggleswitchsize2",
                                                                                        type: "checkbox",
                                                                                        defaultChecked: true
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 202,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                        htmlFor: "recovery-mail",
                                                                                        className: "label-primary mb-1"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 203,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 201,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 196,
                                                                        columnNumber: 57
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "sm:flex block items-center mb-6 justify-between",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                        className: "text-[0.875rem] mb-1 font-semibold",
                                                                                        children: "SMS Recovery"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 208,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                        className: "text-[0.75rem] text-[#8c9097] dark:text-white/50 mb-0",
                                                                                        children: "SMS are sent to 9102312xx in case of recovery"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 209,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 207,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "custom-toggle-switch sm:ms-2 ms-0",
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                        id: "sms-recovery",
                                                                                        name: "toggleswitchsize3",
                                                                                        type: "checkbox",
                                                                                        defaultChecked: true
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 212,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                        htmlFor: "sms-recovery",
                                                                                        className: "label-primary mb-1"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 213,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 211,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 206,
                                                                        columnNumber: 57
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "flex items-center justify-between",
                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                    className: "text-[0.875rem] mb-1 font-semibold",
                                                                                    children: "Reset Password"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 218,
                                                                                    columnNumber: 65
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                    className: "text-[0.75rem] text-[#8c9097] dark:text-white/50",
                                                                                    children: [
                                                                                        "Password should be min of ",
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                                                            className: "text-success",
                                                                                            children: [
                                                                                                "8 digits",
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("sup", {
                                                                                                    children: "*"
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                    lineNumber: 219,
                                                                                                    columnNumber: 191
                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                            ]
                                                                                        }, void 0, true, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 219,
                                                                                            columnNumber: 155
                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                        ",atleast ",
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                                                            className: "text-success",
                                                                                            children: [
                                                                                                "One Capital letter",
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("sup", {
                                                                                                    children: "*"
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                    lineNumber: 219,
                                                                                                    columnNumber: 262
                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                            ]
                                                                                        }, void 0, true, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 219,
                                                                                            columnNumber: 216
                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                        " and ",
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                                                            className: "text-success",
                                                                                            children: [
                                                                                                "One Special Character",
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("sup", {
                                                                                                    children: "*"
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                    lineNumber: 219,
                                                                                                    columnNumber: 332
                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                            ]
                                                                                        }, void 0, true, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 219,
                                                                                            columnNumber: 283
                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                        " included."
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 219,
                                                                                    columnNumber: 65
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "mb-2",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                            htmlFor: "current-password",
                                                                                            className: "form-label",
                                                                                            children: "Current Password"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 221,
                                                                                            columnNumber: 69
                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                            type: "text",
                                                                                            className: "form-control w-full !rounded-md",
                                                                                            id: "current-password",
                                                                                            placeholder: "Current Password"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 222,
                                                                                            columnNumber: 69
                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 220,
                                                                                    columnNumber: 65
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "mb-2",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                            htmlFor: "new-password",
                                                                                            className: "form-label",
                                                                                            children: "New Password"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 225,
                                                                                            columnNumber: 69
                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                            type: "text",
                                                                                            className: "form-control w-full !rounded-md",
                                                                                            id: "new-password",
                                                                                            placeholder: "New Password"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 226,
                                                                                            columnNumber: 69
                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 224,
                                                                                    columnNumber: 65
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "mb-0",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                            htmlFor: "confirm-password",
                                                                                            className: "form-label",
                                                                                            children: "Confirm Password"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 229,
                                                                                            columnNumber: 69
                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                            type: "text",
                                                                                            className: "form-control w-full !rounded-md",
                                                                                            id: "confirm-password",
                                                                                            placeholder: "Confirm Password"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 230,
                                                                                            columnNumber: 69
                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 228,
                                                                                    columnNumber: 65
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 217,
                                                                            columnNumber: 61
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 216,
                                                                        columnNumber: 57
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                lineNumber: 166,
                                                                columnNumber: 53
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                            lineNumber: 165,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                        lineNumber: 164,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "xl:col-span-1 col-span-12"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                        lineNumber: 237,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "xl:col-span-4 col-span-12",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "box shadow-none mb-0 border dark:border-defaultborder/10",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "box-header justify-between items-center sm:flex block",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "box-title",
                                                                            children: "Registered Devices"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 241,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "sm:mt-0",
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                type: "button",
                                                                                className: "ti-btn !py-1 !px-2 bg-primary text-white !text-[0.75rem] !font-medium",
                                                                                children: "Signout from all devices"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 243,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 242,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 240,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "box-body",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                                                        className: "list-group",
                                                                        children: __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$pages$2f$mail$2f$mailsettingdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Mailsettingslist"].map((idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                                                className: "list-group-item",
                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "sm:flex block items-center",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                            className: "lh-1 sm:mb-0 mb-2",
                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                                                className: `${idx.class} text-[#8c9097] dark:text-white/50`
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                lineNumber: 252,
                                                                                                columnNumber: 108
                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 252,
                                                                                            columnNumber: 73
                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                            className: "lh-1 flex-grow",
                                                                                            children: [
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                                    className: "mb-0",
                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                        className: "font-semibold",
                                                                                                        children: idx.text1
                                                                                                    }, void 0, false, {
                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                        lineNumber: 255,
                                                                                                        columnNumber: 81
                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                    lineNumber: 254,
                                                                                                    columnNumber: 77
                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                                    className: "mb-0",
                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                        className: "text-[#8c9097] dark:text-white/50 text-[0.6875rem]",
                                                                                                        children: idx.text2
                                                                                                    }, void 0, false, {
                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                        lineNumber: 258,
                                                                                                        columnNumber: 81
                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                    lineNumber: 257,
                                                                                                    columnNumber: 77
                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                            ]
                                                                                        }, void 0, true, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 253,
                                                                                            columnNumber: 73
                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                            className: "hs-dropdown ti-dropdown",
                                                                                            children: [
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                                                                    "aria-label": "anchor",
                                                                                                    href: "#!",
                                                                                                    className: "flex items-center justify-center w-[1.75rem] h-[1.75rem] !text-defaulttextcolor !text-[0.8rem] !py-1 !px-2 rounded-sm bg-light border-light shadow-none !font-medium",
                                                                                                    "aria-expanded": "false",
                                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                                                        className: "fe fe-more-vertical text-[0.8rem]"
                                                                                                    }, void 0, false, {
                                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                        lineNumber: 263,
                                                                                                        columnNumber: 81
                                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                    lineNumber: 262,
                                                                                                    columnNumber: 77
                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                                                                                    className: "hs-dropdown-menu ti-dropdown-menu hidden",
                                                                                                    children: [
                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                                                                                className: "ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block",
                                                                                                                href: "#!",
                                                                                                                children: "Action"
                                                                                                            }, void 0, false, {
                                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                                lineNumber: 266,
                                                                                                                columnNumber: 85
                                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                                        }, void 0, false, {
                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                            lineNumber: 266,
                                                                                                            columnNumber: 81
                                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                                                                                className: "ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block",
                                                                                                                href: "#!",
                                                                                                                children: "Another action"
                                                                                                            }, void 0, false, {
                                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                                lineNumber: 267,
                                                                                                                columnNumber: 85
                                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                                        }, void 0, false, {
                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                            lineNumber: 267,
                                                                                                            columnNumber: 81
                                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                                                                                className: "ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block",
                                                                                                                href: "#!",
                                                                                                                children: "Something else here"
                                                                                                            }, void 0, false, {
                                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                                lineNumber: 268,
                                                                                                                columnNumber: 85
                                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                                        }, void 0, false, {
                                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                            lineNumber: 268,
                                                                                                            columnNumber: 81
                                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                                    ]
                                                                                                }, void 0, true, {
                                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                    lineNumber: 265,
                                                                                                    columnNumber: 77
                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                            ]
                                                                                        }, void 0, true, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 261,
                                                                                            columnNumber: 73
                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 251,
                                                                                    columnNumber: 69
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            }, Math.random(), false, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 250,
                                                                                columnNumber: 65
                                                                            }, ("TURBOPACK compile-time value", void 0)))
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 247,
                                                                        columnNumber: 57
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 246,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                            lineNumber: 239,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                        lineNumber: 238,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                lineNumber: 163,
                                                columnNumber: 41
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                            lineNumber: 162,
                                            columnNumber: 37
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "tab-pane dark:border-defaultborder/10 !p-0 hidden",
                                            id: "email-settings",
                                            "aria-labelledby": "email-item",
                                            role: "tabpanel",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                                className: "list-group list-group-flush",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                        className: "list-group-item !border-t-0 !border-e-0 !border-s-0",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "grid grid-cols-12 gap-4",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "xl:col-span-3 lg:col-span-3 md:col-span-3 sm:col-span-12 col-span-12",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "text-[0.875rem] font-semibold mb-0",
                                                                        children: "Menu View :"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 285,
                                                                        columnNumber: 57
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 284,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "xl:col-span-4 col-span-12",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "form-check !ps-0",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                    className: "form-check-input",
                                                                                    type: "radio",
                                                                                    name: "flexRadioDefault",
                                                                                    id: "flexRadioDefault1"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 289,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                    className: "form-check-label",
                                                                                    htmlFor: "flexRadioDefault1",
                                                                                    children: "Default View"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 290,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 288,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "form-check !ps-0",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                    className: "form-check-input",
                                                                                    type: "radio",
                                                                                    name: "flexRadioDefault",
                                                                                    id: "flexRadioDefault2",
                                                                                    defaultChecked: true
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 295,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                    className: "form-check-label",
                                                                                    htmlFor: "flexRadioDefault2",
                                                                                    children: "Advanced View"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 296,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 294,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 287,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "xl:col-span-5 col-span-12",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "custom-toggle-switch ltr:sm:float-right rtl:sm:float-left",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                id: "menu-view",
                                                                                name: "toggleswitchsize4",
                                                                                type: "checkbox",
                                                                                defaultChecked: true
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 303,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                htmlFor: "menu-view",
                                                                                className: "label-danger mb-1"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 304,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 302,
                                                                        columnNumber: 57
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 301,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                            lineNumber: 283,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                        lineNumber: 282,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                        className: "list-group-item !border-e-0 !border-s-0",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "grid grid-cols-12 gap-4",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "xl:col-span-3 col-span-12",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "text-[0.875rem] font-semibold mb-0",
                                                                        children: "Language :"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 312,
                                                                        columnNumber: 57
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 311,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "xl:col-span-4 col-span-12",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                            className: "form-label",
                                                                            children: "Languages :"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 315,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Select, {
                                                                            isMulti: true,
                                                                            name: "colors",
                                                                            options: __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$pages$2f$mail$2f$mailsettingdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Languageoptions"],
                                                                            className: "basic-multi-select",
                                                                            menuPlacement: "auto",
                                                                            classNamePrefix: "Select2",
                                                                            defaultValue: [
                                                                                __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$pages$2f$mail$2f$mailsettingdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Languageoptions"][0],
                                                                                __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$pages$2f$mail$2f$mailsettingdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Languageoptions"][1]
                                                                            ]
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 316,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 314,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "xl:col-span-5 col-span-12",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "custom-toggle-switch ltr:sm:float-right rtl:sm:float-left",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                id: "mail-languages",
                                                                                name: "toggleswitchsize5",
                                                                                type: "checkbox"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 322,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                htmlFor: "mail-languages",
                                                                                className: "label-danger mb-1"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 323,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 321,
                                                                        columnNumber: 57
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 320,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                            lineNumber: 310,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                        lineNumber: 309,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                        className: "list-group-item !border-e-0 !border-s-0",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "grid grid-cols-12 gap-4",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "xl:col-span-3 col-span-12",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "text-[0.875rem] font-semibold mb-0",
                                                                        children: "Images :"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 331,
                                                                        columnNumber: 57
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 330,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "xl:col-span-4 col-span-12",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "form-check !ps-0",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                    className: "form-check-input",
                                                                                    type: "radio",
                                                                                    name: "images-open",
                                                                                    id: "images-open1"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 335,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                    className: "form-check-label",
                                                                                    htmlFor: "images-open1",
                                                                                    children: "Always Open Images"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 336,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 334,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "form-check !ps-0",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                    className: "form-check-input",
                                                                                    type: "radio",
                                                                                    name: "images-open",
                                                                                    id: "images-hide2",
                                                                                    defaultChecked: true
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 341,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                    className: "form-check-label",
                                                                                    htmlFor: "images-hide2",
                                                                                    children: "Ask For Permission"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 342,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 340,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 333,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "xl:col-span-5 col-span-12",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "custom-toggle-switch ltr:sm:float-right rtl:sm:float-left",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                id: "mails-images",
                                                                                name: "toggleswitchsize6",
                                                                                type: "checkbox"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 349,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                htmlFor: "mails-images",
                                                                                className: "label-danger mb-1"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 350,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 348,
                                                                        columnNumber: 57
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 347,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                            lineNumber: 329,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                        lineNumber: 328,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                        className: "list-group-item !border-e-0 !border-s-0",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "grid grid-cols-12 gap-4",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "xl:col-span-3 col-span-12",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "text-[0.875rem] font-semibold mb-0",
                                                                        children: "Keyboard Shortcuts :"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 358,
                                                                        columnNumber: 57
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 357,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "xl:col-span-4 col-span-12",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "form-check !ps-0",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                    className: "form-check-input",
                                                                                    type: "radio",
                                                                                    name: "keyboard-enable",
                                                                                    id: "keyboard-enable1"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 362,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                    className: "form-check-label",
                                                                                    htmlFor: "keyboard-enable1",
                                                                                    children: "Keyboard Shortcuts Enable"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 363,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 361,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "form-check !ps-0",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                    className: "form-check-input",
                                                                                    type: "radio",
                                                                                    name: "keyboard-enable",
                                                                                    id: "keyboard-disable2",
                                                                                    defaultChecked: true
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 368,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                    className: "form-check-label",
                                                                                    htmlFor: "keyboard-disable2",
                                                                                    children: "Keyboard Shortcuts Disable"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 369,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 367,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 360,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "xl:col-span-5 col-span-12",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "custom-toggle-switch ltr:sm:float-right rtl:sm:float-left",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                id: "keyboard-shortcuts",
                                                                                name: "toggleswitchsize7",
                                                                                type: "checkbox"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 376,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                htmlFor: "keyboard-shortcuts",
                                                                                className: "label-danger mb-1"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 377,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 375,
                                                                        columnNumber: 57
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 374,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                            lineNumber: 356,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                        lineNumber: 355,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                        className: "list-group-item !border-e-0 !border-s-0",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "grid grid-cols-12 gap-4",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "xl:col-span-3 col-span-12",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "text-[0.875rem] font-semibold mb-0",
                                                                        children: "Notifications :"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 385,
                                                                        columnNumber: 57
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 384,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "xl:col-span-4 col-span-12",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "form-check !ps-0",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                    className: "form-check-input",
                                                                                    type: "checkbox",
                                                                                    defaultValue: "",
                                                                                    id: "desktop-notifications",
                                                                                    defaultChecked: true
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 389,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                    className: "form-check-label",
                                                                                    htmlFor: "desktop-notifications",
                                                                                    children: "Desktop Notifications"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 390,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 388,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "form-check !ps-0",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                    className: "form-check-input",
                                                                                    type: "checkbox",
                                                                                    defaultValue: "",
                                                                                    id: "mobile-notifications"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 395,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                    className: "form-check-label",
                                                                                    htmlFor: "mobile-notifications",
                                                                                    children: "Mobile Notifications"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 396,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 394,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 387,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "xl:col-span-5 col-span-12",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "ltr:sm:float-right rtl:sm:float-left",
                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                            href: "#!",
                                                                            scroll: false,
                                                                            className: "ti-btn ti-btn-outline-success !py-1 !px-2 !text-[0.75rem]",
                                                                            children: "Learn-more"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 403,
                                                                            columnNumber: 61
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 402,
                                                                        columnNumber: 57
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 401,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                            lineNumber: 383,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                        lineNumber: 382,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                        className: "list-group-item !border-e-0 !border-s-0",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "grid grid-cols-12 gap-4",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "xl:col-span-3 col-span-12",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "text-[0.875rem] font-semibold mb-0",
                                                                        children: "Maximum Mails Per Page :"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 411,
                                                                        columnNumber: 57
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 410,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "xl:col-span-4 col-span-12",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Select, {
                                                                        name: "colors",
                                                                        options: __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$pages$2f$mail$2f$mailsettingdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Maximumoptions"],
                                                                        className: "w-full !rounded-md",
                                                                        menuPlacement: "auto",
                                                                        classNamePrefix: "Select2",
                                                                        defaultValue: [
                                                                            __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$pages$2f$mail$2f$mailsettingdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Maximumoptions"][0]
                                                                        ]
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 414,
                                                                        columnNumber: 57
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 413,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "xl:col-span-5 col-span-12",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "custom-toggle-switch ltr:sm:float-right rtl:sm:float-left",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                id: "mails-per-page",
                                                                                name: "toggleswitchsize8",
                                                                                type: "checkbox"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 420,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                htmlFor: "mails-per-page",
                                                                                className: "label-danger mb-1"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 421,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 419,
                                                                        columnNumber: 57
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 418,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                            lineNumber: 409,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                        lineNumber: 408,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                        className: "list-group-item !border-e-0 !border-s-0",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "grid grid-cols-12 gap-4",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "xl:col-span-3 col-span-12",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "text-[0.875rem] font-semibold mb-0",
                                                                        children: "Mail Composer :"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 429,
                                                                        columnNumber: 57
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 428,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "xl:col-span-4 col-span-12",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "form-check !ps-0",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                    className: "form-check-input",
                                                                                    type: "radio",
                                                                                    name: "mail-composeron",
                                                                                    id: "mail-composeron1"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 433,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                    className: "form-check-label",
                                                                                    htmlFor: "mail-composeron1",
                                                                                    children: "Mail Composer On"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 434,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 432,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "form-check !ps-0",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                    className: "form-check-input",
                                                                                    type: "radio",
                                                                                    name: "mail-composeron",
                                                                                    id: "mail-composeroff2",
                                                                                    defaultChecked: true
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 439,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                    className: "form-check-label",
                                                                                    htmlFor: "mail-composeroff2",
                                                                                    children: "Mail Composer Off"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 440,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 438,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 431,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "xl:col-span-5 col-span-12",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "custom-toggle-switch ltr:sm:float-right rtl:sm:float-left",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                id: "mail-composer",
                                                                                name: "toggleswitchsize9",
                                                                                type: "checkbox"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 447,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                htmlFor: "mail-composer",
                                                                                className: "label-danger mb-1"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 448,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 446,
                                                                        columnNumber: 57
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 445,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                            lineNumber: 427,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                        lineNumber: 426,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                        className: "list-group-item !border-e-0 !border-s-0",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "grid grid-cols-12 gap-4",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "xl:col-span-3 col-span-12",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "text-[0.875rem] font-semibold mb-0",
                                                                        children: "Auto Correct :"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 456,
                                                                        columnNumber: 57
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 455,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "xl:col-span-4 col-span-12",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "form-check !ps-0",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                    className: "form-check-input",
                                                                                    type: "radio",
                                                                                    name: "auto-correcton",
                                                                                    id: "auto-correcton1"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 460,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                    className: "form-check-label",
                                                                                    htmlFor: "auto-correcton1",
                                                                                    children: "Auto Correct On"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 461,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 459,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "form-check !ps-0",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                    className: "form-check-input",
                                                                                    type: "radio",
                                                                                    name: "auto-correcton",
                                                                                    id: "auto-correctoff2",
                                                                                    defaultChecked: true
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 466,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                    className: "form-check-label",
                                                                                    htmlFor: "auto-correctoff2",
                                                                                    children: "Auto Correct Off"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 467,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 465,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 458,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "xl:col-span-5 col-span-12",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "custom-toggle-switch ltr:sm:float-right rtl:sm:float-left",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                id: "auto-correct",
                                                                                name: "toggleswitchsize10",
                                                                                type: "checkbox"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 474,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                htmlFor: "auto-correct",
                                                                                className: "label-danger mb-1"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 475,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 473,
                                                                        columnNumber: 57
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 472,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                            lineNumber: 454,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                        lineNumber: 453,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                        className: "list-group-item !border-e-0 !border-s-0 !border-b-0",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "grid grid-cols-12 gap-4",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "xl:col-span-3 col-span-12",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "text-[0.875rem] font-semibold mb-0",
                                                                        children: "Mail Send Action :"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 483,
                                                                        columnNumber: 57
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 482,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "xl:col-span-4 col-span-12",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "form-check !ps-0",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                    className: "form-check-input",
                                                                                    type: "checkbox",
                                                                                    defaultValue: "",
                                                                                    id: "on-keyboard",
                                                                                    defaultChecked: true
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 487,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                    className: "form-check-label",
                                                                                    htmlFor: "on-keyboard",
                                                                                    children: "On Keyboard Action"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 488,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 486,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "form-check !ps-0",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                    className: "form-check-input",
                                                                                    type: "checkbox",
                                                                                    defaultValue: "",
                                                                                    id: "on-buttonclick"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 493,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                    className: "form-check-label",
                                                                                    htmlFor: "on-buttonclick",
                                                                                    children: "On Button Click"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 494,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 492,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 485,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "xl:col-span-5 col-span-12",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "ltr:sm:float-right rtl:sm:float-left",
                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                            href: "#!",
                                                                            scroll: false,
                                                                            className: "ti-btn ti-btn-outline-success !py-1 !px-2 !text-[0.75rem]",
                                                                            children: "Learn-more"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 501,
                                                                            columnNumber: 61
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 500,
                                                                        columnNumber: 57
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 499,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                            lineNumber: 481,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                        lineNumber: 480,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                lineNumber: 281,
                                                columnNumber: 41
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                            lineNumber: 280,
                                            columnNumber: 37
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "tab-pane dark:border-defaultborder/10 hidden",
                                            id: "labels",
                                            "aria-labelledby": "labels-item",
                                            role: "tabpanel",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-[0.875rem] font-semibold mb-3",
                                                    children: "Mail Labels :"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                    lineNumber: 509,
                                                    columnNumber: 41
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "grid grid-cols-12 gap-4",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "xl:col-span-3 col-span-12",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "box !shadow-none border dark:border-defaultborder/10",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "box-body flex items-center justify-between flex-wrap gap-2",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "",
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "font-semibold",
                                                                                children: "All Mails"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 515,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 514,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "inline-flex",
                                                                                role: "group",
                                                                                "aria-label": "Basic radio toggle button group",
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                        className: "btn-check",
                                                                                        type: "radio",
                                                                                        name: "label-allmails",
                                                                                        id: "all-mails-enable",
                                                                                        defaultChecked: true
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 519,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                        className: "ti-btn !text-[0.75rem] !font-medium ti-btn-outline-primary text-white !rounded-e-none !border-e-0",
                                                                                        htmlFor: "all-mails-enable",
                                                                                        children: "Enable"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 520,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                        className: "btn-check",
                                                                                        type: "radio",
                                                                                        name: "label-allmails",
                                                                                        id: "all-mails-disable"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 521,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                        className: "ti-btn !text-[0.75rem] !font-medium btn-sm ti-btn-outline-primary !rounded-s-none",
                                                                                        htmlFor: "all-mails-disable",
                                                                                        children: "Disable"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 522,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 518,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 517,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 513,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                lineNumber: 512,
                                                                columnNumber: 49
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                            lineNumber: 511,
                                                            columnNumber: 45
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "xl:col-span-3 col-span-12",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "box !shadow-none border dark:border-defaultborder/10",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "box-body flex items-center justify-between flex-wrap gap-2",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "",
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "font-semibold",
                                                                                children: "Inbox"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 532,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 531,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "inline-flex",
                                                                                role: "group",
                                                                                "aria-label": "Basic radio toggle button group",
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                        type: "radio",
                                                                                        className: "btn-check",
                                                                                        name: "label-inbox",
                                                                                        id: "inbox-enable",
                                                                                        defaultChecked: true
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 536,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                        className: "ti-btn !text-[0.75rem] !font-medium ti-btn-outline-primary text-white !rounded-e-none !border-e-0",
                                                                                        htmlFor: "inbox-enable",
                                                                                        children: "Enable"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 537,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                        type: "radio",
                                                                                        className: "btn-check",
                                                                                        name: "label-inbox",
                                                                                        id: "inbox-disable"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 538,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                        className: "ti-btn !text-[0.75rem] !font-medium ti-btn-outline-primary !rounded-s-none",
                                                                                        htmlFor: "inbox-disable",
                                                                                        children: "Disable"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 539,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 535,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 534,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 530,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                lineNumber: 529,
                                                                columnNumber: 49
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                            lineNumber: 528,
                                                            columnNumber: 45
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "xl:col-span-3 col-span-12",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "box !shadow-none border dark:border-defaultborder/10",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "box-body flex items-center justify-between flex-wrap gap-2",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "",
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "font-semibold",
                                                                                children: "Sent"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 549,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 548,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "inline-flex",
                                                                                role: "group",
                                                                                "aria-label": "Basic radio toggle button group",
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                        type: "radio",
                                                                                        className: "btn-check",
                                                                                        name: "label-sent",
                                                                                        id: "sent-enable",
                                                                                        defaultChecked: true
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 553,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                        className: "ti-btn !text-[0.75rem] !font-medium ti-btn-outline-primary text-white !rounded-e-none !border-e-0",
                                                                                        htmlFor: "sent-enable",
                                                                                        children: "Enable"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 554,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                        type: "radio",
                                                                                        className: "btn-check",
                                                                                        name: "label-sent",
                                                                                        id: "sent-disable"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 555,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                        className: "ti-btn !text-[0.75rem] !font-medium ti-btn-outline-primary !rounded-s-none",
                                                                                        htmlFor: "sent-disable",
                                                                                        children: "Disable"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 556,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 552,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 551,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 547,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                lineNumber: 546,
                                                                columnNumber: 49
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                            lineNumber: 545,
                                                            columnNumber: 45
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "xl:col-span-3 col-span-12",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "box !shadow-none border dark:border-defaultborder/10",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "box-body flex items-center justify-between flex-wrap gap-2",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "",
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "font-semibold",
                                                                                children: "Drafts"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 566,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 565,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "inline-flex",
                                                                                role: "group",
                                                                                "aria-label": "Basic radio toggle button group",
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                        type: "radio",
                                                                                        className: "btn-check",
                                                                                        name: "label-drafts",
                                                                                        id: "drafts-enable",
                                                                                        defaultChecked: true
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 570,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                        className: "ti-btn !text-[0.75rem] !font-medium ti-btn-outline-primary text-white !rounded-e-none !border-e-0",
                                                                                        htmlFor: "drafts-enable",
                                                                                        children: "Enable"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 571,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                        type: "radio",
                                                                                        className: "btn-check",
                                                                                        name: "label-drafts",
                                                                                        id: "drafts-disable"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 572,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                        className: "ti-btn !text-[0.75rem] !font-medium ti-btn-outline-primary !rounded-s-none",
                                                                                        htmlFor: "drafts-disable",
                                                                                        children: "Disable"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 573,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 569,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 568,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 564,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                lineNumber: 563,
                                                                columnNumber: 49
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                            lineNumber: 562,
                                                            columnNumber: 45
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "xl:col-span-3 col-span-12",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "box !shadow-none border dark:border-defaultborder/10",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "box-body flex items-center justify-between flex-wrap gap-2",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "",
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "font-semibold",
                                                                                children: "Spam"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 583,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 582,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "inline-flex",
                                                                                role: "group",
                                                                                "aria-label": "Basic radio toggle button group",
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                        type: "radio",
                                                                                        className: "btn-check",
                                                                                        name: "label-spam",
                                                                                        id: "spam-enable",
                                                                                        defaultChecked: true
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 587,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                        className: "ti-btn !text-[0.75rem] !font-medium ti-btn-outline-primary text-white !rounded-e-none !border-e-0",
                                                                                        htmlFor: "spam-enable",
                                                                                        children: "Enable"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 588,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                        type: "radio",
                                                                                        className: "btn-check",
                                                                                        name: "label-spam",
                                                                                        id: "spam-disable"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 589,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                        className: "ti-btn !text-[0.75rem] !font-medium ti-btn-outline-primary !rounded-s-none",
                                                                                        htmlFor: "spam-disable",
                                                                                        children: "Disable"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 590,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 586,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 585,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 581,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                lineNumber: 580,
                                                                columnNumber: 49
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                            lineNumber: 579,
                                                            columnNumber: 45
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "xl:col-span-3 col-span-12",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "box !shadow-none border dark:border-defaultborder/10",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "box-body flex items-center justify-between flex-wrap gap-2",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "",
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "font-semibold",
                                                                                children: "Important"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 600,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 599,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "inline-flex",
                                                                                role: "group",
                                                                                "aria-label": "Basic radio toggle button group",
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                        type: "radio",
                                                                                        className: "btn-check",
                                                                                        name: "label-important",
                                                                                        id: "important-enable",
                                                                                        defaultChecked: true
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 604,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                        className: "ti-btn !text-[0.75rem] !font-medium ti-btn-outline-primary text-white !rounded-e-none !border-e-0",
                                                                                        htmlFor: "important-enable",
                                                                                        children: "Enable"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 605,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                        type: "radio",
                                                                                        className: "btn-check",
                                                                                        name: "label-important",
                                                                                        id: "important-disable"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 606,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                        className: "ti-btn !text-[0.75rem] !font-medium ti-btn-outline-primary !rounded-s-none",
                                                                                        htmlFor: "important-disable",
                                                                                        children: "Disable"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 607,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 603,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 602,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 598,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                lineNumber: 597,
                                                                columnNumber: 49
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                            lineNumber: 596,
                                                            columnNumber: 45
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "xl:col-span-3 col-span-12",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "box !shadow-none border dark:border-defaultborder/10",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "box-body flex items-center justify-between flex-wrap gap-2",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "",
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "font-semibold",
                                                                                children: "Trash"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 617,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 616,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "inline-flex",
                                                                                role: "group",
                                                                                "aria-label": "Basic radio toggle button group",
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                        type: "radio",
                                                                                        className: "btn-check",
                                                                                        name: "label-trash",
                                                                                        id: "trash-enable",
                                                                                        defaultChecked: true
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 621,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                        className: "ti-btn !text-[0.75rem] !font-medium  ti-btn-outline-primary text-white !rounded-e-none !border-e-0",
                                                                                        htmlFor: "trash-enable",
                                                                                        children: "Enable"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 622,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                        type: "radio",
                                                                                        className: "btn-check",
                                                                                        name: "label-trash",
                                                                                        id: "trash-disable"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 623,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                        className: "ti-btn !text-[0.75rem] !font-medium ti-btn-outline-primary !rounded-s-none",
                                                                                        htmlFor: "trash-disable",
                                                                                        children: "Disable"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 624,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 620,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 619,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 615,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                lineNumber: 614,
                                                                columnNumber: 49
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                            lineNumber: 613,
                                                            columnNumber: 45
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "xl:col-span-3 col-span-12",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "box !shadow-none border dark:border-defaultborder/10",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "box-body flex items-center justify-between flex-wrap gap-2",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "",
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "font-semibold",
                                                                                children: "Archive"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 634,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 633,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "inline-flex",
                                                                                role: "group",
                                                                                "aria-label": "Basic radio toggle button group",
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                        type: "radio",
                                                                                        className: "btn-check",
                                                                                        name: "label-archive",
                                                                                        id: "archive-enable",
                                                                                        defaultChecked: true
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 638,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                        className: "ti-btn !text-[0.75rem] !font-medium  ti-btn-outline-primary text-white !rounded-e-none !border-e-0",
                                                                                        htmlFor: "archive-enable",
                                                                                        children: "Enable"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 639,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                        type: "radio",
                                                                                        className: "btn-check",
                                                                                        name: "label-archive",
                                                                                        id: "archive-disable"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 640,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                        className: "ti-btn !text-[0.75rem] !font-medium ti-btn-outline-primary !rounded-s-none",
                                                                                        htmlFor: "archive-disable",
                                                                                        children: "Disable"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 641,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 637,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 636,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 632,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                lineNumber: 631,
                                                                columnNumber: 49
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                            lineNumber: 630,
                                                            columnNumber: 45
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "xl:col-span-3 col-span-12",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "box !shadow-none border dark:border-defaultborder/10",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "box-body flex items-center justify-between flex-wrap gap-2",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "",
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "font-semibold",
                                                                                children: "Starred"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 651,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 650,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "inline-flex",
                                                                                role: "group",
                                                                                "aria-label": "Basic radio toggle button group",
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                        type: "radio",
                                                                                        className: "btn-check",
                                                                                        name: "label-starred",
                                                                                        id: "starred-enable",
                                                                                        defaultChecked: true
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 655,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                        className: "ti-btn !text-[0.75rem] !font-medium  ti-btn-outline-primary text-white !rounded-e-none !border-e-0",
                                                                                        htmlFor: "starred-enable",
                                                                                        children: "Enable"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 656,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                        type: "radio",
                                                                                        className: "btn-check",
                                                                                        name: "label-starred",
                                                                                        id: "starred-disable"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 657,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                        className: "ti-btn !text-[0.75rem] !font-medium ti-btn-outline-primary !rounded-s-none",
                                                                                        htmlFor: "starred-disable",
                                                                                        children: "Disable"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 658,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 654,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 653,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 649,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                lineNumber: 648,
                                                                columnNumber: 49
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                            lineNumber: 647,
                                                            columnNumber: 45
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                    lineNumber: 510,
                                                    columnNumber: 41
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-[0.875rem] font-semibold mb-3",
                                                    children: "Settings :"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                    lineNumber: 665,
                                                    columnNumber: 41
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "grid grid-cols-12 gap-2",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "xl:col-span-3 col-span-12",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "box !shadow-none border dark:border-defaultborder/10",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "box-body flex items-center justify-between flex-wrap gap-2",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "",
                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            className: "font-semibold",
                                                                            children: "Settings"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 671,
                                                                            columnNumber: 61
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 670,
                                                                        columnNumber: 57
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "inline-flex",
                                                                            role: "group",
                                                                            "aria-label": "Basic radio toggle button group",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                    type: "radio",
                                                                                    className: "btn-check",
                                                                                    name: "label-settings",
                                                                                    id: "settings-enable",
                                                                                    defaultChecked: true
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 675,
                                                                                    columnNumber: 65
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                    className: "ti-btn !text-[0.75rem] !font-medium  ti-btn-outline-primary text-white !rounded-e-none !border-e-0",
                                                                                    htmlFor: "settings-enable",
                                                                                    children: "Enable"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 676,
                                                                                    columnNumber: 65
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                    type: "radio",
                                                                                    className: "btn-check",
                                                                                    name: "label-settings",
                                                                                    id: "settings-disable"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 677,
                                                                                    columnNumber: 65
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                    className: "ti-btn !text-[0.75rem] !font-medium ti-btn-outline-primary !rounded-s-none",
                                                                                    htmlFor: "settings-disable",
                                                                                    children: "Disable"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 678,
                                                                                    columnNumber: 65
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 674,
                                                                            columnNumber: 61
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 673,
                                                                        columnNumber: 57
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                lineNumber: 669,
                                                                columnNumber: 53
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                            lineNumber: 668,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                        lineNumber: 667,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                    lineNumber: 666,
                                                    columnNumber: 41
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-[0.875rem] font-semibold mb-3",
                                                    children: "Custom Labels :"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                    lineNumber: 685,
                                                    columnNumber: 41
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "grid grid-cols-12 gap-4",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "xl:col-span-3 col-span-12",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "box !shadow-none border dark:border-defaultborder/10",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "box-body flex items-center justify-between flex-wrap gap-2",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "",
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "font-semibold",
                                                                                children: "Mail"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 691,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 690,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "inline-flex",
                                                                                role: "group",
                                                                                "aria-label": "Basic radio toggle button group",
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                        type: "radio",
                                                                                        className: "btn-check",
                                                                                        name: "label-custom-mail",
                                                                                        id: "custom-mail-enable",
                                                                                        defaultChecked: true
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 695,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                        className: "ti-btn !text-[0.75rem] !font-medium  ti-btn-outline-primary text-white !rounded-e-none !border-e-0",
                                                                                        htmlFor: "custom-mail-enable",
                                                                                        children: "Enable"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 696,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                        type: "radio",
                                                                                        className: "btn-check",
                                                                                        name: "label-custom-mail",
                                                                                        id: "custom-mail-disable"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 697,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                        className: "ti-btn !text-[0.75rem] !font-medium ti-btn-outline-primary !rounded-s-none",
                                                                                        htmlFor: "custom-mail-disable",
                                                                                        children: "Disable"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 698,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 694,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 693,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 689,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                lineNumber: 688,
                                                                columnNumber: 49
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                            lineNumber: 687,
                                                            columnNumber: 45
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "xl:col-span-3 col-span-12",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "box !shadow-none border dark:border-defaultborder/10",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "box-body flex items-center justify-between flex-wrap gap-2",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "",
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "font-semibold",
                                                                                children: "Home"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 708,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 707,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "inline-flex",
                                                                                role: "group",
                                                                                "aria-label": "Basic radio toggle button group",
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                        type: "radio",
                                                                                        className: "btn-check",
                                                                                        name: "label-home",
                                                                                        id: "home-enable",
                                                                                        defaultChecked: true
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 712,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                        className: "ti-btn !text-[0.75rem] !font-medium  ti-btn-outline-primary text-white !rounded-e-none !border-e-0",
                                                                                        htmlFor: "home-enable",
                                                                                        children: "Enable"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 713,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                        type: "radio",
                                                                                        className: "btn-check",
                                                                                        name: "label-home",
                                                                                        id: "home-disable"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 714,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                        className: "ti-btn !text-[0.75rem] !font-medium ti-btn-outline-primary !rounded-s-none",
                                                                                        htmlFor: "home-disable",
                                                                                        children: "Disable"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 715,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 711,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 710,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 706,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                lineNumber: 705,
                                                                columnNumber: 49
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                            lineNumber: 704,
                                                            columnNumber: 45
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "xl:col-span-3 col-span-12",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "box !shadow-none border dark:border-defaultborder/10",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "box-body flex items-center justify-between flex-wrap gap-2",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "",
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "font-semibold",
                                                                                children: "Work"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 725,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 724,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "inline-flex",
                                                                                role: "group",
                                                                                "aria-label": "Basic radio toggle button group",
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                        type: "radio",
                                                                                        className: "btn-check",
                                                                                        name: "label-work",
                                                                                        id: "work-enable",
                                                                                        defaultChecked: true
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 729,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                        className: "ti-btn !text-[0.75rem] !font-medium  ti-btn-outline-primary text-white !rounded-e-none !border-e-0",
                                                                                        htmlFor: "work-enable",
                                                                                        children: "Enable"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 730,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                        type: "radio",
                                                                                        className: "btn-check",
                                                                                        name: "label-work",
                                                                                        id: "work-disable"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 731,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                        className: "ti-btn !text-[0.75rem] !font-medium ti-btn-outline-primary !rounded-s-none",
                                                                                        htmlFor: "work-disable",
                                                                                        children: "Disable"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 732,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 728,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 727,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 723,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                lineNumber: 722,
                                                                columnNumber: 49
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                            lineNumber: 721,
                                                            columnNumber: 45
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "xl:col-span-3 col-span-12",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "box !shadow-none border dark:border-defaultborder/10",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "box-body flex items-center justify-between flex-wrap gap-2",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "",
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "font-semibold",
                                                                                children: "Friends"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 742,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 741,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "inline-flex",
                                                                                role: "group",
                                                                                "aria-label": "Basic radio toggle button group",
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                        type: "radio",
                                                                                        className: "btn-check",
                                                                                        name: "label-friends",
                                                                                        id: "friends-enable",
                                                                                        defaultChecked: true
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 746,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                        className: "ti-btn !text-[0.75rem] !font-medium  ti-btn-outline-primary text-white !rounded-e-none !border-e-0",
                                                                                        htmlFor: "friends-enable",
                                                                                        children: "Enable"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 747,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                        type: "radio",
                                                                                        className: "btn-check",
                                                                                        name: "label-friends",
                                                                                        id: "friends-disable"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 748,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                        className: "ti-btn !text-[0.75rem] !font-medium ti-btn-outline-primary !rounded-s-none",
                                                                                        htmlFor: "friends-disable",
                                                                                        children: "Disable"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 749,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 745,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 744,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 740,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                lineNumber: 739,
                                                                columnNumber: 49
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                            lineNumber: 738,
                                                            columnNumber: 45
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                    lineNumber: 686,
                                                    columnNumber: 41
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                            lineNumber: 508,
                                            columnNumber: 37
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "tab-pane !p-0 !border-0 dark:border-defaultborder/10 hidden",
                                            id: "notification-settings",
                                            "aria-labelledby": "notifications-item",
                                            role: "tabpanel",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                                className: "list-group list-group-flush list-none !rounded-md",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                        className: "list-group-item",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "grid grid-cols-12 xl:gap-x-[3rem] gap-y-4",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "xl:col-span-5 col-span-12",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                            className: "text-[1rem] mb-1 font-semibold",
                                                                            children: "Email Notifications"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 762,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                            className: "text-[0.75rem] mb-0 text-[#8c9097] dark:text-white/50",
                                                                            children: "Email notifications are the notifications you will receeive when you are offline, you can customize them by enabling or disabling them."
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 763,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 761,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "xl:col-span-7 col-span-12",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "flex items-center justify-between sm:mt-0 mt-4",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "mail-notification-settings",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                            className: "text-[0.875rem] mb-1 font-semibold",
                                                                                            children: "Updates & Features"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 768,
                                                                                            columnNumber: 65
                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                            className: "text-[0.75rem] mb-0 text-[#8c9097] dark:text-white/50",
                                                                                            children: "Notifications about new updates and their features."
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 769,
                                                                                            columnNumber: 65
                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 767,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                        className: "custom-toggle-switch ltr:sm:float-right rtl:sm:float-left",
                                                                                        children: [
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                                id: "update-features",
                                                                                                name: "toggleswitchsize11",
                                                                                                type: "checkbox",
                                                                                                defaultChecked: true
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                lineNumber: 773,
                                                                                                columnNumber: 69
                                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                                htmlFor: "update-features",
                                                                                                className: "label-success mb-1"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                lineNumber: 774,
                                                                                                columnNumber: 69
                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 772,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 771,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 766,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "flex items-center justify-between mt-4",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "mail-notification-settings",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                            className: "text-[0.875rem] mb-1 font-semibold",
                                                                                            children: "Early Access"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 780,
                                                                                            columnNumber: 65
                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                            className: "text-[0.75rem] mb-0 text-[#8c9097] dark:text-white/50",
                                                                                            children: "Users are selected for beta testing of new update,notifications relating or participate in any of paid product promotion."
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 781,
                                                                                            columnNumber: 65
                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 779,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                        className: "custom-toggle-switch ltr:sm:float-right rtl:sm:float-left",
                                                                                        children: [
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                                id: "early-access",
                                                                                                name: "toggleswitchsize12",
                                                                                                type: "checkbox"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                lineNumber: 785,
                                                                                                columnNumber: 69
                                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                                htmlFor: "early-access",
                                                                                                className: "label-success mb-1"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                lineNumber: 786,
                                                                                                columnNumber: 69
                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 784,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 783,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 778,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "flex items-center justify-between mt-4",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "mail-notification-settings",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                            className: "text-[0.875rem] mb-1 font-semibold",
                                                                                            children: "Email Shortcuts"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 792,
                                                                                            columnNumber: 65
                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                            className: "text-[0.75rem] mb-0 text-[#8c9097] dark:text-white/50",
                                                                                            children: "Shortcut notifications for email."
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 793,
                                                                                            columnNumber: 65
                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 791,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                        className: "custom-toggle-switch ltr:sm:float-right rtl:sm:float-left",
                                                                                        children: [
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                                id: "email-shortcut",
                                                                                                name: "toggleswitchsize13",
                                                                                                type: "checkbox",
                                                                                                defaultChecked: true
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                lineNumber: 797,
                                                                                                columnNumber: 69
                                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                                htmlFor: "email-shortcut",
                                                                                                className: "label-success mb-1"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                lineNumber: 798,
                                                                                                columnNumber: 69
                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 796,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 795,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 790,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "flex items-center justify-between mt-4",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "mail-notification-settings",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                            className: "text-[0.875rem] mb-1 font-semibold",
                                                                                            children: "New Mails"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 804,
                                                                                            columnNumber: 65
                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                            className: "text-[0.75rem] mb-0 text-[#8c9097] dark:text-white/50",
                                                                                            children: "Notifications related to new mails received."
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 805,
                                                                                            columnNumber: 65
                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 803,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                        className: "custom-toggle-switch ltr:sm:float-right rtl:sm:float-left",
                                                                                        children: [
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                                id: "new-mails",
                                                                                                name: "toggleswitchsize14",
                                                                                                type: "checkbox",
                                                                                                defaultChecked: true
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                lineNumber: 809,
                                                                                                columnNumber: 69
                                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                                htmlFor: "new-mails",
                                                                                                className: "label-success mb-1"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                lineNumber: 810,
                                                                                                columnNumber: 69
                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 808,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 807,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 802,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "flex items-center justify-between mt-4",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "mail-notification-settings",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                            className: "text-[0.875rem] mb-1 font-semibold",
                                                                                            children: "Mail Chat Messages"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 816,
                                                                                            columnNumber: 65
                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                            className: "text-[0.75rem] mb-0 text-[#8c9097] dark:text-white/50",
                                                                                            children: "Any of new messages are received will be updated through notifications."
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 817,
                                                                                            columnNumber: 65
                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 815,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                        className: "custom-toggle-switch ltr:sm:float-right rtl:sm:float-left",
                                                                                        children: [
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                                id: "mail-chat-messages",
                                                                                                name: "toggleswitchsize15",
                                                                                                type: "checkbox",
                                                                                                defaultChecked: true
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                lineNumber: 821,
                                                                                                columnNumber: 69
                                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                                htmlFor: "mail-chat-messages",
                                                                                                className: "label-success mb-1"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                lineNumber: 822,
                                                                                                columnNumber: 69
                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 820,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 819,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 814,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 765,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                            lineNumber: 760,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                        lineNumber: 759,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                        className: "list-group-item",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "grid grid-cols-12 xl:gap-x-[3rem] gap-y-4",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "xl:col-span-5 col-span-12",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                            className: "text-[1rem] mb-1 font-semibold",
                                                                            children: "Push Notifications"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 832,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                            className: "text-[0.75rem] mb-0 text-[#8c9097] dark:text-white/50",
                                                                            children: "Push notifications are recieved when you are online, you can customize them by enabling or disabling them."
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 833,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 831,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "xl:col-span-7 col-span-12",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "flex items-center justify-between sm:mt-0 mt-4",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "mail-notification-settings",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                            className: "text-[0.875rem] mb-1 font-semibold",
                                                                                            children: "New Mails"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 838,
                                                                                            columnNumber: 65
                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                            className: "text-[0.75rem] mb-0 text-[#8c9097] dark:text-white/50",
                                                                                            children: "Notifications related to new mails received."
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 839,
                                                                                            columnNumber: 65
                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 837,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                        className: "custom-toggle-switch ltr:sm:float-right rtl:sm:float-left",
                                                                                        children: [
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                                id: "push-new-mails",
                                                                                                name: "toggleswitchsize16",
                                                                                                type: "checkbox",
                                                                                                defaultChecked: true
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                lineNumber: 843,
                                                                                                columnNumber: 69
                                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                                htmlFor: "push-new-mails",
                                                                                                className: "label-success mb-1"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                lineNumber: 844,
                                                                                                columnNumber: 69
                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 842,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 841,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 836,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "flex items-center justify-between mt-4",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "mail-notification-settings",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                            className: "text-[0.875rem] mb-1 font-semibold",
                                                                                            children: "Mail Chat Messages"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 850,
                                                                                            columnNumber: 65
                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                            className: "text-[0.75rem] mb-0 text-[#8c9097] dark:text-white/50",
                                                                                            children: "Any of new messages are received will be updated through notifications."
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 851,
                                                                                            columnNumber: 65
                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 849,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                        className: "custom-toggle-switch ltr:sm:float-right rtl:sm:float-left",
                                                                                        children: [
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                                id: "push-mail-chat-messages",
                                                                                                name: "toggleswitchsize17",
                                                                                                type: "checkbox",
                                                                                                defaultChecked: true
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                lineNumber: 855,
                                                                                                columnNumber: 69
                                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                                htmlFor: "push-mail-chat-messages",
                                                                                                className: "label-success mb-1"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                lineNumber: 856,
                                                                                                columnNumber: 69
                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 854,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 853,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 848,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "flex items-center justify-between mt-4",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "mail-notification-settings",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                            className: "text-[0.875rem] mb-1 font-semibold",
                                                                                            children: "Mail Extensions"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 862,
                                                                                            columnNumber: 65
                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                            className: "text-[0.75rem] mb-0 text-[#8c9097] dark:text-white/50",
                                                                                            children: "Notifications related to the extensions received by new emails and thier propertied also been displayed."
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 863,
                                                                                            columnNumber: 65
                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 861,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                        className: "custom-toggle-switch ltr:sm:float-right rtl:sm:float-left",
                                                                                        children: [
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                                id: "mail-extensions",
                                                                                                name: "toggleswitchsize18",
                                                                                                type: "checkbox"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                lineNumber: 867,
                                                                                                columnNumber: 69
                                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                                htmlFor: "mail-extensions",
                                                                                                className: "label-success mb-1"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                lineNumber: 868,
                                                                                                columnNumber: 69
                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 866,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 865,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 860,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 835,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                            lineNumber: 830,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                        lineNumber: 829,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                lineNumber: 758,
                                                columnNumber: 41
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                            lineNumber: 757,
                                            columnNumber: 37
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "tab-pane  dark:border-defaultborder/10 !p-0 hidden",
                                            id: "security",
                                            "aria-labelledby": "security-item",
                                            role: "tabpanel",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                                className: "list-group !border-0 list-group-flush list-unstyled",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                        className: "list-group-item !border !border-defaultborder dark:!border-defaultborder/10 !border-t-0 !border-e-0 !border-s-0",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "grid grid-cols-12 xl:gap-x-[3rem] gap-y-4",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "xl:col-span-4 col-span-12",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                            className: "text-[1rem] mb-1 font-semibold",
                                                                            children: "Logging In"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 882,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                            className: "text-[0.75rem] mb-0 text-[#8c9097] dark:text-white/50",
                                                                            children: "Security settings related to logging into our email account and taking down account if any mischevious action happended."
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 883,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 881,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "xl:col-span-8 col-span-12",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "sm:flex block items-center justify-between sm:mt-0 mt-4",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "mail-security-settings",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                            className: "text-[0.875rem] mb-1 font-semibold",
                                                                                            children: "Max Limit for login attempts"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 888,
                                                                                            columnNumber: 65
                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                            className: "text-[0.75rem] mb-0 text-[#8c9097] dark:text-white/50",
                                                                                            children: "Account will freeze for 24hrs while attempt to login with wrong credentials for selected number of times"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 889,
                                                                                            columnNumber: 65
                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 887,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Select, {
                                                                                        name: "colors",
                                                                                        options: __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$pages$2f$mail$2f$mailsettingdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MaxLimitoptions"],
                                                                                        className: "w-full !rounded-md",
                                                                                        menuPlacement: "auto",
                                                                                        classNamePrefix: "Select2",
                                                                                        defaultValue: [
                                                                                            __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$pages$2f$mail$2f$mailsettingdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MaxLimitoptions"][0]
                                                                                        ]
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 892,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 891,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 886,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "sm:flex block items-center justify-between mt-4",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "mail-security-settings",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                            className: "text-[0.875rem] mb-1 font-semibold",
                                                                                            children: "Account Freeze time management"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 899,
                                                                                            columnNumber: 65
                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                            className: "text-[0.75rem] mb-0 text-[#8c9097] dark:text-white/50",
                                                                                            children: "You can change the time for the account freeze when attempts for "
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 900,
                                                                                            columnNumber: 65
                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 898,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Select, {
                                                                                        name: "colors",
                                                                                        options: __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$pages$2f$mail$2f$mailsettingdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Accountoptions"],
                                                                                        className: "w-full !rounded-md",
                                                                                        menuPlacement: "auto",
                                                                                        classNamePrefix: "Select2",
                                                                                        defaultValue: [
                                                                                            __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$data$2f$pages$2f$mail$2f$mailsettingdata$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Accountoptions"][0]
                                                                                        ]
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 903,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 902,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 897,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 885,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                            lineNumber: 880,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                        lineNumber: 879,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                        className: "list-group-item !border !border-defaultborder dark:!border-defaultborder/10 !border-t-0 !border-e-0 !border-s-0",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "grid grid-cols-12 xl:gap-x-[3rem] gap-y-4",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "xl:col-span-4 col-span-12",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                            className: "text-base mb-1 font-semibold",
                                                                            children: "Password Requirements"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 914,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                            className: "text-[0.75rem] mb-0 text-[#8c9097] dark:text-white/50",
                                                                            children: "Security settings related to password strength."
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 915,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 913,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "xl:col-span-8 col-span-12",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "sm:flex block items-center justify-between sm:mt-0 mt-4",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "mail-security-settings",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                            className: "text-[0.875rem] mb-1 font-semibold",
                                                                                            children: "Minimun number of characters in the password"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 920,
                                                                                            columnNumber: 65
                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                            className: "text-[0.75rem] mb-0 text-[#8c9097] dark:text-white/50",
                                                                                            children: "There should be a minimum number of characters for a password to be validated that shouls be set here."
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 921,
                                                                                            columnNumber: 65
                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 919,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                        type: "text",
                                                                                        className: "form-control !rounded-md",
                                                                                        defaultValue: "8"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 924,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 923,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 918,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "sm:flex block items-center justify-between mt-4",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                            className: "text-[0.875rem] mb-1 font-semibold",
                                                                                            children: "Contain A Number"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 929,
                                                                                            columnNumber: 65
                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                            className: "text-[0.75rem] mb-0 text-[#8c9097] dark:text-white/50",
                                                                                            children: "Password should contain a number."
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 930,
                                                                                            columnNumber: 65
                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 928,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                        className: "custom-toggle-switch ltr:sm:float-right rtl:sm:float-left",
                                                                                        children: [
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                                id: "password-number",
                                                                                                name: "toggleswitchsize19",
                                                                                                type: "checkbox"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                lineNumber: 934,
                                                                                                columnNumber: 69
                                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                                htmlFor: "password-number",
                                                                                                className: "label-success mb-1"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                lineNumber: 935,
                                                                                                columnNumber: 69
                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 933,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 932,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 927,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "sm:flex block items-center justify-between mt-4",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                            className: "text-[0.875rem] mb-1 font-semibold",
                                                                                            children: "Contain A Special Character"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 941,
                                                                                            columnNumber: 65
                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                            className: "text-[0.75rem] mb-0 text-[#8c9097] dark:text-white/50",
                                                                                            children: "Password should contain a special Character."
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 942,
                                                                                            columnNumber: 65
                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 940,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                        className: "custom-toggle-switch ltr:sm:float-right rtl:sm:float-left",
                                                                                        children: [
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                                id: "password-special-character",
                                                                                                name: "toggleswitchsize20",
                                                                                                type: "checkbox",
                                                                                                defaultChecked: true
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                lineNumber: 946,
                                                                                                columnNumber: 69
                                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                                htmlFor: "password-special-character",
                                                                                                className: "label-success mb-1"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                lineNumber: 947,
                                                                                                columnNumber: 69
                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 945,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 944,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 939,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "sm:flex block items-center justify-between mt-4",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                            className: "text-[0.875rem] mb-1 font-semibold",
                                                                                            children: "Atleast One Capital Letter"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 953,
                                                                                            columnNumber: 65
                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                            className: "text-[0.75rem] mb-0 text-[#8c9097] dark:text-white/50",
                                                                                            children: "Password should contain atleast one capital letter."
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 954,
                                                                                            columnNumber: 65
                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 952,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                        className: "custom-toggle-switch ltr:sm:float-right rtl:sm:float-left",
                                                                                        children: [
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                                id: "password-capital",
                                                                                                name: "toggleswitchsize21",
                                                                                                type: "checkbox",
                                                                                                defaultChecked: true
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                lineNumber: 958,
                                                                                                columnNumber: 69
                                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                                htmlFor: "password-capital",
                                                                                                className: "label-success mb-1"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                                lineNumber: 959,
                                                                                                columnNumber: 69
                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 957,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 956,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 951,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "sm:flex block items-center justify-between mt-4",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                            className: "text-[0.875rem] mb-1 font-semibold",
                                                                                            children: "Maximun Password Length"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 965,
                                                                                            columnNumber: 65
                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                            className: "text-[0.75rem] mb-0 text-[#8c9097] dark:text-white/50",
                                                                                            children: "Maximum password lenth should be selected here."
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                            lineNumber: 966,
                                                                                            columnNumber: 65
                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 964,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                        type: "text",
                                                                                        className: "form-control !rounded-md",
                                                                                        defaultValue: "16"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 969,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                    lineNumber: 968,
                                                                                    columnNumber: 61
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 963,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 917,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                            lineNumber: 912,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                        lineNumber: 911,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                        className: "list-group-item !border-0",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "grid grid-cols-12 xl:gap-x-[3rem] gap-y-4",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "xl:col-span-4 col-span-12",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                            className: "text-[1rem] mb-1 font-semibold",
                                                                            children: "Unknown Chats"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 978,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                            className: "text-[0.75rem] mb-0 text-[#8c9097] dark:text-white/50",
                                                                            children: "Security settings related to unknown chats."
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                            lineNumber: 979,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 977,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "xl:col-span-8 col-span-12",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "form-check !ps-0",
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                        className: "form-check-input",
                                                                                        type: "radio",
                                                                                        name: "unknown-messages-show",
                                                                                        id: "unknown-messages-show1"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 984,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                        className: "form-check-label",
                                                                                        htmlFor: "unknown-messages-show1",
                                                                                        children: "Show"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 985,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 983,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "form-check !ps-0",
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                        className: "form-check-input",
                                                                                        type: "radio",
                                                                                        name: "unknown-messages-show",
                                                                                        id: "unknown-messages-hide2",
                                                                                        defaultChecked: true
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 990,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                        className: "form-check-label",
                                                                                        htmlFor: "unknown-messages-hide2",
                                                                                        children: "Hide"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                        lineNumber: 991,
                                                                                        columnNumber: 65
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                                lineNumber: 989,
                                                                                columnNumber: 61
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                        lineNumber: 982,
                                                                        columnNumber: 57
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                                    lineNumber: 981,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                            lineNumber: 976,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                        lineNumber: 975,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                                lineNumber: 878,
                                                columnNumber: 41
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                            lineNumber: 877,
                                            columnNumber: 37
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                    lineNumber: 74,
                                    columnNumber: 33
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                                lineNumber: 73,
                                columnNumber: 29
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                        lineNumber: 44,
                        columnNumber: 25
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                    lineNumber: 43,
                    columnNumber: 21
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
                lineNumber: 42,
                columnNumber: 17
            }, ("TURBOPACK compile-time value", void 0))
        }, void 0, false, {
            fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
            lineNumber: 41,
            columnNumber: 13
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/app/(components)/(contentlayout)/pages/email/mail-settings/page.tsx",
        lineNumber: 40,
        columnNumber: 9
    }, ("TURBOPACK compile-time value", void 0));
};
_s(Mailsettings, "gyPjtWeS0oociX6U83GlVH0PqUg=");
_c1 = Mailsettings;
const __TURBOPACK__default__export__ = Mailsettings;
var _c, _c1;
__turbopack_context__.k.register(_c, "Select");
__turbopack_context__.k.register(_c1, "Mailsettings");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_8a1d9593._.js.map