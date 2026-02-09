"use client"

import React, { Fragment, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Seo from '@/shared/layout-components/seo/seo'
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Swal from 'sweetalert2'

const PASSWORD_MIN_LENGTH = 8

const AddStudent = () => {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [phone, setPhone] = useState('')
  const [education, setEducation] = useState('')
  const [experience, setExperience] = useState<number>(0)
  const [bio, setBio] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [currentSkill, setCurrentSkill] = useState('')
  const [displayPicture, setDisplayPicture] = useState<string>('')
  const [displayPictureFile, setDisplayPictureFile] = useState<File | null>(null)
  const [displayPicturePreview, setDisplayPicturePreview] = useState<string>('')
  const [displayPictureDragOver, setDisplayPictureDragOver] = useState(false)
  const displayPictureInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAddSkill = () => {
    const trimmedSkill = currentSkill.trim()
    if (trimmedSkill && !skills.includes(trimmedSkill)) {
      setSkills([...skills, trimmedSkill])
      setCurrentSkill('')
    }
  }

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove))
  }

  const handleSkillKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddSkill()
    }
  }

  const processDisplayPictureFile = (file: File | null) => {
    if (!file || !file.type.startsWith('image/')) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid file',
        text: 'Please select an image file.',
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
      return
    }
    setDisplayPictureFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setDisplayPicturePreview(reader.result as string)
      setDisplayPicture(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleDisplayPictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processDisplayPictureFile(e.target.files?.[0] ?? null)
    e.target.value = ''
  }

  const handleDisplayPictureDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDisplayPictureDragOver(false)
    processDisplayPictureFile(e.dataTransfer.files?.[0] ?? null)
  }

  const handleDisplayPictureDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDisplayPictureDragOver(true)
  }

  const handleDisplayPictureDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDisplayPictureDragOver(false)
  }

  const handleDisplayPictureRemove = () => {
    setDisplayPictureFile(null)
    setDisplayPicturePreview('')
    setDisplayPicture('')
    if (displayPictureInputRef.current) displayPictureInputRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedPhone = phone.trim()
    const trimmedEducation = education.trim()
    const trimmedBio = bio.trim()

    if (!trimmedName) {
      setError('Name is required.')
      return
    }
    if (!trimmedEmail) {
      setError('Email is required.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address.')
      return
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      setError('Password must contain at least 1 letter and 1 number.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!trimmedPhone) {
      setError('Phone number is required.')
      return
    }
    if (!trimmedEducation) {
      setError('Education is required.')
      return
    }
    if (skills.length === 0) {
      setError('Please add at least one skill.')
      return
    }

    setLoading(true)

    try {
      // Simulate API call - in real app, this would call the API
      await new Promise(resolve => setTimeout(resolve, 1000))

      // For static implementation, we'll just show success and redirect
      await Swal.fire({
        icon: 'success',
        title: 'Student created',
        text: `The student "${trimmedName}" has been created successfully.`,
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false,
        timerProgressBar: true,
      })

      router.push('/training/students')
    } catch (err: any) {
      const msg = err?.message || 'Failed to create student.'
      setError(msg)
      await Swal.fire({
        icon: 'error',
        title: 'Failed to create student',
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

  return (
    <Fragment>
      <Seo title="Add Student" />
      
      <div className="container w-full max-w-full mx-auto">
        <div className="grid grid-cols-12 gap-6">
          <div className="xl:col-span-12 col-span-12">
            <div className="box">
              <div className="box-header flex items-center justify-between flex-wrap gap-4">
                <div className="box-title">Add Student</div>
                <Link href="/training/students" className="ti-btn ti-btn-light !py-1 !px-2 !text-[0.75rem]">
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

                  {/* Display Picture Upload */}
                  <div className="mb-6">
                    <label className="form-label">Profile Picture</label>
                    <div className="flex flex-col items-start gap-4">
                      {displayPicturePreview ? (
                        <div className="relative">
                          <img
                            src={displayPicturePreview}
                            alt="Preview"
                            className="w-32 h-32 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                          />
                          <button
                            type="button"
                            onClick={handleDisplayPictureRemove}
                            className="absolute -top-2 -right-2 ti-btn ti-btn-icon ti-btn-sm ti-btn-danger rounded-full"
                            title="Remove image"
                          >
                            <i className="ri-close-line"></i>
                          </button>
                        </div>
                      ) : (
                        <div
                          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                            displayPictureDragOver
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-300 dark:border-gray-600 hover:border-primary/50'
                          }`}
                          onDrop={handleDisplayPictureDrop}
                          onDragOver={handleDisplayPictureDragOver}
                          onDragLeave={handleDisplayPictureDragLeave}
                          onClick={() => displayPictureInputRef.current?.click()}
                        >
                          <i className="ri-image-add-line text-4xl text-gray-400 dark:text-gray-500 mb-2"></i>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Drag and drop an image here, or click to select
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            PNG, JPG, GIF up to 5MB
                          </p>
                        </div>
                      )}
                      <input
                        ref={displayPictureInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleDisplayPictureChange}
                        className="hidden"
                      />
                      {!displayPicturePreview && (
                        <button
                          type="button"
                          onClick={() => displayPictureInputRef.current?.click()}
                          className="ti-btn ti-btn-light"
                        >
                          <i className="ri-upload-line me-1"></i>Upload Image
                        </button>
                      )}
                    </div>
                    <p className="text-[0.75rem] text-defaulttextcolor/70 mt-1 mb-0">
                      Optional. Upload a profile picture for the student.
                    </p>
                  </div>

                  {/* Name and Email - 2 columns on large screens */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                    {/* Name */}
                    <div>
                      <label htmlFor="student-name" className="form-label">
                        Full Name <span className="text-danger">*</span>
                      </label>
                      <input
                        id="student-name"
                        type="text"
                        className="form-control"
                        placeholder="e.g. John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="student-email" className="form-label">
                        Email <span className="text-danger">*</span>
                      </label>
                      <input
                        id="student-email"
                        type="email"
                        className="form-control"
                        placeholder="e.g. john.doe@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Password and Confirm Password - 2 columns on large screens */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                    {/* Password */}
                    <div>
                      <label htmlFor="student-password" className="form-label">
                        Password <span className="text-danger">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="student-password"
                          type={showPassword ? 'text' : 'password'}
                          className="form-control pe-10"
                          placeholder="Min 8 characters, at least 1 letter and 1 number"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete="new-password"
                          minLength={PASSWORD_MIN_LENGTH}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute top-1/2 -translate-y-1/2 end-3 p-1 text-defaulttextcolor/70 hover:text-defaulttextcolor"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          <i className={showPassword ? 'ri-eye-off-line text-[1.25rem]' : 'ri-eye-line text-[1.25rem]'} />
                        </button>
                      </div>
                      <p className="text-[0.75rem] text-defaulttextcolor/70 mt-1 mb-0">
                        Minimum 8 characters; must contain at least 1 letter and 1 number.
                      </p>
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label htmlFor="student-confirm-password" className="form-label">
                        Confirm Password <span className="text-danger">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="student-confirm-password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          className="form-control pe-10"
                          placeholder="Re-enter password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          autoComplete="new-password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          className="absolute top-1/2 -translate-y-1/2 end-3 p-1 text-defaulttextcolor/70 hover:text-defaulttextcolor"
                          aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                        >
                          <i className={showConfirmPassword ? 'ri-eye-off-line text-[1.25rem]' : 'ri-eye-line text-[1.25rem]'} />
                        </button>
                      </div>
                      <p className="text-[0.75rem] text-defaulttextcolor/70 mt-1 mb-0">
                        Must match the password above.
                      </p>
                    </div>
                  </div>

                  {/* Phone and Education - 2 columns on large screens */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                    {/* Phone */}
                    <div>
                      <label htmlFor="student-phone" className="form-label">
                        Phone Number <span className="text-danger">*</span>
                      </label>
                      <input
                        id="student-phone"
                        type="tel"
                        className="form-control"
                        placeholder="e.g. +1 (555) 123-4567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                      />
                    </div>

                    {/* Education */}
                    <div>
                      <label htmlFor="student-education" className="form-label">
                        Education <span className="text-danger">*</span>
                      </label>
                      <input
                        id="student-education"
                        type="text"
                        className="form-control"
                        placeholder="e.g. BS Computer Science - Stanford University (2018)"
                        value={education}
                        onChange={(e) => setEducation(e.target.value)}
                        required
                      />
                      <p className="text-[0.75rem] text-defaulttextcolor/70 mt-1 mb-0">
                        Format: Degree - University (Year)
                      </p>
                    </div>
                  </div>

                  {/* Experience */}
                  <div className="mb-6">
                    <label htmlFor="student-experience" className="form-label">
                      Work Experience (Years)
                    </label>
                    <input
                      id="student-experience"
                      type="number"
                      className="form-control"
                      placeholder="e.g. 5"
                      value={experience}
                      onChange={(e) => setExperience(Number(e.target.value) || 0)}
                      min="0"
                      step="1"
                    />
                    <p className="text-[0.75rem] text-defaulttextcolor/70 mt-1 mb-0">
                      Optional. Number of years of work experience.
                    </p>
                  </div>

                  {/* Skills */}
                  <div className="mb-6">
                    <label className="form-label">
                      Skills <span className="text-danger">*</span>
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Enter a skill and press Enter"
                        value={currentSkill}
                        onChange={(e) => setCurrentSkill(e.target.value)}
                        onKeyPress={handleSkillKeyPress}
                      />
                      <button
                        type="button"
                        onClick={handleAddSkill}
                        className="ti-btn ti-btn-primary"
                        disabled={!currentSkill.trim()}
                      >
                        <i className="ri-add-line"></i>Add
                      </button>
                    </div>
                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {skills.map((skill, index) => (
                          <span
                            key={index}
                            className="badge bg-primary/10 text-primary border border-primary/30 px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2"
                          >
                            {skill}
                            <button
                              type="button"
                              onClick={() => handleRemoveSkill(skill)}
                              className="hover:text-primary-hover hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                              aria-label={`Remove ${skill}`}
                            >
                              <i className="ri-close-line text-xs"></i>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-[0.75rem] text-defaulttextcolor/70 mt-1 mb-0">
                      Add at least one skill. Press Enter or click Add to add a skill.
                    </p>
                  </div>

                  {/* Bio */}
                  <div className="mb-6">
                    <label htmlFor="student-bio" className="form-label">
                      Bio
                    </label>
                    <textarea
                      id="student-bio"
                      className="form-control"
                      rows={5}
                      placeholder="Enter a brief bio about the student..."
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                    />
                    <p className="text-[0.75rem] text-defaulttextcolor/70 mt-1 mb-0">
                      Optional. A brief description of the student's background and experience.
                    </p>
                  </div>

                  {/* Form Actions */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      className="ti-btn ti-btn-primary"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Creating...
                        </>
                      ) : (
                        <>
                          <i className="ri-add-line me-1"></i>Create Student
                        </>
                      )}
                    </button>
                    <Link href="/training/students" className="ti-btn ti-btn-light">
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

export default AddStudent
