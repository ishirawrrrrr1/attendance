import Link from "next/link";
import { Download, Printer } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { RangeLineChart, StatusDoughnutChart } from "@/components/trend-chart";
import { requireUserSession } from "@/lib/auth/session";
import { getReportsOverview, getTrendSeries, type AppRole } from "@/lib/db/queries";
import { currentDateString, formatDateLabel, normalizeDateRange } from "@/lib/utils/date";

type ReportsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
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
  const [overview, chart] = await Promise.all([
    getReportsOverview({
      today,
      weeklyStart: weeklyStart.toISOString().slice(0, 10),
      monthlyStart: defaultStart,
      selectedStart: startDate,
      selectedEnd: endDate,
      viewerUserId,
      role: attendanceRole
    }),
    getTrendSeries(startDate, endDate, viewerUserId, attendanceRole)
  ]);
  const dailySummary = overview.daily;
  const weeklySummary = overview.weekly;
  const monthlySummary = overview.monthly;
  const selectedSummary = overview.selected;
  const reportParams = new URLSearchParams({
    startDate,
    endDate
  });

  if (selectedRole) {
    reportParams.set("role", selectedRole);
  }

  return (
    <AppShell title="Reports & Analytics" user={user}>
      <div className="grid grid-3" style={{ marginBottom: "1.5rem" }}>
        <div className="stat-card">
          <div className="stat-kicker">Daily Report</div>
          <div className="stat-value">{dailySummary.present + dailySummary.late + dailySummary.absent}</div>
          <div className="page-subtitle">
            {dailySummary.late} late, {dailySummary.absent} absent recorded today
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-kicker">Weekly Report</div>
          <div className="stat-value">{weeklySummary.present + weeklySummary.late + weeklySummary.absent}</div>
          <div className="page-subtitle">
            {weeklySummary.late} late, {weeklySummary.absent} absent recorded this week
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-kicker">Monthly Report</div>
          <div className="stat-value">{monthlySummary.present + monthlySummary.late + monthlySummary.absent}</div>
          <div className="page-subtitle">
            {monthlySummary.late} late, {monthlySummary.absent} absent recorded this month
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 className="section-title">Custom Report Range</h2>
        <form className="filter-grid filter-grid-compact">
          <div className="field">
            <label htmlFor="startDate">Start Date</label>
            <input className="input" defaultValue={startDate} id="startDate" name="startDate" suppressHydrationWarning type="date" />
          </div>
          <div className="field">
            <label htmlFor="endDate">End Date</label>
            <input className="input" defaultValue={endDate} id="endDate" name="endDate" suppressHydrationWarning type="date" />
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
              confirmButtonText="Generate"
              confirmText="Generate a report using the selected range and user?"
              confirmTitle="Generate report?"
              icon="question"
            >
              Generate
            </ConfirmActionButton>
            <Link
              aria-label="Print report"
              className="button-secondary filter-action-button filter-action-icon-only"
              href={`/reports/print?${reportParams.toString()}`}
              target="_blank"
              title="Print"
            >
              <Printer size={18} />
            </Link>
            <Link
              aria-label="Download report CSV"
              className="button-secondary filter-action-button filter-action-icon-only"
              href={`/reports/export?${reportParams.toString()}`}
              title="Download CSV"
            >
              <Download size={18} />
            </Link>
          </div>
        </form>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h2 className="section-title">Attendance Trend</h2>
          <div className="section-subtitle">
            {formatDateLabel(startDate)} to {formatDateLabel(endDate)}
          </div>
          <div className="chart-box">
            <RangeLineChart labels={chart.labels} present={chart.present} late={chart.late} />
          </div>
        </div>

        <div className="card">
          <h2 className="section-title">Status Distribution</h2>
          <div className="chart-box">
            <StatusDoughnutChart
              absent={selectedSummary.absent}
              late={selectedSummary.late}
              present={selectedSummary.present}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
