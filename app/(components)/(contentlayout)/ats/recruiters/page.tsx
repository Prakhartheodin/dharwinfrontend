"use client"
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useMemo, useState, useEffect } from 'react'
import { useTable, useSortBy, useGlobalFilter, usePagination } from 'react-table'
import Link from 'next/link'

// Mock data for recruiters
const RECRUITERS_DATA = [
  {
    id: '1',
    name: 'John Anderson',
    displayPicture: '/assets/images/faces/1.jpg',
    phone: '+1 (555) 123-4567',
    email: 'john.anderson@example.com',
    education: 'BS Computer Science - Stanford University (2018)',
    domain: 'Technology',
    location: 'San Francisco, CA',
    profileSummary: 'Experienced recruiter with 6+ years in tech talent acquisition. Specialized in placing software engineers and product managers at top-tier companies.',
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    displayPicture: '/assets/images/faces/2.jpg',
    phone: '+1 (555) 234-5678',
    email: 'sarah.johnson@example.com',
    education: 'MBA - Harvard Business School (2019)',
    domain: 'Finance',
    location: 'New York, NY',
    profileSummary: 'Strategic recruiter with 4+ years in finance and consulting placements. Expert in matching top talent with leading financial institutions.',
  },
  {
    id: '3',
    name: 'Michael Chen',
    displayPicture: '/assets/images/faces/3.jpg',
    phone: '+1 (555) 345-6789',
    email: 'michael.chen@example.com',
    education: 'BS Business Administration - UC Berkeley (2020)',
    domain: 'Healthcare',
    location: 'Los Angeles, CA',
    profileSummary: 'Healthcare recruitment specialist connecting medical professionals with premier healthcare organizations. Strong network in clinical and administrative roles.',
  },
  {
    id: '4',
    name: 'Emily Davis',
    displayPicture: '/assets/images/faces/4.jpg',
    phone: '+1 (555) 456-7890',
    email: 'emily.davis@example.com',
    education: 'MS Human Resources - MIT (2021)',
    domain: 'Technology',
    location: 'Seattle, WA',
    profileSummary: 'Tech recruiter passionate about building diverse engineering teams. Specialized in data science and machine learning talent placement.',
  },
  {
    id: '5',
    name: 'David Brown',
    displayPicture: '/assets/images/faces/5.jpg',
    phone: '+1 (555) 567-8901',
    email: 'david.brown@example.com',
    education: 'BS Business Management - Carnegie Mellon (2018)',
    domain: 'Manufacturing',
    location: 'Chicago, IL',
    profileSummary: 'Manufacturing and operations recruiter with expertise in supply chain and logistics placements. Connecting talent with industrial leaders.',
  },
  {
    id: '6',
    name: 'Lisa Anderson',
    displayPicture: '/assets/images/faces/6.jpg',
    phone: '+1 (555) 678-9012',
    email: 'lisa.anderson@example.com',
    education: 'BA Psychology - Art Center College (2019)',
    domain: 'Marketing',
    location: 'Austin, TX',
    profileSummary: 'Creative marketing recruiter focused on digital marketing and brand strategy roles. Building connections between creative talent and innovative brands.',
  },
  {
    id: '7',
    name: 'Robert Wilson',
    displayPicture: '/assets/images/faces/7.jpg',
    phone: '+1 (555) 789-0123',
    email: 'robert.wilson@example.com',
    education: 'BS Business Administration - Georgia Tech (2017)',
    domain: 'Sales',
    location: 'Boston, MA',
    profileSummary: 'Sales recruitment expert specializing in B2B and enterprise sales placements. Proven track record in building high-performing sales teams.',
  },
  {
    id: '8',
    name: 'Jessica Martinez',
    displayPicture: '/assets/images/faces/8.jpg',
    phone: '+1 (555) 890-1234',
    email: 'jessica.martinez@example.com',
    education: 'BA Marketing - UCLA (2018)',
    domain: 'Retail',
    location: 'Miami, FL',
    profileSummary: 'Retail and consumer goods recruiter connecting talent with leading brands. Expertise in merchandising, operations, and store management roles.',
  },
  {
    id: '9',
    name: 'Thomas Lee',
    displayPicture: '/assets/images/faces/9.jpg',
    phone: '+1 (555) 901-2345',
    email: 'thomas.lee@example.com',
    education: 'BA Business Administration - USC (2020)',
    domain: 'Real Estate',
    location: 'Phoenix, AZ',
    profileSummary: 'Real estate recruitment specialist placing professionals in commercial and residential real estate firms. Strong network in property management.',
  },
  {
    id: '10',
    name: 'Jennifer White',
    displayPicture: '/assets/images/faces/10.jpg',
    phone: '+1 (555) 012-3456',
    email: 'jennifer.white@example.com',
    education: 'BS Human Resources - UC San Diego (2019)',
    domain: 'Education',
    location: 'Denver, CO',
    profileSummary: 'Education sector recruiter connecting educators and administrators with schools and educational institutions. Passionate about educational excellence.',
  },
  {
    id: '11',
    name: 'Christopher Taylor',
    displayPicture: '/assets/images/faces/11.jpg',
    phone: '+1 (555) 123-4568',
    email: 'christopher.taylor@example.com',
    education: 'BS Business Management - University of Washington (2018)',
    domain: 'Technology',
    location: 'Portland, OR',
    profileSummary: 'Full-stack tech recruiter with expertise in modern software development roles. Building connections between developers and innovative tech companies.',
  },
  {
    id: '12',
    name: 'Amanda Garcia',
    displayPicture: '/assets/images/faces/12.jpg',
    phone: '+1 (555) 234-5679',
    email: 'amanda.garcia@example.com',
    education: 'MBA - Northwestern University (2020)',
    domain: 'Consulting',
    location: 'Washington, DC',
    profileSummary: 'Management consulting recruiter placing strategy and operations consultants with top-tier firms. Expert in matching analytical talent with consulting opportunities.',
  },
  {
    id: '13',
    name: 'Daniel Rodriguez',
    displayPicture: '/assets/images/faces/13.jpg',
    phone: '+1 (555) 345-6790',
    email: 'daniel.rodriguez@example.com',
    education: 'MS Business Analytics - Arizona State (2019)',
    domain: 'Technology',
    location: 'San Jose, CA',
    profileSummary: 'Cloud and infrastructure recruiter specializing in DevOps and cloud architecture placements. Connecting engineers with cutting-edge technology companies.',
  },
  {
    id: '14',
    name: 'Rachel Kim',
    displayPicture: '/assets/images/faces/14.jpg',
    phone: '+1 (555) 456-7901',
    email: 'rachel.kim@example.com',
    education: 'BS Communications - San Diego State (2021)',
    domain: 'Media',
    location: 'Nashville, TN',
    profileSummary: 'Media and entertainment recruiter connecting creative professionals with production companies and media organizations. Building teams for content creation.',
  },
  {
    id: '15',
    name: 'Kevin Harris',
    displayPicture: '/assets/images/faces/15.jpg',
    phone: '+1 (555) 567-9012',
    email: 'kevin.harris@example.com',
    education: 'BS Business Administration - Tennessee Tech (2018)',
    domain: 'Logistics',
    location: 'Atlanta, GA',
    profileSummary: 'Logistics and supply chain recruiter with extensive experience in transportation and warehousing placements. Connecting operations talent with logistics leaders.',
  }
]


