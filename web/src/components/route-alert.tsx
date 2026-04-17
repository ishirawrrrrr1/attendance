"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Swal from "sweetalert2";

export function RouteAlert() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const alertKeyRef = useRef<string | null>(null);

  const success = searchParams.get("success");
  const error = searchParams.get("error");
  const type = success ? "success" : error ? "error" : null;
  const message = success ?? error;

  useEffect(() => {
    if (!type || !message) {
      return;
    }

    const alertKey = `${pathname}:${type}:${message}`;

    if (alertKeyRef.current === alertKey) {
      return;
    }

    alertKeyRef.current = alertKey;

    void Swal.fire({
      icon: type,
      title: type === "success" ? "Success" : "Error",
      text: message,
      confirmButtonColor: type === "success" ? "#8f6a21" : "#b64a3d"
    }).then(() => {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.delete("success");
      nextParams.delete("error");
      const nextQuery = nextParams.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    });
  }, [message, pathname, router, searchParams, type]);

  return null;
}
