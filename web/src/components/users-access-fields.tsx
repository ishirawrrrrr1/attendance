"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

type UsersAccessFieldsProps = {
  defaultRole: "admin" | "staff" | "student";
  defaultUid?: string | null;
  passwordPlaceholder: string;
  pinPlaceholder: string;
};

export function UsersAccessFields({
  defaultRole,
  defaultUid,
  passwordPlaceholder,
  pinPlaceholder
}: UsersAccessFieldsProps) {
  const [role, setRole] = useState(defaultRole);
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const passwordId = useId();
  const pinId = useId();
  const uidId = useId();
  const roleId = useId();
  const isStudent = role === "student";

  return (
    <div className="users-form-fields">
      <div className="field">
        <label htmlFor={passwordId}>Password</label>
        <div className="password-field">
          <input
            autoComplete="new-password"
            className="input"
            disabled={isStudent}
            id={passwordId}
            name="password"
            placeholder={isStudent ? "Not required for student accounts" : passwordPlaceholder}
            suppressHydrationWarning
            type={showPassword ? "text" : "password"}
          />
          <button
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="password-toggle"
            disabled={isStudent}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setShowPassword((value) => !value)}
            suppressHydrationWarning
            type="button"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <span className="field-note">
          {isStudent ? "Student accounts do not need website login." : "Required for staff and admin website login."}
        </span>
      </div>

      <div className="field">
        <label htmlFor={pinId}>PIN</label>
        <div className="password-field">
          <input
            autoComplete="new-password"
            className="input"
            id={pinId}
            name="pin"
            placeholder={pinPlaceholder}
            suppressHydrationWarning
            type={showPin ? "text" : "password"}
          />
          <button
            aria-label={showPin ? "Hide PIN" : "Show PIN"}
            className="password-toggle"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setShowPin((value) => !value)}
            suppressHydrationWarning
            type="button"
          >
            {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div className="field">
        <label htmlFor={uidId}>RFID UID</label>
        <input
          autoComplete="off"
          className="input"
          defaultValue={defaultUid ?? ""}
          id={uidId}
          name="uid"
          placeholder="Assign RFID card UID"
          suppressHydrationWarning
        />
      </div>

      <div className="field">
        <label htmlFor={roleId}>Role</label>
        <select
          className="select"
          id={roleId}
          name="role"
          onChange={(event) => setRole(event.target.value as "admin" | "staff" | "student")}
          suppressHydrationWarning
          value={role}
        >
          <option value="student">Student</option>
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </select>
      </div>
    </div>
  );
}
