"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { loginAction } from "@/app/login/actions";
import { ConfirmActionButton } from "@/components/confirm-action-button";

export function LoginForm() {
  const [visible, setVisible] = useState(false);

  return (
    <form action={loginAction} className="grid" style={{ gap: "1rem" }}>
      <div className="field">
        <label htmlFor="login">Email or Username</label>
        <input className="input" id="login" name="login" placeholder="Enter your email or username" required suppressHydrationWarning />
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <div className="password-field">
          <input
            className="input"
            id="password"
            name="password"
            placeholder="Enter your password"
            required
            suppressHydrationWarning
            type={visible ? "text" : "password"}
          />
          <button
            aria-label={visible ? "Hide password" : "Show password"}
            className="password-toggle"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setVisible((value) => !value)}
            suppressHydrationWarning
            type="button"
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <ConfirmActionButton
        className="button"
        confirmButtonColor="#8f6a21"
        confirmButtonText="Sign In"
        confirmText="Proceed with these login credentials?"
        confirmTitle="Sign in now?"
        icon="question"
      >
        Sign In
      </ConfirmActionButton>
    </form>
  );
}
