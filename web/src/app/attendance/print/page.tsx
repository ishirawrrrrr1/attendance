import { PrintClient } from "@/app/users/print/[id]/print-client";
import { requireUserSession } from "@/lib/auth/session";
import { listAttendance, type AppRole } from "@/lib/db/queries";
import { formatDateLabel, formatTimeLabel, normalizeDateRange } from "@/lib/utils/date";

type PrintAttendancePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PrintAttendancePage({ searchParams }: PrintAttendancePageProps) {
  const user = await requireUserSession();
  const params = await searchParams;
  const rawDateFrom = typeof params.dateFrom === "string" ? params.dateFrom : "";
  const rawDateTo = typeof params.dateTo === "string" ? params.dateTo : "";
  const [dateFrom, dateTo] =
    rawDateFrom && rawDateTo ? normalizeDateRange(rawDateFrom, rawDateTo) : [rawDateFrom, rawDateTo];
  const selectedRole = params.role === "admin" || params.role === "staff" || params.role === "student" ? params.role : undefined;
  const viewerUserId = user.role === "student" ? user.id : undefined;
  const attendanceRole: AppRole | undefined = user.role === "staff" ? "student" : selectedRole;

  const rows = await listAttendance({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    viewerUserId,
    role: attendanceRole
  });

  return (
    <div className="print-page">
      <PrintClient />
      <div className="print-card" style={{ maxWidth: "980px" }}>
        <h1 className="print-title">Attendance Records</h1>
        <p className="print-subtitle">RFID Attendance Management System</p>

        <table className="table" style={{ marginBottom: "1.5rem" }}>
          <tbody>
            <tr>
              <td>Date Range</td>
              <td style={{ textAlign: "right", fontWeight: 700 }}>
                {dateFrom || dateTo
                  ? `${dateFrom ? formatDateLabel(dateFrom) : "Earliest"} to ${dateTo ? formatDateLabel(dateTo) : "Latest"}`
                  : "All Dates"}
              </td>
            </tr>
            <tr>
              <td>Role</td>
              <td style={{ textAlign: "right", fontWeight: 700, textTransform: "capitalize" }}>{selectedRole ?? "All Roles"}</td>
            </tr>
            <tr>
              <td>Total Records</td>
              <td style={{ textAlign: "right", fontWeight: 700 }}>{rows.length}</td>
            </tr>
          </tbody>
        </table>

        {!rows.length ? (
          <div className="empty-state">No attendance records match the selected filters.</div>
        ) : (
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
                  <td>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <p className="print-meta">
          Printed on{" "}
          {new Intl.DateTimeFormat("en-PH", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "Asia/Manila"
          }).format(new Date())}
        </p>
      </div>
    </div>
  );
}
