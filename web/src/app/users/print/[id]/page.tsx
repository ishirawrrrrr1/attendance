import { notFound } from "next/navigation";

import { requireAdminSession } from "@/lib/auth/session";
import { getUserById } from "@/lib/db/queries";
import { PrintClient } from "@/app/users/print/[id]/print-client";

type PrintUserPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PrintUserPage({ params }: PrintUserPageProps) {
  await requireAdminSession();
  const { id } = await params;
  const userId = Number(id);
  const user = Number.isFinite(userId) ? await getUserById(userId) : null;

  if (!user) {
    notFound();
  }

  return (
    <div className="print-page">
      <PrintClient />
      <div className="print-card">
        <h1 className="print-title">User Information</h1>
        <p className="print-subtitle">RFID Attendance Management System</p>

        <table className="table">
          <tbody>
            <tr>
              <td>Full Name</td>
              <td style={{ textAlign: "right", fontWeight: 700 }}>{user.name}</td>
            </tr>
            <tr>
              <td>Username</td>
              <td style={{ textAlign: "right", fontWeight: 700 }}>{user.username}</td>
            </tr>
            <tr>
              <td>Email</td>
              <td style={{ textAlign: "right", fontWeight: 700 }}>{user.email ?? "--"}</td>
            </tr>
            <tr>
              <td>RFID UID</td>
              <td style={{ textAlign: "right", fontWeight: 700 }}>{user.uid ?? "--"}</td>
            </tr>
            <tr>
              <td>Role</td>
              <td style={{ textAlign: "right", fontWeight: 700, textTransform: "capitalize" }}>{user.role}</td>
            </tr>
          </tbody>
        </table>

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
