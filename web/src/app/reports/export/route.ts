import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { getReportsOverview, listAttendance, type AppRole } from "@/lib/db/queries";
import { currentDateString, formatDateLabel, formatTimeLabel, normalizeDateRange } from "@/lib/utils/date";

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replaceAll("\"", "\"\"")}"`;
  }

  return value;
}

export async function GET(request: Request) {
  const session = await getSession();

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const today = currentDateString();
  const defaultStart = `${today.slice(0, 8)}01`;
  const startParam = searchParams.get("startDate") ?? defaultStart;
  const endParam = searchParams.get("endDate") ?? today;
  const [startDate, endDate] = normalizeDateRange(startParam, endParam);
  const selectedRoleParam = searchParams.get("role");
  const selectedRole = selectedRoleParam === "admin" || selectedRoleParam === "staff" || selectedRoleParam === "student" ? selectedRoleParam : undefined;
  const viewerUserId = session.role === "student" ? session.id : undefined;
  const attendanceRole: AppRole | undefined = session.role === "staff" ? "student" : selectedRole;
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

  const lines = [
    ["Report", "Attendance Report"],
    ["Start Date", formatDateLabel(startDate)],
    ["End Date", formatDateLabel(endDate)],
    ["Role", selectedRole ?? "All Roles"],
    ["Present", String(overview.selected.present)],
    ["Late", String(overview.selected.late)],
    ["Absent", String(overview.selected.absent)],
    [],
    ["Name", "Username", "RFID UID", "Date", "Time In", "Time Out", "Status"],
    ...rows.map((row) => [
      row.name,
      row.username,
      row.uid ?? "--",
      formatDateLabel(row.attendance_date),
      formatTimeLabel(row.time_in),
      formatTimeLabel(row.time_out),
      row.status
    ])
  ];

  const csv = `\uFEFF${lines.map((line) => line.map((value) => escapeCsv(value)).join(",")).join("\r\n")}`;
  const filename = `attendance-report-${startDate}-to-${endDate}.csv`;

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`
    }
  });
}
