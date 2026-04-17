"use client";

import { useEffect, useRef } from "react";

type StudentSearchFormProps = {
  defaultValue: string;
};

export function StudentSearchForm({ defaultValue }: StudentSearchFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <form
      action="/users"
      className="toolbar"
      method="get"
      ref={formRef}
      style={{ marginBottom: "1rem", gridTemplateColumns: "minmax(0, 1fr)" }}
    >
      <input name="role" suppressHydrationWarning type="hidden" value="student" />
      <div className="field">
        <label htmlFor="student-search">Search Students</label>
        <input
          autoComplete="off"
          className="input"
          defaultValue={defaultValue}
          id="student-search"
          name="q"
          onChange={() => {
            if (timeoutRef.current) {
              window.clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = window.setTimeout(() => {
              formRef.current?.requestSubmit();
            }, 300);
          }}
          placeholder="Search by name, username, RFID UID, or email"
          suppressHydrationWarning
        />
      </div>
    </form>
  );
}
