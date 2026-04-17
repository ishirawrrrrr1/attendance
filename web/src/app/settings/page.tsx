import { AppShell } from "@/components/app-shell";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { requireUserSession } from "@/lib/auth/session";
import { getAccountProfile } from "@/lib/db/queries";
import { updateAccountSettingsAction } from "@/app/settings/actions";

type SettingsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const user = await requireUserSession();
  const profile = await getAccountProfile(user.id);
  await searchParams;

  if (!profile) {
    throw new Error("Account profile not found.");
  }

  const shellUser = {
    ...user,
    name: profile.name,
    username: profile.username,
    avatar_data_url: profile.avatar_data_url,
    role: profile.role
  };

  return (
    <AppShell title="Settings" user={shellUser}>
      <div className="grid">
        <div className="card settings-card">
          <h2 className="section-title">Account Settings</h2>
          <form action={updateAccountSettingsAction} autoComplete="on" className="settings-form">
            <div className="settings-side-panel">
              <div className="settings-panel-block">
                <div className="settings-panel-kicker">Profile</div>
                <div className="settings-profile-header">
                  <div className="settings-avatar">
                    {profile.avatar_data_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt={`${profile.role} profile`} className="settings-avatar-image" src={profile.avatar_data_url} />
                    ) : (
                      <span>{profile.name.slice(0, 1).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="settings-profile-copy">
                    <div className="settings-profile-name">{profile.name}</div>
                    <div className="settings-profile-role">{profile.role}</div>
                  </div>
                </div>
              </div>

              <div className="settings-panel-block">
                <div className="field">
                  <label htmlFor="profilePicture">Profile Picture</label>
                  <input className="input" accept="image/png,image/jpeg,image/webp" id="profilePicture" name="profilePicture" suppressHydrationWarning type="file" />
                </div>

                {profile.avatar_data_url ? (
                  <label className="settings-checkbox">
                    <input name="removeAvatar" suppressHydrationWarning type="checkbox" />
                    <span>Remove current profile picture</span>
                  </label>
                ) : null}
              </div>
            </div>

            <div className="settings-main-panel">
              <div className="settings-panel-block">
                <div className="settings-panel-kicker">Account</div>
                <div className="settings-fields">
                  <div className="field">
                    <label htmlFor="name">Full Name</label>
                    <input
                      autoComplete="name"
                      className="input"
                      defaultValue={profile.name}
                      id="name"
                      name="name"
                      required
                      suppressHydrationWarning
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="username">Username</label>
                    <input
                      autoComplete="username"
                      className="input"
                      defaultValue={profile.username}
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
                      autoComplete="email"
                      className="input"
                      defaultValue={profile.email ?? ""}
                      id="email"
                      name="email"
                      suppressHydrationWarning
                      type="email"
                    />
                  </div>
                </div>
              </div>

              <div className="settings-panel-block">
                <div className="settings-panel-kicker">Password</div>
                <div className="settings-fields">
                  <div className="field">
                    <label htmlFor="currentPassword">Current Password</label>
                    <input
                      autoComplete="current-password"
                      className="input"
                      id="currentPassword"
                      name="currentPassword"
                      placeholder="Required only when changing password"
                      suppressHydrationWarning
                      type="password"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="newPassword">New Password</label>
                    <input
                      autoComplete="new-password"
                      className="input"
                      id="newPassword"
                      name="newPassword"
                      placeholder="Leave blank to keep current password"
                      suppressHydrationWarning
                      type="password"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="confirmPassword">Confirm New Password</label>
                    <input
                      autoComplete="new-password"
                      className="input"
                      id="confirmPassword"
                      name="confirmPassword"
                      suppressHydrationWarning
                      type="password"
                    />
                  </div>
                </div>
              </div>

              <div className="button-row settings-actions">
                <ConfirmActionButton
                  className="button"
                  confirmButtonColor="#8f6a21"
                  confirmButtonText="Save"
                  confirmText="Your account settings will be updated."
                  confirmTitle="Save account settings?"
                  icon="question"
                >
                  Save Account Settings
                </ConfirmActionButton>
              </div>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
