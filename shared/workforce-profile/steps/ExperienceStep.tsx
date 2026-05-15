"use client";

import React from "react";
import { useWorkforceStore } from "../state/workforce.store";
import { useWizardContext } from "../engine/WizardContext";

let rowCounter = 0;
const newId = () => `x-${Date.now()}-${++rowCounter}`;

const todayISO = (): string => new Date().toISOString().slice(0, 10);

const validateDateRange = (start: string, end: string): boolean =>
  !start || !end || start <= end;

const validateNotFutureDate = (end: string): boolean =>
  !end || end <= todayISO();

export function ExperienceStep() {
  const experiences = useWorkforceStore((s) => s.experience.experiences);
  const addExperienceRow = useWorkforceStore((s) => s.addExperienceRow);
  const removeExperienceRow = useWorkforceStore((s) => s.removeExperienceRow);
  const updateExperienceRow = useWorkforceStore((s) => s.updateExperienceRow);
  const { issuesByField } = useWizardContext();

  const expErr =
    issuesByField["experience.experiences[].endDate"]?.[0]?.message ?? null;

  return (
    <div className="p-4">
      <p className="mb-1 font-semibold text-[#8c9097] opacity-50 text-[1.25rem]">03</p>
      <div className="text-[0.9375rem] font-semibold sm:flex block items-center justify-between mb-4">
        <div>Experience :</div>
        <button
          type="button"
          onClick={() =>
            addExperienceRow({
              id: newId(),
              company: "",
              role: "",
              startDate: "",
              endDate: "",
              currentlyWorking: false,
              description: "",
            })
          }
          className="ti-btn bg-primary text-white !py-1 !px-2 !text-[0.75rem]"
        >
          + Add Experience
        </button>
      </div>
      {expErr && <div className="text-red-500 text-sm mb-3">{expErr}</div>}

      {experiences.map((exp, index) => (
        <div
          key={exp.id}
          className="relative grid grid-cols-12 gap-4 border rounded-sm p-3 mb-3"
        >
          <button
            type="button"
            onClick={() => removeExperienceRow(exp.id)}
            className="absolute top-2 right-2 border rounded-full px-1 text-red-500 hover:text-white hover:bg-red-600"
          >
            ✕
          </button>

          <div className="xl:col-span-6 col-span-12">
            <label className="form-label">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="form-control w-full !rounded-md"
              placeholder="Company Name"
              value={exp.company}
              onChange={(e) => updateExperienceRow(exp.id, { company: e.target.value })}
            />
          </div>

          <div className="xl:col-span-6 col-span-12">
            <label className="form-label">
              Role/Designation <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="form-control w-full !rounded-md"
              placeholder="Role/Designation"
              value={exp.role}
              onChange={(e) => updateExperienceRow(exp.id, { role: e.target.value })}
            />
          </div>

          <div className="xl:col-span-6 col-span-12">
            <label className="form-label">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              className="form-control w-full !rounded-md"
              value={exp.startDate}
              onChange={(e) => updateExperienceRow(exp.id, { startDate: e.target.value })}
            />
          </div>

          <div className="xl:col-span-6 col-span-12">
            <label className="form-label">
              End Date {!exp.currentlyWorking && <span className="text-red-500">*</span>}
            </label>
            <input
              type="date"
              className="form-control w-full !rounded-md"
              value={exp.endDate}
              onChange={(e) => updateExperienceRow(exp.id, { endDate: e.target.value })}
              disabled={exp.currentlyWorking}
            />
          </div>

          <div className="xl:col-span-12 col-span-12">
            <div className="flex items-center">
              <input
                type="checkbox"
                id={`currentlyWorking-${index}`}
                checked={exp.currentlyWorking}
                onChange={(e) =>
                  updateExperienceRow(exp.id, {
                    currentlyWorking: e.target.checked,
                    endDate: e.target.checked ? "" : exp.endDate,
                  })
                }
                className="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <label
                htmlFor={`currentlyWorking-${index}`}
                className="ml-2 text-sm text-gray-700 dark:text-gray-300"
              >
                Currently working here
              </label>
            </div>
          </div>

          {exp.startDate && exp.endDate && !validateDateRange(exp.startDate, exp.endDate) && (
            <div className="text-red-500 text-sm mt-2 col-span-12">
              Start date cannot be ahead of end date
            </div>
          )}
          {exp.endDate && !validateNotFutureDate(exp.endDate) && (
            <div className="text-red-500 text-sm mt-2 col-span-12">
              End date cannot be in the future
            </div>
          )}

          <div className="xl:col-span-12 col-span-12">
            <label className="form-label">Responsibilities / Description</label>
            <textarea
              className="form-control w-full !rounded-md"
              rows={3}
              placeholder="Responsibilities / Description"
              value={exp.description}
              onChange={(e) => updateExperienceRow(exp.id, { description: e.target.value })}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
