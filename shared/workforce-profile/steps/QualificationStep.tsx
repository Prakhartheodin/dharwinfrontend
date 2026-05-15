"use client";

import React from "react";
import { useWorkforceStore } from "../state/workforce.store";
import { useWizardContext } from "../engine/WizardContext";

let rowCounter = 0;
const newId = () => `q-${Date.now()}-${++rowCounter}`;

function generateYearOptions(): string[] {
  const now = new Date().getFullYear();
  const out: string[] = [];
  for (let y = now + 5; y >= 1960; y--) out.push(String(y));
  return out;
}

function validateYearRange(start: string, end: string): boolean {
  if (!start || !end) return true;
  return Number(start) <= Number(end);
}

export function QualificationStep() {
  const educations = useWorkforceStore((s) => s.qualification.educations);
  const skills = useWorkforceStore((s) => s.qualification.skills);
  const addEducation = useWorkforceStore((s) => s.addEducation);
  const removeEducation = useWorkforceStore((s) => s.removeEducation);
  const updateEducation = useWorkforceStore((s) => s.updateEducation);
  const addSkill = useWorkforceStore((s) => s.addSkill);
  const removeSkill = useWorkforceStore((s) => s.removeSkill);
  const updateSkill = useWorkforceStore((s) => s.updateSkill);
  const { issuesByField } = useWizardContext();

  const eduErr = issuesByField["qualification.educations"]?.[0]?.message ?? null;
  const skillErr = issuesByField["qualification.skills"]?.[0]?.message ?? null;
  const years = generateYearOptions();

  return (
    <div className="p-4">
      <p className="mb-1 font-semibold text-[#8c9097] opacity-50 text-[1.25rem]">02</p>
      <div className="text-[0.9375rem] font-semibold sm:flex block items-center justify-between mb-4">
        <div>Qualification :</div>
        <button
          type="button"
          onClick={() =>
            addEducation({
              id: newId(),
              degree: "",
              institute: "",
              location: "",
              startYear: "",
              endYear: "",
              description: "",
            })
          }
          className="ti-btn bg-primary text-white !py-1 !px-2 !text-[0.75rem]"
        >
          + Add Education
        </button>
      </div>
      {eduErr && <div className="text-red-500 text-sm mb-3">{eduErr}</div>}

      {educations.map((edu) => {
        const yearMismatch =
          edu.startYear &&
          edu.endYear &&
          !validateYearRange(edu.startYear, edu.endYear);
        return (
          <div
            key={edu.id}
            className="relative grid grid-cols-12 gap-4 border rounded-sm p-3 mb-3"
          >
            <button
              type="button"
              onClick={() => removeEducation(edu.id)}
              className="absolute top-2 right-2 border rounded-full px-1 text-red-500 hover:text-white hover:bg-red-600"
            >
              ✕
            </button>
            <div className="xl:col-span-6 col-span-12">
              <label className="form-label">
                Degree <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className={`form-control w-full !rounded-md ${eduErr ? "border-red-500" : ""}`}
                placeholder="Degree"
                value={edu.degree}
                onChange={(e) => updateEducation(edu.id, { degree: e.target.value })}
              />
            </div>
            <div className="xl:col-span-6 col-span-12">
              <label className="form-label">
                University <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className={`form-control w-full !rounded-md ${eduErr ? "border-red-500" : ""}`}
                placeholder="University/Institute"
                value={edu.institute}
                onChange={(e) =>
                  updateEducation(edu.id, { institute: e.target.value })
                }
              />
            </div>
            <div className="xl:col-span-6 col-span-12">
              <label className="form-label">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="form-control w-full !rounded-md"
                placeholder="Location"
                value={edu.location}
                onChange={(e) =>
                  updateEducation(edu.id, { location: e.target.value })
                }
              />
            </div>
            <div className="xl:col-span-6 col-span-12">
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-6">
                  <label className="form-label">
                    Start Year <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="form-control w-full !rounded-md"
                    value={edu.startYear}
                    onChange={(e) =>
                      updateEducation(edu.id, { startYear: e.target.value })
                    }
                  >
                    <option value="">Select Start Year</option>
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-6">
                  <label className="form-label">
                    End Year <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="form-control w-full !rounded-md"
                    value={edu.endYear}
                    onChange={(e) =>
                      updateEducation(edu.id, { endYear: e.target.value })
                    }
                  >
                    <option value="">Select End Year</option>
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {yearMismatch && (
                <div className="text-red-500 text-sm mt-2 col-span-12">
                  Start year cannot be ahead of end year
                </div>
              )}
            </div>
            <div className="xl:col-span-12 col-span-12">
              <label className="form-label">Description</label>
              <textarea
                className="form-control w-full !rounded-md"
                rows={3}
                placeholder="Description"
                value={edu.description}
                onChange={(e) =>
                  updateEducation(edu.id, { description: e.target.value })
                }
              />
            </div>
          </div>
        );
      })}

      <div className="xl:col-span-12 col-span-12">
        <div className="text-[0.9375rem] font-semibold sm:flex block items-center justify-between mb-4">
          <div>Skills :</div>
          <button
            type="button"
            onClick={() =>
              addSkill({ id: newId(), name: "", level: "Beginner" })
            }
            className="ti-btn bg-primary text-white !py-1 !px-2 !text-[0.75rem]"
          >
            + Add Skill
          </button>
        </div>
        {skillErr && <div className="text-red-500 text-sm mb-3">{skillErr}</div>}

        {skills.map((sk) => (
          <div
            key={sk.id}
            className="relative grid grid-cols-12 gap-4 border rounded-sm p-3 mb-3"
          >
            <button
              type="button"
              onClick={() => removeSkill(sk.id)}
              className="absolute top-2 right-2 border rounded-full px-1 text-red-500 hover:text-white hover:bg-red-600"
            >
              ✕
            </button>
            <div className="xl:col-span-4 col-span-12">
              <label className="form-label">
                Skill Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="form-control w-full !rounded-md"
                placeholder="e.g., JavaScript, Python, React"
                value={sk.name}
                onChange={(e) => updateSkill(sk.id, { name: e.target.value })}
              />
            </div>
            <div className="xl:col-span-4 col-span-12">
              <label className="form-label">Skill Level</label>
              <select
                className="form-control w-full !rounded-md"
                value={sk.level}
                onChange={(e) => updateSkill(sk.id, { level: e.target.value })}
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Expert">Expert</option>
              </select>
            </div>
            <div className="xl:col-span-4 col-span-12">
              <label className="form-label">Category</label>
              <input
                type="text"
                className="form-control w-full !rounded-md"
                placeholder="e.g., Frontend, Languages"
                value={sk.category ?? ""}
                onChange={(e) => updateSkill(sk.id, { category: e.target.value })}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
