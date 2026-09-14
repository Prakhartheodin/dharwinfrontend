"use client";

import React, { useState } from "react";
import type {
  PublicApplyExperience,
  PublicApplyQualification,
  PublicApplySocialLink,
  PublicResumeParseSkill,
} from "@/shared/lib/api/jobs";

type PublicApplyAiProfileEditorProps = {
  skills: PublicResumeParseSkill[];
  experiences: PublicApplyExperience[];
  qualifications: PublicApplyQualification[];
  socialLinks: PublicApplySocialLink[];
  onSkillsChange?: (skills: PublicResumeParseSkill[]) => void;
  onExperiencesChange: (rows: PublicApplyExperience[]) => void;
  onQualificationsChange: (rows: PublicApplyQualification[]) => void;
  onSocialLinksChange: (rows: PublicApplySocialLink[]) => void;
  heading?: string;
  /** When true, always show the skills block (add/remove) even if the list is empty. */
  showSkillsEditor?: boolean;
};

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white";

export function PublicApplyAiProfileEditor({
  skills,
  experiences,
  qualifications,
  socialLinks,
  onSkillsChange,
  onExperiencesChange,
  onQualificationsChange,
  onSocialLinksChange,
  heading = "AI suggestions — review and edit before submitting",
  showSkillsEditor = false,
}: PublicApplyAiProfileEditorProps) {
  const [skillDraft, setSkillDraft] = useState("");

  const addSkillFromDraft = () => {
    const name = skillDraft.trim();
    if (!name || !onSkillsChange) return;
    const exists = skills.some((s) => s.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      setSkillDraft("");
      return;
    }
    onSkillsChange([...skills, { name, level: "" }]);
    setSkillDraft("");
  };
  const updateExperience = (index: number, patch: Partial<PublicApplyExperience>) => {
    onExperiencesChange(experiences.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const updateQualification = (index: number, patch: Partial<PublicApplyQualification>) => {
    onQualificationsChange(qualifications.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const updateSocialLink = (index: number, patch: Partial<PublicApplySocialLink>) => {
    onSocialLinksChange(socialLinks.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  return (
    <div className="space-y-5 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-900/40">
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{heading}</p>

      {showSkillsEditor || skills.length > 0 ? (
        <section aria-labelledby="public-apply-skills-heading">
          <h3 id="public-apply-skills-heading" className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Skills
          </h3>
          {onSkillsChange ? (
            <>
              <div className="mb-2 flex flex-wrap gap-2" aria-label="Skills from resume">
                {skills.map((skill) => (
                  <span
                    key={skill.name}
                    className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                  >
                    {skill.name}
                    <button
                      type="button"
                      className="rounded-full p-0.5 text-gray-500 hover:bg-gray-200 hover:text-gray-800 dark:hover:bg-gray-600 dark:hover:text-white"
                      aria-label={`Remove skill ${skill.name}`}
                      onClick={() => onSkillsChange(skills.filter((s) => s.name !== skill.name))}
                    >
                      <i className="ri-close-line text-sm" aria-hidden />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={skillDraft}
                  onChange={(e) => setSkillDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSkillFromDraft();
                    }
                  }}
                  className={inputClass}
                  placeholder="Add a skill"
                  aria-label="Add skill"
                />
                <button
                  type="button"
                  className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                  onClick={addSkillFromDraft}
                >
                  Add
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap gap-2" aria-label="Detected skills from resume">
              {skills.map((skill) => (
                <span
                  key={skill.name}
                  className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                >
                  {skill.name}
                </span>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <section aria-labelledby="public-apply-experience-heading">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 id="public-apply-experience-heading" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Experience ({experiences.length})
          </h3>
          <button
            type="button"
            className="text-xs font-semibold text-primary hover:underline"
            onClick={() =>
              onExperiencesChange([
                ...experiences,
                { company: "", role: "", currentlyWorking: false, startDate: null, endDate: null, description: null },
              ])
            }
          >
            + Add experience
          </button>
        </div>
        {experiences.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">No experience rows yet.</p>
        ) : (
          <div className="space-y-3">
            {experiences.map((row, index) => (
              <div key={`exp-${index}`} className="space-y-2 rounded-md border border-gray-200 bg-white p-3 dark:border-gray-600 dark:bg-gray-800">
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    type="text"
                    value={row.company}
                    onChange={(e) => updateExperience(index, { company: e.target.value })}
                    className={inputClass}
                    placeholder="Company"
                    aria-label={`Experience ${index + 1} company`}
                  />
                  <input
                    type="text"
                    value={row.role}
                    onChange={(e) => updateExperience(index, { role: e.target.value })}
                    className={inputClass}
                    placeholder="Role / title"
                    aria-label={`Experience ${index + 1} role`}
                  />
                  <input
                    type="date"
                    value={row.startDate || ""}
                    onChange={(e) => updateExperience(index, { startDate: e.target.value || null })}
                    className={inputClass}
                    aria-label={`Experience ${index + 1} start date`}
                  />
                  <input
                    type="date"
                    value={row.endDate || ""}
                    disabled={row.currentlyWorking}
                    onChange={(e) => updateExperience(index, { endDate: e.target.value || null })}
                    className={inputClass}
                    aria-label={`Experience ${index + 1} end date`}
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={Boolean(row.currentlyWorking)}
                    onChange={(e) =>
                      updateExperience(index, {
                        currentlyWorking: e.target.checked,
                        endDate: e.target.checked ? null : row.endDate,
                      })
                    }
                  />
                  Currently working here
                </label>
                <textarea
                  value={row.description || ""}
                  onChange={(e) => updateExperience(index, { description: e.target.value })}
                  rows={2}
                  className={inputClass}
                  placeholder="Description (optional)"
                  aria-label={`Experience ${index + 1} description`}
                />
                <button
                  type="button"
                  className="text-xs text-red-600 hover:underline dark:text-red-400"
                  onClick={() => onExperiencesChange(experiences.filter((_, i) => i !== index))}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="public-apply-qualification-heading">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 id="public-apply-qualification-heading" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Qualifications ({qualifications.length})
          </h3>
          <button
            type="button"
            className="text-xs font-semibold text-primary hover:underline"
            onClick={() =>
              onQualificationsChange([
                ...qualifications,
                { degree: "", institute: "", location: null, startYear: null, endYear: null, description: null },
              ])
            }
          >
            + Add qualification
          </button>
        </div>
        {qualifications.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">No qualification rows yet.</p>
        ) : (
          <div className="space-y-3">
            {qualifications.map((row, index) => (
              <div key={`qual-${index}`} className="space-y-2 rounded-md border border-gray-200 bg-white p-3 dark:border-gray-600 dark:bg-gray-800">
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    type="text"
                    value={row.degree}
                    onChange={(e) => updateQualification(index, { degree: e.target.value })}
                    className={inputClass}
                    placeholder="Degree"
                    aria-label={`Qualification ${index + 1} degree`}
                  />
                  <input
                    type="text"
                    value={row.institute}
                    onChange={(e) => updateQualification(index, { institute: e.target.value })}
                    className={inputClass}
                    placeholder="Institute"
                    aria-label={`Qualification ${index + 1} institute`}
                  />
                  <input
                    type="text"
                    value={row.location || ""}
                    onChange={(e) => updateQualification(index, { location: e.target.value })}
                    className={inputClass}
                    placeholder="Location (optional)"
                    aria-label={`Qualification ${index + 1} location`}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={row.startYear ?? ""}
                      onChange={(e) =>
                        updateQualification(index, {
                          startYear: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className={inputClass}
                      placeholder="Start year"
                      aria-label={`Qualification ${index + 1} start year`}
                    />
                    <input
                      type="number"
                      value={row.endYear ?? ""}
                      onChange={(e) =>
                        updateQualification(index, {
                          endYear: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className={inputClass}
                      placeholder="End year"
                      aria-label={`Qualification ${index + 1} end year`}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="text-xs text-red-600 hover:underline dark:text-red-400"
                  onClick={() => onQualificationsChange(qualifications.filter((_, i) => i !== index))}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="public-apply-social-heading">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 id="public-apply-social-heading" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Social links ({socialLinks.length})
          </h3>
          <button
            type="button"
            className="text-xs font-semibold text-primary hover:underline"
            onClick={() => onSocialLinksChange([...socialLinks, { platform: "", url: "" }])}
          >
            + Add link
          </button>
        </div>
        {socialLinks.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">No social links yet.</p>
        ) : (
          <div className="space-y-3">
            {socialLinks.map((row, index) => (
              <div key={`social-${index}`} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                <input
                  type="text"
                  value={row.platform}
                  onChange={(e) => updateSocialLink(index, { platform: e.target.value })}
                  className={inputClass}
                  placeholder="Platform"
                  aria-label={`Social link ${index + 1} platform`}
                />
                <input
                  type="url"
                  value={row.url}
                  onChange={(e) => updateSocialLink(index, { url: e.target.value })}
                  className={inputClass}
                  placeholder="https://..."
                  aria-label={`Social link ${index + 1} url`}
                />
                <button
                  type="button"
                  className="text-xs text-red-600 hover:underline dark:text-red-400"
                  onClick={() => onSocialLinksChange(socialLinks.filter((_, i) => i !== index))}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
