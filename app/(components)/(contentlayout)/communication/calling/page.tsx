"use client"
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useState, useMemo } from 'react'
import Link from 'next/link'

// Mock data for contacts
const CONTACTS_DATA = [
  {
    id: '1',
    name: 'Pepper Potts',
    displayPicture: '/assets/images/faces/1.jpg',
    initials: 'PP',
    phone: '(555) 123-4567',
    email: 'pepper.potts@starkindustries.com',
    address: 'Stark Tower, 200 Park Avenue, New York, NY 10017, USA',
    tags: ['Executive', 'CEO', 'Priority'],
    voicemails: [
      {
        id: 'vm1',
        message: 'Pepper called to discuss the merger proposal and wants to schedule a board meeting next week. She mentioned that all stakeholders are aligned.',
        timestamp: '14:23 Today',
        sentiment: 'Cheerful',
        duration: '3:42',
        status: 'Completed',
      },
      {
        id: 'vm2',
        message: 'Following up on the quarterly financial review. Please send the updated projections before end of day. Thanks!',
        timestamp: '10:15 Today',
        sentiment: 'Neutral',
        duration: '1:58',
        status: 'Completed',
      },
      {
        id: 'vm3',
        message: 'Quick call back needed regarding the contract negotiations. There are some terms we need to discuss urgently.',
        timestamp: '16:45 Yesterday',
        sentiment: 'Upset',
        duration: '2:33',
        status: 'Ongoing',
      },
      {
        id: 'vm4',
        message: 'Thank you for the great presentation today! Let\'s connect tomorrow to discuss the next steps.',
        timestamp: '09:30 2 days ago',
        sentiment: 'Cheerful',
        duration: '1:12',
        status: 'Completed',
      },
    ],
    tasks: [
      { id: 't1', title: 'Review merger proposal documents', status: 'pending' },
      { id: 't2', title: 'Schedule board meeting for next week', status: 'pending' },
      { id: 't3', title: 'Send updated quarterly projections', status: 'pending' },
      { id: 't4', title: 'Follow up on contract negotiations', status: 'pending' },
      { id: 't5', title: 'Prepare presentation for stakeholders', status: 'pending' },
    ],
    notes: [
      {
        id: 'n1',
        content: 'Pepper prefers email communication for formal matters but is open to calls for urgent issues. Best time to reach: 9-11 AM or 2-4 PM.',
        timestamp: '2024-01-20',
      },
      {
        id: 'n2',
        content: 'Important: She values punctuality and thorough preparation. Always have all documents ready before meetings.',
        timestamp: '2024-01-18',
      },
      {
        id: 'n3',
        content: 'Recent discussion about expanding operations to Europe. She showed interest in exploring partnerships.',
        timestamp: '2024-01-15',
      },
      {
        id: 'n4',
        content: 'Very detail-oriented and expects quick turnaround on requests. Responds well to proactive communication.',
        timestamp: '2024-01-12',
      },
    ],
  },
  {
    id: '2',
    name: 'Carol Danvers',
    displayPicture: '/assets/images/faces/2.jpg',
    initials: 'CD',
    phone: '(555) 234-5678',
    email: 'carol.danvers@example.com',
    address: 'Avengers Tower, New York, USA',
    tags: ['Hero', 'Avenger'],
    voicemails: [],
    tasks: [],
    notes: [],
  },
  {
    id: '3',
    name: 'Scott Lang',
    displayPicture: '/assets/images/faces/3.jpg',
    initials: 'SL',
    phone: '(555) 345-6789',
    email: 'scott.lang@example.com',
    address: 'San Francisco, CA, USA',
    tags: ['Consultant'],
    voicemails: [],
    tasks: [],
    notes: [],
  },
  {
    id: '4',
    name: 'Natasha Romanoff',
    displayPicture: '/assets/images/faces/4.jpg',
    initials: 'NR',
    phone: '(555) 456-7890',
    email: 'natasha.romanoff@example.com',
    address: 'Red Room, Location Classified',
    tags: ['Agent', 'Specialist'],
    voicemails: [],
    tasks: [],
    notes: [],
  },
  {
    id: '5',
    name: 'Peter Parker',
    displayPicture: '/assets/images/faces/5.jpg',
    initials: 'PP',
    phone: '(555) 567-8901',
    email: 'peter.parker@example.com',
    address: 'Queens, New York, USA',
    tags: ['Intern', 'Student'],
    voicemails: [],
    tasks: [],
    notes: [],
  },
  {
    id: '6',
    name: 'Barbara Gordon',
    displayPicture: '/assets/images/faces/6.jpg',
    initials: 'BG',
    phone: '(704) 555-0127',
    email: 'Barbara@example.com',
    address: 'Lavender street, Mountain View, USA',
    tags: ['Sales', 'Upgrade', 'Outreach'],
    voicemails: [
      {
        id: 'vm1',
        message: 'Barbara wishes you a happy birthday and would like to meet for lunch.',
        timestamp: '12:34 Today',
        sentiment: 'Cheerful',
        duration: '8:24',
        status: 'Ongoing',
      },
      {
        id: 'vm2',
        message: 'Follow-up on the proposal we discussed last week.',
        timestamp: '09:15 Yesterday',
        sentiment: 'Neutral',
        duration: '3:45',
        status: 'Completed',
      },
      {
        id: 'vm3',
        message: 'Concerned about the delivery timeline, need to discuss.',
        timestamp: '16:42 2 days ago',
        sentiment: 'Upset',
        duration: '5:12',
        status: 'Completed',
      },
    ],
    tasks: [
      { id: 't1', title: 'Review contract details', status: 'pending' },
      { id: 't2', title: 'Send follow-up email', status: 'pending' },
      { id: 't3', title: 'Schedule lunch meeting', status: 'pending' },
    ],
    notes: [
      { id: 'n1', content: 'Prefers morning calls', timestamp: '2024-01-15' },
    ],
  },
  {
    id: '7',
    name: 'Paula Irving',
    displayPicture: null,
    initials: 'PI',
    phone: '(555) 678-9012',
    email: 'paula.irving@example.com',
    address: 'Gotham City, USA',
    tags: ['Client'],
    voicemails: [],
    tasks: [],
    notes: [],
  },
  {
    id: '8',
    name: 'Harleen Quinzel',
    displayPicture: '/assets/images/faces/8.jpg',
    initials: 'HQ',
    phone: '(555) 789-0123',
    email: 'harleen.quinzel@example.com',
    address: 'Arkham Asylum, Gotham City, USA',
    tags: ['Specialist'],
    voicemails: [],
    tasks: [],
    notes: [],
  },
  {
    id: '9',
    name: 'Lois Lane',
    displayPicture: '/assets/images/faces/9.jpg',
    initials: 'LL',
    phone: '(555) 890-1234',
    email: 'lois.lane@example.com',
    address: 'Metropolis, USA',
    tags: ['Reporter', 'Media'],
    voicemails: [],
    tasks: [],
    notes: [],
  },
  {
    id: '10',
    name: 'Tony Stark',
    displayPicture: '/assets/images/faces/10.jpg',
    initials: 'TS',
    phone: '(555) 901-2345',
    email: 'tony.stark@example.com',
    address: 'Stark Tower, New York, USA',
    tags: ['CEO', 'Founder'],
    voicemails: [],
    tasks: [],
    notes: [],
  },
  {
    id: '11',
    name: 'Diana Prince',
    displayPicture: null,
    initials: 'DP',
    phone: '(555) 012-3456',
    email: 'diana.prince@example.com',
    address: 'Themyscira',
    tags: ['Ambassador'],
    voicemails: [],
    tasks: [],
    notes: [],
  },
  {
    id: '12',
    name: 'Karen Starr',
    displayPicture: '/assets/images/faces/12.jpg',
    initials: 'KS',
    phone: '(555) 123-4568',
    email: 'karen.starr@example.com',
    address: 'Los Angeles, CA, USA',
    tags: ['Actor'],
    voicemails: [],
    tasks: [],
    notes: [],
  },
]

