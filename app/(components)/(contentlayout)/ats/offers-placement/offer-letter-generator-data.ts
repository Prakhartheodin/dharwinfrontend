/** Client-side templates for offer letter generator (preview + auto-fill). */

export type EligibilityPresetKey =
  | 'opt_regular'
  | 'opt_stem'
  | 'opt_training'
  | 'h1b'
  | 'gc'
  | 'citizen'
  | 'custom'
  | 'none'

export const ELIGIBILITY_MAP: Record<
  Exclude<EligibilityPresetKey, 'custom' | 'none'>,
  { paid: string; unpaid: string }
> = {
  opt_regular: {
    paid: 'As per the Immigration Reform and Control Act, you are required to present documentation verifying your identity and employment authorization on your first day of employment. It is our understanding that you are currently authorized to work in the United States under the F-1 Post-Completion OPT program (Regular OPT). This offer is valid subject to your continued valid employment authorization.',
    unpaid:
      'As per U.S. immigration regulations, this training position is aligned with your F-1 Optional Practical Training (OPT) authorization. The responsibilities outlined above are directly related to your major field of study, and we are prepared to support any necessary documentation required for your Designated School Official (DSO) or SEVIS reporting, including confirming supervision, training plans, and role alignment.',
  },
  opt_stem: {
    paid: 'As per the Immigration Reform and Control Act, you are required to present documentation verifying your identity and employment authorization on your first day of employment. It is our understanding that you are currently authorized to work in the United States under the F-1 STEM OPT Extension program. This offer is valid subject to your continued valid employment authorization.',
    unpaid:
      'As per U.S. immigration regulations, this training position is aligned with your F-1 STEM OPT Extension authorization. The responsibilities are directly related to your field of study, and we are prepared to support any SEVIS or DSO documentation required.',
  },
  opt_training: {
    paid: 'As per the Immigration Reform and Control Act, you are required to present documentation verifying your identity and employment authorization on your first day of employment. It is our understanding that you are currently authorized to work in the United States under the F-1 OPT program. This offer is valid subject to your continued valid employment authorization.',
    unpaid:
      'As per U.S. immigration regulations, this training position is aligned with your F-1 Optional Practical Training (OPT) authorization. The responsibilities outlined above are directly related to your major field of study, and we are prepared to support any necessary documentation required for your DSO or SEVIS reporting.',
  },
  h1b: {
    paid: 'As per the Immigration Reform and Control Act, you are required to present documentation verifying your identity and employment authorization on your first day of employment. It is our understanding that you are currently authorized to work in the United States under an H-1B visa. This offer is contingent upon your continued valid H-1B status.',
    unpaid:
      'This training position is offered subject to your valid H-1B authorization. We are prepared to support any documentation required by relevant authorities.',
  },
  gc: {
    paid: 'As per the Immigration Reform and Control Act, you are required to present documentation verifying your identity and employment authorization on your first day of employment.',
    unpaid:
      'This training position is open to individuals authorized to work in the United States. Please provide appropriate documentation upon commencement.',
  },
  citizen: {
    paid: 'As per the Immigration Reform and Control Act, you are required to present documentation verifying your identity and employment authorization on your first day of employment.',
    unpaid:
      'This training position requires verification of identity and work authorization in accordance with applicable laws.',
  },
}

/** Paid offer letters: eligibility as separate bullets (matches Word / PDF). */
export const PAID_ELIGIBILITY_BULLETS: Record<
  Exclude<EligibilityPresetKey, 'custom' | 'none'>,
  string[]
