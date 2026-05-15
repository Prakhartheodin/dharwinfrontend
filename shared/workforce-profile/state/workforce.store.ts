"use client";

import { create } from "zustand";
import type {
  WorkforceFormState,
  PersonalInfoSlice,
  QualificationSlice,
  ExperienceSlice,
  DocumentsSlice,
  SalarySlice,
  Education,
  Skill,
  Experience,
  SalarySlip,
} from "../types/workforce.types";
import type { DocumentResource } from "../types/resource.types";
import { emptyWorkforceFormState } from "../services/schema";

type Patch<T> = Partial<T> | ((prev: T) => Partial<T>);

export type WorkforceStoreState = WorkforceFormState & {
  snapshot: WorkforceFormState;

  setPersonalInfo: (patch: Patch<PersonalInfoSlice>) => void;
  setQualification: (patch: Patch<QualificationSlice>) => void;
  setExperience: (patch: Patch<ExperienceSlice>) => void;
  setDocuments: (patch: Patch<DocumentsSlice>) => void;
  setSalary: (patch: Patch<SalarySlice>) => void;

  addEducation: (item: Education) => void;
  removeEducation: (id: Education["id"]) => void;
  updateEducation: (id: Education["id"], patch: Partial<Education>) => void;

  addSkill: (item: Skill) => void;
  removeSkill: (id: Skill["id"]) => void;
  updateSkill: (id: Skill["id"], patch: Partial<Skill>) => void;

  addExperienceRow: (item: Experience) => void;
  removeExperienceRow: (id: Experience["id"]) => void;
  updateExperienceRow: (id: Experience["id"], patch: Partial<Experience>) => void;

  addDocument: (item: DocumentResource) => void;
  removeDocument: (tempId: DocumentResource["tempId"]) => void;
  updateDocument: (
    tempId: DocumentResource["tempId"],
    patch: Partial<DocumentResource>,
  ) => void;

  addSalarySlip: (item: SalarySlip) => void;
  removeSalarySlip: (id: SalarySlip["id"]) => void;
  updateSalarySlip: (id: SalarySlip["id"], patch: Partial<SalarySlip>) => void;

  hydrate: (state: WorkforceFormState) => void;
  commitSnapshot: () => void;
  reset: () => void;
};

const applyPatch = <T extends object>(prev: T, patch: Patch<T>): T => {
  const next = typeof patch === "function" ? patch(prev) : patch;
  return { ...prev, ...next };
};

const cloneState = (s: WorkforceFormState): WorkforceFormState =>
  typeof structuredClone === "function"
    ? structuredClone(s)
    : (JSON.parse(JSON.stringify(s)) as WorkforceFormState);

export const useWorkforceStore = create<WorkforceStoreState>((set, get) => {
  const initial = emptyWorkforceFormState();
  return {
    ...initial,
    snapshot: initial,

    setPersonalInfo: (patch) =>
      set((s) => ({ personalInfo: applyPatch(s.personalInfo, patch) })),
    setQualification: (patch) =>
      set((s) => ({ qualification: applyPatch(s.qualification, patch) })),
    setExperience: (patch) =>
      set((s) => ({ experience: applyPatch(s.experience, patch) })),
    setDocuments: (patch) =>
      set((s) => ({ documents: applyPatch(s.documents, patch) })),
    setSalary: (patch) =>
      set((s) => ({ salary: applyPatch(s.salary, patch) })),

    addEducation: (item) =>
      set((s) => ({
        qualification: { ...s.qualification, educations: [...s.qualification.educations, item] },
      })),
    removeEducation: (id) =>
      set((s) => ({
        qualification: {
          ...s.qualification,
          educations: s.qualification.educations.filter((e) => e.id !== id),
        },
      })),
    updateEducation: (id, patch) =>
      set((s) => ({
        qualification: {
          ...s.qualification,
          educations: s.qualification.educations.map((e) =>
            e.id === id ? { ...e, ...patch } : e,
          ),
        },
      })),

    addSkill: (item) =>
      set((s) => ({
        qualification: { ...s.qualification, skills: [...s.qualification.skills, item] },
      })),
    removeSkill: (id) =>
      set((s) => ({
        qualification: {
          ...s.qualification,
          skills: s.qualification.skills.filter((sk) => sk.id !== id),
        },
      })),
    updateSkill: (id, patch) =>
      set((s) => ({
        qualification: {
          ...s.qualification,
          skills: s.qualification.skills.map((sk) =>
            sk.id === id ? { ...sk, ...patch } : sk,
          ),
        },
      })),

    addExperienceRow: (item) =>
      set((s) => ({
        experience: { experiences: [...s.experience.experiences, item] },
      })),
    removeExperienceRow: (id) =>
      set((s) => ({
        experience: {
          experiences: s.experience.experiences.filter((x) => x.id !== id),
        },
      })),
    updateExperienceRow: (id, patch) =>
      set((s) => ({
        experience: {
          experiences: s.experience.experiences.map((x) =>
            x.id === id ? { ...x, ...patch } : x,
          ),
        },
      })),

    addDocument: (item) =>
      set((s) => ({ documents: { documents: [...s.documents.documents, item] } })),
    removeDocument: (tempId) =>
      set((s) => ({
        documents: {
          documents: s.documents.documents.filter((d) => d.tempId !== tempId),
        },
      })),
    updateDocument: (tempId, patch) =>
      set((s) => ({
        documents: {
          documents: s.documents.documents.map((d) =>
            d.tempId === tempId ? { ...d, ...patch } : d,
          ),
        },
      })),

    addSalarySlip: (item) =>
      set((s) => ({ salary: { salarySlips: [...s.salary.salarySlips, item] } })),
    removeSalarySlip: (id) =>
      set((s) => ({
        salary: { salarySlips: s.salary.salarySlips.filter((x) => x.id !== id) },
      })),
    updateSalarySlip: (id, patch) =>
      set((s) => ({
        salary: {
          salarySlips: s.salary.salarySlips.map((x) =>
            x.id === id ? { ...x, ...patch } : x,
          ),
        },
      })),

    hydrate: (state) =>
      set(() => ({
        ...state,
        snapshot: cloneState(state),
      })),
    commitSnapshot: () => {
      const { personalInfo, qualification, experience, documents, salary } = get();
      set({
        snapshot: cloneState({
          personalInfo,
          qualification,
          experience,
          documents,
          salary,
        }),
      });
    },
    reset: () =>
      set((s) => ({
        personalInfo: cloneState(s.snapshot).personalInfo,
        qualification: cloneState(s.snapshot).qualification,
        experience: cloneState(s.snapshot).experience,
        documents: cloneState(s.snapshot).documents,
        salary: cloneState(s.snapshot).salary,
      })),
  };
});

export const selectFormState = (s: WorkforceStoreState): WorkforceFormState => ({
  personalInfo: s.personalInfo,
  qualification: s.qualification,
  experience: s.experience,
  documents: s.documents,
  salary: s.salary,
});
