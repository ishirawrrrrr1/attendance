"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Clock3,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  User,
  Users
} from "lucide-react";
import clsx from "clsx";

import type { ReactNode } from "react";

import { logoutAction } from "@/app/logout/actions";
import type { SessionUser } from "@/lib/db/queries";
import { LiveClock } from "@/components/live-clock";
import { ConfirmActionButton } from "@/components/confirm-action-button";

type AppShellProps = {
  user: SessionUser;
  title: string;
  children: ReactNode;
};

export function AppShell({ user, title, children }: AppShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);
  const panelLabel = user.role === "admin" ? "School Admin Panel" : user.role === "staff" ? "Teacher and Staff Panel" : "Attendance Panel";

  const navItems = useMemo(
    () => [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/attendance", label: user.role === "admin" ? "Attendance" : user.role === "staff" ? "Students Attendance" : "My Attendance", icon: CalendarDays },
      { href: "/reports", label: "Reports", icon: BarChart3 },
      ...(user.role === "admin" || user.role === "staff"
        ? [
            { href: "/users?role=student", label: "Students", icon: GraduationCap },
            ...(user.role === "admin"
              ? [
                  { href: "/users", label: "Users", icon: Users },
                  { href: "/attendance-rules", label: "Time Rules", icon: Clock3 }
                ]
              : [])
          ]
        : []),
      ...(user.role === "admin" || user.role === "staff"
        ? [
            { href: "/settings", label: "Settings", icon: Settings }
          ]
        : [])
    ],
    [user.role]
  );

  return (
    <div className={clsx("app-shell", collapsed && "app-shell-collapsed")}>
      <aside className="sidebar">
        <div className="brand-panel">
          <div className="brand-group">
            <div className="brand-mark" aria-hidden="true">
              {user.avatar_data_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="" className="brand-avatar" src={user.avatar_data_url} />
              ) : (
                <User size={24} />
              )}
            </div>
            <div className="brand-copy">
              <div className="brand-username">{user.name}</div>
              <div className="brand-subtitle">{panelLabel}</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const roleFilter = searchParams.get("role");
            const active =
              item.href === "/users?role=student"
                ? pathname === "/users" && roleFilter === "student"
                : item.href === "/users"
                  ? pathname === "/users" && roleFilter !== "student"
                  : pathname === item.href;

            return (
              <Link
                key={item.href}
                className={clsx("sidebar-link", active && "active")}
                href={item.href}
                title={item.label}
              >
                <span className="sidebar-link-icon">
                  <Icon size={19} />
                </span>
                <span className="sidebar-link-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <form action={logoutAction} className="sidebar-logout-form">
            <ConfirmActionButton
              className="sidebar-link sidebar-link-logout"
              confirmButtonText="Log Out"
              confirmText="You will be signed out of the attendance portal."
              confirmTitle="Log out now?"
              title="Log Out"
            >
              <span className="sidebar-link-icon">
                <LogOut size={19} />
              </span>
              <span className="sidebar-link-label">Log Out</span>
            </ConfirmActionButton>
          </form>
        </div>

      </aside>

      <button
        className="sidebar-toggle"
        type="button"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-expanded={collapsed ? "false" : "true"}
        onClick={() => setCollapsed((value) => !value)}
        suppressHydrationWarning
      >
        <Menu size={18} />
      </button>

      <main className="main-panel">
        <header className="page-header">
          <div>
            <h1 className="page-title">{title}</h1>
            <LiveClock />
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
