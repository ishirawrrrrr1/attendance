import { AppShell } from "@/components/app-shell";
import { WeeklyBarChart } from "@/components/trend-chart";
import { requireUserSession } from "@/lib/auth/session";
import { getAttendanceRules, getDailySummary, getOverallSummary, getTrendSeries, listRecentAttendance } from "@/lib/db/queries";
import { currentDateString, formatDateLabel, formatTimeLabel } from "@/lib/utils/date";

export default async function DashboardPage() {
  const user = await requireUserSession();
  const viewerUserId = user.role === "student" ? user.id : undefined;
  const attendanceRole = user.role === "staff" ? "student" : undefined;
  const recentAttendanceLimit = user.role === "admin" || user.role === "staff" ? 10 : 8;
  const today = currentDateString();
  const chartEnd = currentDateString();
  const chartStartDate = new Date(`${chartEnd}T00:00:00+08:00`);
  chartStartDate.setUTCDate(chartStartDate.getUTCDate() - 6);
  const chartStart = chartStartDate.toISOString().slice(0, 10);
  const [summary, overallSummary, recentAttendance, chart, rules] = await Promise.all([
    getDailySummary(today, viewerUserId, attendanceRole),
    getOverallSummary(viewerUserId, attendanceRole),
    listRecentAttendance(recentAttendanceLimit, viewerUserId, attendanceRole),
    getTrendSeries(chartStart, chartEnd, viewerUserId, attendanceRole),
    getAttendanceRules()
  ]);

  return (
    <AppShell title="Dashboard" user={user}>
      <div className="grid grid-3 dashboard-summary-grid" style={{ marginBottom: "1.5rem" }}>
        <div className="stat-card">
          <div className="stat-kicker">On Time</div>
          <div className="stat-value">{summary.present}</div>
          <div className="page-subtitle">Time-in on or before {rules.present_until.slice(0, 5)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-kicker">Late</div>
          <div className="stat-value">{summary.late}</div>
          <div className="page-subtitle">Time-in from {rules.late_from.slice(0, 5)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-kicker">Absent</div>
          <div className="stat-value">{summary.absent}</div>
          <div className="page-subtitle">Time-in from {rules.absent_from.slice(0, 5)}</div>
        </div>
      </div>

      <div className="grid grid-3 dashboard-summary-grid" style={{ marginBottom: "1.5rem" }}>
        <div className="stat-card">
          <div className="stat-kicker">Overall On Time</div>
          <div className="stat-value">{overallSummary.present}</div>
          <div className="page-subtitle">All recorded on-time attendance</div>
        </div>
        <div className="stat-card">
          <div className="stat-kicker">Overall Late</div>
          <div className="stat-value">{overallSummary.late}</div>
          <div className="page-subtitle">All recorded late attendance</div>
        </div>
        <div className="stat-card">
          <div className="stat-kicker">Overall Absent</div>
          <div className="stat-value">{overallSummary.absent}</div>
          <div className="page-subtitle">All recorded absent attendance</div>
        </div>
      </div>

      <div className="grid grid-2" style={{ alignItems: "stretch" }}>
        <div className="card dashboard-card-tall">
          <h2 className="section-title">Last 7 Days Trend</h2>
          <div className="section-subtitle">Attendance pattern for recent school days</div>
          <div className="chart-box">
            <WeeklyBarChart labels={chart.labels} present={chart.present} late={chart.late} />
          </div>
        </div>

        <div className="card dashboard-card-tall">
          <h2 className="section-title">
            {user.role === "admin" ? "Recent Attendance Logs" : user.role === "staff" ? "Recent Student Attendance" : "Your Recent Attendance"}
          </h2>
          {!recentAttendance.length ? (
            <div className="empty-state dashboard-empty-state">No attendance entries found yet.</div>
          ) : (
            <div className="table-wrap dashboard-table-wrap">
              <table className="table dashboard-recent-table">
                <colgroup>
                  <col className="dashboard-col-name" />
                  <col className="dashboard-col-username" />
                  <col className="dashboard-col-date" />
                  <col className="dashboard-col-time" />
                  <col className="dashboard-col-time" />
                  <col className="dashboard-col-status" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Date</th>
                    <th>Time In</th>
                    <th>Time Out</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAttendance.map((row) => (
                    <tr key={row.id}>
                      <td className="dashboard-cell-name">{row.name}</td>
                      <td className="dashboard-cell-username">{row.username}</td>
                      <td className="dashboard-cell-date">{formatDateLabel(row.attendance_date)}</td>
                      <td className="dashboard-cell-time">{formatTimeLabel(row.time_in)}</td>
                      <td className="dashboard-cell-time">{formatTimeLabel(row.time_out)}</td>
                      <td className="dashboard-cell-status">
                        <span
                          className={
                            row.status === "Late"
                              ? "badge badge-warning"
                              : row.status === "Absent"
                                ? "badge badge-danger"
                                : "badge badge-success"
                          }
                        >
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
      </div>
    </AppShell>
  );
}