> = {
  opt_regular: [
    'As per the Immigration Reform and Control Act, you are required to present documentation verifying your identity and employment authorization on your first day of employment.',
    'It is our understanding that you are currently authorized to work in the United States under the F-1 Post-Completion OPT program (Regular OPT).',
    'This offer is valid subject to your continued valid employment authorization.',
  ],
  opt_stem: [
    'As per the Immigration Reform and Control Act, you are required to present documentation verifying your identity and employment authorization on your first day of employment.',
    'It is our understanding that you are currently authorized to work in the United States under the F-1 STEM OPT Extension program.',
    'This offer is valid subject to your continued valid employment authorization.',
  ],
  opt_training: [
    'As per the Immigration Reform and Control Act, you are required to present documentation verifying your identity and employment authorization on your first day of employment.',
    'It is our understanding that you are currently authorized to work in the United States under the F-1 OPT program.',
    'This offer is valid subject to your continued valid employment authorization.',
  ],
  h1b: [
    'As per the Immigration Reform and Control Act, you are required to present documentation verifying your identity and employment authorization on your first day of employment.',
    'It is our understanding that you are currently authorized to work in the United States under an H-1B visa.',
    'This offer is contingent upon your continued valid H-1B status.',
  ],
  gc: [
    'As per the Immigration Reform and Control Act, you are required to present documentation verifying your identity and employment authorization on your first day of employment.',
  ],
  citizen: [
    'As per the Immigration Reform and Control Act, you are required to present documentation verifying your identity and employment authorization on your first day of employment.',
  ],
}

export type RolesPack = { roles: string[]; learning: string[] }

