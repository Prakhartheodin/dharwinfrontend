"use client"
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import TiptapEditor from '@/shared/data/forms/form-editors/tiptapeditor'
const Select = dynamic(() => import("react-select"), { ssr: false })
import CreatableSelect from 'react-select/creatable'

const CreateJob = () => {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('general')
  const [jobDescription, setJobDescription] = useState('')
  
  // Form state
  const [formData, setFormData] = useState({
    jobTitle: '',
    salaryMin: '',
    salaryMax: '',
    location: '',
    jobType: null as any,
    skills: [] as any[],
  })

  // Job type options
  const jobTypeOptions = [
    { value: 'full-time', label: 'Full Time' },
    { value: 'part-time', label: 'Part Time' },
    { value: 'contract', label: 'Contract' },
    { value: 'remote', label: 'Remote' },
    { value: 'internship', label: 'Internship' },
  ]

  // Skills input handling
  const components = {
    DropdownIndicator: null,
  }

  const createOption = (label: string) => ({
    label,
    value: label,
  })

  const [skillsInputValue, setSkillsInputValue] = useState('')

  const handleSkillsKeyDown = (event: any) => {
    if (!skillsInputValue) return
    switch (event.key) {
      case 'Enter':
      case 'Tab':
        setFormData((prev) => ({
          ...prev,
          skills: [...prev.skills, createOption(skillsInputValue)],
        }))
        setSkillsInputValue('')
        event.preventDefault()
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission here
    console.log('Form Data:', {
      ...formData,
      jobDescription,
    })
    // Navigate back to jobs page after submission
    router.push('/ats/jobs')
  }

  return (
    <Fragment>
      <Seo title={"Create Job"} />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="xl:col-span-12 col-span-12">
          <div className="box custom-box">
            <div className="box-header">
              <div className="box-title">
                Create New Job
              </div>
              <div>
                <Link
                  href="/ats/jobs"
                  className="ti-btn ti-btn-secondary !py-1 !px-2 !text-[0.75rem]"
                >
                  <i className="ri-arrow-left-line font-semibold align-middle me-1"></i>Back to Jobs
                </Link>
              </div>
            </div>
            <div className="box-body">
              {/* Tabs Navigation */}
              <div className="border-b border-gray-200 dark:border-defaultborder/10 mb-6">
                <nav className="flex space-x-2 rtl:space-x-reverse" aria-label="Tabs" role="tablist">
                  <button
                    type="button"
                    onClick={() => setActiveTab('general')}
                    className={`hs-tab-active:bg-primary/10 hs-tab-active:text-primary hs-tab-active:border-primary -mb-px py-2 px-4 inline-flex items-center gap-2 text-sm font-medium text-center border-b-2 transition-colors ${
                      activeTab === 'general'
                        ? 'bg-primary/10 text-primary border-primary'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 border-transparent'
                    }`}
                    id="general-tab"
                    aria-controls="general-panel"
                  >
                    <i className="ri-file-text-line"></i>
                    General
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('requirements')}
                    className={`hs-tab-active:bg-primary/10 hs-tab-active:text-primary hs-tab-active:border-primary -mb-px py-2 px-4 inline-flex items-center gap-2 text-sm font-medium text-center border-b-2 transition-colors ${
                      activeTab === 'requirements'
                        ? 'bg-primary/10 text-primary border-primary'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 border-transparent'
                    }`}
                    id="requirements-tab"
                    aria-controls="requirements-panel"
                  >
                    <i className="ri-checkbox-line"></i>
                    Requirements
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    className={`hs-tab-active:bg-primary/10 hs-tab-active:text-primary hs-tab-active:border-primary -mb-px py-2 px-4 inline-flex items-center gap-2 text-sm font-medium text-center border-b-2 transition-colors ${
                      activeTab === 'settings'
                        ? 'bg-primary/10 text-primary border-primary'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 border-transparent'
                    }`}
                    id="settings-tab"
                    aria-controls="settings-panel"
                  >
                    <i className="ri-settings-3-line"></i>
                    Settings
                  </button>
                </nav>
              </div>

              {/* Tab Panels */}
              <form onSubmit={handleSubmit}>
                {/* General Tab */}
                {activeTab === 'general' && (
                  <div id="general-panel" role="tabpanel" aria-labelledby="general-tab">
                    <div className="grid grid-cols-12 gap-4">
                      {/* Job Title */}
                      <div className="xl:col-span-12 col-span-12">
                        <label htmlFor="job-title" className="form-label">
                          Job Title <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          id="job-title"
                          placeholder="e.g., Senior Software Engineer"
                          value={formData.jobTitle}
                          onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                          required
                        />
                      </div>

                      {/* Job Description */}
                      <div className="xl:col-span-12 col-span-12">
                        <label className="form-label">
                          Job Description <span className="text-danger">*</span>
                        </label>
                        <div className="border border-gray-200 dark:border-defaultborder/10 rounded-md">
                          <TiptapEditor
                            content={jobDescription}
                            placeholder="Enter detailed job description..."
                            onChange={(html) => setJobDescription(html)}
                          />
                        </div>
                        <p className="text-muted text-xs mt-2">
                          Provide a comprehensive description of the role, responsibilities, and what makes this opportunity unique.
                        </p>
                      </div>

                      {/* Salary Range */}
                      <div className="xl:col-span-6 col-span-12">
                        <label htmlFor="salary-min" className="form-label">
                          Minimum Salary
                        </label>
                        <div className="input-group">
                          <span className="input-group-text text-muted">$</span>
                          <input
                            type="number"
                            className="form-control"
                            id="salary-min"
                            placeholder="50000"
                            value={formData.salaryMin}
                            onChange={(e) => handleInputChange('salaryMin', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="xl:col-span-6 col-span-12">
                        <label htmlFor="salary-max" className="form-label">
                          Maximum Salary
                        </label>
                        <div className="input-group">
                          <span className="input-group-text text-muted">$</span>
                          <input
                            type="number"
                            className="form-control"
                            id="salary-max"
                            placeholder="100000"
                            value={formData.salaryMax}
                            onChange={(e) => handleInputChange('salaryMax', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Location */}
                      <div className="xl:col-span-6 col-span-12">
                        <label htmlFor="location" className="form-label">
                          Location <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          id="location"
                          placeholder="e.g., San Francisco, CA or Remote"
                          value={formData.location}
                          onChange={(e) => handleInputChange('location', e.target.value)}
                          required
                        />
                      </div>

                      {/* Job Type */}
                      <div className="xl:col-span-6 col-span-12">
                        <label className="form-label">
                          Job Type <span className="text-danger">*</span>
                        </label>
                        <Select
                          name="jobType"
                          options={jobTypeOptions}
                          className="ti-form-select !p-0 !rounded-s-none"
                          classNamePrefix="Select2"
                          placeholder="Select job type"
                          value={formData.jobType}
                          onChange={(selected: any) => handleInputChange('jobType', selected)}
                          menuPlacement="auto"
                        />
                      </div>

                      {/* Skills */}
                      <div className="xl:col-span-12 col-span-12">
                        <label className="form-label">
                          Skills
                        </label>
                        <CreatableSelect
                          components={components}
                          classNamePrefix="react-select"
                          inputValue={skillsInputValue}
                          isClearable
                          isMulti
                          menuIsOpen={false}
                          onChange={(newValue: any) => {
                            if (Array.isArray(newValue)) {
                              handleInputChange('skills', newValue)
                            } else {
                              handleInputChange('skills', [])
                            }
                          }}
                          onInputChange={(newValue: string) => setSkillsInputValue(newValue)}
                          onKeyDown={handleSkillsKeyDown}
                          placeholder="Type a skill and press Enter to add..."
                          value={formData.skills}
                          className="ti-form-select"
                        />
                        <p className="text-muted text-xs mt-2">
                          Add relevant skills required for this position. Press Enter after typing each skill.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Requirements Tab - Placeholder for future */}
                {activeTab === 'requirements' && (
                  <div id="requirements-panel" role="tabpanel" aria-labelledby="requirements-tab">
                    <div className="text-center py-8">
                      <p className="text-muted">Requirements section coming soon...</p>
                    </div>
                  </div>
                )}

                {/* Settings Tab - Placeholder for future */}
                {activeTab === 'settings' && (
                  <div id="settings-panel" role="tabpanel" aria-labelledby="settings-tab">
                    <div className="text-center py-8">
                      <p className="text-muted">Settings section coming soon...</p>
                    </div>
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-defaultborder/10">
                  <Link
                    href="/ats/jobs"
                    className="ti-btn ti-btn-secondary"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    className="ti-btn ti-btn-primary"
                  >
                    <i className="ri-save-line font-semibold align-middle me-1"></i>
                    Create Job
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  )
}

export default CreateJob

