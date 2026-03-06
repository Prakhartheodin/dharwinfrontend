"use client"

import React, { Fragment, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Seo from '@/shared/layout-components/seo/seo'
import Swal from 'sweetalert2'
import { AxiosError } from 'axios'
import * as mentorsApi from '@/shared/lib/api/mentors'
import * as usersApi from '@/shared/lib/api/users'
import type { Mentor, MentorExpertise, MentorExperience, MentorAddress, MentorCertification } from '@/shared/lib/api/mentors'

function getErrorMessage(err: any): string {
  if (err instanceof AxiosError) {
    const msg = err.response?.data?.message
    if (typeof msg === 'string') return msg
    const code = err.response?.data?.code
    if (code === 400 && msg) return String(msg)
  }
  return 'Failed to update mentor.'
}

const EditMentorClient = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mentorId = searchParams.get('id') ?? ''

  // User fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  // Mentor profile fields
  const [phone, setPhone] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('')
  const [address, setAddress] = useState<MentorAddress>({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
  })
  const [expertise, setExpertise] = useState<MentorExpertise[]>([])
  const [experience, setExperience] = useState<MentorExperience[]>([])
  const [certifications, setCertifications] = useState<MentorCertification[]>([])
  const [skills, setSkills] = useState<string[]>([])
  const [currentSkill, setCurrentSkill] = useState('')
  const [bio, setBio] = useState('')
  const [status, setStatus] = useState<string>('active')

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState<string>('')

  // Fetch mentor data
  useEffect(() => {
    if (!mentorId) {
      router.replace('/training/mentors/')
      return
    }

    let cancelled = false
    ;(async () => {
      setFetching(true)
      setError('')
      try {
        const mentor = await mentorsApi.getMentor(mentorId)
        if (cancelled) return

        // Set user ID for updating user name
        setUserId(mentor.user?.id ?? '')

        // Set user fields
        setName(mentor.user?.name ?? '')
        setEmail(mentor.user?.email ?? '')

        // Set mentor profile fields
        setPhone(mentor.phone ?? '')
        setDateOfBirth(mentor.dateOfBirth ? new Date(mentor.dateOfBirth).toISOString().split('T')[0] : '')
        setGender((mentor.gender as 'male' | 'female' | 'other') ?? '')
        setAddress({
          street: mentor.address?.street ?? '',
          city: mentor.address?.city ?? '',
          state: mentor.address?.state ?? '',
          zipCode: mentor.address?.zipCode ?? '',
          country: mentor.address?.country ?? '',
        })
        setExpertise(mentor.expertise ?? [])
        setExperience(mentor.experience ?? [])
        setCertifications(mentor.certifications ?? [])
        setSkills(mentor.skills ?? [])
        setBio(mentor.bio ?? '')
        setStatus(mentor.status ?? 'active')
      } catch (err) {
        if (cancelled) return
        const msg = getErrorMessage(err)
        setError(msg)
        await Swal.fire({
          icon: 'error',
          title: 'Failed to load mentor',
          text: msg,
          toast: true,
          position: 'top-end',
          timer: 4000,
          showConfirmButton: false,
          timerProgressBar: true,
        })
        router.replace('/training/mentors/')
      } finally {
        if (!cancelled) {
          setFetching(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [mentorId, router])

  const addExpertise = () => {
    setExpertise([
      ...expertise,
      {
        area: '',
        level: '',
        yearsOfExperience: undefined,
        description: '',
      },
    ])
  }

  const removeExpertise = (index: number) => {
    setExpertise(expertise.filter((_, i) => i !== index))
  }

  const updateExpertise = (index: number, field: keyof MentorExpertise, value: any) => {
    const updated = [...expertise]
    updated[index] = { ...updated[index], [field]: value }
    setExpertise(updated)
  }

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

  const updateExperience = (index: number, field: keyof MentorExperience, value: any) => {
    const updated = [...experience]
    updated[index] = { ...updated[index], [field]: value }
    setExperience(updated)
  }

  const addCertification = () => {
    setCertifications([
      ...certifications,
      {
        name: '',
        issuer: '',
        issueDate: '',
        expiryDate: '',
        credentialId: '',
        credentialUrl: '',
      },
    ])
  }

  const removeCertification = (index: number) => {
    setCertifications(certifications.filter((_, i) => i !== index))
  }

  const updateCertification = (index: number, field: keyof MentorCertification, value: any) => {
    const updated = [...certifications]
    updated[index] = { ...updated[index], [field]: value }
    setCertifications(updated)
  }

  const addSkill = () => {
    if (currentSkill.trim() && !skills.includes(currentSkill.trim())) {
      setSkills([...skills, currentSkill.trim()])
      setCurrentSkill('')
    }
  }

  const removeSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index))
  }

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

      // Prepare expertise array
      const expertiseArray = expertise.map((exp) => ({
        ...exp,
        yearsOfExperience: exp.yearsOfExperience || undefined,
      }))

      // Prepare experience array with proper date formatting
      const experienceArray = experience.map((exp) => ({
        ...exp,
        startDate: exp.startDate || undefined,
        endDate: exp.isCurrent ? null : (exp.endDate || undefined),
        isCurrent: exp.isCurrent || false,
      }))

      // Prepare certifications array
      const certificationsArray = certifications.map((cert) => ({
        name: cert.name,
        issuer: cert.issuer,
        ...(cert.issueDate && { issueDate: cert.issueDate }),
        ...(cert.expiryDate && { expiryDate: cert.expiryDate }),
        ...(cert.credentialId && { credentialId: cert.credentialId }),
        ...(cert.credentialUrl && { credentialUrl: cert.credentialUrl }),
      }))

      // Prepare address (only include if at least one field is filled)
      const addressData: MentorAddress | undefined =
        address.street || address.city || address.state || address.zipCode || address.country
          ? {
              ...(address.street && { street: address.street }),
              ...(address.city && { city: address.city }),
              ...(address.state && { state: address.state }),
              ...(address.zipCode && { zipCode: address.zipCode }),
              ...(address.country && { country: address.country }),
            }
          : undefined

      // Update mentor profile
      await mentorsApi.updateMentor(mentorId, {
        ...(phone && { phone }),
        ...(dateOfBirth && { dateOfBirth }),
        ...(gender && { gender }),
        ...(addressData && { address: addressData }),
        ...(expertiseArray.length > 0 && { expertise: expertiseArray }),
        ...(experienceArray.length > 0 && { experience: experienceArray }),
        ...(certificationsArray.length > 0 && { certifications: certificationsArray }),
        ...(skills.length > 0 && { skills }),
        ...(bio && { bio }),
        status,
      })

      await Swal.fire({
        icon: 'success',
        title: 'Mentor updated',
        text: `The mentor "${trimmedName}" has been updated successfully.`,
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false,
        timerProgressBar: true,
      })

      router.push('/training/mentors/')
    } catch (err) {
      const msg = getErrorMessage(err)
      setError(msg)
      await Swal.fire({
        icon: 'error',
        title: 'Failed to update mentor',
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

  if (!mentorId) {
    return (
      <Fragment>
        <Seo title="Edit Mentor" />
        <div className="container w-full max-w-full mx-auto">
          <div className="box">
            <div className="box-body py-12 text-center text-defaulttextcolor/70">Missing mentor ID. Redirecting...</div>
          </div>
        </div>
      </Fragment>
    )
  }

  if (fetching && !name && !email) {
    return (
      <Fragment>
        <Seo title="Edit Mentor" />
        <div className="container w-full max-w-full mx-auto">
          <div className="box">
            <div className="box-body py-12 text-center text-defaulttextcolor/70">Loading mentor...</div>
          </div>
        </div>
      </Fragment>
    )
  }

  return (
    <Fragment>
      <Seo title="Edit Mentor" />
      
      <div className="container w-full max-w-full mx-auto">
        <div className="grid grid-cols-12 gap-6">
          <div className="xl:col-span-12 col-span-12">
            <div className="box">
              <div className="box-header flex items-center justify-between flex-wrap gap-4">
                <div className="box-title">Edit Mentor</div>
                <Link href="/training/mentors/" className="ti-btn ti-btn-light !py-1 !px-2 !text-[0.75rem]">
                  <i className="ri-arrow-left-line me-1"></i>Back to Mentors
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
                      <label htmlFor="mentor-name" className="form-label">
                        Full Name <span className="text-danger">*</span>
                      </label>
                      <input
                        id="mentor-name"
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
                      <label htmlFor="mentor-email" className="form-label">
                        Email
                      </label>
                      <input
                        id="mentor-email"
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
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="mentor-phone" className="form-label">
                          Phone
                        </label>
                        <input
                          id="mentor-phone"
                          type="tel"
                          className="form-control"
                          placeholder="e.g. +1234567890"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                        />
                      </div>
                      <div>
                        <label htmlFor="mentor-date-of-birth" className="form-label">
                          Date of Birth
                        </label>
                        <input
                          id="mentor-date-of-birth"
                          type="date"
                          className="form-control"
                          value={dateOfBirth}
                          onChange={(e) => setDateOfBirth(e.target.value)}
                        />
                      </div>
                      <div>
                        <label htmlFor="mentor-gender" className="form-label">
                          Gender
                        </label>
                        <select
                          id="mentor-gender"
                          className="form-control"
                          value={gender}
                          onChange={(e) => setGender(e.target.value as 'male' | 'female' | 'other' | '')}
                        >
                          <option value="">Select gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="mentor-status" className="form-label">
                          Status
                        </label>
                        <select
                          id="mentor-status"
                          className="form-control"
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Address Section */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4 text-defaulttextcolor">Address</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <input
                        type="text"
                        className="form-control lg:col-span-2"
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

                  {/* Expertise Section */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-defaulttextcolor">Expertise</h3>
                      <button
                        type="button"
                        onClick={addExpertise}
                        className="ti-btn ti-btn-primary"
                      >
                        <i className="ri-add-line me-1"></i>Add Expertise
                      </button>
                    </div>

                    {expertise.length === 0 ? (
                      <p className="text-defaulttextcolor/70 text-sm mb-4">No expertise entries added.</p>
                    ) : (
                      <div className="space-y-4">
                        {expertise.map((exp, index) => (
                          <div key={index} className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-medium text-defaulttextcolor">Expertise Entry {index + 1}</h4>
                              <button
                                type="button"
                                onClick={() => removeExpertise(index)}
                                className="ti-btn ti-btn-sm ti-btn-danger"
                              >
                                <i className="ri-delete-bin-line"></i>
                              </button>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Area (e.g., Software Development)"
                                value={exp.area || ''}
                                onChange={(e) => updateExpertise(index, 'area', e.target.value)}
                              />
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Level (e.g., Expert, Advanced)"
                                value={exp.level || ''}
                                onChange={(e) => updateExpertise(index, 'level', e.target.value)}
                              />
                              <input
                                type="number"
                                className="form-control"
                                placeholder="Years of Experience"
                                value={exp.yearsOfExperience || ''}
                                onChange={(e) => updateExpertise(index, 'yearsOfExperience', e.target.value ? parseInt(e.target.value) : undefined)}
                              />
                              <textarea
                                className="form-control lg:col-span-2"
                                placeholder="Description"
                                rows={3}
                                value={exp.description || ''}
                                onChange={(e) => updateExpertise(index, 'description', e.target.value)}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Work Experience Section */}
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

                  {/* Certifications Section */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-defaulttextcolor">Certifications</h3>
                      <button
                        type="button"
                        onClick={addCertification}
                        className="ti-btn ti-btn-primary"
                      >
                        <i className="ri-add-line me-1"></i>Add Certification
                      </button>
                    </div>

                    {certifications.length === 0 ? (
                      <p className="text-defaulttextcolor/70 text-sm mb-4">No certifications added.</p>
                    ) : (
                      <div className="space-y-4">
                        {certifications.map((cert, index) => (
                          <div key={index} className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-medium text-defaulttextcolor">Certification {index + 1}</h4>
                              <button
                                type="button"
                                onClick={() => removeCertification(index)}
                                className="ti-btn ti-btn-sm ti-btn-danger"
                              >
                                <i className="ri-delete-bin-line"></i>
                              </button>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Certification Name *"
                                value={cert.name}
                                onChange={(e) => updateCertification(index, 'name', e.target.value)}
                                required
                              />
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Issuing Organization *"
                                value={cert.issuer}
                                onChange={(e) => updateCertification(index, 'issuer', e.target.value)}
                                required
                              />
                              <input
                                type="date"
                                className="form-control"
                                placeholder="Issue Date"
                                value={cert.issueDate || ''}
                                onChange={(e) => updateCertification(index, 'issueDate', e.target.value)}
                              />
                              <input
                                type="date"
                                className="form-control"
                                placeholder="Expiry Date"
                                value={cert.expiryDate || ''}
                                onChange={(e) => updateCertification(index, 'expiryDate', e.target.value)}
                              />
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Credential ID"
                                value={cert.credentialId || ''}
                                onChange={(e) => updateCertification(index, 'credentialId', e.target.value)}
                              />
                              <input
                                type="url"
                                className="form-control"
                                placeholder="Credential URL"
                                value={cert.credentialUrl || ''}
                                onChange={(e) => updateCertification(index, 'credentialUrl', e.target.value)}
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
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Add a skill"
                        value={currentSkill}
                        onChange={(e) => setCurrentSkill(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addSkill()
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={addSkill}
                        className="ti-btn ti-btn-primary"
                      >
                        <i className="ri-add-line me-1"></i>Add
                      </button>
                    </div>
                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {skills.map((skill, index) => (
                          <span
                            key={index}
                            className="badge bg-primary/10 text-primary border border-primary/30 px-3 py-1 rounded-md text-sm font-medium flex items-center gap-2"
                          >
                            {skill}
                            <button
                              type="button"
                              onClick={() => removeSkill(index)}
                              className="text-primary hover:text-primary/70"
                            >
                              <i className="ri-close-line"></i>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bio Section */}
                  <div className="mb-8">
                    <label htmlFor="mentor-bio" className="form-label">
                      Bio
                    </label>
                    <textarea
                      id="mentor-bio"
                      className="form-control"
                      placeholder="Enter mentor biography..."
                      rows={5}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                    />
                  </div>

                  {/* Form Actions */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      className="ti-btn ti-btn-primary"
                      disabled={loading}
                    >
                      {loading ? 'Updating...' : 'Update Mentor'}
                    </button>
                    <Link href="/training/mentors/" className="ti-btn ti-btn-light">
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

export default EditMentorClient
