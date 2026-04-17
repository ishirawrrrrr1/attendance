"use client";

import type { ReactNode } from "react";
import Swal from "sweetalert2";

type ConfirmActionButtonProps = {
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
  confirmButtonText: string;
  confirmButtonColor?: string;
  confirmText: string;
  confirmTitle: string;
  icon?: "warning" | "question" | "success" | "info";
  cancelButtonText?: string;
  cancelButtonColor?: string;
  title?: string;
};

export function ConfirmActionButton({
  ariaLabel,
  children,
  className,
  confirmButtonText,
  confirmButtonColor = "#b64a3d",
  confirmText,
  confirmTitle,
  icon = "warning",
  cancelButtonText = "Cancel",
  cancelButtonColor = "#355f3b",
  title
}: ConfirmActionButtonProps) {
  async function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    const form = event.currentTarget.form;

    const result = await Swal.fire({
      title: confirmTitle,
      text: confirmText,
      icon,
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText,
      confirmButtonColor,
      cancelButtonColor,
      reverseButtons: true
    });

    if (result.isConfirmed) {
      form?.requestSubmit();
    }
  }

  return (
    <button
      aria-label={ariaLabel}
      className={className}
      onClick={handleClick}
      suppressHydrationWarning
      title={title}
      type="button"
    >
      {children}
    </button>
  );
}
