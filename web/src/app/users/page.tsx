import Link from "next/link";
import { redirect } from "next/navigation";
import { Eye, Pencil, Plus, Trash2, X } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { StudentSearchForm } from "@/components/student-search-form";
import { UsersAccessFields } from "@/components/users-access-fields";
import { deleteUserAction, saveUserAction } from "@/app/users/actions";
import { requireUserSession } from "@/lib/auth/session";
import { getUserById, listAttendance, listUsers } from "@/lib/db/queries";
import { formatDateLabel, formatTimeLabel } from "@/lib/utils/date";

type UsersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const viewer = await requireUserSession();
  const isAdmin = viewer.role === "admin";
  const isStaff = viewer.role === "staff";

  if (!isAdmin && !isStaff) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const requestedRoleFilter = params.role === "admin" || params.role === "staff" || params.role === "student" ? params.role : undefined;
  const roleFilter = isStaff ? "student" : requestedRoleFilter;
  const searchQuery = typeof params.q === "string" ? params.q.trim() : "";
  const viewId = typeof params.view === "string" ? Number(params.view) : null;
  const editId = typeof params.edit === "string" ? Number(params.edit) : null;
  const requestedModalMode = typeof params.mode === "string" ? params.mode : undefined;
  const modalMode = isStaff ? "view" : requestedModalMode ?? (editId ? "edit" : viewId ? "view" : "create");
  const requestedShowModal = typeof params.modal === "string" ? params.modal === "open" : Boolean(editId) || Boolean(viewId);
  const showModal = isStaff ? Boolean(viewId) : requestedShowModal;
  const activeUserId = modalMode === "view" ? viewId : editId;
  const isStudentListView = roleFilter === "student";
  const baseParams = new URLSearchParams();

  if (isStaff && requestedRoleFilter && requestedRoleFilter !== "student") {
    redirect("/users?role=student");
  }

  if (isStaff && (editId || requestedModalMode === "create")) {
    redirect("/users?role=student");
  }

  if (roleFilter) {
    baseParams.set("role", roleFilter);
  }

  if (searchQuery) {
    baseParams.set("q", searchQuery);
  }

  const baseUsersHref = baseParams.size ? `/users?${baseParams.toString()}` : "/users";
  const [activeUser, users, activeUserAttendance] = await Promise.all([
    activeUserId ? getUserById(activeUserId) : Promise.resolve(null),
    listUsers(roleFilter, searchQuery),
    viewId ? listAttendance({ userId: viewId }).then((records) => records.slice(0, 5)) : Promise.resolve([])
  ]);

  if (activeUserId && !activeUser) {
    redirect("/users?error=User%20not%20found.");
  }

  if (isStaff && activeUser && activeUser.role !== "student") {
    redirect("/users?role=student&error=Student%20not%20found.");
  }

  const isModalOpen = showModal || Boolean(activeUser);
  const isViewMode = modalMode === "view" && Boolean(activeUser);

  return (
    <AppShell title={isAdmin ? "User Management" : "Students"} user={viewer}>
      <div className="card">
        <div className="users-toolbar">
          <div>
            <h2 className="section-title" style={{ marginBottom: "0.35rem" }}>
              {roleFilter === "student" ? "Registered Students" : "Registered Users"}
            </h2>
            <div className="section-subtitle" style={{ marginBottom: 0 }}>
              {roleFilter === "student"
                ? "View all registered student RFID accounts."
                : "Manage student, staff, and admin accounts from one place."}
            </div>
          </div>
          {!isStudentListView && isAdmin ? (
            <Link className="button users-add-button" href={`${baseUsersHref}${baseUsersHref.includes("?") ? "&" : "?"}modal=open&mode=create`}>
              <Plus size={18} />
              <span>Add New User</span>
            </Link>
          ) : null}
        </div>

        {isStudentListView ? (
          <StudentSearchForm defaultValue={searchQuery} />
        ) : null}

        {!users.length ? (
          <div className="empty-state">
            {isStudentListView && searchQuery ? "No students matched your search." : "No users registered yet."}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>RFID UID</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.username}</td>
                    <td>{user.uid ?? "--"}</td>
                    <td>
                      <span className="badge badge-role">
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <div className="action-icons">
                        <Link
                          className="icon-action icon-action-view"
                          href={`${baseUsersHref}${baseUsersHref.includes("?") ? "&" : "?"}modal=open&mode=view&view=${user.id}`}
                          title="View"
                        >
                          <Eye size={17} />
                        </Link>
                        {isAdmin ? (
                          <Link
                            className="icon-action icon-action-edit"
                            href={`${baseUsersHref}${baseUsersHref.includes("?") ? "&" : "?"}modal=open&mode=edit&edit=${user.id}`}
                            title="Edit"
                          >
                            <Pencil size={17} />
                          </Link>
                        ) : null}
                        {isAdmin && user.id !== viewer.id ? (
                          <form action={deleteUserAction}>
                            <input name="id" suppressHydrationWarning type="hidden" value={user.id} />
                            <ConfirmActionButton
                              className="icon-action icon-action-delete"
                              confirmButtonText="Delete"
                              confirmText="This user will be removed permanently."
                              confirmTitle="Delete this user?"
                              title="Delete"
                            >
                              <Trash2 size={17} />
                            </ConfirmActionButton>
                          </form>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen ? (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="users-toolbar" style={{ marginBottom: "1rem" }}>
              <h2 className="section-title" style={{ marginBottom: 0 }}>
                {isViewMode ? "View User" : activeUser ? "Edit User" : "Add New User"}
              </h2>
              <Link aria-label="Close user form" className="modal-close" href={baseUsersHref}>
                <X size={19} strokeWidth={2.2} />
              </Link>
            </div>

            {isViewMode && activeUser ? (
              <div className="user-view-layout">
                <section className="user-view-details">
                  <div className="user-view-row">
                    <span className="user-view-label">Full Name</span>
                    <span className="user-view-value">{activeUser.name}</span>
                  </div>
                  <div className="user-view-row">
                    <span className="user-view-label">Username</span>
                    <span className="user-view-value">{activeUser.username}</span>
                  </div>
                  <div className="user-view-row">
                    <span className="user-view-label">Email</span>
                    <span className="user-view-value">{activeUser.email ?? "--"}</span>
                  </div>
                  <div className="user-view-row">
                    <span className="user-view-label">RFID UID</span>
                    <span className="user-view-value">{activeUser.uid ?? "--"}</span>
                  </div>
                  <div className="user-view-row">
                    <span className="user-view-label">Role</span>
                    <span className="user-view-value user-view-value-capitalize">{activeUser.role}</span>
                  </div>
                </section>

                <section className="user-view-history">
                  <div className="user-view-history-header">
                    <h3 className="user-view-history-title">Attendance History</h3>
                    <p className="user-view-history-subtitle">
                      Recorded attendance dates and time logs for this user.
                    </p>
                  </div>

                  {!activeUserAttendance.length ? (
                    <div className="empty-state user-view-history-empty">No attendance records yet.</div>
                  ) : (
                    <div className="table-wrap">
                      <table className="table user-history-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Time In</th>
                            <th>Time Out</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeUserAttendance.map((record) => (
                            <tr key={record.id}>
                              <td>{formatDateLabel(record.attendance_date)}</td>
                              <td>{formatTimeLabel(record.time_in)}</td>
                              <td>{formatTimeLabel(record.time_out)}</td>
                              <td>
                                <span
                                  className={`badge ${
                                    record.status === "Present"
                                      ? "badge-success"
                                      : record.status === "Late"
                                        ? "badge-warning"
                                        : "badge-danger"
                                  }`}
                                >
                                  {record.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </div>
            ) : (
              <form action={saveUserAction} className="users-form" autoComplete="off">
                {activeUser ? <input name="id" suppressHydrationWarning type="hidden" value={activeUser.id} /> : null}

                <div className="users-form-layout">
                  <section className="users-form-panel">
                    <div className="users-form-kicker">Basic Info</div>
                    <div className="users-form-fields">
                      <div className="field users-form-span-2">
                        <label htmlFor="name">Full Name</label>
                        <input
                          autoComplete="off"
                          className="input"
                          defaultValue={activeUser?.name ?? ""}
                          id="name"
                          name="name"
                          required
                          suppressHydrationWarning
                        />
                      </div>

                      <div className="field">
                        <label htmlFor="username">Username</label>
                        <input
                          autoComplete="off"
                          className="input"
                          defaultValue={activeUser?.username ?? ""}
                          id="username"
                          maxLength={10}
                          name="username"
                          required
                          suppressHydrationWarning
                        />
                      </div>

                      <div className="field">
                        <label htmlFor="email">Email</label>
                        <input
                          autoComplete="off"
                          className="input"
                          defaultValue={activeUser?.email ?? ""}
                          id="email"
                          name="email"
                          suppressHydrationWarning
                          type="email"
                        />
                      </div>
                    </div>
                  </section>

                  <section className="users-form-panel">
                    <div className="users-form-kicker">Access and Security</div>
                    <UsersAccessFields
                      defaultRole={activeUser?.role ?? "staff"}
                      defaultUid={activeUser?.uid ?? ""}
                      passwordPlaceholder={activeUser ? "Leave blank to keep current password" : "Set account password"}
                      pinPlaceholder={activeUser ? "Leave blank to keep current PIN" : "Set RFID PIN"}
                    />
                  </section>
                </div>

                <div className="button-row users-form-actions">
                  <ConfirmActionButton
                    className="button"
                    confirmButtonColor="#8f6a21"
                    confirmButtonText={activeUser ? "Save" : "Create"}
                    confirmText={
                      activeUser
                        ? "This user account will be updated."
                        : "A new user account will be created."
                    }
                    confirmTitle={activeUser ? "Save user changes?" : "Create new user?"}
                    icon="question"
                  >
                    {activeUser ? "Save Changes" : "Create User"}
                  </ConfirmActionButton>
                  <Link className="button-secondary" href={baseUsersHref}>
                    Cancel
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
