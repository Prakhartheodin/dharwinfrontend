"use client"
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { useTable, useSortBy, useGlobalFilter, usePagination } from 'react-table'
import Link from 'next/link'
import { Range, getTrackBackground } from "react-range"
import Swal from 'sweetalert2'
import { AxiosError } from 'axios'
import * as studentsApi from '@/shared/lib/api/students'
import type { Student } from '@/shared/lib/api/students'

// Mock data for students
const STUDENTS_DATA = [
  {
    id: '1',
    name: 'Alex Thompson',
    displayPicture: '/assets/images/faces/1.jpg',
    phone: '+1 (555) 123-4567',
    email: 'alex.thompson@example.com',
    skills: ['React', 'Node.js', 'TypeScript', 'AWS', 'MongoDB'],
    education: 'BS Computer Science - Stanford University (2018)',
    experience: 6,
    bio: 'Experienced full-stack developer with 6+ years in building scalable web applications. Passionate about clean code and modern technologies.',
  },
  {
    id: '2',
    name: 'Maria Garcia',
    displayPicture: '/assets/images/faces/2.jpg',
    phone: '+1 (555) 234-5678',
    email: 'maria.garcia@example.com',
    skills: ['Product Management', 'Agile', 'Scrum', 'JIRA', 'Analytics'],
    education: 'MBA - Harvard Business School (2019)',
    experience: 4,
    bio: 'Strategic product manager with 4+ years of experience in building and launching successful products. Strong background in user research and data-driven decision making.',
  },
  {
    id: '3',
    name: 'James Wilson',
    displayPicture: '/assets/images/faces/3.jpg',
    phone: '+1 (555) 345-6789',
    email: 'james.wilson@example.com',
    skills: ['Vue.js', 'JavaScript', 'CSS', 'HTML', 'Responsive Design'],
    education: 'BS Web Development - UC Berkeley (2020)',
    experience: 3,
    bio: 'Creative frontend developer specializing in creating beautiful and intuitive user interfaces. Expert in modern CSS frameworks and responsive design.',
  },
  {
    id: '4',
    name: 'Emma Brown',
    displayPicture: '/assets/images/faces/4.jpg',
    phone: '+1 (555) 456-7890',
    email: 'emma.brown@example.com',
    skills: ['Python', 'Machine Learning', 'TensorFlow', 'SQL', 'Data Visualization'],
    education: 'MS Data Science - MIT (2021)',
    experience: 3,
    bio: 'Data scientist passionate about extracting insights from complex datasets. Experienced in building predictive models and creating data-driven solutions.',
  },
  {
    id: '5',
    name: 'David Lee',
    displayPicture: '/assets/images/faces/5.jpg',
    phone: '+1 (555) 567-8901',
    email: 'david.lee@example.com',
    skills: ['Docker', 'Kubernetes', 'CI/CD', 'AWS', 'Linux'],
    education: 'BS Computer Engineering - Carnegie Mellon (2018)',
    experience: 5,
    bio: 'DevOps engineer with expertise in cloud infrastructure and automation. Passionate about improving deployment pipelines and system reliability.',
  },
  {
    id: '6',
    name: 'Sophia Martinez',
    displayPicture: '/assets/images/faces/6.jpg',
    phone: '+1 (555) 678-9012',
    email: 'sophia.martinez@example.com',
    skills: ['Figma', 'Adobe XD', 'User Research', 'Prototyping', 'UI/UX Design'],
    education: 'BFA Graphic Design - Art Center College (2019)',
    experience: 4,
    bio: 'UX designer focused on creating meaningful user experiences. Strong background in user research, wireframing, and visual design.',
  },
  {
    id: '7',
    name: 'Robert Taylor',
    displayPicture: '/assets/images/faces/7.jpg',
    phone: '+1 (555) 789-0123',
    email: 'robert.taylor@example.com',
    skills: ['Java', 'Spring Boot', 'MySQL', 'Redis', 'Microservices'],
    education: 'BS Software Engineering - Georgia Tech (2017)',
    experience: 6,
    bio: 'Backend developer specializing in building scalable and efficient server-side applications. Expert in RESTful APIs and microservices architecture.',
  },
  {
    id: '8',
    name: 'Jessica White',
    displayPicture: '/assets/images/faces/8.jpg',
    phone: '+1 (555) 890-1234',
    email: 'jessica.white@example.com',
    skills: ['Digital Marketing', 'SEO', 'Content Strategy', 'Analytics', 'Social Media'],
    education: 'BA Marketing - UCLA (2018)',
    experience: 5,
    bio: 'Marketing professional with expertise in digital marketing strategies and brand development. Proven track record of driving growth and engagement.',
  },
  {
    id: '9',
    name: 'Thomas Anderson',
    displayPicture: '/assets/images/faces/9.jpg',
    phone: '+1 (555) 901-2345',
    email: 'thomas.anderson@example.com',
    skills: ['Sales', 'CRM', 'Negotiation', 'Account Management', 'Business Development'],
    education: 'BA Business Administration - USC (2020)',
    experience: 3,
    bio: 'Results-driven sales executive with strong relationship-building skills. Experienced in B2B sales and enterprise account management.',
  },
  {
    id: '10',
    name: 'Jennifer Davis',
    displayPicture: '/assets/images/faces/10.jpg',
    phone: '+1 (555) 012-3456',
    email: 'jennifer.davis@example.com',
    skills: ['Selenium', 'Test Automation', 'QA Testing', 'JIRA', 'API Testing'],
    education: 'BS Computer Science - UC San Diego (2019)',
    experience: 4,
    bio: 'QA engineer dedicated to ensuring software quality through comprehensive testing strategies. Expert in test automation and bug tracking.',
  },
  {
    id: '11',
    name: 'Christopher Moore',
    displayPicture: '/assets/images/faces/11.jpg',
    phone: '+1 (555) 123-4568',
    email: 'christopher.moore@example.com',
    skills: ['React', 'Node.js', 'PostgreSQL', 'GraphQL', 'TypeScript'],
    education: 'BS Computer Science - University of Washington (2018)',
    experience: 5,
    bio: 'Full-stack developer with expertise in modern JavaScript frameworks. Passionate about building complete web applications from frontend to backend.',
  },
  {
    id: '12',
    name: 'Amanda Johnson',
    displayPicture: '/assets/images/faces/12.jpg',
    phone: '+1 (555) 234-5679',
    email: 'amanda.johnson@example.com',
    skills: ['Business Analysis', 'SQL', 'Excel', 'Project Management', 'Process Improvement'],
    education: 'MBA - Northwestern University (2020)',
    experience: 3,
    bio: 'Business analyst with strong analytical skills and experience in process optimization. Focused on driving business value through data insights.',
  },
  {
    id: '13',
    name: 'Daniel Rodriguez',
    displayPicture: '/assets/images/faces/13.jpg',
    phone: '+1 (555) 345-6790',
    email: 'daniel.rodriguez@example.com',
    skills: ['AWS', 'Azure', 'Terraform', 'Cloud Architecture', 'Serverless'],
    education: 'MS Cloud Computing - Arizona State (2019)',
    experience: 4,
    bio: 'Cloud architect specializing in designing and implementing scalable cloud infrastructure solutions. Expert in multi-cloud strategies.',
  },
  {
    id: '14',
    name: 'Rachel Kim',
    displayPicture: '/assets/images/faces/14.jpg',
    phone: '+1 (555) 456-7901',
    email: 'rachel.kim@example.com',
    skills: ['Swift', 'Kotlin', 'React Native', 'iOS Development', 'Android Development'],
    education: 'BS Mobile App Development - San Diego State (2021)',
    experience: 2,
    bio: 'Mobile app developer with expertise in both native and cross-platform development. Passionate about creating smooth mobile experiences.',
  },
  {
    id: '15',
    name: 'Kevin Harris',
    displayPicture: '/assets/images/faces/15.jpg',
    phone: '+1 (555) 567-9012',
    email: 'kevin.harris@example.com',
    skills: ['Network Administration', 'Cisco', 'Firewall', 'VPN', 'System Security'],
    education: 'BS Network Engineering - Tennessee Tech (2018)',
    experience: 5,
    bio: 'Network administrator with extensive experience in managing enterprise network infrastructure and ensuring optimal performance and security.',
  }
]


interface FilterState {
  name: string[]
  skills: string[]
  education: string[]
  email: string
  experience: [number, number] // [min, max] in years
}

// Extract experience ranges to determine min/max for slider
const getExperienceRanges = () => {
  const experiences = STUDENTS_DATA.map(student => student.experience || 0)
  return {
    min: Math.min(...experiences),
    max: Math.max(...experiences)
  }
}

const experienceRangesConst = getExperienceRanges()

// Interface for display purposes (mapped from User)
interface StudentRow {
  id: string
  name: string
  displayPicture: string
  phone: string
  email: string
  skills: string[]
  education: string
  experience: number
  bio: string
}

// Note type for student notes
interface StudentNote {
  id: string
  studentId: string
  note: string
  visibility: 'public' | 'private'
  postedBy: string
  postedDate: string
}