interface FilterState {
  name: string[]
  domain: string[]
  education: string[]
  location: string[]
  email: string
}

// Note type for recruiter notes
interface RecruiterNote {
  id: string
  recruiterId: string
  note: string
  visibility: 'public' | 'private'
  postedBy: string
  postedDate: string
}

const Recruiters = () => {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [recruiterNotes, setRecruiterNotes] = useState<RecruiterNote[]>([])
  const [previewRecruiter, setPreviewRecruiter] = useState<any>(null)
  const [notesRecruiterId, setNotesRecruiterId] = useState<string | null>(null)
  const [newNote, setNewNote] = useState({ text: '', visibility: 'public' as 'public' | 'private' })
  const [shareRecruiter, setShareRecruiter] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [showEmailInput, setShowEmailInput] = useState(false)
  const [selectedSort, setSelectedSort] = useState<string>('')
  
  const [filters, setFilters] = useState<FilterState>({
    name: [],
    domain: [],
    education: [],
    location: [],
    email: ''
  })

  // Search states for filter dropdowns
  const [searchName, setSearchName] = useState('')
  const [searchDomain, setSearchDomain] = useState('')
  const [searchEducation, setSearchEducation] = useState('')
  const [searchLocation, setSearchLocation] = useState('')

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
  const handleAddNote = (id: string, recruiter?: any) => {
    // Open the notes sidebar
    setNotesRecruiterId(id)
    
    // Trigger the panel via Preline's trigger button
    setTimeout(() => {
      const trigger = document.getElementById('recruiter-notes-panel-trigger')
      if (trigger) {
        trigger.click()
      }
    }, 100)
  }

  // Get notes for a specific recruiter
  const getRecruiterNotes = (recruiterId: string) => {
    return recruiterNotes.filter(note => note.recruiterId === recruiterId).sort((a, b) => 
      new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime()
    )
  }

  // Add a new note
  const handleAddNoteSubmit = () => {
    if (!notesRecruiterId || !newNote.text.trim()) return
    
    const note: RecruiterNote = {
      id: `note-${Date.now()}`,
      recruiterId: notesRecruiterId,
      note: newNote.text,
      visibility: newNote.visibility,
      postedBy: 'John Doe', // This would come from user context in real app
      postedDate: new Date().toISOString()
    }
    
    setRecruiterNotes([...recruiterNotes, note])
    setNewNote({ text: '', visibility: 'public' })
  }

  // Delete a note
  const handleDeleteNote = (noteId: string) => {
    setRecruiterNotes(recruiterNotes.filter(note => note.id !== noteId))
  }

  // Get recruiter details for the notes sidebar
  const getRecruiterDetails = () => {
    if (!notesRecruiterId) return null
    return RECRUITERS_DATA.find(recruiter => recruiter.id === notesRecruiterId)
  }

  // Generate public URL for recruiter
  const getRecruiterPublicUrl = (recruiterId: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/ats/recruiters/${recruiterId}`
    }
    return `https://example.com/ats/recruiters/${recruiterId}`
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
  const handleShareWhatsApp = (recruiter: any) => {
    const url = getRecruiterPublicUrl(recruiter.id)
    const text = `Check out this recruiter: ${recruiter.name} - ${url}`
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
    console.log('Sending email to:', shareEmail, 'for recruiter:', shareRecruiter?.id)
    // Reset after sending
    setShareEmail('')
    setShowEmailInput(false)
  }

  // Handle share button click
  const handleShareClick = (recruiter: any) => {
    setShareRecruiter(recruiter)
    setShowEmailInput(false)
    setShareEmail('')
    setTimeout(() => {
      const trigger = document.getElementById('share-recruiter-modal-trigger')
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
        Header: 'Recruiter Info',
        accessor: 'recruiterInfo',
        Cell: ({ row }: any) => {
          const recruiter = row.original
          return (
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <img
                  src={recruiter.displayPicture || '/assets/images/faces/1.jpg'}
                  alt={recruiter.name}
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
                    setPreviewRecruiter(recruiter)
                    // Trigger the panel via Preline's trigger button
                    setTimeout(() => {
                      const trigger = document.getElementById('recruiter-preview-panel-trigger')
                      if (trigger) {
                        trigger.click()
                      }
                    }, 100)
                  }}
                >
                  {recruiter.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  <div className="flex items-center gap-1">
                    <i className="ri-phone-line"></i>
                    {recruiter.phone}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <i className="ri-mail-line"></i>
                    {recruiter.email}
                  </div>
                </div>
              </div>
            </div>
          )
        },
      },
      {
        Header: 'Education',
        accessor: 'education',
        Cell: ({ row }: any) => {
          const recruiter = row.original
          // Parse education: split by " - " to separate degree and university
          const educationParts = recruiter.education ? recruiter.education.split(' - ') : ['', '']
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
              title={recruiter.education}
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
        Header: 'Domain',
        accessor: 'domain',
        Cell: ({ row }: any) => {
          const recruiter = row.original
          return (
            <div className="text-sm text-gray-800 dark:text-white">
              <span className="badge bg-success/10 text-success border border-success/30 px-2 py-1 rounded-md text-xs font-medium">
                {recruiter.domain}
              </span>
            </div>
          )
        },
      },
      {
        Header: 'Location',
        accessor: 'location',
        Cell: ({ row }: any) => {
          const recruiter = row.original
          return (
            <div className="text-sm text-gray-800 dark:text-white flex items-center gap-2">
              <i className="ri-map-pin-line text-warning"></i>
              <span>{recruiter.location}</span>
            </div>
          )
        },
      },
      {
        Header: 'Profile Summary',
        accessor: 'profileSummary',
        Cell: ({ row }: any) => {
          const recruiter = row.original
          return (
            <div 
              className="text-sm text-gray-700 dark:text-gray-300" 
              style={{ 
                maxWidth: '320px',
                minHeight: '60px',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: '1.5',
                wordBreak: 'break-word'
              }}
              title={recruiter.profileSummary}
            >
              {recruiter.profileSummary}
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
                title="Edit Recruiter"
              >
                <i className="ri-pencil-line"></i>
                <span
                  className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                  role="tooltip">
                  Edit Recruiter
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
    return RECRUITERS_DATA.filter((recruiter) => {
      // Name filter (array)
      if (filters.name.length > 0 && !filters.name.some(name => 
        recruiter.name.toLowerCase().includes(name.toLowerCase())
      )) {
        return false
      }
      
      // Domain filter (array)
      if (filters.domain.length > 0 && !filters.domain.some(domain => 
        recruiter.domain.toLowerCase().includes(domain.toLowerCase())
      )) {
        return false
      }
      
      // Education filter (array)
      if (filters.education.length > 0 && !filters.education.some(edu => 
        recruiter.education.toLowerCase().includes(edu.toLowerCase())
      )) {
        return false
      }
      
      // Location filter (array)
      if (filters.location.length > 0 && !filters.location.some(loc => 
        recruiter.location.toLowerCase().includes(loc.toLowerCase())
      )) {
        return false
      }
      
      // Email filter (string)
      if (filters.email && !recruiter.email.toLowerCase().includes(filters.email.toLowerCase())) {
        return false
      }
      
      return true
    })
  }, [filters])

  const data = useMemo(() => filteredData, [filteredData])

  // Get unique values for dropdown filters
  const allDomains = useMemo(() => {
    return [...new Set(RECRUITERS_DATA.map(recruiter => recruiter.domain))].sort()
  }, [])

  const allEducation = useMemo(() => {
    return [...new Set(RECRUITERS_DATA.map(recruiter => recruiter.education))].sort()
  }, [])

  const allNames = useMemo(() => {
    return [...new Set(RECRUITERS_DATA.map(recruiter => recruiter.name))].sort()
  }, [])

  const allLocations = useMemo(() => {
    return [...new Set(RECRUITERS_DATA.map(recruiter => recruiter.location))].sort()
  }, [])

  // Filter options based on search terms
  const filteredNames = useMemo(() => {
    if (!searchName) return allNames
    return allNames.filter(name => 
      name.toLowerCase().includes(searchName.toLowerCase())
    )
  }, [allNames, searchName])

  const filteredDomains = useMemo(() => {
    if (!searchDomain) return allDomains
    return allDomains.filter(domain => 
      domain.toLowerCase().includes(searchDomain.toLowerCase())
    )
  }, [allDomains, searchDomain])

  const filteredEducation = useMemo(() => {
    if (!searchEducation) return allEducation
    return allEducation.filter(edu => 
      edu.toLowerCase().includes(searchEducation.toLowerCase())
    )
  }, [allEducation, searchEducation])

  const filteredLocations = useMemo(() => {
    if (!searchLocation) return allLocations
    return allLocations.filter(loc => 
      loc.toLowerCase().includes(searchLocation.toLowerCase())
    )
  }, [allLocations, searchLocation])

  const handleMultiSelectChange = (key: 'name' | 'domain' | 'education' | 'location', value: string) => {
    setFilters(prev => {
      const currentArray = prev[key]
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value]
      return { ...prev, [key]: newArray }
    })
  }

  const handleRemoveFilter = (key: 'name' | 'domain' | 'education' | 'location', value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].filter(item => item !== value)
    }))
  }

  const handleResetFilters = () => {
    setFilters({
      name: [],
      domain: [],
      education: [],
      location: [],
      email: ''
    })
    setSearchName('')
    setSearchDomain('')
    setSearchEducation('')
    setSearchLocation('')
  }

  const hasActiveFilters = 
    filters.name.length > 0 ||
    filters.domain.length > 0 ||
    filters.education.length > 0 ||
    filters.location.length > 0 ||
    filters.email !== ''

  const activeFilterCount = 
    filters.name.length +
    filters.domain.length +
    filters.education.length +
    filters.location.length +
    (filters.email !== '' ? 1 : 0)

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
        setSortBy([{ id: 'recruiterInfo', desc: false }])
        break
      case 'name-desc':
        setSortBy([{ id: 'recruiterInfo', desc: true }])
        break
      case 'domain-asc':
        setSortBy([{ id: 'domain', desc: false }])
        break
      case 'domain-desc':
        setSortBy([{ id: 'domain', desc: true }])
        break
      case 'education-asc':
        setSortBy([{ id: 'education', desc: false }])
        break
      case 'education-desc':
        setSortBy([{ id: 'education', desc: true }])
        break
      case 'location-asc':
        setSortBy([{ id: 'location', desc: false }])
        break
      case 'location-desc':
        setSortBy([{ id: 'location', desc: true }])
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
      const allIds = new Set(filteredData.map((recruiter) => recruiter.id))
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
                Recruiters
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
                  data-hs-overlay="#create-recruiter-modal"
                >
                  <i className="ri-add-line font-semibold align-middle"></i>Add Recruiter
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
                  data-hs-overlay="#recruiters-filter-panel"
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
      <div id="recruiters-filter-panel" className="hs-overlay hidden ti-offcanvas ti-offcanvas-right !z-[105]" tabIndex={-1}>
        <div className="ti-offcanvas-header bg-gray-50 dark:bg-black/20 !py-2.5">
          <h6 className="ti-offcanvas-title text-base font-semibold flex items-center gap-2">
            <i className="ri-search-line text-primary text-base"></i>
            Search Recruiters
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

            {/* Domain Filter */}
            <div className="pb-4 border-b border-gray-200 dark:border-defaultborder/10">
              <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                <i className="ri-building-2-line text-success text-base"></i>
                Domain
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({allDomains.length})</span>
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  className="form-control !py-1.5 !text-sm mb-1.5"
                  placeholder="Search domains..."
                  value={searchDomain}
                  onChange={(e) => setSearchDomain(e.target.value)}
                />
                <div className="max-h-40 overflow-y-auto rounded-lg bg-white dark:bg-black/20 p-2 shadow-sm">
                  <div className="space-y-1">
                    {filteredDomains.length > 0 ? (
                      filteredDomains.map((domain) => (
                        <label
                          key={domain}
                          className="flex items-center gap-2 cursor-pointer hover:bg-success/5 dark:hover:bg-success/10 p-1.5 rounded-md transition-colors"
                        >
                          <input
                            type="checkbox"
                            className="form-check-input !w-3.5 !h-3.5"
                            checked={filters.domain.includes(domain)}
                            onChange={() => handleMultiSelectChange('domain', domain)}
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{domain}</span>
                        </label>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-3">
                        No domains found
                      </div>
                    )}
                  </div>
                </div>
                {filters.domain.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {filters.domain.map((domain) => (
                      <span
                        key={domain}
                        className="badge bg-success/10 text-success border border-success/30 px-2 py-1 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-sm"
                      >
                        {domain}
                        <button
                          type="button"
                          onClick={() => handleRemoveFilter('domain', domain)}
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

            {/* Location Filter */}
            <div className="pb-4 border-b border-gray-200 dark:border-defaultborder/10">
              <label className="form-label mb-2.5 block font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                <i className="ri-map-pin-line text-warning text-base"></i>
                Location
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({allLocations.length})</span>
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  className="form-control !py-1.5 !text-sm mb-1.5"
                  placeholder="Search locations..."
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                />
                <div className="max-h-40 overflow-y-auto rounded-lg bg-white dark:bg-black/20 p-2 shadow-sm">
                  <div className="space-y-1">
                    {filteredLocations.length > 0 ? (
                      filteredLocations.map((location) => (
                        <label
                          key={location}
                          className="flex items-center gap-2 cursor-pointer hover:bg-warning/5 dark:hover:bg-warning/10 p-1.5 rounded-md transition-colors"
                        >
                          <input
                            type="checkbox"
                            className="form-check-input !w-3.5 !h-3.5"
                            checked={filters.location.includes(location)}
                            onChange={() => handleMultiSelectChange('location', location)}
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{location}</span>
                        </label>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-3">
                        No locations found
                      </div>
                    )}
                  </div>
                </div>
                {filters.location.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {filters.location.map((location) => (
                      <span
                        key={location}
                        className="badge bg-warning/10 text-warning border border-warning/30 px-2 py-1 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-sm"
                      >
                        {location}
                        <button
                          type="button"
                          onClick={() => handleRemoveFilter('location', location)}
                          className="hover:text-warning-hover hover:bg-warning/20 rounded-full p-0.5 transition-colors"
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
                data-hs-overlay="#recruiters-filter-panel"
              >
                <i className="ri-close-line me-1.5"></i>Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden trigger button for recruiter preview panel (needed for Preline) */}
      <button 
        id="recruiter-preview-panel-trigger"
        type="button"
        style={{ display: 'none' }}
        data-hs-overlay="#recruiter-preview-panel"
      ></button>

      {/* Recruiter Preview Panel (Offcanvas) */}
      <div 
        id="recruiter-preview-panel" 
        className="hs-overlay hidden ti-offcanvas ti-offcanvas-right !z-[105] !max-w-[50rem] lg:!max-w-[60rem]"
        tabIndex={-1}
      >
        <div className="ti-offcanvas-header bg-gray-50 dark:bg-black/20 !py-2.5">
          <h6 className="ti-offcanvas-title text-base font-semibold flex items-center gap-2">
            <i className="ri-user-line text-primary text-base"></i>
            {previewRecruiter?.name || 'Recruiter Profile'}
          </h6>
          <button 
            type="button" 
            className="hs-dropdown-toggle ti-btn flex-shrink-0 p-0 transition-none text-gray-500 hover:text-gray-700 focus:ring-gray-400 focus:ring-offset-white dark:text-[#8c9097] dark:text-white/50 dark:hover:text-white/80 dark:focus:ring-white/10 dark:focus:ring-offset-white/10 hover:bg-gray-100 dark:hover:bg-black/40 rounded-md p-1" 
            data-hs-overlay="#recruiter-preview-panel"
            onClick={() => setPreviewRecruiter(null)}
          >
            <span className="sr-only">Close</span>
            <svg className="w-3.5 h-3.5" width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0.258206 1.00652C0.351976 0.912791 0.479126 0.860131 0.611706 0.860131C0.744296 0.860131 0.871447 0.912791 0.965207 1.00652L3.61171 3.65302L6.25822 1.00652C6.30432 0.958771 6.35952 0.920671 6.42052 0.894471C6.48152 0.868271 6.54712 0.854471 6.61352 0.853901C6.67992 0.853321 6.74572 0.865971 6.80722 0.891111C6.86862 0.916251 6.92442 0.953381 6.97142 1.00032C7.01832 1.04727 7.05552 1.1031 7.08062 1.16454C7.10572 1.22599 7.11842 1.29183 7.11782 1.35822C7.11722 1.42461 7.10342 1.49022 7.07722 1.55122C7.05102 1.61222 7.01292 1.6674 6.96522 1.71352L4.31871 4.36002L6.96522 7.00648C7.05632 7.10078 7.10672 7.22708 7.10552 7.35818C7.10442 7.48928 7.05182 7.61468 6.95912 7.70738C6.86642 7.80018 6.74102 7.85268 6.60992 7.85388C6.47882 7.85498 6.35252 7.80458 6.25822 7.71348L3.61171 5.06702L0.965207 7.71348C0.870907 7.80458 0.744606 7.85498 0.613506 7.85388C0.482406 7.85268 0.357007 7.80018 0.264297 7.70738C0.171597 7.61468 0.119017 7.48928 0.117877 7.35818C0.116737 7.22708 0.167126 7.10078 0.258206 7.00648L2.90471 4.36002L0.258206 1.71352C0.164476 1.61976 0.111816 1.4926 0.111816 1.36002C0.111816 1.22744 0.164476 1.10028 0.258206 1.00652Z" fill="currentColor"/>
            </svg>
          </button>
        </div>
        <div className="ti-offcanvas-body !p-4">
          {previewRecruiter ? (
            <div className="space-y-4">
              {/* Recruiter Header Info */}
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 dark:border-primary/30 rounded-lg">
                <img
                  src={previewRecruiter.displayPicture || '/assets/images/faces/1.jpg'}
                  alt={previewRecruiter.name}
                  className="w-16 h-16 rounded-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/images/faces/1.jpg'
                  }}
                />
                <div className="flex-1">
                  <h6 className="font-bold text-gray-800 dark:text-white text-xl mb-1">{previewRecruiter.name}</h6>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <i className="ri-mail-line"></i>
                      {previewRecruiter.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <i className="ri-phone-line"></i>
                      {previewRecruiter.phone}
                    </span>
                  </div>
                </div>
              </div>

              {/* Key Details Grid */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-black/20 rounded-lg">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Education</div>
                  <div className="font-semibold text-gray-800 dark:text-white">{previewRecruiter.education}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Domain</div>
                  <span className="badge bg-success/10 text-success border border-success/30 px-2 py-1 rounded-md text-xs font-medium">
                    {previewRecruiter.domain}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Location</div>
                  <div className="font-semibold text-gray-800 dark:text-white flex items-center gap-1">
                    <i className="ri-map-pin-line text-warning"></i>
                    {previewRecruiter.location}
                  </div>
                </div>
              </div>

              {/* Profile Summary Section */}
              {previewRecruiter.profileSummary && (
                <div className="p-4 border border-gray-200 dark:border-defaultborder/10 rounded-lg">
                  <h6 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                    <i className="ri-file-text-line text-primary"></i>
                    Profile Summary
                  </h6>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {previewRecruiter.profileSummary}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-200 dark:border-defaultborder/10 flex gap-3">
                <button 
                  type="button" 
                  className="hs-dropdown-toggle ti-btn ti-btn-light flex-1" 
                  data-hs-overlay="#recruiter-preview-panel"
                  onClick={() => setPreviewRecruiter(null)}
                >
                  Close
                </button>
                <button type="button" className="ti-btn ti-btn-primary flex-1">
                  View Full Profile
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No recruiter selected</div>
          )}
        </div>
      </div>

      {/* Hidden trigger button for recruiter notes panel (needed for Preline) */}
      <button 
        id="recruiter-notes-panel-trigger"
        type="button"
        style={{ display: 'none' }}
        data-hs-overlay="#recruiter-notes-panel"
      ></button>

      {/* Recruiter Notes Panel (Offcanvas) */}
      <div 
        id="recruiter-notes-panel" 
        className="hs-overlay hidden ti-offcanvas ti-offcanvas-right !z-[105]"
        tabIndex={-1}
      >
        <div className="ti-offcanvas-header bg-gray-50 dark:bg-black/20 !py-2.5">
          <h6 className="ti-offcanvas-title text-base font-semibold flex items-center gap-2">
            <i className="ri-file-add-line text-primary text-base"></i>
            {getRecruiterDetails()?.name || 'Recruiter Notes'}
          </h6>
          <button 
            type="button" 
            className="hs-dropdown-toggle ti-btn flex-shrink-0 p-0 transition-none text-gray-500 hover:text-gray-700 focus:ring-gray-400 focus:ring-offset-white dark:text-[#8c9097] dark:text-white/50 dark:hover:text-white/80 dark:focus:ring-white/10 dark:focus:ring-offset-white/10 hover:bg-gray-100 dark:hover:bg-black/40 rounded-md p-1" 
            data-hs-overlay="#recruiter-notes-panel"
            onClick={() => setNotesRecruiterId(null)}
          >
            <span className="sr-only">Close</span>
            <svg className="w-3.5 h-3.5" width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0.258206 1.00652C0.351976 0.912791 0.479126 0.860131 0.611706 0.860131C0.744296 0.860131 0.871447 0.912791 0.965207 1.00652L3.61171 3.65302L6.25822 1.00652C6.30432 0.958771 6.35952 0.920671 6.42052 0.894471C6.48152 0.868271 6.54712 0.854471 6.61352 0.853901C6.67992 0.853321 6.74572 0.865971 6.80722 0.891111C6.86862 0.916251 6.92442 0.953381 6.97142 1.00032C7.01832 1.04727 7.05552 1.1031 7.08062 1.16454C7.10572 1.22599 7.11842 1.29183 7.11782 1.35822C7.11722 1.42461 7.10342 1.49022 7.07722 1.55122C7.05102 1.61222 7.01292 1.6674 6.96522 1.71352L4.31871 4.36002L6.96522 7.00648C7.05632 7.10078 7.10672 7.22708 7.10552 7.35818C7.10442 7.48928 7.05182 7.61468 6.95912 7.70738C6.86642 7.80018 6.74102 7.85268 6.60992 7.85388C6.47882 7.85498 6.35252 7.80458 6.25822 7.71348L3.61171 5.06702L0.965207 7.71348C0.870907 7.80458 0.744606 7.85498 0.613506 7.85388C0.482406 7.85268 0.357007 7.80018 0.264297 7.70738C0.171597 7.61468 0.119017 7.48928 0.117877 7.35818C0.116737 7.22708 0.167126 7.10078 0.258206 7.00648L2.90471 4.36002L0.258206 1.71352C0.164476 1.61976 0.111816 1.4926 0.111816 1.36002C0.111816 1.22744 0.164476 1.10028 0.258206 1.00652Z" fill="currentColor"/>
            </svg>
          </button>
        </div>
        <div className="ti-offcanvas-body !p-4">
          {notesRecruiterId ? (
            <div className="space-y-6">
              {/* Recruiter Info Header */}
              {(() => {
                const recruiterDetails = getRecruiterDetails()
                return recruiterDetails ? (
                  <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 dark:border-primary/30 rounded-lg">
                    <h6 className="font-bold text-gray-800 dark:text-white text-lg mb-2">{recruiterDetails.name}</h6>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <i className="ri-mail-line"></i>
                        {recruiterDetails.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <i className="ri-phone-line"></i>
                        {recruiterDetails.phone}
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
                  Notes ({notesRecruiterId ? getRecruiterNotes(notesRecruiterId).length : 0})
                </h6>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {notesRecruiterId && getRecruiterNotes(notesRecruiterId).length > 0 ? (
                    getRecruiterNotes(notesRecruiterId).map((note) => (
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
            <div className="text-center py-8 text-gray-500">No recruiter selected</div>
          )}
        </div>
      </div>

      {/* Hidden trigger button for share modal (needed for Preline) */}
      <button 
        id="share-recruiter-modal-trigger"
        type="button"
        style={{ display: 'none' }}
        data-hs-overlay="#share-recruiter-modal"
      ></button>

      {/* Share Recruiter Modal */}
      <div 
        id="share-recruiter-modal" 
        className="hs-overlay hidden ti-modal"
      >
        <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out lg:!max-w-lg lg:w-full m-3 lg:!mx-auto">
          <div className="ti-modal-content">
            <div className="ti-modal-header">
              <h6 className="ti-modal-title flex items-center gap-2">
                <i className="ri-share-line text-primary"></i>
                Share Recruiter
              </h6>
              <button 
                type="button" 
                className="hs-dropdown-toggle ti-modal-close-btn" 
                data-hs-overlay="#share-recruiter-modal"
                onClick={() => {
                  setShareRecruiter(null)
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
              {shareRecruiter ? (
                <div className="space-y-4">
                  {/* Recruiter Info */}
                  <div className="p-3 bg-gray-50 dark:bg-black/20 rounded-lg border border-gray-200 dark:border-defaultborder/10">
                    <h6 className="font-semibold text-gray-800 dark:text-white mb-1">{shareRecruiter.name}</h6>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {shareRecruiter.email} • {shareRecruiter.phone}
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
                        value={getRecruiterPublicUrl(shareRecruiter.id)}
                        readOnly
                      />
                      <button
                        type="button"
                        className={`ti-btn ${copied ? 'ti-btn-success' : 'ti-btn-primary'}`}
                        onClick={() => handleCopyUrl(getRecruiterPublicUrl(shareRecruiter.id))}
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
                        onClick={() => handleShareWhatsApp(shareRecruiter)}
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
                <div className="text-center py-4 text-gray-500">No recruiter selected</div>
              )}
            </div>
            <div className="ti-modal-footer">
              <button 
                type="button" 
                className="ti-btn ti-btn-light" 
                data-hs-overlay="#share-recruiter-modal"
                onClick={() => {
                  setShareRecruiter(null)
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

export default Recruiters