const Calling = () => {
  const [selectedContact, setSelectedContact] = useState<string | null>('6') // Barbara Gordon selected by default
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'voicemails' | 'tasks' | 'notes'>('voicemails')

  // Filter contacts based on search query
  const filteredContacts = CONTACTS_DATA.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Get selected contact details
  const selectedContactData = useMemo(() => {
    return CONTACTS_DATA.find(contact => contact.id === selectedContact) || null
  }, [selectedContact])

  // Get sentiment emoji
  const getSentimentEmoji = (sentiment: string) => {
    switch (sentiment) {
      case 'Cheerful':
        return '😊'
      case 'Upset':
        return '😟'
      case 'Neutral':
      default:
        return '😐'
    }
  }

  // Get tag color classes
  const getTagColor = (index: number) => {
    const colors = [
      'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    ]
    return colors[index % colors.length]
  }

  return (
    <Fragment>
      <Seo title={"Calling"} />
      
      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-8rem)]">
        {/* Left Column - Contacts List */}
        <div className="xl:col-span-4 col-span-12 h-full flex flex-col">
          <div className="box custom-box h-full flex flex-col">
            <div className="box-header flex items-center justify-between flex-wrap gap-4">
              <div className="box-title">
                Contacts
                <span className="badge bg-light text-default rounded-full ms-1 text-[0.75rem] align-middle">
                  {filteredContacts.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="#!"
                  scroll={false}
                  className="ti-btn ti-btn-danger-full !py-1 !px-2 !text-[0.75rem]"
                >
                  <i className="ri-add-line font-semibold align-middle me-1"></i>New
                </Link>
              </div>
            </div>
            <div className="box-body !p-0 flex-1 flex flex-col overflow-hidden">
              {/* Search Bar */}
              <div className="p-4 border-b border-gray-200 dark:border-defaultborder/10">
                <div className="relative">
                  <input
                    type="text"
                    className="form-control !py-2 !px-4 !pl-10 !text-sm rounded-lg"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-base"></i>
                </div>
              </div>

              {/* Contacts List */}
              <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
                <div className="divide-y divide-gray-200 dark:divide-defaultborder/10">
                  {filteredContacts.map((contact) => (
                    <div
                      key={contact.id}
                      onClick={() => setSelectedContact(contact.id)}
                      className={`p-4 cursor-pointer transition-colors ${
                        selectedContact === contact.id
                          ? 'bg-success/10 dark:bg-success/20'
                          : 'hover:bg-gray-50 dark:hover:bg-black/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          {contact.displayPicture ? (
                            <img
                              src={contact.displayPicture}
                              alt={contact.name}
                              className="w-10 h-10 rounded-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                const parent = target.parentElement
                                if (parent && !parent.querySelector('.initials-fallback')) {
                                  const initialsDiv = document.createElement('div')
                                  initialsDiv.className = 'initials-fallback w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-semibold text-gray-600 dark:text-gray-300'
                                  initialsDiv.textContent = contact.initials
                                  parent.appendChild(initialsDiv)
                                }
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-semibold text-gray-600 dark:text-gray-300">
                              {contact.initials}
                            </div>
                          )}
                        </div>
                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-800 dark:text-white truncate">
                            {contact.name}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {filteredContacts.length === 0 && (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <i className="ri-user-search-line text-4xl text-gray-400 dark:text-gray-500 mb-3"></i>
                      <p className="text-sm text-gray-500 dark:text-gray-400">No contacts found</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Contact Details */}
        <div className="xl:col-span-8 col-span-12 h-full flex flex-col">
          {selectedContactData ? (
            <div className="box custom-box h-full flex flex-col">
              <div className="box-body flex-1 flex flex-col overflow-hidden">
                {/* Profile Header */}
                <div className="p-6 border-b border-gray-200 dark:border-defaultborder/10">
                  <div className="flex items-start gap-4">
                    {/* Large Avatar */}
                    <div className="flex-shrink-0">
                      {selectedContactData.displayPicture ? (
                        <img
                          src={selectedContactData.displayPicture}
                          alt={selectedContactData.name}
                          className="w-20 h-20 rounded-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            const parent = target.parentElement
                            if (parent && !parent.querySelector('.initials-fallback-large')) {
                              const initialsDiv = document.createElement('div')
                              initialsDiv.className = 'initials-fallback-large w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xl font-semibold text-gray-600 dark:text-gray-300'
                              initialsDiv.textContent = selectedContactData.initials
                              parent.appendChild(initialsDiv)
                            }
                          }}
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xl font-semibold text-gray-600 dark:text-gray-300">
                          {selectedContactData.initials}
                        </div>
                      )}
                    </div>
                    {/* Name and Phone */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">
                            {selectedContactData.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {selectedContactData.phone}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="ti-btn ti-btn-light ti-btn-icon ti-btn-sm"
                            title="Edit"
                          >
                            <i className="ri-pencil-line"></i>
                          </button>
                          <button
                            type="button"
                            className="ti-btn ti-btn-success !py-1.5 !px-4 !text-sm"
                          >
                            <i className="ri-phone-line me-1"></i>Call Now
                          </button>
                        </div>
                      </div>
                      {/* Email and Address */}
                      <div className="space-y-1 mt-3">
                        <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                          <i className="ri-mail-line"></i>
                          {selectedContactData.email}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                          <i className="ri-map-pin-line"></i>
                          {selectedContactData.address}
                        </div>
                      </div>
                      {/* Tags */}
                      <div className="flex flex-wrap gap-2 mt-4">
                        {selectedContactData.tags.map((tag, index) => (
                          <span
                            key={tag}
                            className={`px-3 py-1 rounded-full text-xs font-medium ${getTagColor(index)}`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 dark:border-defaultborder/10">
                  <nav className="flex" role="tablist">
                    <button
                      type="button"
                      onClick={() => setActiveTab('voicemails')}
                      className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${
                        activeTab === 'voicemails'
                          ? 'border-danger text-danger'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      Voicemails
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('tasks')}
                      className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors relative ${
                        activeTab === 'tasks'
                          ? 'border-danger text-danger'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      Tasks
                      {selectedContactData.tasks.length > 0 && (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full"></span>
                      )}
                      {selectedContactData.tasks.length > 0 && (
                        <span className="ms-1 text-danger">({selectedContactData.tasks.length})</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('notes')}
                      className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${
                        activeTab === 'notes'
                          ? 'border-danger text-danger'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      Notes
                    </button>
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-6" style={{ minHeight: 0 }}>
                  {activeTab === 'voicemails' && (
                    <div className="space-y-4">
                      {selectedContactData.voicemails.length > 0 ? (
                        selectedContactData.voicemails.map((voicemail) => (
                          <div
                            key={voicemail.id}
                            className="group p-5 bg-white dark:bg-black/40 rounded-xl border border-gray-200 dark:border-defaultborder/10 shadow-sm hover:shadow-md transition-all duration-200"
                          >
                            <div className="flex items-start justify-between gap-4 mb-4">
                              <div className="flex-1">
                                <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 mb-3">
                                  {voicemail.message}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                  <span className="flex items-center gap-1.5">
                                    <i className="ri-time-line"></i>
                                    {voicemail.timestamp}
                                  </span>
                                  <span className="flex items-center gap-1.5">
                                    <span className="text-lg">{getSentimentEmoji(voicemail.sentiment)}</span>
                                    <span className="font-medium">{voicemail.sentiment}</span>
                                  </span>
                                </div>
                              </div>
                              <span
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${
                                  voicemail.status === 'Ongoing'
                                    ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border border-orange-200 dark:border-orange-800'
                                    : 'bg-success/10 text-success dark:bg-success/20 dark:text-success border border-success/30 dark:border-success/50'
                                }`}
                              >
                                {voicemail.status}
                              </span>
                            </div>
                            {/* Audio Player */}
                            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-black/60 rounded-lg">
                              <button
                                type="button"
                                className="ti-btn ti-btn-danger ti-btn-icon shadow-sm hover:shadow-md transition-shadow"
                                title="Play voicemail"
                              >
                                <i className="ri-play-fill text-lg"></i>
                              </button>
                              <div className="flex-1">
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                                  <div
                                    className="bg-gradient-to-r from-danger to-danger/80 h-2.5 rounded-full transition-all duration-300"
                                    style={{ width: voicemail.status === 'Ongoing' ? '20%' : '100%' }}
                                  ></div>
                                </div>
                              </div>
                              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 min-w-[60px] text-right">
                                0:00 / {voicemail.duration}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12">
                          <i className="ri-mail-voice-line text-4xl text-gray-400 dark:text-gray-500 mb-3"></i>
                          <p className="text-sm text-gray-500 dark:text-gray-400">No voicemails</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'tasks' && (
                    <div className="space-y-3">
                      {selectedContactData.tasks.length > 0 ? (
                        selectedContactData.tasks.map((task) => (
                          <div
                            key={task.id}
                            className="group p-4 bg-white dark:bg-black/40 rounded-xl border border-gray-200 dark:border-defaultborder/10 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-4"
                          >
                            <input
                              type="checkbox"
                              className="form-check-input !w-5 !h-5 cursor-pointer"
                              checked={task.status === 'completed'}
                              readOnly
                            />
                            <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                              {task.title}
                            </span>
                            <button
                              type="button"
                              className="opacity-0 group-hover:opacity-100 ti-btn ti-btn-light ti-btn-icon ti-btn-sm transition-opacity"
                              title="View task details"
                            >
                              <i className="ri-arrow-right-s-line"></i>
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12">
                          <i className="ri-task-line text-4xl text-gray-400 dark:text-gray-500 mb-3"></i>
                          <p className="text-sm text-gray-500 dark:text-gray-400">No tasks</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'notes' && (
                    <div className="space-y-4">
                      {selectedContactData.notes.length > 0 ? (
                        selectedContactData.notes.map((note) => (
                          <div
                            key={note.id}
                            className="group p-5 bg-white dark:bg-black/40 rounded-xl border border-gray-200 dark:border-defaultborder/10 shadow-sm hover:shadow-md transition-all duration-200"
                          >
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex-1">
                                <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                                  {note.content}
                                </p>
                              </div>
                              <button
                                type="button"
                                className="opacity-0 group-hover:opacity-100 ti-btn ti-btn-light ti-btn-icon ti-btn-sm transition-opacity"
                                title="Edit note"
                              >
                                <i className="ri-pencil-line"></i>
                              </button>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                              <i className="ri-calendar-line"></i>
                              <span>{new Date(note.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12">
                          <i className="ri-file-text-line text-4xl text-gray-400 dark:text-gray-500 mb-3"></i>
                          <p className="text-sm text-gray-500 dark:text-gray-400">No notes</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="box custom-box h-full flex flex-col">
              <div className="box-body flex-1 flex items-center justify-center">
                <div className="text-center">
                  <i className="ri-user-line text-5xl text-gray-400 dark:text-gray-500 mb-4"></i>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Select a contact to view details</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Fragment>
  )
}

export default Calling
