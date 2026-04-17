import { PrintClient } from "@/app/users/print/[id]/print-client";
import { requireUserSession } from "@/lib/auth/session";
import { getReportsOverview, listAttendance, type AppRole } from "@/lib/db/queries";
import { currentDateString, formatDateLabel, formatTimeLabel, normalizeDateRange } from "@/lib/utils/date";

type PrintReportsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PrintReportsPage({ searchParams }: PrintReportsPageProps) {
  const user = await requireUserSession();
  const params = await searchParams;
  const today = currentDateString();
  const defaultStart = `${today.slice(0, 8)}01`;
  const startParam = typeof params.startDate === "string" ? params.startDate : defaultStart;
  const endParam = typeof params.endDate === "string" ? params.endDate : today;
  const [startDate, endDate] = normalizeDateRange(startParam, endParam);
  const selectedRole = params.role === "admin" || params.role === "staff" || params.role === "student" ? params.role : undefined;
  const viewerUserId = user.role === "student" ? user.id : undefined;
  const attendanceRole: AppRole | undefined = user.role === "staff" ? "student" : selectedRole;
  const weeklyStart = new Date(`${today}T00:00:00+08:00`);
  weeklyStart.setUTCDate(weeklyStart.getUTCDate() - 4);

  const [overview, rows] = await Promise.all([
    getReportsOverview({
      today,
      weeklyStart: weeklyStart.toISOString().slice(0, 10),
      monthlyStart: defaultStart,
      selectedStart: startDate,
      selectedEnd: endDate,
      viewerUserId,
      role: attendanceRole
    }),
    listAttendance({
      dateFrom: startDate,
      dateTo: endDate,
      viewerUserId,
      role: attendanceRole
    })
  ]);

  return (
    <div className="print-page">
      <PrintClient />
      <div className="print-card" style={{ maxWidth: "980px" }}>
        <h1 className="print-title">Attendance Report</h1>
        <p className="print-subtitle">RFID Attendance Management System</p>

        <table className="table" style={{ marginBottom: "1.5rem" }}>
          <tbody>
            <tr>
              <td>Date Range</td>
              <td style={{ textAlign: "right", fontWeight: 700 }}>
                {formatDateLabel(startDate)} to {formatDateLabel(endDate)}
              </td>
            </tr>
            <tr>
              <td>Role</td>
              <td style={{ textAlign: "right", fontWeight: 700, textTransform: "capitalize" }}>{selectedRole ?? "All Roles"}</td>
            </tr>
            <tr>
              <td>Present</td>
              <td style={{ textAlign: "right", fontWeight: 700 }}>{overview.selected.present}</td>
            </tr>
            <tr>
              <td>Late</td>
              <td style={{ textAlign: "right", fontWeight: 700 }}>{overview.selected.late}</td>
            </tr>
            <tr>
              <td>Absent</td>
              <td style={{ textAlign: "right", fontWeight: 700 }}>{overview.selected.absent}</td>
            </tr>
          </tbody>
        </table>

        {!rows.length ? (
          <div className="empty-state">No attendance records match the selected report range.</div>
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