export const ROLES_MAP: Record<string, RolesPack> = {
  'data analyst': {
    roles: [
      'Assist in collecting, cleaning, and organizing data from various sources for analysis.',
      'Perform data analysis using tools such as Excel, SQL, or Python to identify trends and insights.',
      'Support the development of dashboards, reports, and visualizations for business decision-making.',
      'Work on real-time datasets to understand business performance and operational efficiency.',
      'Collaborate with internal teams to understand data requirements and provide analytical support.',
      'Participate in training sessions focused on data analytics concepts, tools, and industry practices.',
    ],
    learning: [
      'Data cleaning and preprocessing techniques',
      'Data visualization and reporting',
      'Basic statistical analysis and business insights generation',
      'Real-world project exposure in data analytics',
    ],
  },
  'business analyst': {
    roles: [
      'Collecting, cleaning, and analyzing business and operational datasets using SQL, Python, and Excel.',
      'Developing dashboards and reports using Power BI/Tableau to support decision-making.',
      'Conducting KPI analysis, trend identification, and performance evaluation.',
      'Supporting business stakeholders with data-driven insights and documentation.',
      'Assisting in process optimization and business reporting initiatives.',
      'Collaborating with technical and management teams to improve operational efficiency.',
    ],
    learning: [
      'Business process analysis and documentation',
      'KPI tracking and performance reporting',
      'Data-driven decision making and stakeholder communication',
      'Tools: SQL, Excel, Power BI/Tableau',
    ],
  },
  'software engineer': {
    roles: [
      'Design, develop, and maintain scalable software applications and services.',
      'Write clean, well-documented, and testable code following best practices.',
      'Participate in code reviews and contribute to technical discussions.',
      'Collaborate with cross-functional teams to deliver features on schedule.',
      'Debug, troubleshoot, and resolve software defects and performance issues.',
      'Contribute to Agile/Scrum ceremonies including sprint planning and retrospectives.',
    ],
    learning: [
      'Software development lifecycle (SDLC) and Agile methodologies',
      'Coding best practices and design patterns',
      'Version control and CI/CD pipeline exposure',
      'Collaborative development in a professional environment',
    ],
  },
  'senior software engineer': {
    roles: [
      'Lead the design and development of complex, enterprise-grade software systems.',
      'Architect scalable and maintainable solutions aligned with business requirements.',
      'Conduct code reviews and mentor junior engineers in best practices.',
      'Collaborate with product managers and stakeholders to define technical requirements.',
      'Drive continuous improvement in development processes and engineering culture.',
      'Troubleshoot and resolve high-impact production issues with urgency and precision.',
    ],
    learning: [
      'Enterprise system architecture and design patterns',
      'Technical leadership and mentoring practices',
      'DevOps, CI/CD, and cloud infrastructure best practices',
      'Cross-functional collaboration and stakeholder management',
    ],
  },
  'junior software engineer': {
    roles: [
      'Contribute to assigned projects under supervision and in line with business priorities.',
      'Collaborate with team members to deliver quality work within agreed timelines.',
      'Write and test code for assigned features under guidance of senior engineers.',
      'Participate in code reviews to learn best practices and coding standards.',
      'Document code and technical decisions as required.',
      'Support bug fixes and maintenance tasks across existing applications.',
    ],
    learning: [
      'Software development fundamentals and coding standards',
      'Version control using Git and collaborative development workflows',
      'Agile/Scrum processes and team collaboration',
      'Real-world software engineering project exposure',
    ],
  },
  'full stack developer': {
    roles: [
      'Develop and maintain both frontend and backend components of web applications.',
      'Build responsive UI using modern frameworks (React, Angular, or Vue.js).',
      'Design and implement RESTful APIs and microservices.',
      'Work with databases (SQL and NoSQL) for data modeling and optimization.',
      'Collaborate with DevOps teams for deployment and monitoring of applications.',
      'Participate in all phases of the software development lifecycle.',
    ],
    learning: [
      'Full-stack web development with modern frameworks',
      'RESTful API design and backend development',
      'Database design, optimization, and querying',
      'Cloud deployment and DevOps fundamentals',
    ],
  },
  'frontend developer': {
    roles: [
      'Build and maintain user interfaces using HTML, CSS, JavaScript, and modern frameworks.',
      'Translate UI/UX designs into responsive, accessible web components.',
      'Optimize application performance for maximum speed and scalability.',
      'Collaborate with backend developers to integrate APIs and data services.',
      'Ensure cross-browser compatibility and mobile responsiveness.',
      'Participate in design reviews and contribute to UI/UX improvements.',
    ],
    learning: [
      'Modern frontend frameworks (React/Vue/Angular)',
      'Responsive design and accessibility best practices',
      'Performance optimization and browser compatibility',
      'UI/UX collaboration and component-based architecture',
    ],
  },
  'backend developer': {
    roles: [
      'Design and develop server-side logic, APIs, and database interactions.',
      'Build and maintain RESTful and GraphQL APIs consumed by frontend clients.',
      'Optimize database queries and ensure efficient data storage and retrieval.',
      'Implement security best practices including authentication and authorization.',
      'Collaborate with frontend teams to define API contracts and data schemas.',
      'Monitor and improve backend system performance and reliability.',
    ],
    learning: [
      'Server-side programming and API development',
      'Database management and query optimization',
      'Security best practices and authentication systems',
      'Microservices architecture and cloud integrations',
    ],
  },
  'devops engineer': {
    roles: [
      'Design, implement, and maintain CI/CD pipelines for automated software delivery.',
      'Manage cloud infrastructure (AWS/Azure/GCP) using Infrastructure-as-Code tools.',
      'Monitor system performance, uptime, and security using observability tools.',
      'Collaborate with development teams to streamline deployment and release processes.',
      'Implement containerization and orchestration using Docker and Kubernetes.',
      'Ensure backup, disaster recovery, and high-availability configurations.',
    ],
    learning: [
      'CI/CD pipeline design and automation',
      'Cloud infrastructure management (AWS/Azure/GCP)',
      'Containerization with Docker and Kubernetes',
      'Site reliability engineering and monitoring',
    ],
  },
  'data scientist': {
    roles: [
      'Develop and deploy machine learning models to solve business problems.',
      'Perform statistical analysis and predictive modeling on large datasets.',
      'Build data pipelines and ETL processes for model training and evaluation.',
      'Communicate findings through data visualizations and executive reports.',
      'Collaborate with engineering teams to productionize ML models.',
      'Stay current with emerging research and apply relevant techniques.',
    ],
    learning: [
      'Machine learning model development and evaluation',
      'Statistical analysis and predictive modeling',
      'Data engineering and pipeline development',
      'Business communication of data-driven insights',
    ],
  },
  'machine learning engineer': {
    roles: [
      'Design, train, and deploy machine learning models at production scale.',
      'Build and maintain ML infrastructure including feature stores and model registries.',
      'Optimize model performance through hyperparameter tuning and architecture changes.',
      'Collaborate with data scientists to transition research models to production.',
      'Monitor model drift and implement retraining pipelines.',
      'Ensure ML systems are reliable, scalable, and maintainable.',
    ],
    learning: [
      'Production ML system design and MLOps',
      'Deep learning frameworks (TensorFlow/PyTorch)',
      'Model deployment, monitoring, and lifecycle management',
      'Feature engineering and data pipeline development',
    ],
  },
  'cloud engineer': {
    roles: [
      'Design and implement cloud architectures on AWS, Azure, or GCP platforms.',
      'Provision and manage cloud resources using Terraform or CloudFormation.',
      'Implement cloud security best practices and compliance controls.',
      'Optimize cloud costs through resource rightsizing and reserved capacity planning.',
      'Collaborate with development teams to architect cloud-native solutions.',
      'Monitor cloud infrastructure performance and ensure high availability.',
    ],
    learning: [
      'Cloud architecture and service design (AWS/Azure/GCP)',
      'Infrastructure-as-Code with Terraform/CloudFormation',
      'Cloud security and compliance frameworks',
      'Cost optimization and cloud governance',
    ],
  },
  'qa engineer': {
    roles: [
      'Design and execute test plans, test cases, and test scripts for software applications.',
      'Perform manual and automated testing across functional and regression test suites.',
      'Identify, document, and track software defects to resolution.',
      'Collaborate with developers to understand requirements and define acceptance criteria.',
      'Implement and maintain test automation frameworks using Selenium/Cypress/Playwright.',
      'Report on quality metrics and testing progress to stakeholders.',
    ],
    learning: [
      'Software testing methodologies and best practices',
      'Test automation frameworks and scripting',
      'Defect management and quality metrics reporting',
      'Agile testing and CI/CD pipeline integration',
    ],
  },
  'product manager': {
    roles: [
      'Define and maintain the product roadmap aligned with business goals and customer needs.',
      'Gather and prioritize product requirements through stakeholder interviews and data analysis.',
      'Write detailed product specifications and user stories for engineering teams.',
      'Coordinate cross-functional teams to ensure timely product delivery.',
      'Analyze product performance metrics and user feedback to drive iteration.',
      'Communicate product vision and progress to leadership and stakeholders.',
    ],
    learning: [
      'Product lifecycle management and roadmap planning',
      'User research and requirements gathering techniques',
      'Agile product development methodologies',
      'Data-driven product decision making',
    ],
  },
  'project manager': {
    roles: [
      'Plan, execute, and close projects on time, within scope and budget.',
      'Develop detailed project plans, schedules, and resource allocation matrices.',
      'Facilitate stakeholder communication and manage expectations throughout the project.',
      'Identify and mitigate project risks and resolve blockers proactively.',
      'Track project progress using Agile/Waterfall methodologies and reporting tools.',
      'Conduct project retrospectives and document lessons learned.',
    ],
    learning: [
      'Project planning and scheduling methodologies',
      'Risk management and issue resolution',
      'Stakeholder communication and change management',
      'Agile/Scrum and PMP framework application',
    ],
  },
  'ui/ux designer': {
    roles: [
      'Create wireframes, prototypes, and high-fidelity mockups for web and mobile applications.',
      'Conduct user research and usability testing to inform design decisions.',
      'Develop and maintain a consistent design system and component library.',
      'Collaborate with product managers and engineers to translate requirements into designs.',
      'Iterate on designs based on user feedback, analytics, and stakeholder input.',
      'Ensure all designs meet accessibility standards (WCAG guidelines).',
    ],
    learning: [
      'UX research methodologies and user testing',
      'UI design principles and visual design systems',
      'Prototyping tools (Figma, Adobe XD)',
      'Accessibility and inclusive design practices',
    ],
  },
  'cybersecurity analyst': {
    roles: [
      'Monitor security systems and investigate potential threats and vulnerabilities.',
      'Perform risk assessments, vulnerability scans, and penetration testing activities.',
      'Develop and maintain security policies, standards, and incident response playbooks.',
      'Analyze security logs and alerts using SIEM tools to detect anomalies.',
      'Collaborate with IT teams to implement security controls and best practices.',
      'Stay current with cybersecurity threats, trends, and regulatory compliance requirements.',
    ],
    learning: [
      'Cybersecurity threat detection and incident response',
      'Vulnerability assessment and penetration testing basics',
      'SIEM tools and security log analysis',
      'Compliance frameworks (NIST, ISO 27001, SOC 2)',
    ],
  },
}

