import Link from "next/link";
import { Download, Printer } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { requireUserSession } from "@/lib/auth/session";
import { listAttendance, type AppRole } from "@/lib/db/queries";
import { formatDateLabel, formatTimeLabel, normalizeDateRange } from "@/lib/utils/date";

type AttendancePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AttendancePage({ searchParams }: AttendancePageProps) {
  const user = await requireUserSession();
  const params = await searchParams;
  const rawDateFrom = typeof params.dateFrom === "string" ? params.dateFrom : "";
  const rawDateTo = typeof params.dateTo === "string" ? params.dateTo : "";
  const [dateFrom, dateTo] =
    rawDateFrom && rawDateTo ? normalizeDateRange(rawDateFrom, rawDateTo) : [rawDateFrom, rawDateTo];
  const selectedRole = params.role === "admin" || params.role === "staff" || params.role === "student" ? params.role : undefined;
  const viewerUserId = user.role === "student" ? user.id : undefined;
  const attendanceRole: AppRole | undefined = user.role === "staff" ? "student" : selectedRole;
  const attendanceParams = new URLSearchParams();

  if (dateFrom) {
    attendanceParams.set("dateFrom", dateFrom);
  }

  if (dateTo) {
    attendanceParams.set("dateTo", dateTo);
  }

  if (selectedRole) {
    attendanceParams.set("role", selectedRole);
  }

  const rows = await listAttendance({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    viewerUserId,
    role: attendanceRole
  });

  return (
    <AppShell title={user.role === "admin" ? "Attendance Records" : user.role === "staff" ? "Student Attendance" : "My Attendance"} user={user}>
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 className="section-title">Filter Attendance</h2>
        <form className="filter-grid filter-grid-compact">
          <div className="field">
            <label htmlFor="dateFrom">Date From</label>
            <input className="input" defaultValue={dateFrom} id="dateFrom" name="dateFrom" suppressHydrationWarning type="date" />
          </div>
          <div className="field">
            <label htmlFor="dateTo">Date To</label>
            <input className="input" defaultValue={dateTo} id="dateTo" name="dateTo" suppressHydrationWarning type="date" />
          </div>
          {user.role === "admin" ? (
            <div className="field">
              <label htmlFor="role">Role</label>
              <select className="select" defaultValue={selectedRole ?? ""} id="role" name="role" suppressHydrationWarning>
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
                <option value="student">Student</option>
              </select>
            </div>
          ) : null}
          <div className="button-row filter-actions">
            <ConfirmActionButton
              className="button filter-submit-button filter-action-button"
              confirmButtonColor="#8f6a21"
              confirmButtonText="Apply"
              confirmText="Apply the selected attendance filters?"
              confirmTitle="Apply filters?"
              icon="question"
            >
              Apply Filters
            </ConfirmActionButton>
            <Link
              aria-label="Print attendance"
              className="button-secondary filter-action-button filter-action-icon-only"
              href={`/attendance/print?${attendanceParams.toString()}`}
              target="_blank"
              title="Print"
            >
              <Printer size={18} />
            </Link>
            <Link
              aria-label="Download attendance CSV"
              className="button-secondary filter-action-button filter-action-icon-only"
              href={`/attendance/export?${attendanceParams.toString()}`}
              title="Download CSV"
            >
              <Download size={18} />
            </Link>
          </div>
        </form>
      </div>

      <div className="card">
        <h2 className="section-title">
          {user.role === "admin" ? "Attendance Table" : user.role === "staff" ? "Student Attendance Table" : "Attendance History"}
        </h2>
        {!rows.length ? (
          <div className="empty-state">No attendance records match the selected filters.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>RFID UID</th>
                  <th>Date</th>
                  <th>Time In</th>
                  <th>Time Out</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{row.username}</td>
                    <td>{row.uid ?? "--"}</td>
                    <td>{formatDateLabel(row.attendance_date)}</td>
                    <td>{formatTimeLabel(row.time_in)}</td>
                    <td>{formatTimeLabel(row.time_out)}</td>
                    <td>
                      <span className={row.status === "Late" ? "badge badge-warning" : "badge badge-success"}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
