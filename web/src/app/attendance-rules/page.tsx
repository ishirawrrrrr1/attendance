import { AppShell } from "@/components/app-shell";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { updateAttendanceRulesAction } from "@/app/attendance-rules/actions";
import { requireAdminSession } from "@/lib/auth/session";
import { getAttendanceRules } from "@/lib/db/queries";

type AttendanceRulesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AttendanceRulesPage({ searchParams }: AttendanceRulesPageProps) {
  const admin = await requireAdminSession();
  const rules = await getAttendanceRules();
  const params = await searchParams;
  const success = typeof params.success === "string" ? params.success : "";
  const error = typeof params.error === "string" ? params.error : "";

  return (
    <AppShell title="Attendance Time Rules" user={admin}>
      {success ? <div className="settings-message settings-message-success">{success}</div> : null}
      {error ? <div className="settings-message settings-message-error">{error}</div> : null}

      <div className="card">
        <h2 className="section-title">Status Time Rules</h2>
        <div className="section-subtitle">
          Configure how the hardware scan will classify each attendance tap in the database.
        </div>

        <form action={updateAttendanceRulesAction} className="rules-form">
          <div className="rules-time-grid">
            <div className="settings-panel-block">
              <div className="settings-panel-kicker">Present</div>
              <div className="field">
                <label htmlFor="presentUntil">Present Until</label>
                <input
                  className="input"
                  defaultValue={rules.present_until.slice(0, 5)}
                  id="presentUntil"
                  name="presentUntil"
                  required
                  suppressHydrationWarning
                  type="time"
                />
              </div>
              <div className="field-note">Students scanned on or before this time will be marked as Present.</div>
            </div>

            <div className="settings-panel-block">
              <div className="settings-panel-kicker">Late</div>
              <div className="field">
                <label htmlFor="lateFrom">Late From</label>
                <input
                  className="input"
                  defaultValue={rules.late_from.slice(0, 5)}
                  id="lateFrom"
                  name="lateFrom"
                  required
                  suppressHydrationWarning
                  type="time"
                />
              </div>
              <div className="field-note">Students scanned from this time onward will be marked as Late.</div>
            </div>

            <div className="settings-panel-block">
              <div className="settings-panel-kicker">Absent</div>
              <div className="field">
                <label htmlFor="absentFrom">Absent From</label>
                <input
                  className="input"
                  defaultValue={rules.absent_from.slice(0, 5)}
                  id="absentFrom"
                  name="absentFrom"
                  required
                  suppressHydrationWarning
                  type="time"
                />
              </div>
              <div className="field-note">Students scanned from this time onward will be marked as Absent.</div>
            </div>

            <div className="settings-panel-block">
              <div className="settings-panel-kicker">Time Out</div>
              <div className="field">
                <label htmlFor="timeOutFrom">Time Out From</label>
                <input
                  className="input"
                  defaultValue={rules.time_out_from.slice(0, 5)}
                  id="timeOutFrom"
                  name="timeOutFrom"
                  required
                  suppressHydrationWarning
                  type="time"
                />
              </div>
              <div className="field-note">
                Time-out is allowed only from this time onward and only when a valid time-in already exists.
              </div>
            </div>
          </div>

          <div className="settings-panel-block rules-extra-block">
            <div className="settings-panel-kicker">Device Rule</div>
            <div className="field rules-cooldown-field">
              <label htmlFor="scanCooldownSeconds">Scan Cooldown Seconds</label>
              <input
                className="input"
                defaultValue={String(rules.scan_cooldown_seconds)}
                id="scanCooldownSeconds"
                min={0}
                name="scanCooldownSeconds"
                required
                suppressHydrationWarning
                type="number"
              />
            </div>
            <div className="field-note">
              Prevents duplicate taps from being recorded immediately after the first time-in.
            </div>
          </div>

          <div className="button-row settings-actions">
            <ConfirmActionButton
              className="button"
              confirmButtonColor="#8f6a21"
              confirmButtonText="Save"
              confirmText="The new time rules will apply to future hardware scans."
              confirmTitle="Save attendance time rules?"
              icon="question"
            >
              Save Time Rules
            </ConfirmActionButton>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