export const DEFAULT_ROLES_PACK: RolesPack = {
  roles: [
    'Contribute to assigned projects under supervision and in line with business priorities.',
    'Collaborate with team members to deliver quality work within agreed timelines.',
    'Participate in meetings and training sessions relevant to the role.',
    'Support the team with documentation and reporting as required.',
    'Adhere to company policies, processes, and professional standards.',
  ],
  learning: [
    'Professional workplace practices and collaboration',
    'Industry-relevant tools and technologies',
    'Project management and delivery fundamentals',
    'Real-world exposure to business operations',
  ],
}

export function fmtDateLong(iso: string): string {
  if (!iso) return '—'
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export function fmtStartDateOrdinal(iso: string): string {
  if (!iso) return '—'
  const d = new Date(`${iso}T00:00:00`)
  const day = getOrdinal(d.getDate())
  const month = d.toLocaleDateString('en-US', { month: 'long' })
  return `${day} ${month}, ${d.getFullYear()}`
}

export function fmtCurrencyParts(val: string, cur: string): { annual: string; monthly: string; sym: string; cur: string } | null {
  if (!val) return null
  const n = parseFloat(val.replace(/,/g, ''))
  if (Number.isNaN(n) || n <= 0) return null
  const sym = cur === 'INR' ? '₹' : '$'
  const monthly = Math.round(n / 12).toLocaleString(cur === 'INR' ? 'en-IN' : 'en-US')
  const annual = n.toLocaleString(cur === 'INR' ? 'en-IN' : 'en-US')
  return { annual: sym + annual, monthly: sym + monthly, sym, cur }
}

export function getJobHoursLabel(jobTypeUi: 'fulltime' | 'parttime' | 'internship'): string {
  if (jobTypeUi === 'parttime') return '25 hours per week'
  return '40 hours per week'
}

export function getJobTypeLabelUi(jobTypeUi: 'fulltime' | 'parttime' | 'internship'): string {
  if (jobTypeUi === 'fulltime') return 'Full-Time (40 Hours per Week)'
  if (jobTypeUi === 'parttime') return 'Part Time (25 Hours per Week)'
  return 'Training / Unpaid Internship (Full Time)'
}

/** Map API job type to UI pill value */
export function apiJobTypeToUi(j: 'FT_40' | 'PT_25' | 'INTERN_UNPAID'): 'fulltime' | 'parttime' | 'internship' {
  if (j === 'PT_25') return 'parttime'
  if (j === 'INTERN_UNPAID') return 'internship'
  return 'fulltime'
}

export function uiJobTypeToApi(j: 'fulltime' | 'parttime' | 'internship'): 'FT_40' | 'PT_25' | 'INTERN_UNPAID' {
  if (j === 'parttime') return 'PT_25'
  if (j === 'internship') return 'INTERN_UNPAID'
  return 'FT_40'
}

export function escHtml(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function autoFillRolesFromPosition(positionTitle: string): RolesPack | null {
  const pos = positionTitle.trim().toLowerCase()
  if (ROLES_MAP[pos]) return ROLES_MAP[pos]
  const key = Object.keys(ROLES_MAP).find((k) => pos.includes(k) || k.includes(pos))
  if (key) return ROLES_MAP[key]
  return null
}

export function detectEligibilityPreset(
  lines: string[],
  isIntern: boolean
): EligibilityPresetKey {
  const cleaned = (lines || []).map((s) => String(s).trim()).filter(Boolean)
  if (!cleaned.length) return 'none'

  if (!isIntern) {
    for (const key of Object.keys(ELIGIBILITY_MAP) as (keyof typeof ELIGIBILITY_MAP)[]) {
      const bullets = PAID_ELIGIBILITY_BULLETS[key]
      if (
        bullets.length === cleaned.length &&
        bullets.every((b, i) => b === cleaned[i])
      ) {
        return key
      }
      const paidOne = ELIGIBILITY_MAP[key].paid
      if (cleaned.length === 1 && cleaned[0] === paidOne) return key
    }
    return 'custom'
  }

  const first = cleaned[0] || ''
  for (const key of Object.keys(ELIGIBILITY_MAP) as (keyof typeof ELIGIBILITY_MAP)[]) {
    const t = ELIGIBILITY_MAP[key].unpaid
    if (t && first === t) return key
  }
  return 'custom'
}

/** Wording aligned with backend `buildCompensationNarrative` for live preview. */
export function compensationPreviewFromAnnualGross(annual: number, currency: string): string {
  if (annual == null || Number.isNaN(annual) || annual <= 0) return ''
  const cur = (currency || 'USD').toUpperCase()
  const monthly = annual / 12
  const closing = 'subject to all applicable federal, state, and local tax withholdings.'
  if (cur === 'USD') {
    return `You will receive a gross annual salary of $${annual.toLocaleString('en-US', { maximumFractionDigits: 0 })} USD, payable in monthly installments of $${Math.round(monthly).toLocaleString('en-US', { maximumFractionDigits: 0 })} USD, ${closing}`
  }
  if (cur === 'INR') {
    return `You will receive a gross annual salary of ₹${annual.toLocaleString('en-IN', { maximumFractionDigits: 0 })} INR, payable in monthly installments of ₹${Math.round(monthly).toLocaleString('en-IN', { maximumFractionDigits: 0 })} INR, ${closing}`
  }
  return `You will receive a gross annual salary of ${annual.toLocaleString('en-US', { maximumFractionDigits: 0 })} ${cur}, payable in monthly installments of ${Math.round(monthly).toLocaleString('en-US', { maximumFractionDigits: 0 })} ${cur}, ${closing}`
}

export function employmentLinesFromPreset(
  preset: EligibilityPresetKey,
  isIntern: boolean,
  customText: string
): string[] {
  if (preset === 'none') return []
  if (preset === 'custom') {
    return customText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  const presetKey = preset as keyof typeof ELIGIBILITY_MAP
  const entry = ELIGIBILITY_MAP[presetKey]
  if (!entry) return []
  if (isIntern) {
    return entry.unpaid ? [entry.unpaid] : []
  }
  const bullets = PAID_ELIGIBILITY_BULLETS[presetKey]
  return bullets ? [...bullets] : []
}

/** Default OPT paragraph for unpaid interns (matches Word template; used when preset is unset / none in UI). */
export const INTERN_OFFER_DEFAULT_ELIGIBILITY = ELIGIBILITY_MAP.opt_regular.unpaid

/** Preview HTML with emphasis matching the reference offer letter. */
export function internEligibilityOptRegularPreviewHtml(): string {
  return `As per U.S. immigration regulations, this training position is aligned with your <strong>F-1 Optional Practical Training (OPT)</strong> authorization. The responsibilities outlined above are <strong>directly related to your major field of study</strong>, and we are prepared to support any necessary documentation required for your Designated School Official (DSO) or SEVIS reporting, including confirming supervision, training plans, and role alignment.`
}

/** Preview / display parity when eligibility preset is unset (none) or saved lines are empty. */
export function effectiveEligibilityLines(
  preset: EligibilityPresetKey,
  isIntern: boolean,
  customText: string
): string[] {
  const lines = employmentLinesFromPreset(preset, isIntern, customText)
  if (lines.length > 0) return lines
  if (preset === 'custom') return []
  if (isIntern) return [INTERN_OFFER_DEFAULT_ELIGIBILITY]
  return [...PAID_ELIGIBILITY_BULLETS.opt_regular]
}
