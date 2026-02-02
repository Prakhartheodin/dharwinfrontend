import React from "react";

const DashboardIcon = <i className="bx bx-home side-menu__icon"></i>;

// ATS Icons
const JobsIcon = <i className="bx bx-briefcase-alt side-menu__icon"></i>;
const CandidatesIcon = <i className="bx bx-user side-menu__icon"></i>;
const RecruitersIcon = <i className="bx bx-user-check side-menu__icon"></i>;
const InterviewsIcon = <i className="bx bx-calendar-check side-menu__icon"></i>;
const OffersPlacementIcon = <i className="bx bx-badge-check side-menu__icon"></i>;
const PreBoardingIcon = <i className="bx bx-user-plus side-menu__icon"></i>;
const OnboardingIcon = <i className="bx bx-log-in-circle side-menu__icon"></i>;
const AnalyticsIcon = <i className="bx bx-bar-chart-alt-2 side-menu__icon"></i>;

// Communication Icons
const EmailIcon = <i className="bx bx-envelope side-menu__icon"></i>;
const ChatsIcon = <i className="bx bx-message-rounded-dots side-menu__icon"></i>;
const CallingIcon = <i className="bx bx-phone-call side-menu__icon"></i>;
const FilesStorageIcon = <i className="bx bx-folder side-menu__icon"></i>;

// Training Management Icons
const TrainingCurriculumIcon = <i className="bx bx-book-open side-menu__icon"></i>;
const AttendanceTrackingIcon = <i className="bx bx-clipboard side-menu__icon"></i>;
const MentorsIcon = <i className="bx bx-user-voice side-menu__icon"></i>;
const StudentsIcon = <i className="bx bx-group side-menu__icon"></i>;
const EvaluationIcon = <i className="bx bx-edit-alt side-menu__icon"></i>;

// Project Management Icons
const ProjectsIcon = <i className="bx bx-folder-open side-menu__icon"></i>;
const TaskIcon = <i className="bx bx-task side-menu__icon"></i>;
const TeamsIcon = <i className="bx bx-group side-menu__icon"></i>;

const badge = (
  <span className="badge !bg-warning/10 !text-warning !py-[0.25rem] !px-[0.45rem] !text-[0.75em] ms-1">
    12
  </span>
);
const badge1 = (
  <span className="text-secondary text-[0.75em] rounded-sm !py-[0.25rem] !px-[0.45rem] badge !bg-secondary/10 ms-1">
    New
  </span>
);
const badge2 = (
  <span className="text-danger text-[0.75em] rounded-sm badge !py-[0.25rem] !px-[0.45rem] !bg-danger/10 ms-1">
    Hot
  </span>
);
const badge4 = (
  <span className="text-success text-[0.75em] badge !py-[0.25rem] !px-[0.45rem] rounded-sm bg-success/10 ms-1">
    3
  </span>
);

export const MenuItems: any = [
  {
    menutitle: "MAIN",
  },

  {
    icon: DashboardIcon,
    title: "Dashboard",
        type: "link",
    path: "/dashboards/projects",
        active: false,
        selected: false,
        dirchange: false, 
  },

  {
    menutitle: "ATS",
      },

  {
    icon: JobsIcon,
        title: "Jobs",
        type: "link",
    path: "/ats/jobs",
        active: false,
        selected: false,
        dirchange: false, 
      },

      {
    icon: CandidatesIcon,
    title: "Candidates",
        type: "link",
    path: "/ats/candidates",
        active: false,
        selected: false,
        dirchange: false, 
      },

      {
    icon: RecruitersIcon,
    title: "Recruiters",
        type: "link",
    path: "/ats/recruiters",
        active: false,
        selected: false,
        dirchange: false, 
      },

      {
    icon: InterviewsIcon,
    title: "Interviews",
        type: "link",
    path: "/ats/interviews",
        active: false,
        selected: false,
        dirchange: false, 
      },

      {
    icon: OffersPlacementIcon,
    title: "Offers & Placement",
        type: "link",
    path: "/ats/offers-placement",
        active: false,
        selected: false,
        dirchange: false, 
      },

      {
    icon: PreBoardingIcon,
    title: "Pre-boarding",
        type: "link",
    path: "/ats/pre-boarding",
        active: false,
        selected: false,
        dirchange: false, 
      },

      {
    icon: OnboardingIcon,
    title: "Onboarding",
        type: "link",
    path: "/ats/onboarding",
        active: false,
        selected: false,
        dirchange: false, 
      },

      {
    icon: AnalyticsIcon,
    title: "Analytics",
        type: "link",
    path: "/ats/analytics",
        active: false,
        selected: false,
        dirchange: false, 
  },

  {
    menutitle: "Communication",
  },

  {
    icon: EmailIcon,
    title: "Email",
        type: "link",
    path: "/pages/email/mail-app",
        active: false,
        selected: false,
        dirchange: false, 
  },

  {
    icon: ChatsIcon,
    title: "Chats",
            type: "link",
        path: "/pages/chat",
        active: false,
        selected: false,
        dirchange: false, 
      },

      {
    icon: CallingIcon,
    title: "Calling",
        type: "link",
    path: "/communication/calling",
        active: false,
        selected: false,
        dirchange: false, 
      },

      {
    icon: FilesStorageIcon,
    title: "Files Storage",
        type: "link",
            path: "/pages/filemanager",
            active: false,
            selected: false,
            dirchange: false, 
  },

  {
    menutitle: "Training Management",
          },

      {
    icon: TrainingCurriculumIcon,
    title: "Training Curriculum",
            type: "link",
    path: "/training/curriculum",
            active: false,
            selected: false,
            dirchange: false, 
          },

          {
    icon: AttendanceTrackingIcon,
    title: "Attendance Tracking",
            type: "link",
    path: "/training/attendance",
            active: false,
            selected: false,
            dirchange: false, 
          },

      {
    icon: MentorsIcon,
    title: "Mentors",
        type: "link",
    path: "/training/mentors",
        active: false,
        selected: false,
        dirchange: false, 
      },

      {
    icon: StudentsIcon,
    title: "Students",
        type: "link",
    path: "/training/students",
        active: false,
        selected: false,
        dirchange: false, 
      },

      {
    icon: EvaluationIcon,
    title: "Evaluation",
        type: "link",
    path: "/training/evaluation",
        active: false,
        selected: false,
        dirchange: false, 
  },

  {
    icon: AnalyticsIcon,
    title: "Analytics",
            type: "link",
    path: "/training/analytics",
            active: false,
            selected: false,
            dirchange: false, 
  },

  {
    menutitle: "Project Management",
  },

  {
    icon: ProjectsIcon,
        title: "Projects",
            type: "link",
    path: "/apps/projects/project-list",
        active: false,
        selected: false,
        dirchange: false, 
      },

      {
    icon: TaskIcon,
    title: "Task Board",
        type: "link",
    path: "/task/kanban-board",
        active: false,
        selected: false,
        dirchange: false, 
  },

  {
    icon: TeamsIcon,
    title: "Teams",
            type: "link",
    path: "/pages/team",
            active: false,
            selected: false,
            dirchange: false, 
  },

  {
    icon: AnalyticsIcon,
    title: "Analytics",
        type: "link",
    path: "/project-management/analytics",
        active: false,
        selected: false,
        dirchange: false, 
  },
];
