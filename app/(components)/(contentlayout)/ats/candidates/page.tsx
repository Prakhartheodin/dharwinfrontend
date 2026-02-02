"use client"
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useMemo, useState, useEffect } from 'react'
import { useTable, useSortBy, useGlobalFilter, usePagination } from 'react-table'
import Link from 'next/link'
import { Range, getTrackBackground } from "react-range"

// Mock data for candidates
const CANDIDATES_DATA = [
  {
    id: '1',
    name: 'John Anderson',
    displayPicture: '/assets/images/faces/1.jpg',
    phone: '+1 (555) 123-4567',
    email: 'john.anderson@example.com',
    skills: ['React', 'Node.js', 'TypeScript', 'AWS', 'MongoDB'],
    education: 'BS Computer Science - Stanford University (2018)',
    experience: 6,
    bio: 'Experienced full-stack developer with 6+ years in building scalable web applications. Passionate about clean code and modern technologies.',
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    displayPicture: '/assets/images/faces/2.jpg',
    phone: '+1 (555) 234-5678',
    email: 'sarah.johnson@example.com',
    skills: ['Product Management', 'Agile', 'Scrum', 'JIRA', 'Analytics'],
    education: 'MBA - Harvard Business School (2019)',
    experience: 4,
    bio: 'Strategic product manager with 4+ years of experience in building and launching successful products. Strong background in user research and data-driven decision making.',
  },
  {
    id: '3',
    name: 'Michael Chen',
    displayPicture: '/assets/images/faces/3.jpg',
    phone: '+1 (555) 345-6789',
    email: 'michael.chen@example.com',
    skills: ['Vue.js', 'JavaScript', 'CSS', 'HTML', 'Responsive Design'],
    education: 'BS Web Development - UC Berkeley (2020)',
    experience: 3,
    bio: 'Creative frontend developer specializing in creating beautiful and intuitive user interfaces. Expert in modern CSS frameworks and responsive design.',
  },
  {
    id: '4',
    name: 'Emily Davis',
    displayPicture: '/assets/images/faces/4.jpg',
    phone: '+1 (555) 456-7890',
    email: 'emily.davis@example.com',
    skills: ['Python', 'Machine Learning', 'TensorFlow', 'SQL', 'Data Visualization'],
    education: 'MS Data Science - MIT (2021)',
    experience: 3,
    bio: 'Data scientist passionate about extracting insights from complex datasets. Experienced in building predictive models and creating data-driven solutions.',
  },
  {
    id: '5',
    name: 'David Brown',
    displayPicture: '/assets/images/faces/5.jpg',
    phone: '+1 (555) 567-8901',
    email: 'david.brown@example.com',
    skills: ['Docker', 'Kubernetes', 'CI/CD', 'AWS', 'Linux'],
    education: 'BS Computer Engineering - Carnegie Mellon (2018)',
    experience: 5,
    bio: 'DevOps engineer with expertise in cloud infrastructure and automation. Passionate about improving deployment pipelines and system reliability.',
  },
  {
    id: '6',
    name: 'Lisa Anderson',
    displayPicture: '/assets/images/faces/6.jpg',
    phone: '+1 (555) 678-9012',
    email: 'lisa.anderson@example.com',
    skills: ['Figma', 'Adobe XD', 'User Research', 'Prototyping', 'UI/UX Design'],
    education: 'BFA Graphic Design - Art Center College (2019)',
    experience: 4,
    bio: 'UX designer focused on creating meaningful user experiences. Strong background in user research, wireframing, and visual design.',
  },
  {
    id: '7',
    name: 'Robert Wilson',
    displayPicture: '/assets/images/faces/7.jpg',
    phone: '+1 (555) 789-0123',
    email: 'robert.wilson@example.com',
    skills: ['Java', 'Spring Boot', 'MySQL', 'Redis', 'Microservices'],
    education: 'BS Software Engineering - Georgia Tech (2017)',
    experience: 6,
    bio: 'Backend developer specializing in building scalable and efficient server-side applications. Expert in RESTful APIs and microservices architecture.',
  },
  {
    id: '8',
    name: 'Jessica Martinez',
    displayPicture: '/assets/images/faces/8.jpg',
    phone: '+1 (555) 890-1234',
    email: 'jessica.martinez@example.com',
    skills: ['Digital Marketing', 'SEO', 'Content Strategy', 'Analytics', 'Social Media'],
    education: 'BA Marketing - UCLA (2018)',
    experience: 5,
    bio: 'Marketing professional with expertise in digital marketing strategies and brand development. Proven track record of driving growth and engagement.',
  },
  {
    id: '9',
    name: 'Thomas Lee',
    displayPicture: '/assets/images/faces/9.jpg',
    phone: '+1 (555) 901-2345',
    email: 'thomas.lee@example.com',
    skills: ['Sales', 'CRM', 'Negotiation', 'Account Management', 'Business Development'],
    education: 'BA Business Administration - USC (2020)',
    experience: 3,
    bio: 'Results-driven sales executive with strong relationship-building skills. Experienced in B2B sales and enterprise account management.',
  },
  {
    id: '10',
    name: 'Jennifer White',
    displayPicture: '/assets/images/faces/10.jpg',
    phone: '+1 (555) 012-3456',
    email: 'jennifer.white@example.com',
    skills: ['Selenium', 'Test Automation', 'QA Testing', 'JIRA', 'API Testing'],
    education: 'BS Computer Science - UC San Diego (2019)',
    experience: 4,
    bio: 'QA engineer dedicated to ensuring software quality through comprehensive testing strategies. Expert in test automation and bug tracking.',
  },
  {
    id: '11',
    name: 'Christopher Taylor',
    displayPicture: '/assets/images/faces/11.jpg',
    phone: '+1 (555) 123-4568',
    email: 'christopher.taylor@example.com',
    skills: ['React', 'Node.js', 'PostgreSQL', 'GraphQL', 'TypeScript'],
    education: 'BS Computer Science - University of Washington (2018)',
    experience: 5,
    bio: 'Full-stack developer with expertise in modern JavaScript frameworks. Passionate about building complete web applications from frontend to backend.',
  },
  {
    id: '12',
    name: 'Amanda Garcia',
    displayPicture: '/assets/images/faces/12.jpg',
    phone: '+1 (555) 234-5679',
    email: 'amanda.garcia@example.com',
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
  const experiences = CANDIDATES_DATA.map(candidate => candidate.experience || 0)
  return {
    min: Math.min(...experiences),
    max: Math.max(...experiences)
  }
}

const experienceRangesConst = getExperienceRanges()

// Note type for candidate notes
interface CandidateNote {
  id: string
  candidateId: string
  note: string
  visibility: 'public' | 'private'
  postedBy: string
  postedDate: string
}

const Candidates = () => {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [candidateNotes, setCandidateNotes] = useState<CandidateNote[]>([])
  const [previewCandidate, setPreviewCandidate] = useState<any>(null)
  const [notesCandidateId, setNotesCandidateId] = useState<string | null>(null)
  const [newNote, setNewNote] = useState({ text: '', visibility: 'public' as 'public' | 'private' })
  const [shareCandidate, setShareCandidate] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [showEmailInput, setShowEmailInput] = useState(false)
  const [selectedSort, setSelectedSort] = useState<string>('')
  
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

  // Handle add note - open notes sidebar
  const handleAddNote = (id: string, candidate?: any) => {
    // Open the notes sidebar
    setNotesCandidateId(id)
    
    // Trigger the panel via Preline's trigger button
    setTimeout(() => {
      const trigger = document.getElementById('candidate-notes-panel-trigger')
      if (trigger) {
        trigger.click()
      }
    }, 100)
  }

  // Get notes for a specific candidate
  const getCandidateNotes = (candidateId: string) => {
    return candidateNotes.filter(note => note.candidateId === candidateId).sort((a, b) => 
      new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime()
    )
  }

  // Add a new note
  const handleAddNoteSubmit = () => {
    if (!notesCandidateId || !newNote.text.trim()) return
    
    const note: CandidateNote = {
      id: `note-${Date.now()}`,
      candidateId: notesCandidateId,
      note: newNote.text,
      visibility: newNote.visibility,
      postedBy: 'John Doe', // This would come from user context in real app
      postedDate: new Date().toISOString()
    }
    
    setCandidateNotes([...candidateNotes, note])
    setNewNote({ text: '', visibility: 'public' })
  }

  // Delete a note
  const handleDeleteNote = (noteId: string) => {
    setCandidateNotes(candidateNotes.filter(note => note.id !== noteId))
  }

  // Get candidate details for the notes sidebar
  const getCandidateDetails = () => {
    if (!notesCandidateId) return null
    return CANDIDATES_DATA.find(candidate => candidate.id === notesCandidateId)
  }

  // Generate public URL for candidate
  const getCandidatePublicUrl = (candidateId: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/ats/candidates/${candidateId}`
    }
    return `https://example.com/ats/candidates/${candidateId}`
  }

  // Export candidate documents
  const handleExportDocs = (candidate: any, type: 'all' | 'resume' | 'cover-letter' = 'all') => {
    // TODO: Implement document export functionality
    console.log(`Exporting ${type} for candidate:`, candidate.id)
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
  const handleShareWhatsApp = (candidate: any) => {
    const url = getCandidatePublicUrl(candidate.id)
    const text = `Check out this candidate: ${candidate.name} - ${url}`
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
    console.log('Sending email to:', shareEmail, 'for candidate:', shareCandidate?.id)
    // Reset after sending
    setShareEmail('')
    setShowEmailInput(false)
  }

  // Handle share button click
  const handleShareClick = (candidate: any) => {
    setShareCandidate(candidate)
    setShowEmailInput(false)
    setShareEmail('')
    setTimeout(() => {
      const trigger = document.getElementById('share-candidate-modal-trigger')
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
        Header: 'Candidate Info',
        accessor: 'candidateInfo',
        Cell: ({ row }: any) => {
          const candidate = row.original
          return (
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <img
                  src={candidate.displayPicture || '/assets/images/faces/1.jpg'}
                  alt={candidate.name}
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
                    setPreviewCandidate(candidate)
                    // Trigger the panel via Preline's trigger button
                    setTimeout(() => {
                      const trigger = document.getElementById('candidate-preview-panel-trigger')
                      if (trigger) {
                        trigger.click()
                      }
                    }, 100)
                  }}
                >
                  {candidate.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  <div className="flex items-center gap-1">
                    <i className="ri-phone-line"></i>
                    {candidate.phone}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <i className="ri-mail-line"></i>
                    {candidate.email}
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
          const candidate = row.original
          return (
            <div className="flex flex-wrap gap-1.5">
              {candidate.skills?.slice(0, 3).map((skill: string, index: number) => (
                <span
                  key={index}
                  className="badge bg-primary/10 text-primary border border-primary/30 px-2 py-1 rounded-md text-xs font-medium"
                >
                  {skill}
                </span>
              ))}
              {candidate.skills?.length > 3 && (
                <span className="badge bg-gray-100 dark:bg-black/20 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-md text-xs font-medium">
                  +{candidate.skills.length - 3}
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
          const candidate = row.original
          // Parse education: split by " - " to separate degree and university
          const educationParts = candidate.education ? candidate.education.split(' - ') : ['', '']
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
              title={candidate.education}
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
          const candidate = row.original
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
              title={candidate.bio}
            >
              {candidate.bio}
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
                className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-info"
                title="Edit Candidate"
              >
                <i className="ri-pencil-line"></i>
                <span
                  className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                  role="tooltip">
                  Edit Candidate
                </span>
              </button>
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
          </div>
        ),
      },
    ],
    [selectedRows]
  )

  // Filter data based on filter state
  const filteredData = useMemo(() => {
    return CANDIDATES_DATA.filter((candidate) => {
      // Name filter (array)
      if (filters.name.length > 0 && !filters.name.some(name => 
        candidate.name.toLowerCase().includes(name.toLowerCase())
      )) {
        return false
      }
      
      // Skills filter (array)
      if (filters.skills.length > 0 && !filters.skills.some(skill => 
        candidate.skills?.some(candidateSkill => 
          candidateSkill.toLowerCase().includes(skill.toLowerCase())
        )
      )) {
        return false
      }
      
      // Education filter (array)
      if (filters.education.length > 0 && !filters.education.some(edu => 
        candidate.education.toLowerCase().includes(edu.toLowerCase())
      )) {
        return false
      }
      
      // Email filter (string)
      if (filters.email && !candidate.email.toLowerCase().includes(filters.email.toLowerCase())) {
        return false
      }
      
      // Experience filter (range)
      if (filters.experience[0] !== experienceRangesConst.min || filters.experience[1] !== experienceRangesConst.max) {
        const candidateExperience = candidate.experience || 0
        if (candidateExperience < filters.experience[0] || candidateExperience > filters.experience[1]) {
          return false
        }
      }
      
      return true
    })
  }, [filters])

  const data = useMemo(() => filteredData, [filteredData])

  // Get unique values for dropdown filters
  const allSkills = useMemo(() => {
    const skillSet = new Set<string>()
    CANDIDATES_DATA.forEach(candidate => {
      candidate.skills?.forEach(skill => skillSet.add(skill))
    })
    return Array.from(skillSet).sort()
  }, [])

  const allEducation = useMemo(() => {
    return [...new Set(CANDIDATES_DATA.map(candidate => candidate.education))].sort()
  }, [])

  const allNames = useMemo(() => {
    return [...new Set(CANDIDATES_DATA.map(candidate => candidate.name))].sort()
  }, [])

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
      initialState: { pageIndex: 0, pageSize: 10 },
    },
    useSortBy,
    usePagination
  )

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    state,
    page,
    nextPage,
    previousPage,
    canNextPage,
    canPreviousPage,
    pageOptions,
    gotoPage,
    pageCount,
    setPageSize,
    setSortBy,
  } = tableInstance

  const { pageIndex, pageSize } = state

  // Handle sort selection
  const handleSortChange = (sortOption: string) => {
    setSelectedSort(sortOption)
    
    switch(sortOption) {
      case 'name-asc':
        setSortBy([{ id: 'candidateInfo', desc: false }])
        break
      case 'name-desc':
        setSortBy([{ id: 'candidateInfo', desc: true }])
        break
      case 'skills-asc':
        setSortBy([{ id: 'skills', desc: false }])
        break
      case 'skills-desc':
        setSortBy([{ id: 'skills', desc: true }])
        break
      case 'education-asc':
        setSortBy([{ id: 'education', desc: false }])
        break
      case 'education-desc':
        setSortBy([{ id: 'education', desc: true }])
        break
      case 'clear-sort':
        setSortBy([])
        setSelectedSort('')
        break
      default:
        setSortBy([])
    }
  }

  // Handle select all checkbox - select ALL rows in filtered dataset
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = new Set(filteredData.map((candidate) => candidate.id))
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
  
      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-8rem)]">
        <div className="xl:col-span-12 col-span-12 h-full flex flex-col">
          <div className="box custom-box h-full flex flex-col">
            <div className="box-header flex items-center justify-between flex-wrap gap-4">
              <div className="box-title">
                Candidates
                <span className="badge bg-light text-default rounded-full ms-1 text-[0.75rem] align-middle">
                  {filteredData.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  className="form-control !w-auto !py-1 !px-4 !text-[0.75rem] me-2"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
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
                  href="#!"
                  scroll={false}
                  className="hs-dropdown-toggle ti-btn ti-btn-primary-full !py-1 !px-2 !text-[0.75rem] me-2"
                  data-hs-overlay="#create-candidate-modal"
                >
                  <i className="ri-add-line font-semibold align-middle"></i>Add Candidate
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
                  data-hs-overlay="#candidates-filter-panel"
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
                    {page.map((row: any) => {
                      prepareRow(row)
                      return (
                        <tr {...row.getRowProps()} className="border-b border-gray-300 dark:border-gray-600" key={Math.random()}>
                          {row.cells.map((cell: any) => {
                            return (
                              <td {...cell.getCellProps()} key={Math.random()}>
                                {cell.render('Cell')}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="box-footer !border-t-0">
              <div className="flex items-center flex-wrap gap-4">
                <div>
                  Showing {pageIndex * pageSize + 1} to {Math.min((pageIndex + 1) * pageSize, data.length)} of {data.length} entries{' '}
                  <i className="bi bi-arrow-right ms-2 font-semibold"></i>
                </div>
                <div className="ms-auto">
                  <nav aria-label="Page navigation" className="pagination-style-4">
                    <ul className="ti-pagination mb-0">
                      <li className={`page-item ${!canPreviousPage ? 'disabled' : ''}`}>
                        <button
                          className="page-link px-3 py-[0.375rem]"
                          onClick={() => previousPage()}
                          disabled={!canPreviousPage}
                        >
                          Prev
                        </button>
                      </li>
                      {pageOptions.length <= 7 ? (
                        // Show all pages if 7 or fewer
                        pageOptions.map((page: number) => (
                          <li
                            key={page}
                            className={`page-item ${pageIndex === page ? 'active' : ''}`}
                          >
                            <button
                              className="page-link px-3 py-[0.375rem]"
                              onClick={() => gotoPage(page)}
                            >
                              {page + 1}
                            </button>
                          </li>
                        ))
                      ) : (
                        // Show smart pagination for more pages
                        <>
                          {pageIndex > 2 && (
                            <>
                              <li className="page-item">
                                <button
                                  className="page-link px-3 py-[0.375rem]"
                                  onClick={() => gotoPage(0)}
                                >
                                  1
                                </button>
                              </li>
                              {pageIndex > 3 && (
                                <li className="page-item disabled">
                                  <span className="page-link px-3 py-[0.375rem]">...</span>
                                </li>
                              )}
                            </>
                          )}
                          {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
                            let pageNum
                            if (pageIndex < 3) {
                              pageNum = i
                            } else if (pageIndex > pageCount - 4) {
                              pageNum = pageCount - 5 + i
                            } else {
                              pageNum = pageIndex - 2 + i
                            }
                            return (
                              <li
                                key={pageNum}
                                className={`page-item ${pageIndex === pageNum ? 'active' : ''}`}
                              >
                                <button
                                  className="page-link px-3 py-[0.375rem]"
                                  onClick={() => gotoPage(pageNum)}
                                >
                                  {pageNum + 1}
                                </button>
                              </li>
                            )
                          })}
                          {pageIndex < pageCount - 3 && (
                            <>
                              {pageIndex < pageCount - 4 && (
                                <li className="page-item disabled">
                                  <span className="page-link px-3 py-[0.375rem]">...</span>
                                </li>
                              )}
                              <li className="page-item">
                                <button
                                  className="page-link px-3 py-[0.375rem]"
                                  onClick={() => gotoPage(pageCount - 1)}
                                >
                                  {pageCount}
                                </button>
                              </li>
                            </>
                          )}
                        </>
                      )}
                      <li className={`page-item ${!canNextPage ? 'disabled' : ''}`}>
                        <button
                          className="page-link px-3 py-[0.375rem] text-primary"
                          onClick={() => nextPage()}
                          disabled={!canNextPage}
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

      {/* Filter Panel Offcanvas */}
      <div id="candidates-filter-panel" className="hs-overlay hidden ti-offcanvas ti-offcanvas-right !z-[105]" tabIndex={-1}>
        <div className="ti-offcanvas-header bg-gray-50 dark:bg-black/20 !py-2.5">
          <h6 className="ti-offcanvas-title text-base font-semibold flex items-center gap-2">
            <i className="ri-search-line text-primary text-base"></i>
            Search Candidates
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
                data-hs-overlay="#candidates-filter-panel"
              >
                <i className="ri-close-line me-1.5"></i>Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden trigger button for candidate preview panel (needed for Preline) */}
      <button 
        id="candidate-preview-panel-trigger"
        type="button"
        style={{ display: 'none' }}
        data-hs-overlay="#candidate-preview-panel"
      ></button>

      {/* Candidate Preview Panel (Offcanvas) */}
      <div 
        id="candidate-preview-panel" 
        className="hs-overlay hidden ti-offcanvas ti-offcanvas-right !z-[105] !max-w-[50rem] lg:!max-w-[60rem]"
        tabIndex={-1}
      >
        <div className="ti-offcanvas-header bg-gray-50 dark:bg-black/20 !py-2.5">
          <h6 className="ti-offcanvas-title text-base font-semibold flex items-center gap-2">
            <i className="ri-user-line text-primary text-base"></i>
            {previewCandidate?.name || 'Candidate Profile'}
          </h6>
          <button 
            type="button" 
            className="hs-dropdown-toggle ti-btn flex-shrink-0 p-0 transition-none text-gray-500 hover:text-gray-700 focus:ring-gray-400 focus:ring-offset-white dark:text-[#8c9097] dark:text-white/50 dark:hover:text-white/80 dark:focus:ring-white/10 dark:focus:ring-offset-white/10 hover:bg-gray-100 dark:hover:bg-black/40 rounded-md p-1" 
            data-hs-overlay="#candidate-preview-panel"
            onClick={() => setPreviewCandidate(null)}
          >
            <span className="sr-only">Close</span>
            <svg className="w-3.5 h-3.5" width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0.258206 1.00652C0.351976 0.912791 0.479126 0.860131 0.611706 0.860131C0.744296 0.860131 0.871447 0.912791 0.965207 1.00652L3.61171 3.65302L6.25822 1.00652C6.30432 0.958771 6.35952 0.920671 6.42052 0.894471C6.48152 0.868271 6.54712 0.854471 6.61352 0.853901C6.67992 0.853321 6.74572 0.865971 6.80722 0.891111C6.86862 0.916251 6.92442 0.953381 6.97142 1.00032C7.01832 1.04727 7.05552 1.1031 7.08062 1.16454C7.10572 1.22599 7.11842 1.29183 7.11782 1.35822C7.11722 1.42461 7.10342 1.49022 7.07722 1.55122C7.05102 1.61222 7.01292 1.6674 6.96522 1.71352L4.31871 4.36002L6.96522 7.00648C7.05632 7.10078 7.10672 7.22708 7.10552 7.35818C7.10442 7.48928 7.05182 7.61468 6.95912 7.70738C6.86642 7.80018 6.74102 7.85268 6.60992 7.85388C6.47882 7.85498 6.35252 7.80458 6.25822 7.71348L3.61171 5.06702L0.965207 7.71348C0.870907 7.80458 0.744606 7.85498 0.613506 7.85388C0.482406 7.85268 0.357007 7.80018 0.264297 7.70738C0.171597 7.61468 0.119017 7.48928 0.117877 7.35818C0.116737 7.22708 0.167126 7.10078 0.258206 7.00648L2.90471 4.36002L0.258206 1.71352C0.164476 1.61976 0.111816 1.4926 0.111816 1.36002C0.111816 1.22744 0.164476 1.10028 0.258206 1.00652Z" fill="currentColor"/>
            </svg>
          </button>
        </div>
        <div className="ti-offcanvas-body !p-4">
          {previewCandidate ? (
            <div className="space-y-4">
              {/* Candidate Header Info */}
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 dark:border-primary/30 rounded-lg">
                <img
                  src={previewCandidate.displayPicture || '/assets/images/faces/1.jpg'}
                  alt={previewCandidate.name}
                  className="w-16 h-16 rounded-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/images/faces/1.jpg'
                  }}
                />
                <div className="flex-1">
                  <h6 className="font-bold text-gray-800 dark:text-white text-xl mb-1">{previewCandidate.name}</h6>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <i className="ri-mail-line"></i>
                      {previewCandidate.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <i className="ri-phone-line"></i>
                      {previewCandidate.phone}
                    </span>
                  </div>
                </div>
              </div>

              {/* Key Details Grid */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-black/20 rounded-lg">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Education</div>
                  <div className="font-semibold text-gray-800 dark:text-white">{previewCandidate.education}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Skills</div>
                  <div className="flex flex-wrap gap-1.5">
                    {previewCandidate.skills?.map((skill: string, index: number) => (
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
              {previewCandidate.bio && (
                <div className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg">
                  <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                    <i className="ri-file-text-line text-primary"></i>
                    Bio
                  </h6>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {previewCandidate.bio}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-200 dark:border-defaultborder/10 flex gap-3">
                <button 
                  type="button" 
                  className="hs-dropdown-toggle ti-btn ti-btn-light flex-1" 
                  data-hs-overlay="#candidate-preview-panel"
                  onClick={() => setPreviewCandidate(null)}
                >
                  Close
                </button>
                <button type="button" className="ti-btn ti-btn-primary flex-1">
                  View Full Profile
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No candidate selected</div>
          )}
        </div>
      </div>

      {/* Hidden trigger button for candidate notes panel (needed for Preline) */}
      <button 
        id="candidate-notes-panel-trigger"
        type="button"
        style={{ display: 'none' }}
        data-hs-overlay="#candidate-notes-panel"
      ></button>

      {/* Candidate Notes Panel (Offcanvas) */}
      <div 
        id="candidate-notes-panel" 
        className="hs-overlay hidden ti-offcanvas ti-offcanvas-right !z-[105]"
        tabIndex={-1}
      >
        <div className="ti-offcanvas-header bg-gray-50 dark:bg-black/20 !py-2.5">
          <h6 className="ti-offcanvas-title text-base font-semibold flex items-center gap-2">
            <i className="ri-file-add-line text-primary text-base"></i>
            {getCandidateDetails()?.name || 'Candidate Notes'}
          </h6>
          <button 
            type="button" 
            className="hs-dropdown-toggle ti-btn flex-shrink-0 p-0 transition-none text-gray-500 hover:text-gray-700 focus:ring-gray-400 focus:ring-offset-white dark:text-[#8c9097] dark:text-white/50 dark:hover:text-white/80 dark:focus:ring-white/10 dark:focus:ring-offset-white/10 hover:bg-gray-100 dark:hover:bg-black/40 rounded-md p-1" 
            data-hs-overlay="#candidate-notes-panel"
            onClick={() => setNotesCandidateId(null)}
          >
            <span className="sr-only">Close</span>
            <svg className="w-3.5 h-3.5" width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0.258206 1.00652C0.351976 0.912791 0.479126 0.860131 0.611706 0.860131C0.744296 0.860131 0.871447 0.912791 0.965207 1.00652L3.61171 3.65302L6.25822 1.00652C6.30432 0.958771 6.35952 0.920671 6.42052 0.894471C6.48152 0.868271 6.54712 0.854471 6.61352 0.853901C6.67992 0.853321 6.74572 0.865971 6.80722 0.891111C6.86862 0.916251 6.92442 0.953381 6.97142 1.00032C7.01832 1.04727 7.05552 1.1031 7.08062 1.16454C7.10572 1.22599 7.11842 1.29183 7.11782 1.35822C7.11722 1.42461 7.10342 1.49022 7.07722 1.55122C7.05102 1.61222 7.01292 1.6674 6.96522 1.71352L4.31871 4.36002L6.96522 7.00648C7.05632 7.10078 7.10672 7.22708 7.10552 7.35818C7.10442 7.48928 7.05182 7.61468 6.95912 7.70738C6.86642 7.80018 6.74102 7.85268 6.60992 7.85388C6.47882 7.85498 6.35252 7.80458 6.25822 7.71348L3.61171 5.06702L0.965207 7.71348C0.870907 7.80458 0.744606 7.85498 0.613506 7.85388C0.482406 7.85268 0.357007 7.80018 0.264297 7.70738C0.171597 7.61468 0.119017 7.48928 0.117877 7.35818C0.116737 7.22708 0.167126 7.10078 0.258206 7.00648L2.90471 4.36002L0.258206 1.71352C0.164476 1.61976 0.111816 1.4926 0.111816 1.36002C0.111816 1.22744 0.164476 1.10028 0.258206 1.00652Z" fill="currentColor"/>
            </svg>
          </button>
        </div>
        <div className="ti-offcanvas-body !p-4">
          {notesCandidateId ? (
            <div className="space-y-6">
              {/* Candidate Info Header */}
              {(() => {
                const candidateDetails = getCandidateDetails()
                return candidateDetails ? (
                  <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 dark:border-primary/30 rounded-lg">
                    <h6 className="font-bold text-gray-800 dark:text-white text-lg mb-2">{candidateDetails.name}</h6>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <i className="ri-mail-line"></i>
                        {candidateDetails.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <i className="ri-phone-line"></i>
                        {candidateDetails.phone}
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
                  Notes ({getCandidateNotes(notesCandidateId).length})
                </h6>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {getCandidateNotes(notesCandidateId).length > 0 ? (
                    getCandidateNotes(notesCandidateId).map((note) => (
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
            <div className="text-center py-8 text-gray-500">No job selected</div>
          )}
        </div>
      </div>

      {/* Hidden trigger button for share modal (needed for Preline) */}
      <button 
        id="share-candidate-modal-trigger"
        type="button"
        style={{ display: 'none' }}
        data-hs-overlay="#share-candidate-modal"
      ></button>

      {/* Share Candidate Modal */}
      <div 
        id="share-candidate-modal" 
        className="hs-overlay hidden ti-modal"
      >
        <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out lg:!max-w-lg lg:w-full m-3 lg:!mx-auto">
          <div className="ti-modal-content">
            <div className="ti-modal-header">
              <h6 className="ti-modal-title flex items-center gap-2">
                <i className="ri-share-line text-primary"></i>
                Share Candidate
              </h6>
              <button 
                type="button" 
                className="hs-dropdown-toggle ti-modal-close-btn" 
                data-hs-overlay="#share-candidate-modal"
                onClick={() => {
                  setShareCandidate(null)
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
              {shareCandidate ? (
                <div className="space-y-4">
                  {/* Candidate Info */}
                  <div className="p-3 bg-gray-50 dark:bg-black/20 rounded-lg border border-gray-200 dark:border-defaultborder/10">
                    <h6 className="font-semibold text-gray-800 dark:text-white mb-1">{shareCandidate.name}</h6>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {shareCandidate.email} • {shareCandidate.phone}
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
                        value={getCandidatePublicUrl(shareCandidate.id)}
                        readOnly
                      />
                      <button
                        type="button"
                        className={`ti-btn ${copied ? 'ti-btn-success' : 'ti-btn-primary'}`}
                        onClick={() => handleCopyUrl(getCandidatePublicUrl(shareCandidate.id))}
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
                        onClick={() => handleShareWhatsApp(shareCandidate)}
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
                <div className="text-center py-4 text-gray-500">No candidate selected</div>
              )}
            </div>
            <div className="ti-modal-footer">
              <button 
                type="button" 
                className="ti-btn ti-btn-light" 
                data-hs-overlay="#share-candidate-modal"
                onClick={() => {
                  setShareCandidate(null)
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
    </Fragment>
  )
}

export default Candidates
