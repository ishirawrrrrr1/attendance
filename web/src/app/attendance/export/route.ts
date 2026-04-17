import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { listAttendance, type AppRole } from "@/lib/db/queries";
import { formatDateLabel, formatTimeLabel, normalizeDateRange } from "@/lib/utils/date";

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
  const rawDateFrom = searchParams.get("dateFrom") ?? "";
  const rawDateTo = searchParams.get("dateTo") ?? "";
  const [dateFrom, dateTo] =
    rawDateFrom && rawDateTo ? normalizeDateRange(rawDateFrom, rawDateTo) : [rawDateFrom, rawDateTo];
  const selectedRoleParam = searchParams.get("role");
  const selectedRole = selectedRoleParam === "admin" || selectedRoleParam === "staff" || selectedRoleParam === "student" ? selectedRoleParam : undefined;
  const viewerUserId = session.role === "student" ? session.id : undefined;
  const attendanceRole: AppRole | undefined = session.role === "staff" ? "student" : selectedRole;

  const rows = await listAttendance({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    viewerUserId,
    role: attendanceRole
  });

  const lines = [
    ["Report", "Attendance Records"],
    ["Date Range", dateFrom || dateTo ? `${dateFrom || "Earliest"} to ${dateTo || "Latest"}` : "All Dates"],
    ["Role", selectedRole ?? "All Roles"],
    ["Total Records", String(rows.length)],
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
  const filename = `attendance-records${dateFrom || dateTo ? `-${dateFrom || "start"}-to-${dateTo || "end"}` : "-all"}.csv`;

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`
    }
  });
}
