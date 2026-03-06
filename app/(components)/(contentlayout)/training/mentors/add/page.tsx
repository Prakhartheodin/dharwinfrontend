"use client"

import React, { Fragment, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Seo from '@/shared/layout-components/seo/seo'
import Swal from 'sweetalert2'
import { AxiosError } from 'axios'
import * as authApi from '@/shared/lib/api/auth'
import type { RegisterMentorPayload } from '@/shared/lib/api/auth'

const PASSWORD_MIN_LENGTH = 8

function getErrorMessage(err: any): string {
  if (err instanceof AxiosError) {
    const msg = err.response?.data?.message
    if (typeof msg === 'string') return msg
    const code = err.response?.data?.code
    if (code === 400 && msg) return String(msg)
  }
  return 'Failed to create mentor.'
}

const AddMentor = () => {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()

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

    setLoading(true)

    try {
      // Use registerMentor API which creates User + Mentor profile automatically
      // Mentor role is automatically assigned by the backend
      await authApi.registerMentor({
        name: trimmedName,
        email: trimmedEmail,
        password,
        // Admin registration: isEmailVerified will be true (handled by backend when auth token is present)
        // No need to pass roleIds - Mentor role is automatically assigned
      })

      await Swal.fire({
        icon: 'success',
        title: 'Mentor created',
        text: `The mentor "${trimmedName}" has been created successfully.`,
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
        title: 'Failed to create mentor',
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
      <Seo title="Add Mentor" />
      
      <div className="container w-full max-w-full mx-auto">
        <div className="grid grid-cols-12 gap-6">
          <div className="xl:col-span-12 col-span-12">
            <div className="box">
              <div className="box-header flex items-center justify-between flex-wrap gap-4">
                <div className="box-title">Add Mentor</div>
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

                  {/* Email */}
                  <div className="mb-6">
                    <label htmlFor="mentor-email" className="form-label">
                      Email <span className="text-danger">*</span>
                    </label>
                    <input
                      id="mentor-email"
                      type="email"
                      className="form-control"
                      placeholder="e.g. jane.doe@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>

                  {/* Roles - Disabled with Mentor role selected */}
                  <div className="mb-6">
                    <label className="form-label">Roles</label>
                    <div className="form-control border flex items-center justify-between gap-2 text-start min-h-[2.375rem] bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-75">
                      <span>Mentor</span>
                      <i className="ri-arrow-down-s-line text-[1.25rem] shrink-0" />
                    </div>
                    <p className="text-[0.75rem] text-defaulttextcolor/70 mt-1 mb-0">
                      Mentor role is automatically assigned when creating a mentor account.
                    </p>
                  </div>

                  {/* Password */}
                  <div className="mb-6">
                    <label htmlFor="mentor-password" className="form-label">
                      Password <span className="text-danger">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="mentor-password"
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
                  <div className="mb-6">
                    <label htmlFor="mentor-confirm-password" className="form-label">
                      Confirm Password <span className="text-danger">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="mentor-confirm-password"
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

                  {/* Form Actions */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      className="ti-btn ti-btn-primary"
                      disabled={loading}
                    >
                      {loading ? 'Adding...' : 'Add Mentor'}
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

export default AddMentor
