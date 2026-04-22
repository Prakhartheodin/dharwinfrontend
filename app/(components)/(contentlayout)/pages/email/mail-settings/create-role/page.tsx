"use client"

import React, { Fragment, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import { PERMISSION_SECTIONS } from '@/shared/lib/roles-permissions'

interface FeaturePermissions {
  view: boolean
  create: boolean
  delete: boolean
  edit: boolean
}

interface SectionPermissions {
  [feature: string]: FeaturePermissions
}

interface RolePermissions {
  [section: string]: SectionPermissions
}

const getInitialPermissions = (): RolePermissions => {
  const permissions: RolePermissions = {}
  PERMISSION_SECTIONS.forEach((section) => {
    permissions[section.id] = {}
    section.features.forEach((feature) => {
      permissions[section.id][feature.id] = { view: false, create: false, delete: false, edit: false }
    })
  })
  return permissions
}

const CreateRolePage = () => {
  const router = useRouter()
  const [newRoleName, setNewRoleName] = useState('')
  const [rolePermissions, setRolePermissions] = useState<RolePermissions>(getInitialPermissions())
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(PERMISSION_SECTIONS.map((s) => s.id))
  )

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  const handlePermissionChange = (sectionId: string, featureId: string, permission: keyof FeaturePermissions, checked: boolean) => {
    setRolePermissions((prev) => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [featureId]: {
          ...prev[sectionId][featureId],
          [permission]: checked,
        },
      },
    }))
  }

  const handleFullPermission = (sectionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const section = PERMISSION_SECTIONS.find((s) => s.id === sectionId)
    if (!section) return
    const fullPermissions: SectionPermissions = {}
    section.features.forEach((feature) => {
      fullPermissions[feature.id] = { view: true, create: true, delete: true, edit: true }
    })
    setRolePermissions((prev) => ({
      ...prev,
      [sectionId]: fullPermissions,
    }))
  }

  const handleSaveRole = () => {
    const permissionLabels: string[] = []
    PERMISSION_SECTIONS.forEach((section) => {
      section.features.forEach((feature) => {
        const perms = rolePermissions[section.id]?.[feature.id]
        if (perms) {
          if (perms.view) permissionLabels.push(`${feature.label} - View`)
          if (perms.create) permissionLabels.push(`${feature.label} - Create`)
          if (perms.edit) permissionLabels.push(`${feature.label} - Edit`)
          if (perms.delete) permissionLabels.push(`${feature.label} - Delete`)
        }
      })
    })
    const newRole = {
      id: String(Date.now()),
      roleType: newRoleName || 'New Role',
      permissions: permissionLabels,
    }
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('newly-created-role', JSON.stringify(newRole))
    }
    router.push('/pages/email/mail-settings')
  }

  return (
    <Fragment>
      
      <div className="container w-full max-w-full mx-auto">
        <div className="grid grid-cols-12 gap-6">
          <div className="xl:col-span-12 col-span-12">
            <div className="box">
              <div className="box-header flex items-center justify-between flex-wrap gap-4">
                <div className="box-title">User Roles</div>
                <Link
                  href="/pages/email/mail-settings"
                  className="ti-btn ti-btn-light !py-1 !px-2 !text-[0.75rem]"
                >
                  <i className="ri-arrow-left-line me-1"></i>Back to User Roles
                </Link>
              </div>
              <div className="box-body">
                <div className="mb-6">
                  <label htmlFor="role-name" className="form-label">Role Name</label>
                  <input
                    id="role-name"
                    type="text"
                    className="form-control"
                    placeholder="Enter role name"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                  />
                </div>
                <div className="hs-accordion-group space-y-2">
                  {PERMISSION_SECTIONS.map((section) => {
                    const isExpanded = expandedSections.has(section.id)
                    return (
                      <div
                        key={section.id}
                        className={`hs-accordion border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ${isExpanded ? 'active' : ''}`}
                      >
                        <div
                          className="hs-accordion-toggle w-full flex items-center justify-between px-4 py-3 font-semibold text-start bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 cursor-pointer"
                          onClick={() => toggleSection(section.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && toggleSection(section.id)}
                          aria-expanded={isExpanded}
                        >
                          <span>{section.label}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              className="ti-btn ti-btn-primary !py-0.5 !px-2 !text-[0.7rem] whitespace-nowrap"
                              onClick={(e) => handleFullPermission(section.id, e)}
                            >
                              Full Permission
                            </button>
                            <i className={`ri-arrow-down-s-line text-xl transition-transform ${isExpanded ? 'rotate-180' : ''}`}></i>
                          </div>
                        </div>
                        <div
                          className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[80vh]' : 'max-h-0'}`}
                        >
                          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-bodybg max-h-[75vh] overflow-y-auto">
                            <div className="table-responsive overflow-x-auto">
                              <table className="table min-w-full table-bordered border-gray-200 dark:border-gray-700">
                                <thead>
                                  <tr className="bg-gray-50 dark:bg-gray-800/50">
                                    <th className="px-4 py-2 text-start font-medium">Feature</th>
                                    <th className="px-4 py-2 text-center font-medium">View</th>
                                    <th className="px-4 py-2 text-center font-medium">Create</th>
                                    <th className="px-4 py-2 text-center font-medium">Edit</th>
                                    <th className="px-4 py-2 text-center font-medium">Delete</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {section.features.map((feature) => (
                                    <tr key={feature.id} className="border-b border-gray-200 dark:border-gray-700">
                                      <td className="px-4 py-2 font-medium">{feature.label}</td>
                                      <td className="px-4 py-2 text-center align-middle">
                                        <div className="flex justify-center">
                                          <input
                                            type="checkbox"
                                            className="form-check-input"
                                            checked={rolePermissions[section.id]?.[feature.id]?.view ?? false}
                                            onChange={(e) => handlePermissionChange(section.id, feature.id, 'view', e.target.checked)}
                                          />
                                        </div>
                                      </td>
                                      <td className="px-4 py-2 text-center align-middle">
                                        <div className="flex justify-center">
                                          <input
                                            type="checkbox"
                                            className="form-check-input"
                                            checked={rolePermissions[section.id]?.[feature.id]?.create ?? false}
                                            onChange={(e) => handlePermissionChange(section.id, feature.id, 'create', e.target.checked)}
                                          />
                                        </div>
                                      </td>
                                      <td className="px-4 py-2 text-center align-middle">
                                        <div className="flex justify-center">
                                          <input
                                            type="checkbox"
                                            className="form-check-input"
                                            checked={rolePermissions[section.id]?.[feature.id]?.edit ?? false}
                                            onChange={(e) => handlePermissionChange(section.id, feature.id, 'edit', e.target.checked)}
                                          />
                                        </div>
                                      </td>
                                      <td className="px-4 py-2 text-center align-middle">
                                        <div className="flex justify-center">
                                          <input
                                            type="checkbox"
                                            className="form-check-input"
                                            checked={rolePermissions[section.id]?.[feature.id]?.delete ?? false}
                                            onChange={(e) => handlePermissionChange(section.id, feature.id, 'delete', e.target.checked)}
                                          />
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Link
                    href="/pages/email/mail-settings"
                    className="ti-btn ti-btn-light"
                  >
                    Cancel
                  </Link>
                  <button
                    type="button"
                    className="ti-btn ti-btn-primary-full"
                    onClick={handleSaveRole}
                  >
                    Create Role
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  )
}

export default CreateRolePage