const Students = () => {
  const [students, setStudents] = useState<StudentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [studentNotes, setStudentNotes] = useState<StudentNote[]>([])
  const [previewStudent, setPreviewStudent] = useState<any>(null)
  const [viewStudent, setViewStudent] = useState<studentsApi.Student | null>(null)
  const [viewStudentLoading, setViewStudentLoading] = useState(false)
  const [notesStudentId, setNotesStudentId] = useState<string | null>(null)
  const [newNote, setNewNote] = useState({ text: '', visibility: 'public' as 'public' | 'private' })
  const [shareStudent, setShareStudent] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [showEmailInput, setShowEmailInput] = useState(false)
  const [selectedSort, setSelectedSort] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalResults, setTotalResults] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [sortBy, setSortBy] = useState<string>('createdAt:desc')
  
  const [filters, setFilters] = useState<FilterState>({
    name: [],
    skills: [],
    education: [],
    email: '',
    experience: [experienceRangesConst.min, experienceRangesConst.max]
  })

  // Search states for filter dropdowns
  const [searchName, setSearchName] = useState('')
  const [searchSkills, setSearchSkills] = useState('')
  const [searchEducation, setSearchEducation] = useState('')

  // Handle individual row checkbox
  const handleRowSelect = (id: string) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedRows(newSelected)
  }

  // Handle view student - fetch full details and open modal
  const handleViewStudent = async (studentId: string) => {
    setViewStudentLoading(true)
    try {
      const student = await studentsApi.getStudent(studentId)
      setViewStudent(student)
      // Trigger modal via Preline's trigger button
      setTimeout(() => {
        const trigger = document.getElementById('view-student-modal-trigger')
        if (trigger) {
          trigger.click()
        }
      }, 100)
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to load student details.'
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
      setViewStudentLoading(false)
    }
  }

  // Handle add note - open notes sidebar
  const handleAddNote = (id: string, student?: any) => {
    // Open the notes sidebar
    setNotesStudentId(id)
    
    // Trigger the panel via Preline's trigger button
    setTimeout(() => {
      const trigger = document.getElementById('student-notes-panel-trigger')
      if (trigger) {
        trigger.click()
      }
    }, 100)
  }

  // Get notes for a specific student
  const getStudentNotes = (studentId: string) => {
    return studentNotes.filter(note => note.studentId === studentId).sort((a, b) => 
      new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime()
    )
  }

  // Add a new note
  const handleAddNoteSubmit = () => {
    if (!notesStudentId || !newNote.text.trim()) return
    
    const note: StudentNote = {
      id: `note-${Date.now()}`,
      studentId: notesStudentId,
      note: newNote.text,
      visibility: newNote.visibility,
      postedBy: 'John Doe', // This would come from user context in real app
      postedDate: new Date().toISOString()
    }
    
    setStudentNotes([...studentNotes, note])
    setNewNote({ text: '', visibility: 'public' })
  }

  // Delete a note
  const handleDeleteNote = (noteId: string) => {
    setStudentNotes(studentNotes.filter(note => note.id !== noteId))
  }

  // Helper function to map Student API response to StudentRow format
  const mapStudentToRow = useCallback((student: Student): StudentRow => {
    // Format education from array to string
    const educationStr = student.education && student.education.length > 0
      ? student.education.map(edu => {
          const parts = []
          if (edu.degree) parts.push(edu.degree)
          if (edu.institution) parts.push(edu.institution)
          if (edu.endDate) {
            try {
              const year = new Date(edu.endDate).getFullYear()
              if (!isNaN(year)) {
                parts.push(`(${year})`)
              }
            } catch (e) {
              // Invalid date, skip year
            }
          }
          return parts.join(' - ')
        }).filter(Boolean).join(', ')
      : ''

    // Calculate experience from experience array
    const experienceYears = student.experience && student.experience.length > 0
      ? student.experience.reduce((total, exp) => {
          if (exp.startDate && exp.endDate) {
            try {
              const start = new Date(exp.startDate)
              const end = new Date(exp.endDate)
              if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365)
                return total + Math.max(0, years)
              }
            } catch (e) {
              // Invalid date, skip
            }
          }
          return total
        }, 0)
      : 0

    return {
      id: student.id,
      name: student.user?.name || 'Unknown',
      displayPicture: student.profileImageUrl || '/assets/images/faces/1.jpg',
      phone: student.phone || '',
      email: student.user?.email || '',
      skills: student.skills || [],
      education: educationStr,
      experience: Math.round(experienceYears),
      bio: student.bio || '',
    }
  }, [])

  // Use ref to store fetchStudents to avoid circular dependencies
  const fetchStudentsRef = useRef<() => Promise<void>>()

  // Fetch students from Students API
  const fetchStudents = useCallback(async () => {
    setLoading(true)
    try {
      const params: studentsApi.ListStudentsParams = {
        page: currentPage,
        limit: pageSize,
        sortBy,
        ...(searchQuery.trim() && { search: searchQuery.trim() }),
      }
      
      const response = await studentsApi.listStudents(params)
      
      const mappedStudents = response.results.map(mapStudentToRow)
      setStudents(mappedStudents)
      setTotalResults(response.totalResults)
      setTotalPages(response.totalPages)
    } catch (err) {
      console.error('Error fetching students:', err)
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : err instanceof Error
          ? err.message
          : 'Failed to load students.'
      await Swal.fire({
        icon: 'error',
        title: 'Failed to load students',
        text: msg,
        toast: true,
        position: 'top-end',
        timer: 4000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
      setStudents([])
      setTotalResults(0)
      setTotalPages(0)
    } finally {
      setLoading(false)
    }
  }, [currentPage, pageSize, sortBy, searchQuery, mapStudentToRow])

  // Update ref when fetchStudents changes
  useEffect(() => {
    fetchStudentsRef.current = fetchStudents
  }, [fetchStudents])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  // Delete a single student
  const handleDelete = useCallback(async (id: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
    })

    if (!result.isConfirmed) return

    try {
      await studentsApi.deleteStudent(id)
      await Swal.fire({
        icon: 'success',
        title: 'Deleted!',
        text: 'Student has been deleted.',
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
      setSelectedRows((prev) => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
      // Trigger refetch using ref to avoid circular dependency
      if (fetchStudentsRef.current) {
        await fetchStudentsRef.current()
      }
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to delete student.'
      await Swal.fire({
        icon: 'error',
        title: 'Failed to delete student',
        text: msg,
        toast: true,
        position: 'top-end',
        timer: 4000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
    }
  }, [])

  // Delete selected students
  const handleDeleteSelected = useCallback(async () => {
    if (selectedRows.size === 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'No selection',
        text: 'Please select at least one student to delete.',
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
      return
    }

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `You are about to delete ${selectedRows.size} student(s). This action cannot be undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: `Yes, delete ${selectedRows.size} student(s)!`,
    })

    if (!result.isConfirmed) return

    try {
      await Promise.all(Array.from(selectedRows).map((id) => studentsApi.deleteStudent(id)))
      await Swal.fire({
        icon: 'success',
        title: 'Deleted!',
        text: `${selectedRows.size} student(s) have been deleted.`,
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
      setSelectedRows(new Set())
      // Trigger refetch using ref to avoid circular dependency
      if (fetchStudentsRef.current) {
        await fetchStudentsRef.current()
      }
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to delete students.'
      await Swal.fire({
        icon: 'error',
        title: 'Failed to delete students',
        text: msg,
        toast: true,
        position: 'top-end',
        timer: 4000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
    }
  }, [selectedRows])

  // Get student details for the notes sidebar
  const getStudentDetails = () => {
    if (!notesStudentId) return null
    return students.find(student => student.id === notesStudentId)
  }

  // Generate public URL for student (edit page with query param for static export)
  const getStudentPublicUrl = (studentId: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/training/students/edit/?id=${encodeURIComponent(studentId)}`
    }
    return `https://example.com/training/students/edit/?id=${encodeURIComponent(studentId)}`
  }

  // Export student documents
  const handleExportDocs = (student: any, type: 'all' | 'resume' | 'cover-letter' = 'all') => {
    // TODO: Implement document export functionality
    console.log(`Exporting ${type} for student:`, student.id)
    // Here you would implement the actual export logic based on type
    switch (type) {
      case 'all':
        // Export both resume and cover letter
        console.log('Exporting all documents')
        break
      case 'resume':
        // Export only resume
        console.log('Exporting resume')
        break
      case 'cover-letter':
        // Export only cover letter
        console.log('Exporting cover letter')
        break
    }
  }

  // Copy URL to clipboard
  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Share on WhatsApp
  const handleShareWhatsApp = (student: any) => {
    const url = getStudentPublicUrl(student.id)
    const text = `Check out this student: ${student.name} - ${url}`
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(whatsappUrl, '_blank')
  }

  // Handle email share - show input field
  const handleEmailShareClick = () => {
    setShowEmailInput(true)
  }

  // Handle send email (UI only for now)
  const handleSendEmail = () => {
    if (!shareEmail.trim()) return
    // TODO: Add email sending logic here
    console.log('Sending email to:', shareEmail, 'for student:', shareStudent?.id)
    // Reset after sending
    setShareEmail('')
    setShowEmailInput(false)
  }

  // Handle share button click
  const handleShareClick = (student: any) => {
    setShareStudent(student)
    setShowEmailInput(false)
    setShareEmail('')
    setTimeout(() => {
      const trigger = document.getElementById('share-student-modal-trigger')
      if (trigger) {
        trigger.click()
      }
    }, 100)
  }

  // Define columns
  const columns = useMemo(
    () => [
      {
        Header: 'All',
        accessor: 'checkbox',
        disableSortBy: true,
        Cell: ({ row }: any) => (
          <input
            className="form-check-input"
            type="checkbox"
            checked={selectedRows.has(row.original.id)}
            onChange={() => handleRowSelect(row.original.id)}
            aria-label={`Select ${row.original.name}`}
          />
        ),
      },
      {
        Header: 'Student Info',
        accessor: 'studentInfo',
        Cell: ({ row }: any) => {
          const student = row.original
          return (
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <img
                  src={student.displayPicture || '/assets/images/faces/1.jpg'}
                  alt={student.name}
                  className="w-10 h-10 rounded-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/images/faces/1.jpg'
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div 
                  className="font-semibold text-gray-800 dark:text-white truncate cursor-pointer hover:text-primary"
                  onClick={() => {
                    setPreviewStudent(student)
                    // Trigger the panel via Preline's trigger button
                    setTimeout(() => {
                      const trigger = document.getElementById('student-preview-panel-trigger')
                      if (trigger) {
                        trigger.click()
                      }
                    }, 100)
                  }}
                >
                  {student.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  <div className="flex items-center gap-1">
                    <i className="ri-phone-line"></i>
                    {student.phone}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <i className="ri-mail-line"></i>
                    {student.email}
                  </div>
                </div>
              </div>
            </div>
          )
        },
      },
      {
        Header: 'Skills',
        accessor: 'skills',
        Cell: ({ row }: any) => {
          const student = row.original
          return (
            <div className="flex flex-wrap gap-1.5">
              {student.skills?.slice(0, 3).map((skill: string, index: number) => (
                <span
                  key={index}
                  className="badge bg-primary/10 text-primary border border-primary/30 px-2 py-1 rounded-md text-xs font-medium"
                >
                  {skill}
                </span>
              ))}
              {student.skills?.length > 3 && (
                <span className="badge bg-gray-100 dark:bg-black/20 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-md text-xs font-medium">
                  +{student.skills.length - 3}
                </span>
              )}
            </div>
          )
        },
      },
      {
        Header: 'Education',
        accessor: 'education',
        Cell: ({ row }: any) => {
          const student = row.original
          // Parse education: split by " - " to separate degree and university
          const educationParts = student.education ? student.education.split(' - ') : ['', '']
          const degree = educationParts[0] || ''
          const university = educationParts.slice(1).join(' - ') || ''
          
          return (
            <div 
              className="text-sm text-gray-800 dark:text-white" 
              style={{ 
                maxWidth: '280px',
                minHeight: '60px',
                lineHeight: '1.5',
                wordBreak: 'break-word'
              }}
              title={student.education}
            >
              <div className="font-medium flex items-center gap-2">
                <i className="ri-graduation-cap-line text-primary"></i>
                <span>{degree}</span>
              </div>
              {university && (
                <div className="text-gray-600 dark:text-gray-400 mt-0.5 flex items-center gap-2">
                  <i className="ri-building-line text-info"></i>
                  <span>{university}</span>
                </div>
              )}
            </div>
          )
        },
      },
      {
        Header: 'Bio',
        accessor: 'bio',
        Cell: ({ row }: any) => {
          const student = row.original
          return (
            <div 
              className="text-sm text-gray-700 dark:text-gray-300" 
              style={{ 
                maxWidth: '280px',
               
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: '1.5',
                wordBreak: 'break-word'
              }}
              title={student.bio}
            >
              {student.bio}
            </div>
          )
        },
      },
      {
        Header: 'Actions',
        accessor: 'id',
        disableSortBy: true,
        Cell: ({ row }: any) => (
          <div className="flex items-center gap-2">
            <div className="hs-tooltip ti-main-tooltip">
              <button
                type="button"
                onClick={() => handleViewStudent(row.original.id)}
                className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-success"
                title="View Student"
                disabled={viewStudentLoading}
              >
                <i className="ri-eye-line"></i>
                <span
                  className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                  role="tooltip">
                  View Student
                </span>
              </button>
            </div>
            <div className="hs-tooltip ti-main-tooltip">
              <Link
                href={`/training/students/edit/?id=${encodeURIComponent(row.original.id)}`}
                className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-info"
                title="Edit Student"
              >
                <i className="ri-pencil-line"></i>
                <span
                  className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                  role="tooltip">
                  Edit Student
                </span>
              </Link>
            </div>
            <div className="hs-tooltip ti-main-tooltip">
              <button
                type="button"
                onClick={() => handleAddNote(row.original.id, row.original)}
                className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-warning"
                title="Add Note"
              >
                <i className="ri-file-add-line"></i>
                <span
                  className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                  role="tooltip">
                  Add Note
                </span>
              </button>
            </div>
            <div className="hs-tooltip ti-main-tooltip">
              <button
                type="button"
                onClick={() => handleShareClick(row.original)}
                className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-success"
                title="Share Public URL"
              >
                <i className="ri-share-line"></i>
                <span
                  className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                  role="tooltip">
                  Share Public URL
                </span>
              </button>
            </div>
            <div className="hs-dropdown ti-dropdown">
              <button
                type="button"
                className="hs-dropdown-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-primary"
                id={`export-dropdown-${row.original.id}`}
                aria-expanded="false"
              >
                <i className="ri-download-line"></i>
              </button>
              <ul
                className="hs-dropdown-menu ti-dropdown-menu hidden"
                aria-labelledby={`export-dropdown-${row.original.id}`}
              >
                <li>
                  <button
                    type="button"
                    className="ti-dropdown-item"
                    onClick={() => handleExportDocs(row.original, 'all')}
                  >
                    <i className="ri-file-download-line me-2"></i>All
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="ti-dropdown-item"
                    onClick={() => handleExportDocs(row.original, 'resume')}
                  >
                    <i className="ri-file-text-line me-2"></i>Resume
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="ti-dropdown-item"
                    onClick={() => handleExportDocs(row.original, 'cover-letter')}
                  >
                    <i className="ri-mail-line me-2"></i>Cover Letter
                  </button>
                </li>
              </ul>
            </div>
            <div className="hs-tooltip ti-main-tooltip">
              <button
                type="button"
                onClick={() => handleDelete(row.original.id)}
                className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-danger"
              >
                <i className="ri-delete-bin-line"></i>
                <span
                  className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                  role="tooltip">
                  Delete
                </span>
              </button>
            </div>
          </div>
        ),
      },
    ],
    [selectedRows, handleDelete]
  )

  // Filter data based on filter state (client-side filtering on current page)
  const filteredData = useMemo(() => {
    return students.filter((student) => {
      // Name filter (array)
      if (filters.name.length > 0 && !filters.name.some(name => 
        student.name.toLowerCase().includes(name.toLowerCase())
      )) {
        return false
      }
      
      // Skills filter (array)
      if (filters.skills.length > 0 && !filters.skills.some(skill => 
        student.skills?.some(studentSkill => 
          studentSkill.toLowerCase().includes(skill.toLowerCase())
        )
      )) {
        return false
      }
      
      // Education filter (array)
      if (filters.education.length > 0 && !filters.education.some(edu => 
        student.education.toLowerCase().includes(edu.toLowerCase())
      )) {
        return false
      }
      
      // Email filter (string)
      if (filters.email && !student.email.toLowerCase().includes(filters.email.toLowerCase())) {
        return false
      }
      
      // Experience filter (range)
      if (filters.experience[0] !== experienceRangesConst.min || filters.experience[1] !== experienceRangesConst.max) {
        const studentExperience = student.experience || 0
        if (studentExperience < filters.experience[0] || studentExperience > filters.experience[1]) {
          return false
        }
      }
      
      return true
    })
  }, [students, filters])

  const data = useMemo(() => filteredData, [filteredData])

  // Get unique values for dropdown filters (from current page data)
  const allSkills = useMemo(() => {
    const skillSet = new Set<string>()
    students.forEach(student => {
      student.skills?.forEach(skill => skillSet.add(skill))
    })
    return Array.from(skillSet).sort()
  }, [students])

  const allEducation = useMemo(() => {
    return [...new Set(students.map(student => student.education).filter(Boolean))].sort()
  }, [students])

  const allNames = useMemo(() => {
    return [...new Set(students.map(student => student.name))].sort()
  }, [students])

  // Filter options based on search terms
  const filteredNames = useMemo(() => {
    if (!searchName) return allNames
    return allNames.filter(name => 
      name.toLowerCase().includes(searchName.toLowerCase())
    )
  }, [allNames, searchName])

  const filteredSkills = useMemo(() => {
    if (!searchSkills) return allSkills
    return allSkills.filter(skill => 
      skill.toLowerCase().includes(searchSkills.toLowerCase())
    )
  }, [allSkills, searchSkills])

  const filteredEducation = useMemo(() => {
    if (!searchEducation) return allEducation
    return allEducation.filter(edu => 
      edu.toLowerCase().includes(searchEducation.toLowerCase())
    )
  }, [allEducation, searchEducation])

  const handleMultiSelectChange = (key: 'name' | 'skills' | 'education', value: string) => {
    setFilters(prev => {
      const currentArray = prev[key]
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value]
      return { ...prev, [key]: newArray }
    })
  }

  const handleRemoveFilter = (key: 'name' | 'skills' | 'education', value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].filter(item => item !== value)
    }))
  }

  const handleExperienceRangeChange = (values: number[]) => {
    setFilters(prev => ({ ...prev, experience: [values[0], values[1]] as [number, number] }))
  }

  const handleResetFilters = () => {
    setFilters({
      name: [],
      skills: [],
      education: [],
      email: '',
      experience: [experienceRangesConst.min, experienceRangesConst.max]
    })
    setSearchName('')
    setSearchSkills('')
    setSearchEducation('')
  }

  const hasActiveFilters = 
    filters.name.length > 0 ||
    filters.skills.length > 0 ||
    filters.education.length > 0 ||
    filters.email !== '' ||
    filters.experience[0] !== experienceRangesConst.min ||
    filters.experience[1] !== experienceRangesConst.max

  const activeFilterCount = 
    filters.name.length +
    filters.skills.length +
    filters.education.length +
    (filters.email !== '' ? 1 : 0) +
    (filters.experience[0] !== experienceRangesConst.min || filters.experience[1] !== experienceRangesConst.max ? 1 : 0)

  const tableInstance: any = useTable(
    {
      columns,
      data,
      manualPagination: true, // We're using API pagination
      manualSortBy: true, // We're using API sorting
    },
    useSortBy
  )

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
  } = tableInstance

  // Handle sort selection
  const handleSortChange = (sortOption: string) => {
    setSelectedSort(sortOption)
    
    switch(sortOption) {
      case 'name-asc':
        setSortBy('createdAt:asc') // API format: field:direction
        break
      case 'name-desc':
        setSortBy('createdAt:desc')
        break
      case 'skills-asc':
        setSortBy('createdAt:asc')
        break
      case 'skills-desc':
        setSortBy('createdAt:desc')
        break
      case 'education-asc':
        setSortBy('createdAt:asc')
        break
      case 'education-desc':
        setSortBy('createdAt:desc')
        break
      case 'clear-sort':
        setSortBy('createdAt:desc')
        setSelectedSort('')
        break
      default:
        setSortBy('createdAt:desc')
    }
    setCurrentPage(1) // Reset to first page when sorting changes
  }

  // Handle select all checkbox - select ALL rows in filtered dataset
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = new Set(filteredData.map((student) => student.id))
      setSelectedRows(allIds)
    } else {
      setSelectedRows(new Set())
    }
  }

  // Check if all rows in filtered dataset are selected
  const isAllSelected = selectedRows.size === filteredData.length && filteredData.length > 0
  const isIndeterminate = selectedRows.size > 0 && selectedRows.size < filteredData.length

  return (
    <Fragment>
      <Seo title="Students" />
  
      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-8rem)]">
        <div className="xl:col-span-12 col-span-12 h-full flex flex-col">
          <div className="box custom-box h-full flex flex-col">
            <div className="box-header flex items-center justify-between flex-wrap gap-4">
              <div className="box-title">
                Students
                <span className="badge bg-light text-default rounded-full ms-1 text-[0.75rem] align-middle">
                  {filteredData.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  className="form-control !w-auto !py-1 !px-4 !text-[0.75rem] me-2"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                >
                  {[10, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      Show {size}
                    </option>
                  ))}
                </select>
                <div className="hs-dropdown ti-dropdown me-2">
                  <button
                    type="button"
                    className="ti-btn ti-btn-light !py-1 !px-2 !text-[0.75rem] ti-dropdown-toggle"
                    id="sort-dropdown-button"
                    aria-expanded="false"
                  >
                    <i className="ri-arrow-up-down-line font-semibold align-middle me-1"></i>Sort
                    <i className="ri-arrow-down-s-line align-middle ms-1 inline-block"></i>
                  </button>
                  <ul className="hs-dropdown-menu ti-dropdown-menu hidden" aria-labelledby="sort-dropdown-button">
                    <li>
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'name-asc' ? 'active' : ''}`}
                        onClick={() => handleSortChange('name-asc')}
                      >
                        <i className="ri-sort-asc me-2 align-middle inline-block"></i>Name (A-Z)
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'name-desc' ? 'active' : ''}`}
                        onClick={() => handleSortChange('name-desc')}
                      >
                        <i className="ri-sort-desc me-2 align-middle inline-block"></i>Name (Z-A)
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'skills-asc' ? 'active' : ''}`}
                        onClick={() => handleSortChange('skills-asc')}
                      >
                        <i className="ri-code-s-slash-line me-2 align-middle inline-block"></i>Skills (A-Z)
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'skills-desc' ? 'active' : ''}`}
                        onClick={() => handleSortChange('skills-desc')}
                      >
                        <i className="ri-code-s-slash-line me-2 align-middle inline-block"></i>Skills (Z-A)
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'education-asc' ? 'active' : ''}`}
                        onClick={() => handleSortChange('education-asc')}
                      >
                        <i className="ri-graduation-cap-line me-2 align-middle inline-block"></i>Education (A-Z)
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={`ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left ${selectedSort === 'education-desc' ? 'active' : ''}`}
                        onClick={() => handleSortChange('education-desc')}
                      >
                        <i className="ri-graduation-cap-line me-2 align-middle inline-block"></i>Education (Z-A)
                      </button>
                    </li>
                    <li className="ti-dropdown-divider"></li>
                    <li>
                      <button
                        type="button"
                        className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left text-gray-500 dark:text-gray-400"
                        onClick={() => handleSortChange('clear-sort')}
                      >
                        <i className="ri-close-line me-2 align-middle inline-block"></i>Clear Sort
                      </button>
                    </li>
                  </ul>
                </div>
                <Link
                  href="/training/students/add"
                  className="ti-btn ti-btn-primary-full !py-1 !px-2 !text-[0.75rem] me-2"
                >
                  <i className="ri-add-line font-semibold align-middle"></i>Add Student
                </Link>
                <div className="hs-dropdown ti-dropdown me-2">
                  <button
                    type="button"
                    className="ti-btn ti-btn-primary !py-1 !px-2 !text-[0.75rem] ti-dropdown-toggle"
                    id="excel-dropdown-button"
                    aria-expanded="false"
                  >
                    <i className="ri-file-excel-2-line font-semibold align-middle me-1"></i>Excel
                    <i className="ri-arrow-down-s-line align-middle ms-1 inline-block"></i>
                  </button>
                  <ul className="hs-dropdown-menu ti-dropdown-menu hidden" aria-labelledby="excel-dropdown-button">
                    <li>
                      <button
                        type="button"
                        className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left"
                      >
                        <i className="ri-upload-2-line me-2 align-middle inline-block"></i>Import
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left"
                      >
                        <i className="ri-file-excel-2-line me-2 align-middle inline-block"></i>Export
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left"
                      >
                        <i className="ri-download-line me-2 align-middle inline-block"></i>Template
                      </button>
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  className="ti-btn ti-btn-light !py-1 !px-2 !text-[0.75rem] me-2"
                  data-hs-overlay="#students-filter-panel"
                >
                  <i className="ri-search-line font-semibold align-middle me-1"></i>Search
                  {hasActiveFilters && (
                    <span className="badge bg-primary text-white rounded-full ms-1 text-[0.65rem]">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              
                <button
                  type="button"
                  className="ti-btn ti-btn-danger !py-1 !px-2 !text-[0.75rem]"
                  onClick={handleDeleteSelected}
                  disabled={selectedRows.size === 0}
                >
                  <i className="ri-delete-bin-line font-semibold align-middle me-1"></i>Delete
                </button>
              </div>
            </div>
            <div className="box-body !p-0 flex-1 flex flex-col overflow-hidden">
              <div className="table-responsive flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
                <table {...getTableProps()} className="table whitespace-nowrap min-w-full table-striped table-hover table-bordered border-gray-300 dark:border-gray-600">
                  <thead>
                    {headerGroups.map((headerGroup: any) => (
                      <tr {...headerGroup.getHeaderGroupProps()} className="bg-primary/10 dark:bg-primary/20 border-b border-gray-300 dark:border-gray-600" key={Math.random()}>
                        {headerGroup.headers.map((column: any) => (
                          <th
                            {...column.getHeaderProps(column.getSortByToggleProps())}
                            scope="col"
                            className="text-start sticky top-0 z-10 bg-gray-50 dark:bg-black/20"
                            key={Math.random()}
                            style={{ 
                              position: 'sticky', 
                              top: 0, 
                              zIndex: 10
                            }}
                          >
                            {column.id === 'select' ? (
                              <input
                                className="form-check-input"
                                type="checkbox"
                                checked={isAllSelected}
                                ref={(input) => {
                                  if (input) input.indeterminate = isIndeterminate
                                }}
                                onChange={handleSelectAll}
                                aria-label="Select all"
                              />
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="tabletitle">{column.render('Header')}</span>
                              <span>
                                {column.isSorted ? (
                                  column.isSortedDesc ? (
                                    <i className="ri-arrow-down-s-line text-[0.875rem]"></i>
                                  ) : (
                                    <i className="ri-arrow-up-s-line text-[0.875rem]"></i>
                                  )
                                ) : (
                                  ''
                                )}
                              </span>
                              </div>
                            )}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody {...getTableBodyProps()}>
                    {loading ? (
                      <tr>
                        <td colSpan={columns.length} className="text-center py-8">
                          <div className="flex flex-col items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                            <span className="text-gray-600 dark:text-gray-400">Loading students...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredData.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length} className="text-center py-8">
                          <div className="flex flex-col items-center justify-center">
                            <i className="ri-inbox-line text-4xl text-gray-400 mb-2"></i>
                            <span className="text-gray-600 dark:text-gray-400">No students found</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredData.map((student) => {
                        const row = {
                          original: student,
                          getRowProps: () => ({}),
                          cells: columns.map((col: any) => ({
                            render: (type: string) => {
                              if (type === 'Cell') {
                                if (col.id === 'checkbox') {
                                  return (
                                    <input
                                      className="form-check-input"
                                      type="checkbox"
                                      checked={selectedRows.has(student.id)}
                                      onChange={() => handleRowSelect(student.id)}
                                      aria-label={`Select ${student.name}`}
                                    />
                                  )
                                }
                                if (col.Cell) {
                                  return col.Cell({ row: { original: student } })
                                }
                                return student[col.accessor as keyof StudentRow]
                              }
                              return null
                            },
                            getCellProps: () => ({})
                          }))
                        }
                        return (
                          <tr className="border-b border-gray-300 dark:border-gray-600" key={student.id}>
                            {row.cells.map((cell: any, idx: number) => (
                              <td key={idx}>
                                {cell.render('Cell')}
                              </td>
                            ))}
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="box-footer !border-t-0">
              <div className="flex items-center flex-wrap gap-4">
                <div>
                  Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalResults)} of {totalResults} entries{' '}
                  <i className="bi bi-arrow-right ms-2 font-semibold"></i>
                </div>
                <div className="ms-auto">
                  <nav aria-label="Page navigation" className="pagination-style-4">
                    <ul className="ti-pagination mb-0">
                      <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                        <button
                          className="page-link px-3 py-[0.375rem]"
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          Prev
                        </button>
                      </li>
                      {totalPages <= 7 ? (
                        // Show all pages if 7 or fewer
                        Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <li
                            key={page}
                            className={`page-item ${currentPage === page ? 'active' : ''}`}
                          >
                            <button
                              className="page-link px-3 py-[0.375rem]"
                              onClick={() => setCurrentPage(page)}
                            >
                              {page}
                            </button>
                          </li>
                        ))
                      ) : (
                        // Show smart pagination for more pages
                        <>
                          {currentPage > 2 && (
                            <>
                              <li className="page-item">
                                <button
                                  className="page-link px-3 py-[0.375rem]"
                                  onClick={() => setCurrentPage(1)}
                                >
                                  1
                                </button>
                              </li>
                              {currentPage > 3 && (
                                <li className="page-item disabled">
                                  <span className="page-link px-3 py-[0.375rem]">...</span>
                                </li>
                              )}
                            </>
                          )}
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum
                            if (currentPage < 3) {
                              pageNum = i + 1
                            } else if (currentPage > totalPages - 3) {
                              pageNum = totalPages - 4 + i
                            } else {
                              pageNum = currentPage - 2 + i
                            }
                            return (
                              <li
                                key={pageNum}
                                className={`page-item ${currentPage === pageNum ? 'active' : ''}`}
                              >
                                <button
                                  className="page-link px-3 py-[0.375rem]"
                                  onClick={() => setCurrentPage(pageNum)}
                                >
                                  {pageNum}
                                </button>
                              </li>
                            )
                          })}
                          {currentPage < totalPages - 2 && (
                            <>
                              {currentPage < totalPages - 3 && (
                                <li className="page-item disabled">
                                  <span className="page-link px-3 py-[0.375rem]">...</span>
                                </li>
                              )}
                              <li className="page-item">
                                <button
                                  className="page-link px-3 py-[0.375rem]"
                                  onClick={() => setCurrentPage(totalPages)}
                                >
                                  {totalPages}
                                </button>
                              </li>
                            </>
                          )}
                        </>
                      )}
                      <li className={`page-item ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}`}>
                        <button
                          className="page-link px-3 py-[0.375rem] text-primary"
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage === totalPages || totalPages === 0}
                        >
                          Next
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Panel Offcanvas - Same structure as candidates */}
      <div id="students-filter-panel" className="hs-overlay hidden ti-offcanvas ti-offcanvas-right !z-[105]" tabIndex={-1}>
        <div className="ti-offcanvas-header bg-gray-50 dark:bg-black/20 !py-2.5">
          <h6 className="ti-offcanvas-title text-base font-semibold flex items-center gap-2">
            <i className="ri-search-line text-primary text-base"></i>
            Search Students
          </h6>
          <button 
            type="button" 
            className="ti-btn flex-shrink-0 p-0 transition-none text-gray-500 hover:text-gray-700 focus:ring-gray-400 focus:ring-offset-white dark:text-[#8c9097] dark:text-white/50 dark:hover:text-white/80 dark:focus:ring-white/10 dark:focus:ring-offset-white/10 hover:bg-gray-100 dark:hover:bg-black/40 rounded-md p-1" 
            onClick={handleResetFilters}
          >
            <i className="ri-refresh-line me-1.5"></i>Reset
          </button>
        </div>
        <div className="ti-offcanvas-body !p-4">
          <div className="space-y-5">
            {/* Name Filter */}
            <div className="pb-4 border-b border-gray-200 dark:border-defaultborder/10">
              <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                <i className="ri-user-line text-primary text-base"></i>
                Name
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({allNames.length})</span>
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  className="form-control !py-1.5 !text-sm mb-1.5"
                  placeholder="Search names..."
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                />
                <div className="max-h-40 overflow-y-auto rounded-lg bg-white dark:bg-black/20 p-2 shadow-sm">
                  <div className="space-y-1">
                    {filteredNames.length > 0 ? (
                      filteredNames.map((name) => (
                        <label
                          key={name}
                          className="flex items-center gap-2 cursor-pointer hover:bg-primary/5 dark:hover:bg-primary/10 p-1.5 rounded-md transition-colors"
                        >
                          <input
                            type="checkbox"
                            className="form-check-input !w-3.5 !h-3.5"
                            checked={filters.name.includes(name)}
                            onChange={() => handleMultiSelectChange('name', name)}
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{name}</span>
                        </label>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-3">
                        No names found
                      </div>
                    )}
                  </div>
                </div>
                {filters.name.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {filters.name.map((name) => (
                      <span
                        key={name}
                        className="badge bg-primary/10 text-primary border border-primary/30 px-2 py-1 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-sm"
                      >
                        {name}
                        <button
                          type="button"
                          onClick={() => handleRemoveFilter('name', name)}
                          className="hover:text-primary-hover hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                        >
                          <i className="ri-close-line text-xs"></i>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Skills Filter */}
            <div className="pb-4 border-b border-gray-200 dark:border-defaultborder/10">
              <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                <i className="ri-code-s-slash-line text-success text-base"></i>
                Skills
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({allSkills.length})</span>
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  className="form-control !py-1.5 !text-sm mb-1.5"
                  placeholder="Search skills..."
                  value={searchSkills}
                  onChange={(e) => setSearchSkills(e.target.value)}
                />
                <div className="max-h-40 overflow-y-auto rounded-lg bg-white dark:bg-black/20 p-2 shadow-sm">
                  <div className="space-y-1">
                    {filteredSkills.length > 0 ? (
                      filteredSkills.map((skill) => (
                        <label
                          key={skill}
                          className="flex items-center gap-2 cursor-pointer hover:bg-success/5 dark:hover:bg-success/10 p-1.5 rounded-md transition-colors"
                        >
                          <input
                            type="checkbox"
                            className="form-check-input !w-3.5 !h-3.5"
                            checked={filters.skills.includes(skill)}
                            onChange={() => handleMultiSelectChange('skills', skill)}
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{skill}</span>
                        </label>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-3">
                        No skills found
                      </div>
                    )}
                  </div>
                </div>
                {filters.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {filters.skills.map((skill) => (
                      <span
                        key={skill}
                        className="badge bg-success/10 text-success border border-success/30 px-2 py-1 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-sm"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => handleRemoveFilter('skills', skill)}
                          className="hover:text-success-hover hover:bg-success/20 rounded-full p-0.5 transition-colors"
                        >
                          <i className="ri-close-line text-xs"></i>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Education Filter */}
            <div className="pb-4 border-b border-gray-200 dark:border-defaultborder/10">
              <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                <i className="ri-graduation-cap-line text-info text-base"></i>
                Education
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({allEducation.length})</span>
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  className="form-control !py-1.5 !text-sm mb-1.5"
                  placeholder="Search education..."
                  value={searchEducation}
                  onChange={(e) => setSearchEducation(e.target.value)}
                />
                <div className="max-h-40 overflow-y-auto rounded-lg bg-white dark:bg-black/20 p-2 shadow-sm">
                  <div className="space-y-1">
                    {filteredEducation.length > 0 ? (
                      filteredEducation.map((edu) => (
                        <label
                          key={edu}
                          className="flex items-center gap-2 cursor-pointer hover:bg-info/5 dark:hover:bg-info/10 p-1.5 rounded-md transition-colors"
                        >
                          <input
                            type="checkbox"
                            className="form-check-input !w-3.5 !h-3.5"
                            checked={filters.education.includes(edu)}
                            onChange={() => handleMultiSelectChange('education', edu)}
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{edu}</span>
                        </label>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-3">
                        No education found
                      </div>
                    )}
                  </div>
                </div>
                {filters.education.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {filters.education.map((edu) => (
                      <span
                        key={edu}
                        className="badge bg-info/10 text-info border border-info/30 px-2 py-1 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-sm"
                      >
                        {edu}
                        <button
                          type="button"
                          onClick={() => handleRemoveFilter('education', edu)}
                          className="hover:text-info-hover hover:bg-info/20 rounded-full p-0.5 transition-colors"
                        >
                          <i className="ri-close-line text-xs"></i>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Email Filter */}
            <div className="pb-4">
              <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                <i className="ri-mail-line text-warning text-base"></i>
                Email
              </label>
              <input
                type="text"
                className="form-control border-gray-200 dark:border-defaultborder/10 focus:ring-2 focus:ring-primary/20 !py-1.5 !text-sm"
                placeholder="Search by email..."
                value={filters.email}
                onChange={(e) => setFilters(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>

            {/* Experience Filter - Range Slider */}
            <div className="pb-4">
              <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <i className="ri-time-line text-info text-base"></i>
                  Work Experience (Years)
                </span>
                <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                  {filters.experience[0]} - {filters.experience[1]} years
                </span>
              </label>
              <div className="px-2 py-4 bg-gray-50 dark:bg-black/20 rounded-lg">
                <Range
                  values={filters.experience}
                  step={1}
                  min={experienceRangesConst.min}
                  max={experienceRangesConst.max}
                  onChange={handleExperienceRangeChange}
                  renderTrack={({ props, children }) => (
                    <div
                      onMouseDown={props.onMouseDown}
                      onTouchStart={props.onTouchStart}
                      style={{
                        ...props.style,
                        height: '36px',
                        display: 'flex',
                        width: '100%',
                      }}
                    >
                      <div
                        ref={props.ref}
                        style={{
                          height: '8px',
                          width: '100%',
                          borderRadius: '6px',
                          background: getTrackBackground({
                            values: filters.experience,
                            colors: ['#e2e8f0', '#845adf', '#e2e8f0'],
                            min: experienceRangesConst.min,
                            max: experienceRangesConst.max,
                          }),
                          alignSelf: 'center',
                        }}
                      >
                        {children}
                      </div>
                    </div>
                  )}
                  renderThumb={({ index, props, isDragged }) => {
                    const { key, ...restProps } = props
                    return (
                    <div
                      key={key}
                      {...restProps}
                      style={{
                        ...restProps.style,
                        height: '20px',
                        width: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#fff',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        boxShadow: isDragged ? '0px 2px 8px rgba(132, 90, 223, 0.4)' : '0px 2px 6px #AAA',
                        border: '2px solid rgb(132, 90, 223)',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: '-28px',
                          color: '#fff',
                          fontWeight: '600',
                          fontSize: '12px',
                          fontFamily: 'inherit',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'rgb(132, 90, 223)',
                        }}
                      >
                        {filters.experience[index]} {filters.experience[index] === 1 ? 'year' : 'years'}
                      </div>
                    </div>
                    )
                  }}
                />
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-defaultborder/10">
              <button
                type="button"
                className="ti-btn ti-btn-primary flex-1 font-medium shadow-sm hover:shadow-md transition-shadow !py-1.5 !text-sm"
                onClick={handleResetFilters}
              >
                <i className="ri-refresh-line me-1.5"></i>Reset
              </button>
              <button
                type="button"
                className="ti-btn ti-btn-light font-medium shadow-sm hover:shadow-md transition-shadow !py-1.5 !text-sm"
                data-hs-overlay="#students-filter-panel"
              >
                <i className="ri-close-line me-1.5"></i>Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden trigger button for student preview panel (needed for Preline) */}
      <button 
        id="student-preview-panel-trigger"
        type="button"
        style={{ display: 'none' }}
        data-hs-overlay="#student-preview-panel"
      ></button>

      {/* Student Preview Panel (Offcanvas) */}
      <div 
        id="student-preview-panel" 
        className="hs-overlay hidden ti-offcanvas ti-offcanvas-right !z-[105] !max-w-[50rem] lg:!max-w-[60rem]"
        tabIndex={-1}
      >
        <div className="ti-offcanvas-header bg-gray-50 dark:bg-black/20 !py-2.5">
          <h6 className="ti-offcanvas-title text-base font-semibold flex items-center gap-2">
            <i className="ri-user-line text-primary text-base"></i>
            {previewStudent?.name || 'Student Profile'}
          </h6>
          <button 
            type="button" 
            className="hs-dropdown-toggle ti-btn flex-shrink-0 p-0 transition-none text-gray-500 hover:text-gray-700 focus:ring-gray-400 focus:ring-offset-white dark:text-[#8c9097] dark:text-white/50 dark:hover:text-white/80 dark:focus:ring-white/10 dark:focus:ring-offset-white/10 hover:bg-gray-100 dark:hover:bg-black/40 rounded-md p-1" 
            data-hs-overlay="#student-preview-panel"
            onClick={() => setPreviewStudent(null)}
          >
            <span className="sr-only">Close</span>
            <svg className="w-3.5 h-3.5" width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0.258206 1.00652C0.351976 0.912791 0.479126 0.860131 0.611706 0.860131C0.744296 0.860131 0.871447 0.912791 0.965207 1.00652L3.61171 3.65302L6.25822 1.00652C6.30432 0.958771 6.35952 0.920671 6.42052 0.894471C6.48152 0.868271 6.54712 0.854471 6.61352 0.853901C6.67992 0.853321 6.74572 0.865971 6.80722 0.891111C6.86862 0.916251 6.92442 0.953381 6.97142 1.00032C7.01832 1.04727 7.05552 1.1031 7.08062 1.16454C7.10572 1.22599 7.11842 1.29183 7.11782 1.35822C7.11722 1.42461 7.10342 1.49022 7.07722 1.55122C7.05102 1.61222 7.01292 1.6674 6.96522 1.71352L4.31871 4.36002L6.96522 7.00648C7.05632 7.10078 7.10672 7.22708 7.10552 7.35818C7.10442 7.48928 7.05182 7.61468 6.95912 7.70738C6.86642 7.80018 6.74102 7.85268 6.60992 7.85388C6.47882 7.85498 6.35252 7.80458 6.25822 7.71348L3.61171 5.06702L0.965207 7.71348C0.870907 7.80458 0.744606 7.85498 0.613506 7.85388C0.482406 7.85268 0.357007 7.80018 0.264297 7.70738C0.171597 7.61468 0.119017 7.48928 0.117877 7.35818C0.116737 7.22708 0.167126 7.10078 0.258206 7.00648L2.90471 4.36002L0.258206 1.71352C0.164476 1.61976 0.111816 1.4926 0.111816 1.36002C0.111816 1.22744 0.164476 1.10028 0.258206 1.00652Z" fill="currentColor"/>
            </svg>
          </button>
        </div>
        <div className="ti-offcanvas-body !p-4">
          {previewStudent ? (
            <div className="space-y-4">
              {/* Student Header Info */}
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 dark:border-primary/30 rounded-lg">
                <img
                  src={previewStudent.displayPicture || '/assets/images/faces/1.jpg'}
                  alt={previewStudent.name}
                  className="w-16 h-16 rounded-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/images/faces/1.jpg'
                  }}
                />
                <div className="flex-1">
                  <h6 className="font-bold text-gray-800 dark:text-white text-xl mb-1">{previewStudent.name}</h6>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <i className="ri-mail-line"></i>
                      {previewStudent.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <i className="ri-phone-line"></i>
                      {previewStudent.phone}
                    </span>
                  </div>
                </div>
              </div>

              {/* Key Details Grid */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-black/20 rounded-lg">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Education</div>
                  <div className="font-semibold text-gray-800 dark:text-white">{previewStudent.education}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Skills</div>
                  <div className="flex flex-wrap gap-1.5">
                    {previewStudent.skills?.map((skill: string, index: number) => (
                      <span
                        key={index}
                        className="badge bg-primary/10 text-primary border border-primary/30 px-2 py-1 rounded-md text-xs font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bio Section */}
              {previewStudent.bio && (
                <div className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg">
                  <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                    <i className="ri-file-text-line text-primary"></i>
                    Bio
                  </h6>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {previewStudent.bio}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-200 dark:border-defaultborder/10 flex gap-3">
                <button 
                  type="button" 
                  className="hs-dropdown-toggle ti-btn ti-btn-light flex-1" 
                  data-hs-overlay="#student-preview-panel"
                  onClick={() => setPreviewStudent(null)}
                >
                  Close
                </button>
                <button type="button" className="ti-btn ti-btn-primary flex-1">
                  View Full Profile
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No student selected</div>
          )}
        </div>
      </div>

      {/* Hidden trigger button for student notes panel (needed for Preline) */}
      <button 
        id="student-notes-panel-trigger"
        type="button"
        style={{ display: 'none' }}
        data-hs-overlay="#student-notes-panel"
      ></button>

      {/* Student Notes Panel (Offcanvas) */}
      <div 
        id="student-notes-panel" 
        className="hs-overlay hidden ti-offcanvas ti-offcanvas-right !z-[105]"
        tabIndex={-1}
      >
        <div className="ti-offcanvas-header bg-gray-50 dark:bg-black/20 !py-2.5">
          <h6 className="ti-offcanvas-title text-base font-semibold flex items-center gap-2">
            <i className="ri-file-add-line text-primary text-base"></i>
            {getStudentDetails()?.name || 'Student Notes'}
          </h6>
          <button 
            type="button" 
            className="hs-dropdown-toggle ti-btn flex-shrink-0 p-0 transition-none text-gray-500 hover:text-gray-700 focus:ring-gray-400 focus:ring-offset-white dark:text-[#8c9097] dark:text-white/50 dark:hover:text-white/80 dark:focus:ring-white/10 dark:focus:ring-offset-white/10 hover:bg-gray-100 dark:hover:bg-black/40 rounded-md p-1" 
            data-hs-overlay="#student-notes-panel"
            onClick={() => setNotesStudentId(null)}
          >
            <span className="sr-only">Close</span>
            <svg className="w-3.5 h-3.5" width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0.258206 1.00652C0.351976 0.912791 0.479126 0.860131 0.611706 0.860131C0.744296 0.860131 0.871447 0.912791 0.965207 1.00652L3.61171 3.65302L6.25822 1.00652C6.30432 0.958771 6.35952 0.920671 6.42052 0.894471C6.48152 0.868271 6.54712 0.854471 6.61352 0.853901C6.67992 0.853321 6.74572 0.865971 6.80722 0.891111C6.86862 0.916251 6.92442 0.953381 6.97142 1.00032C7.01832 1.04727 7.05552 1.1031 7.08062 1.16454C7.10572 1.22599 7.11842 1.29183 7.11782 1.35822C7.11722 1.42461 7.10342 1.49022 7.07722 1.55122C7.05102 1.61222 7.01292 1.6674 6.96522 1.71352L4.31871 4.36002L6.96522 7.00648C7.05632 7.10078 7.10672 7.22708 7.10552 7.35818C7.10442 7.48928 7.05182 7.61468 6.95912 7.70738C6.86642 7.80018 6.74102 7.85268 6.60992 7.85388C6.47882 7.85498 6.35252 7.80458 6.25822 7.71348L3.61171 5.06702L0.965207 7.71348C0.870907 7.80458 0.744606 7.85498 0.613506 7.85388C0.482406 7.85268 0.357007 7.80018 0.264297 7.70738C0.171597 7.61468 0.119017 7.48928 0.117877 7.35818C0.116737 7.22708 0.167126 7.10078 0.258206 7.00648L2.90471 4.36002L0.258206 1.71352C0.164476 1.61976 0.111816 1.4926 0.111816 1.36002C0.111816 1.22744 0.164476 1.10028 0.258206 1.00652Z" fill="currentColor"/>
            </svg>
          </button>
        </div>
        <div className="ti-offcanvas-body !p-4">
          {notesStudentId ? (
            <div className="space-y-6">
              {/* Student Info Header */}
              {(() => {
                const studentDetails = getStudentDetails()
                return studentDetails ? (
                  <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 dark:border-primary/30 rounded-lg">
                    <h6 className="font-bold text-gray-800 dark:text-white text-lg mb-2">{studentDetails.name}</h6>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <i className="ri-mail-line"></i>
                        {studentDetails.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <i className="ri-phone-line"></i>
                        {studentDetails.phone}
                      </span>
                    </div>
                  </div>
                ) : null
              })()}

              {/* Add New Note Form */}
              <div className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg bg-gray-50 dark:bg-black/20">
                <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                  <i className="ri-file-add-line text-primary"></i>
                  Add Note
                </h6>
                <div className="space-y-3">
                  <textarea
                    className="form-control"
                    rows={4}
                    placeholder="Write your note here..."
                    value={newNote.text}
                    onChange={(e) => setNewNote({ ...newNote, text: e.target.value })}
                  />
                  <div className="flex items-center gap-4">
                    <label className="form-label mb-0 font-medium text-sm text-gray-700 dark:text-gray-300">Visibility:</label>
                    <div className="flex items-center gap-4">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="noteVisibility"
                          id="note-public"
                          checked={newNote.visibility === 'public'}
                          onChange={() => setNewNote({ ...newNote, visibility: 'public' })}
                        />
                        <label className="form-check-label" htmlFor="note-public">
                          Public
                        </label>
                      </div>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="noteVisibility"
                          id="note-private"
                          checked={newNote.visibility === 'private'}
                          onChange={() => setNewNote({ ...newNote, visibility: 'private' })}
                        />
                        <label className="form-check-label" htmlFor="note-private">
                          Private
                        </label>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="ti-btn ti-btn-primary"
                    onClick={handleAddNoteSubmit}
                    disabled={!newNote.text.trim()}
                  >
                    <i className="ri-add-line me-1"></i>
                    Add Note
                  </button>
                </div>
              </div>

              {/* Existing Notes */}
              <div>
                <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                  <i className="ri-file-list-line text-primary"></i>
                  Notes ({getStudentNotes(notesStudentId).length})
                </h6>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {getStudentNotes(notesStudentId).length > 0 ? (
                    getStudentNotes(notesStudentId).map((note) => (
                      <div 
                        key={note.id}
                        className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg bg-white dark:bg-black/40"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`badge ${note.visibility === 'public' ? 'bg-success' : 'bg-secondary'} text-white text-xs`}>
                              <i className={`ri-${note.visibility === 'public' ? 'global' : 'lock'}-line me-1`}></i>
                              {note.visibility === 'public' ? 'Public' : 'Private'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
                              <div>{new Date(note.postedDate).toLocaleDateString()}</div>
                              <div>{new Date(note.postedDate).toLocaleTimeString()}</div>
                            </div>
                            <button
                              type="button"
                              className="ti-btn ti-btn-icon ti-btn-sm ti-btn-danger"
                              onClick={() => handleDeleteNote(note.id)}
                              title="Delete note"
                            >
                              <i className="ri-delete-bin-line"></i>
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 whitespace-pre-wrap">
                          {note.note}
                        </p>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <i className="ri-user-line"></i>
                          Posted by: <span className="font-medium">{note.postedBy}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 border border-gray-200 dark:border-defaultborder/10 rounded-lg text-center bg-gray-50 dark:bg-black/20">
                      <i className="ri-file-list-line text-3xl text-gray-400 dark:text-gray-500 mb-2"></i>
                      <p className="text-sm text-gray-500 dark:text-gray-400">No notes yet. Add your first note above.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No student selected</div>
          )}
        </div>
      </div>

      {/* Hidden trigger button for share modal (needed for Preline) */}
      <button 
        id="share-student-modal-trigger"
        type="button"
        style={{ display: 'none' }}
        data-hs-overlay="#share-student-modal"
      ></button>

      {/* Share Student Modal */}
      <div 
        id="share-student-modal" 
        className="hs-overlay hidden ti-modal"
      >
        <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out lg:!max-w-lg lg:w-full m-3 lg:!mx-auto">
          <div className="ti-modal-content">
            <div className="ti-modal-header">
              <h6 className="ti-modal-title flex items-center gap-2">
                <i className="ri-share-line text-primary"></i>
                Share Student
              </h6>
              <button 
                type="button" 
                className="hs-dropdown-toggle ti-modal-close-btn" 
                data-hs-overlay="#share-student-modal"
                onClick={() => {
                  setShareStudent(null)
                  setShowEmailInput(false)
                  setShareEmail('')
                }}
              >
                <span className="sr-only">Close</span>
                <svg className="w-3.5 h-3.5" width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0.258206 1.00652C0.351976 0.912791 0.479126 0.860131 0.611706 0.860131C0.744296 0.860131 0.871447 0.912791 0.965207 1.00652L3.61171 3.65302L6.25822 1.00652C6.30432 0.958771 6.35952 0.920671 6.42052 0.894471C6.48152 0.868271 6.54712 0.854471 6.61352 0.853901C6.67992 0.853321 6.74572 0.865971 6.80722 0.891111C6.86862 0.916251 6.92442 0.953381 6.97142 1.00032C7.01832 1.04727 7.05552 1.1031 7.08062 1.16454C7.10572 1.22599 7.11842 1.29183 7.11782 1.35822C7.11722 1.42461 7.10342 1.49022 7.07722 1.55122C7.05102 1.61222 7.01292 1.6674 6.96522 1.71352L4.31871 4.36002L6.96522 7.00648C7.05632 7.10078 7.10672 7.22708 7.10552 7.35818C7.10442 7.48928 7.05182 7.61468 6.95912 7.70738C6.86642 7.80018 6.74102 7.85268 6.60992 7.85388C6.47882 7.85498 6.35252 7.80458 6.25822 7.71348L3.61171 5.06702L0.965207 7.71348C0.870907 7.80458 0.744606 7.85498 0.613506 7.85388C0.482406 7.85268 0.357007 7.80018 0.264297 7.70738C0.171597 7.61468 0.119017 7.48928 0.117877 7.35818C0.116737 7.22708 0.167126 7.10078 0.258206 7.00648L2.90471 4.36002L0.258206 1.71352C0.164476 1.61976 0.111816 1.4926 0.111816 1.36002C0.111816 1.22744 0.164476 1.10028 0.258206 1.00652Z" fill="currentColor"/>
                </svg>
              </button>
            </div>
            <div className="ti-modal-body">
              {shareStudent ? (
                <div className="space-y-4">
                  {/* Student Info */}
                  <div className="p-3 bg-gray-50 dark:bg-black/20 rounded-lg border border-gray-200 dark:border-defaultborder/10">
                    <h6 className="font-semibold text-gray-800 dark:text-white mb-1">{shareStudent.name}</h6>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {shareStudent.email} • {shareStudent.phone}
                    </p>
                  </div>

                  {/* Copy URL Section */}
                  <div>
                    <label className="form-label mb-2 font-semibold text-sm text-gray-800 dark:text-white">
                      Public URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="form-control"
                        value={getStudentPublicUrl(shareStudent.id)}
                        readOnly
                      />
                      <button
                        type="button"
                        className={`ti-btn ${copied ? 'ti-btn-success' : 'ti-btn-primary'}`}
                        onClick={() => handleCopyUrl(getStudentPublicUrl(shareStudent.id))}
                      >
                        <i className={`ri-${copied ? 'check' : 'file-copy'}-line me-1`}></i>
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  {/* Share Options */}
                  <div>
                    <label className="form-label mb-3 font-semibold text-sm text-gray-800 dark:text-white">
                      Share via
                    </label>
                    <div className="space-y-3">
                      <button
                        type="button"
                        className="ti-btn ti-btn-success w-full flex items-center justify-center gap-2"
                        onClick={() => handleShareWhatsApp(shareStudent)}
                      >
                        <i className="ri-whatsapp-line text-xl"></i>
                        WhatsApp
                      </button>
                      
                      {!showEmailInput ? (
                        <button
                          type="button"
                          className="ti-btn ti-btn-primary w-full flex items-center justify-center gap-2"
                          onClick={handleEmailShareClick}
                        >
                          <i className="ri-mail-line text-xl"></i>
                          Email
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <input
                            type="email"
                            className="form-control"
                            placeholder="Enter email address"
                            value={shareEmail}
                            onChange={(e) => setShareEmail(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleSendEmail()
                              }
                            }}
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="ti-btn ti-btn-primary flex-1"
                              onClick={handleSendEmail}
                              disabled={!shareEmail.trim()}
                            >
                              <i className="ri-send-plane-line me-1"></i>
                              Send
                            </button>
                            <button
                              type="button"
                              className="ti-btn ti-btn-light"
                              onClick={() => {
                                setShowEmailInput(false)
                                setShareEmail('')
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">No student selected</div>
              )}
            </div>
            <div className="ti-modal-footer">
              <button 
                type="button" 
                className="ti-btn ti-btn-light" 
                data-hs-overlay="#share-student-modal"
                onClick={() => {
                  setShareStudent(null)
                  setShowEmailInput(false)
                  setShareEmail('')
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden trigger button for view student modal (needed for Preline) */}
      <button 
        id="view-student-modal-trigger"
        type="button"
        style={{ display: 'none' }}
        data-hs-overlay="#view-student-modal"
      ></button>

      {/* View Student Detailed Modal */}
      <div 
        id="view-student-modal" 
        className="hs-overlay hidden ti-modal"
      >
        <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out lg:!max-w-4xl lg:w-full m-3 lg:!mx-auto">
          <div className="ti-modal-content">
            <div className="ti-modal-header">
              <h6 className="ti-modal-title flex items-center gap-2">
                <i className="ri-eye-line text-primary"></i>
                Student Details
              </h6>
              <button 
                type="button" 
                className="hs-dropdown-toggle ti-modal-close-btn" 
                data-hs-overlay="#view-student-modal"
                onClick={() => setViewStudent(null)}
              >
                <span className="sr-only">Close</span>
                <svg className="w-3.5 h-3.5" width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0.258206 1.00652C0.351976 0.912791 0.479126 0.860131 0.611706 0.860131C0.744296 0.860131 0.871447 0.912791 0.965207 1.00652L3.61171 3.65302L6.25822 1.00652C6.30432 0.958771 6.35952 0.920671 6.42052 0.894471C6.48152 0.868271 6.54712 0.854471 6.61352 0.853901C6.67992 0.853321 6.74572 0.865971 6.80722 0.891111C6.86862 0.916251 6.92442 0.953381 6.97142 1.00032C7.01832 1.04727 7.05552 1.1031 7.08062 1.16454C7.10572 1.22599 7.11842 1.29183 7.11782 1.35822C7.11722 1.42461 7.10342 1.49022 7.07722 1.55122C7.05102 1.61222 7.01292 1.6674 6.96522 1.71352L4.31871 4.36002L6.96522 7.00648C7.05632 7.10078 7.10672 7.22708 7.10552 7.35818C7.10442 7.48928 7.05182 7.61468 6.95912 7.70738C6.86642 7.80018 6.74102 7.85268 6.60992 7.85388C6.47882 7.85498 6.35252 7.80458 6.25822 7.71348L3.61171 5.06702L0.965207 7.71348C0.870907 7.80458 0.744606 7.85498 0.613506 7.85388C0.482406 7.85268 0.357007 7.80018 0.264297 7.70738C0.171597 7.61468 0.119017 7.48928 0.117877 7.35818C0.116737 7.22708 0.167126 7.10078 0.258206 7.00648L2.90471 4.36002L0.258206 1.71352C0.164476 1.61976 0.111816 1.4926 0.111816 1.36002C0.111816 1.22744 0.164476 1.10028 0.258206 1.00652Z" fill="currentColor"/>
                </svg>
              </button>
            </div>
            <div className="ti-modal-body">
              {viewStudentLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="mt-4 text-gray-500 dark:text-gray-400">Loading student details...</p>
                </div>
              ) : viewStudent ? (
                <div className="space-y-6">
                  {/* Student Header */}
                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 dark:border-primary/30 rounded-lg">
                    <img
                      src={viewStudent.profileImageUrl || '/assets/images/faces/1.jpg'}
                      alt={viewStudent.user?.name || 'Student'}
                      className="w-20 h-20 rounded-full object-cover border-2 border-primary/30"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/assets/images/faces/1.jpg'
                      }}
                    />
                    <div className="flex-1">
                      <h6 className="font-bold text-gray-800 dark:text-white text-xl mb-1">{viewStudent.user?.name || 'Unknown'}</h6>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <i className="ri-mail-line"></i>
                          {viewStudent.user?.email || 'N/A'}
                        </span>
                        {viewStudent.phone && (
                          <span className="flex items-center gap-1">
                            <i className="ri-phone-line"></i>
                            {viewStudent.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <i className="ri-user-settings-line"></i>
                          Status: <span className="font-semibold capitalize">{viewStudent.status}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Personal Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {viewStudent.dateOfBirth && (
                      <div className="p-3 bg-gray-50 dark:bg-black/20 rounded-lg border border-gray-200 dark:border-defaultborder/10">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Date of Birth</div>
                        <div className="font-semibold text-gray-800 dark:text-white">
                          {new Date(viewStudent.dateOfBirth).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                    {viewStudent.gender && (
                      <div className="p-3 bg-gray-50 dark:bg-black/20 rounded-lg border border-gray-200 dark:border-defaultborder/10">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Gender</div>
                        <div className="font-semibold text-gray-800 dark:text-white capitalize">{viewStudent.gender}</div>
                      </div>
                    )}
                  </div>

                  {/* Address */}
                  {viewStudent.address && (viewStudent.address.street || viewStudent.address.city || viewStudent.address.state || viewStudent.address.country) && (
                    <div className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg">
                      <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                        <i className="ri-map-pin-line text-primary"></i>
                        Address
                      </h6>
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {[
                          viewStudent.address.street,
                          viewStudent.address.city,
                          viewStudent.address.state,
                          viewStudent.address.zipCode,
                          viewStudent.address.country
                        ].filter(Boolean).join(', ')}
                      </div>
                    </div>
                  )}

                  {/* Education */}
                  {viewStudent.education && viewStudent.education.length > 0 && (
                    <div className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg">
                      <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                        <i className="ri-graduation-cap-line text-primary"></i>
                        Education
                      </h6>
                      <div className="space-y-3">
                        {viewStudent.education.map((edu, index) => (
                          <div key={index} className="p-3 bg-gray-50 dark:bg-black/20 rounded-lg">
                            <div className="font-semibold text-gray-800 dark:text-white">
                              {edu.degree || 'N/A'} {edu.institution && `- ${edu.institution}`}
                            </div>
                            {edu.fieldOfStudy && (
                              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Field: {edu.fieldOfStudy}</div>
                            )}
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {edu.startDate && new Date(edu.startDate).toLocaleDateString()} - {' '}
                              {edu.isCurrent ? 'Present' : (edu.endDate ? new Date(edu.endDate).toLocaleDateString() : 'N/A')}
                            </div>
                            {edu.description && (
                              <div className="text-sm text-gray-700 dark:text-gray-300 mt-2">{edu.description}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Work Experience */}
                  {viewStudent.experience && viewStudent.experience.length > 0 && (
                    <div className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg">
                      <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                        <i className="ri-briefcase-line text-primary"></i>
                        Work Experience
                      </h6>
                      <div className="space-y-3">
                        {viewStudent.experience.map((exp, index) => (
                          <div key={index} className="p-3 bg-gray-50 dark:bg-black/20 rounded-lg">
                            <div className="font-semibold text-gray-800 dark:text-white">
                              {exp.title || 'N/A'} {exp.company && `at ${exp.company}`}
                            </div>
                            {exp.location && (
                              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                <i className="ri-map-pin-line"></i> {exp.location}
                              </div>
                            )}
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {exp.startDate && new Date(exp.startDate).toLocaleDateString()} - {' '}
                              {exp.isCurrent ? 'Present' : (exp.endDate ? new Date(exp.endDate).toLocaleDateString() : 'N/A')}
                            </div>
                            {exp.description && (
                              <div className="text-sm text-gray-700 dark:text-gray-300 mt-2">{exp.description}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Skills */}
                  {viewStudent.skills && viewStudent.skills.length > 0 && (
                    <div className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg">
                      <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                        <i className="ri-tools-line text-primary"></i>
                        Skills
                      </h6>
                      <div className="flex flex-wrap gap-2">
                        {viewStudent.skills.map((skill, index) => (
                          <span
                            key={index}
                            className="badge bg-primary/10 text-primary border border-primary/30 px-3 py-1 rounded-md text-sm font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Documents */}
                  {viewStudent.documents && viewStudent.documents.length > 0 && (
                    <div className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg">
                      <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                        <i className="ri-file-line text-primary"></i>
                        Documents
                      </h6>
                      <div className="space-y-2">
                        {viewStudent.documents.map((doc, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-black/20 rounded-lg">
                            <div className="flex items-center gap-2">
                              <i className="ri-file-text-line text-primary"></i>
                              <div>
                                <div className="font-medium text-gray-800 dark:text-white">{doc.name}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{doc.type}</div>
                              </div>
                            </div>
                            {doc.fileUrl && (
                              <a
                                href={doc.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ti-btn ti-btn-sm ti-btn-primary"
                              >
                                <i className="ri-external-link-line"></i>
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bio */}
                  {viewStudent.bio && (
                    <div className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg">
                      <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                        <i className="ri-file-text-line text-primary"></i>
                        Bio
                      </h6>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {viewStudent.bio}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">No student selected</div>
              )}
            </div>
            <div className="ti-modal-footer">
              <button 
                type="button" 
                className="ti-btn ti-btn-light" 
                data-hs-overlay="#view-student-modal"
                onClick={() => setViewStudent(null)}
              >
                Close
              </button>
              {viewStudent && (
                <Link
                  href={`/training/students/edit/?id=${encodeURIComponent(viewStudent.id)}`}
                  className="ti-btn ti-btn-primary"
                  onClick={() => {
                    const trigger = document.getElementById('view-student-modal-trigger')
                    if (trigger) {
                      trigger.click()
                    }
                  }}
                >
                  <i className="ri-pencil-line me-1"></i>
                  Edit Student
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  )
}

export default Students
