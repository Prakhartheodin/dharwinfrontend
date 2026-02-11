"use client"

import React, { Fragment, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Seo from '@/shared/layout-components/seo/seo'
import Swal from 'sweetalert2'
import { AxiosError } from 'axios'
import * as studentsApi from '@/shared/lib/api/students'
import * as usersApi from '@/shared/lib/api/users'
import type { Student, StudentEducation, StudentExperience, StudentAddress, StudentDocument } from '@/shared/lib/api/students'

function getErrorMessage(err: any): string {
  if (err instanceof AxiosError) {
    const msg = err.response?.data?.message
    if (typeof msg === 'string') return msg
    const code = err.response?.data?.code
    if (code === 400 && msg) return String(msg)
  }
  return 'Failed to update student.'
}

const EditStudentClient = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const studentId = searchParams.get('id') ?? ''

  // User fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  // Student profile fields
  const [phone, setPhone] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('')
  const [address, setAddress] = useState<StudentAddress>({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
  })
  const [education, setEducation] = useState<StudentEducation[]>([])
  const [experience, setExperience] = useState<StudentExperience[]>([])
  const [skills, setSkills] = useState<string[]>([])
  const [currentSkill, setCurrentSkill] = useState('')
  const [documents, setDocuments] = useState<StudentDocument[]>([])
  const [bio, setBio] = useState('')
  const [profileImageUrl, setProfileImageUrl] = useState('')
  const [status, setStatus] = useState<string>('active')

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState<string>('')

  // Fetch student data
  useEffect(() => {
    if (!studentId) {
      router.replace('/training/students/')
      return
    }

    let cancelled = false
    ;(async () => {
      setFetching(true)
      setError('')
      try {
        const student = await studentsApi.getStudent(studentId)
        if (cancelled) return

        // Set user ID for updating user name
        setUserId(student.user?.id ?? '')

        // Set user fields
        setName(student.user?.name ?? '')
        setEmail(student.user?.email ?? '')

        // Set student profile fields
        setPhone(student.phone ?? '')
        setDateOfBirth(student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split('T')[0] : '')
        setGender((student.gender as 'male' | 'female' | 'other') ?? '')
        setAddress({
          street: student.address?.street ?? '',
          city: student.address?.city ?? '',
          state: student.address?.state ?? '',
          zipCode: student.address?.zipCode ?? '',
          country: student.address?.country ?? '',
        })
        setEducation(student.education ?? [])
        setExperience(student.experience ?? [])
        setSkills(student.skills ?? [])
        setDocuments(student.documents ?? [])
        setBio(student.bio ?? '')
        setProfileImageUrl(student.profileImageUrl ?? '')
        setStatus(student.status ?? 'active')
      } catch (err) {
        if (cancelled) return
        const msg = getErrorMessage(err)
        setError(msg)
        await Swal.fire({
          icon: 'error',
          title: 'Failed to load student',
          text: msg,
          toast: true,
          position: 'top-end',
          timer: 4000,
          showConfirmButton: false,
          timerProgressBar: true,
        })
      } finally {
        if (!cancelled) setFetching(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [studentId, router])

  // Education handlers
  const addEducation = () => {
    setEducation([
      ...education,
      {
        degree: '',
        institution: '',
        fieldOfStudy: '',
        startDate: '',
        endDate: null,
        isCurrent: false,
        description: '',
      },
    ])
  }

  const removeEducation = (index: number) => {
    setEducation(education.filter((_, i) => i !== index))
  }

  const updateEducation = (index: number, field: keyof StudentEducation, value: any) => {
    const updated = [...education]
    updated[index] = { ...updated[index], [field]: value }
    setEducation(updated)
  }

  // Experience handlers
  const addExperience = () => {
    setExperience([
      ...experience,
      {
        title: '',
        company: '',
        location: '',
        startDate: '',
        endDate: null,
        isCurrent: false,
        description: '',
      },
    ])
  }

  const removeExperience = (index: number) => {
    setExperience(experience.filter((_, i) => i !== index))
  }

  const updateExperience = (index: number, field: keyof StudentExperience, value: any) => {
    const updated = [...experience]
    updated[index] = { ...updated[index], [field]: value }
    setExperience(updated)
  }

  // Skills handlers
  const handleAddSkill = () => {
    const trimmed = currentSkill.trim()
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed])
      setCurrentSkill('')
    }
  }

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove))
  }

  const handleSkillKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddSkill()
    }
  }

  // Documents handlers
  const addDocument = () => {
    setDocuments([
      ...documents,
      {
        name: '',
        type: '',
        fileUrl: '',
        fileKey: '',
      },
    ])
  }

  const removeDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index))
  }

  const updateDocument = (index: number, field: keyof StudentDocument, value: any) => {
    const updated = [...documents]
    updated[index] = { ...updated[index], [field]: value }
    setDocuments(updated)
  }

  // Profile image is currently read-only from the student's existing data.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Name is required.')
      return
    }

    setLoading(true)

    try {
      // Update user name if userId is available
      if (userId) {
        await usersApi.updateUser(userId, {
          name: trimmedName,
        })
      }

      // Prepare education array with proper date formatting
      const educationArray = education.map((edu) => ({
        ...edu,
        startDate: edu.startDate || undefined,
        endDate: edu.isCurrent ? null : (edu.endDate || undefined),
        isCurrent: edu.isCurrent || false,
      }))

      // Prepare experience array with proper date formatting
      const experienceArray = experience.map((exp) => ({
        ...exp,
        startDate: exp.startDate || undefined,
        endDate: exp.isCurrent ? null : (exp.endDate || undefined),
        isCurrent: exp.isCurrent || false,
      }))

      // Prepare address (only include if at least one field is filled)
      const addressData: StudentAddress | undefined =
        address.street || address.city || address.state || address.zipCode || address.country
          ? {
              ...(address.street && { street: address.street }),
              ...(address.city && { city: address.city }),
              ...(address.state && { state: address.state }),
              ...(address.zipCode && { zipCode: address.zipCode }),
              ...(address.country && { country: address.country }),
            }
          : undefined

      // Update student profile
      await studentsApi.updateStudent(studentId, {
        ...(phone && { phone }),
        ...(dateOfBirth && { dateOfBirth }),
        ...(gender && { gender }),
        ...(addressData && { address: addressData }),
        ...(educationArray.length > 0 && { education: educationArray }),
        ...(experienceArray.length > 0 && { experience: experienceArray }),
        ...(skills.length > 0 && { skills }),
        ...(documents.length > 0 && { documents }),
        ...(bio && { bio }),
        ...(profileImageUrl && { profileImageUrl }),
        status,
      })

      await Swal.fire({
        icon: 'success',
        title: 'Student updated',
        text: `The student "${trimmedName}" has been updated successfully.`,
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false,
        timerProgressBar: true,
      })

      router.push('/training/students/')
    } catch (err) {
      const msg = getErrorMessage(err)
      setError(msg)
      await Swal.fire({
        icon: 'error',
        title: 'Failed to update student',
        text: msg,
        toast: true,
        position: 'top-end',
        timer: 4000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
    } finally {
      setLoading(false)
    }
  }

  if (!studentId) {
    return (
      <Fragment>
        <Seo title="Edit Student" />
        <div className="container w-full max-w-full mx-auto">
          <div className="box">
            <div className="box-body py-12 text-center text-defaulttextcolor/70">Missing student ID. Redirecting...</div>
          </div>
        </div>
      </Fragment>
    )
  }

  if (fetching && !name && !email) {
    return (
      <Fragment>
        <Seo title="Edit Student" />
        <div className="container w-full max-w-full mx-auto">
          <div className="box">
            <div className="box-body py-12 text-center text-defaulttextcolor/70">Loading student...</div>
          </div>
        </div>
      </Fragment>
    )
  }

  return (
    <Fragment>
      <Seo title="Edit Student" />
      
      <div className="container w-full max-w-full mx-auto">
        <div className="grid grid-cols-12 gap-6">
          <div className="xl:col-span-12 col-span-12">
            <div className="box">
              <div className="box-header flex items-center justify-between flex-wrap gap-4">
                <div className="box-title">Edit Student</div>
                <Link href="/training/students/" className="ti-btn ti-btn-light !py-1 !px-2 !text-[0.75rem]">
                  <i className="ri-arrow-left-line me-1"></i>Back to Students
                </Link>
              </div>
              <div className="box-body">
                <form onSubmit={handleSubmit}>
                  {error && (
                    <div className="mb-6 p-4 bg-danger/10 border border-danger/30 text-danger rounded-md text-sm">
                      {error}
                    </div>
                  )}

                  {/* User Information Section */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4 text-defaulttextcolor">User Information</h3>
                    
                    {/* Full Name */}
                    <div className="mb-6">
                      <label htmlFor="student-name" className="form-label">
                        Full Name <span className="text-danger">*</span>
                      </label>
                      <input
                        id="student-name"
                        type="text"
                        className="form-control"
                        placeholder="e.g. Jane Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoComplete="name"
                        required
                      />
                    </div>

                    {/* Email - Disabled */}
                    <div className="mb-6">
                      <label htmlFor="student-email" className="form-label">
                        Email
                      </label>
                      <input
                        id="student-email"
                        type="email"
                        className="form-control bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                        placeholder="e.g. jane.doe@example.com"
                        value={email}
                        disabled
                        readOnly
                      />
                      <p className="text-[0.75rem] text-defaulttextcolor/70 mt-1 mb-0">
                        Email cannot be changed.
                      </p>
                    </div>
                  </div>

                  {/* Personal Information Section */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4 text-defaulttextcolor">Personal Information</h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Phone */}
                      <div className="mb-6">
                        <label htmlFor="student-phone" className="form-label">
                          Phone
                        </label>
                        <input
                          id="student-phone"
                          type="tel"
                          className="form-control"
                          placeholder="e.g. +1 234 567 8900"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                        />
                      </div>

                      {/* Date of Birth */}
                      <div className="mb-6">
                        <label htmlFor="student-dob" className="form-label">
                          Date of Birth
                        </label>
                        <input
                          id="student-dob"
                          type="date"
                          className="form-control"
                          value={dateOfBirth}
                          onChange={(e) => setDateOfBirth(e.target.value)}
                        />
                      </div>

                      {/* Gender */}
                      <div className="mb-6">
                        <label htmlFor="student-gender" className="form-label">
                          Gender
                        </label>
                        <select
                          id="student-gender"
                          className="form-control"
                          value={gender}
                          onChange={(e) => setGender(e.target.value as 'male' | 'female' | 'other' | '')}
                        >
                          <option value="">Select gender...</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      {/* Status */}
                      <div className="mb-6">
                        <label htmlFor="student-status" className="form-label">
                          Status
                        </label>
                        <select
                          id="student-status"
                          className="form-control"
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="mb-6">
                      <label className="form-label">Address</label>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Street"
                          value={address.street}
                          onChange={(e) => setAddress({ ...address, street: e.target.value })}
                        />
                        <input
                          type="text"
                          className="form-control"
                          placeholder="City"
                          value={address.city}
                          onChange={(e) => setAddress({ ...address, city: e.target.value })}
                        />
                        <input
                          type="text"
                          className="form-control"
                          placeholder="State"
                          value={address.state}
                          onChange={(e) => setAddress({ ...address, state: e.target.value })}
                        />
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Zip Code"
                          value={address.zipCode}
                          onChange={(e) => setAddress({ ...address, zipCode: e.target.value })}
                        />
                        <input
                          type="text"
                          className="form-control lg:col-span-2"
                          placeholder="Country"
                          value={address.country}
                          onChange={(e) => setAddress({ ...address, country: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Education Section */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-defaulttextcolor">Education</h3>
                      <button
                        type="button"
                        onClick={addEducation}
                        className="ti-btn ti-btn-primary"
                      >
                        <i className="ri-add-line me-1"></i>Add Education
                      </button>
                    </div>

                    {education.length === 0 ? (
                      <p className="text-defaulttextcolor/70 text-sm mb-4">No education entries added.</p>
                    ) : (
                      <div className="space-y-4">
                        {education.map((edu, index) => (
                          <div key={index} className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-medium text-defaulttextcolor">Education Entry {index + 1}</h4>
                              <button
                                type="button"
                                onClick={() => removeEducation(index)}
                                className="ti-btn ti-btn-sm ti-btn-danger"
                              >
                                <i className="ri-delete-bin-line"></i>
                              </button>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Degree"
                                value={edu.degree || ''}
                                onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                              />
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Institution"
                                value={edu.institution || ''}
                                onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                              />
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Field of Study"
                                value={edu.fieldOfStudy || ''}
                                onChange={(e) => updateEducation(index, 'fieldOfStudy', e.target.value)}
                              />
                              <input
                                type="date"
                                className="form-control"
                                placeholder="Start Date"
                                value={edu.startDate || ''}
                                onChange={(e) => updateEducation(index, 'startDate', e.target.value)}
                              />
                              <div className="flex items-center gap-2">
                                <input
                                  type="date"
                                  className="form-control"
                                  placeholder="End Date"
                                  value={edu.endDate || ''}
                                  onChange={(e) => updateEducation(index, 'endDate', e.target.value)}
                                  disabled={edu.isCurrent}
                                />
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={edu.isCurrent || false}
                                    onChange={(e) => {
                                      updateEducation(index, 'isCurrent', e.target.checked)
                                      if (e.target.checked) {
                                        updateEducation(index, 'endDate', null)
                                      }
                                    }}
                                    className="form-check-input"
                                  />
                                  <span className="text-sm text-defaulttextcolor">Current</span>
                                </label>
                              </div>
                              <textarea
                                className="form-control lg:col-span-2"
                                placeholder="Description"
                                rows={3}
                                value={edu.description || ''}
                                onChange={(e) => updateEducation(index, 'description', e.target.value)}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Experience Section */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-defaulttextcolor">Work Experience</h3>
                      <button
                        type="button"
                        onClick={addExperience}
                        className="ti-btn ti-btn-primary"
                      >
                        <i className="ri-add-line me-1"></i>Add Experience
                      </button>
                    </div>

                    {experience.length === 0 ? (
                      <p className="text-defaulttextcolor/70 text-sm mb-4">No experience entries added.</p>
                    ) : (
                      <div className="space-y-4">
                        {experience.map((exp, index) => (
                          <div key={index} className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-medium text-defaulttextcolor">Experience Entry {index + 1}</h4>
                              <button
                                type="button"
                                onClick={() => removeExperience(index)}
                                className="ti-btn ti-btn-sm ti-btn-danger"
                              >
                                <i className="ri-delete-bin-line"></i>
                              </button>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Job Title"
                                value={exp.title || ''}
                                onChange={(e) => updateExperience(index, 'title', e.target.value)}
                              />
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Company"
                                value={exp.company || ''}
                                onChange={(e) => updateExperience(index, 'company', e.target.value)}
                              />
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Location"
                                value={exp.location || ''}
                                onChange={(e) => updateExperience(index, 'location', e.target.value)}
                              />
                              <input
                                type="date"
                                className="form-control"
                                placeholder="Start Date"
                                value={exp.startDate || ''}
                                onChange={(e) => updateExperience(index, 'startDate', e.target.value)}
                              />
                              <div className="flex items-center gap-2">
                                <input
                                  type="date"
                                  className="form-control"
                                  placeholder="End Date"
                                  value={exp.endDate || ''}
                                  onChange={(e) => updateExperience(index, 'endDate', e.target.value)}
                                  disabled={exp.isCurrent}
                                />
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={exp.isCurrent || false}
                                    onChange={(e) => {
                                      updateExperience(index, 'isCurrent', e.target.checked)
                                      if (e.target.checked) {
                                        updateExperience(index, 'endDate', null)
                                      }
                                    }}
                                    className="form-check-input"
                                  />
                                  <span className="text-sm text-defaulttextcolor">Current</span>
                                </label>
                              </div>
                              <textarea
                                className="form-control lg:col-span-2"
                                placeholder="Description"
                                rows={3}
                                value={exp.description || ''}
                                onChange={(e) => updateExperience(index, 'description', e.target.value)}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Skills Section */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4 text-defaulttextcolor">Skills</h3>
                    <div className="mb-4">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Add a skill and press Enter"
                          value={currentSkill}
                          onChange={(e) => setCurrentSkill(e.target.value)}
                          onKeyPress={handleSkillKeyPress}
                        />
                        <button
                          type="button"
                          onClick={handleAddSkill}
                          className="ti-btn ti-btn-primary"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                    {skills.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {skills.map((skill, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                          >
                            {skill}
                            <button
                              type="button"
                              onClick={() => handleRemoveSkill(skill)}
                              className="hover:text-danger"
                            >
                              <i className="ri-close-line"></i>
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-defaulttextcolor/70 text-sm">No skills added.</p>
                    )}
                  </div>

                  {/* Documents Section */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-defaulttextcolor">Documents</h3>
                      <button
                        type="button"
                        onClick={addDocument}
                        className="ti-btn ti-btn-primary"
                      >
                        <i className="ri-add-line me-1"></i>Add Document
                      </button>
                    </div>

                    {documents.length === 0 ? (
                      <p className="text-defaulttextcolor/70 text-sm mb-4">No documents added.</p>
                    ) : (
                      <div className="space-y-4">
                        {documents.map((doc, index) => (
                          <div key={index} className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-medium text-defaulttextcolor">Document {index + 1}</h4>
                              <button
                                type="button"
                                onClick={() => removeDocument(index)}
                                className="ti-btn ti-btn-sm ti-btn-danger"
                              >
                                <i className="ri-delete-bin-line"></i>
                              </button>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Document Name *"
                                value={doc.name}
                                onChange={(e) => updateDocument(index, 'name', e.target.value)}
                                required
                              />
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Document Type * (e.g., resume, certificate, transcript)"
                                value={doc.type}
                                onChange={(e) => updateDocument(index, 'type', e.target.value)}
                                required
                              />
                              <input
                                type="url"
                                className="form-control lg:col-span-2"
                                placeholder="File URL (optional)"
                                value={doc.fileUrl || ''}
                                onChange={(e) => updateDocument(index, 'fileUrl', e.target.value)}
                              />
                              <input
                                type="text"
                                className="form-control lg:col-span-2"
                                placeholder="File Key / S3 Key (optional)"
                                value={doc.fileKey || ''}
                                onChange={(e) => updateDocument(index, 'fileKey', e.target.value)}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Additional Information Section */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4 text-defaulttextcolor">Additional Information</h3>
                    
                    {/* Bio */}
                    <div className="mb-6">
                      <label htmlFor="student-bio" className="form-label">
                        Bio
                      </label>
                      <textarea
                        id="student-bio"
                        className="form-control"
                        placeholder="Write a brief bio about the student..."
                        rows={5}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      className="ti-btn ti-btn-primary"
                      disabled={loading}
                    >
                      {loading ? 'Updating...' : 'Update Student'}
                    </button>
                    <Link href="/training/students/" className="ti-btn ti-btn-light">
                      Cancel
                    </Link>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  )
}

export default EditStudentClient
