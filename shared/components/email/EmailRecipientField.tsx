"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { queryEmployeeDirectory } from "@/shared/lib/api/org-structure";
import {
  dedupeRecipients,
  extractEmailAddress,
  isValidEmailAddress,
  joinRecipients,
  parseRecipientInput,
  recipientsFromHeaderString,
} from "@/shared/lib/email-recipient-utils";
import styles from "./email-recipient-field.module.css";

export type EmailQuickContact = { email: string };

export interface EmailRecipientFieldProps {
  id: string;
  label: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string | null;
  onErrorChange?: (error: string | null) => void;
  enableDirectory?: boolean;
  quickContacts?: EmailQuickContact[];
  showQuickSuggestions?: boolean;
}

type DirectoryHit = {
  id: string;
  fullName: string;
  email: string;
  designation?: string;
};

const DIRECTORY_DEBOUNCE_MS = 300;

export default function EmailRecipientField({
  id,
  label,
  value,
  onChange,
  placeholder = "name@example.com",
  required,
  error,
  onErrorChange,
  enableDirectory = false,
  quickContacts = [],
  showQuickSuggestions = false,
}: EmailRecipientFieldProps) {
  const errorId = `${id}-error`;
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const [chips, setChips] = useState<string[]>(() => recipientsFromHeaderString(value));
  const [suggestions, setSuggestions] = useState<DirectoryHit[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestGenRef = useRef(0);

  const syncOut = useCallback(
    (nextChips: string[]) => {
      setChips(nextChips);
      onChange(joinRecipients(nextChips));
    },
    [onChange]
  );

  useEffect(() => {
    setChips(recipientsFromHeaderString(value));
  }, [value]);

  const commitInput = useCallback(
    (raw?: string) => {
      const text = (raw ?? input).trim().replace(/,$/, "");
      if (!text) return true;
      const parsed = parseRecipientInput(text);
      if (parsed.length === 0) return true;
      const invalid = parsed.filter((p) => !isValidEmailAddress(p));
      if (invalid.length) {
        onErrorChange?.(`Invalid address: ${invalid[0]}`);
        return false;
      }
      syncOut(dedupeRecipients([...chips, ...parsed]));
      setInput("");
      onErrorChange?.(null);
      return true;
    },
    [chips, input, onErrorChange, syncOut]
  );

  const removeChip = useCallback(
    (index: number) => {
      syncOut(chips.filter((_, i) => i !== index));
      onErrorChange?.(null);
    },
    [chips, onErrorChange, syncOut]
  );

  const addChip = useCallback(
    (address: string) => {
      const trimmed = address.trim();
      if (!trimmed) return;
      if (!isValidEmailAddress(trimmed)) {
        onErrorChange?.(`Invalid address: ${trimmed}`);
        return;
      }
      syncOut(dedupeRecipients([...chips, trimmed]));
      setInput("");
      onErrorChange?.(null);
      setSuggestionsOpen(false);
      setActiveSuggestion(-1);
    },
    [chips, onErrorChange, syncOut]
  );

  const pickSuggestion = useCallback(
    (hit: DirectoryHit) => {
      const display = hit.fullName ? `${hit.fullName} <${hit.email}>` : hit.email;
      addChip(display);
      inputRef.current?.focus();
    },
    [addChip]
  );

  useEffect(() => {
    if (!enableDirectory) return;
    const q = input.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      setDirectoryLoading(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const gen = ++requestGenRef.current;
      setDirectoryLoading(true);
      void queryEmployeeDirectory({ q, limit: 8 })
        .then((res) => {
          if (gen !== requestGenRef.current) return;
          const hits = (res.results || []).filter((r) => r.email);
          setSuggestions(hits);
          setSuggestionsOpen(hits.length > 0);
          setActiveSuggestion(hits.length ? 0 : -1);
        })
        .catch(() => {
          if (gen !== requestGenRef.current) return;
          setSuggestions([]);
          setSuggestionsOpen(false);
        })
        .finally(() => {
          if (gen === requestGenRef.current) setDirectoryLoading(false);
        });
    }, DIRECTORY_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [enableDirectory, input]);

  useEffect(() => {
    if (!suggestionsOpen) return;
    const onDocPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setSuggestionsOpen(false);
        setActiveSuggestion(-1);
      }
    };
    document.addEventListener("mousedown", onDocPointer);
    return () => document.removeEventListener("mousedown", onDocPointer);
  }, [suggestionsOpen]);

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestionsOpen && suggestions.length && e.key === "Enter" && activeSuggestion >= 0) {
      e.preventDefault();
      pickSuggestion(suggestions[activeSuggestion]);
      return;
    }
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitInput();
      return;
    }
    if (e.key === "Backspace" && !input && chips.length) {
      e.preventDefault();
      removeChip(chips.length - 1);
      return;
    }
    if (suggestionsOpen && suggestions.length) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveSuggestion((i) => (i + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveSuggestion((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
      } else if (e.key === "Tab" && activeSuggestion >= 0) {
        e.preventDefault();
        pickSuggestion(suggestions[activeSuggestion]);
      } else if (e.key === "Escape") {
        setSuggestionsOpen(false);
        setActiveSuggestion(-1);
      }
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (
      !text ||
      (!text.includes(",") &&
        !text.includes(";") &&
        !text.includes("\n") &&
        !text.includes("\t") &&
        !/\s/.test(text))
    ) {
      return;
    }
    e.preventDefault();
    const parsed = parseRecipientInput(text);
    const valid = parsed.filter((p) => isValidEmailAddress(p));
    const invalid = parsed.filter((p) => !isValidEmailAddress(p));
    if (valid.length) {
      syncOut(dedupeRecipients([...chips, ...valid]));
    }
    if (invalid.length) {
      onErrorChange?.(`Invalid address: ${invalid[0]}`);
    } else {
      onErrorChange?.(null);
    }
    setInput("");
  };

  const availableQuickContacts = useMemo(() => {
    const seen = new Set(chips.map((chip) => extractEmailAddress(chip)));
    return quickContacts.filter((c) => {
      const key = extractEmailAddress(c.email);
      return key && !seen.has(key);
    });
  }, [chips, quickContacts]);

  return (
    <div ref={rootRef}>
      <label className="form-label block mb-1" htmlFor={id}>
        {label}
        {required ? <sup className="text-danger">*</sup> : null}
      </label>
      <div
        className={`${styles.chipWrap} ${error ? styles.chipWrapInvalid : ""}`}
        onClick={() => inputRef.current?.focus()}
        role="group"
        aria-labelledby={`${id}-label`}
      >
        <span id={`${id}-label`} className="sr-only">
          {typeof label === "string" ? label : id}
        </span>
        {chips.map((chip, index) => (
          <span key={`${chip}-${index}`} className={styles.chip}>
            <span className={styles.chipLabel} title={chip}>
              {chip}
            </span>
            <button
              type="button"
              className={styles.chipRemove}
              onClick={(e) => {
                e.stopPropagation();
                removeChip(index);
              }}
              aria-label={`Remove ${chip}`}
            >
              <i className="ri-close-line text-base" aria-hidden />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={id}
          type="text"
          autoComplete="off"
          role="combobox"
          aria-expanded={suggestionsOpen}
          aria-controls={suggestionsOpen ? listId : undefined}
          aria-autocomplete="list"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={styles.input}
          placeholder={chips.length ? "" : placeholder}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (error) onErrorChange?.(null);
          }}
          onKeyDown={onInputKeyDown}
          onBlur={() => {
            void commitInput();
          }}
          onPaste={onPaste}
          onFocus={() => {
            if (enableDirectory && suggestions.length) setSuggestionsOpen(true);
          }}
        />
      </div>
      {enableDirectory && suggestionsOpen ? (
        <div className={styles.suggestions}>
          <ul id={listId} role="listbox" className="max-h-52 overflow-y-auto m-0 p-0 list-none">
            {directoryLoading ? (
              <li className="px-3 py-2 text-sm text-stone-500" role="status">
                Searching directory…
              </li>
            ) : (
              suggestions.map((hit, index) => (
                <li key={hit.id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === activeSuggestion}
                    className={`${styles.suggestionItem} ${index === activeSuggestion ? styles.suggestionItemActive : ""}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActiveSuggestion(index)}
                    onClick={() => pickSuggestion(hit)}
                  >
                    <span>{hit.fullName}</span>
                    <span className={styles.suggestionEmail}>{hit.email}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
      {showQuickSuggestions && availableQuickContacts.length ? (
        <div className={styles.quickSuggestions} aria-label="Quick contacts">
          {availableQuickContacts.map((contact) => (
            <button
              key={contact.email}
              type="button"
              className={styles.quickChip}
              onClick={() => addChip(contact.email)}
            >
              {contact.email}
            </button>
          ))}
        </div>
      ) : null}
      {error ? (
        <p id={errorId} className={styles.errorText} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
