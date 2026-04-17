import bcrypt from "bcryptjs";
import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { currentDateString, getNowInManila } from "@/lib/utils/date";

export type AppRole = "admin" | "staff" | "student";
export type AttendanceStatus = "Present" | "Late" | "Absent";

export type SessionUser = {
  id: number;
  name: string;
  username: string;
  avatar_data_url?: string | null;
  role: AppRole;
};

export type AppUser = {
  id: number;
  name: string;
  username: string;
  email: string | null;
  uid: string | null;
  avatar_data_url: string | null;
  role: AppRole;
};

export type AccountProfile = {
  id: number;
  name: string;
  username: string;
  email: string | null;
  role: AppRole;
  avatar_data_url: string | null;
};

export type AttendanceRecord = {
  id: number;
  attendance_date: string;
  time_in: string | null;
  time_out: string | null;
  status: AttendanceStatus;
  name: string;
  username: string;
  uid: string | null;
  role: AppRole;
};

export type SummaryStats = {
  present: number;
  late: number;
  absent: number;
};

export type ReportsOverview = {
  daily: SummaryStats;
  weekly: SummaryStats;
  monthly: SummaryStats;
  selected: SummaryStats;
};

export type UserRoleCounts = {
  total: number;
  admins: number;
  staff: number;
  students: number;
};

export type AttendanceRules = {
  present_until: string;
  late_from: string;
  absent_from: string;
  scan_cooldown_seconds: number;
};

type UserRow = {
  id: number;
  name: string;
  username: string;
  email: string | null;
  uid: string | null;
  avatar_data_url: string | null;
  avatar_storage_path: string | null;
  role: AppRole;
  password_hash: string | null;
  pin_hash: string | null;
};

type AttendanceRow = {
  id: number;
  user_id: number;
  attendance_date: string;
  time_in: string | null;
  time_out: string | null;
  status: AttendanceStatus;
};

type AttendanceRuleRow = {
  id: number;
  present_until: string;
  late_from: string;
  absent_from: string;
  scan_cooldown_seconds: number;
};

type InternalAccountProfile = AccountProfile & {
  avatar_storage_path: string | null;
  password_hash: string;
};

const userSchema = z.object({
  name: z.string().trim().min(1),
  username: z.string().trim().min(1).max(10),
  email: z.string().email().optional().or(z.literal("")),
  uid: z.string().optional().or(z.literal("")),
  role: z.enum(["admin", "staff", "student"]),
  password: z.string().optional().or(z.literal("")),
  pin: z.string().optional().or(z.literal(""))
});

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function toDatabaseTime(value: string) {
  return value.length === 5 ? `${value}:00` : value;
}

const AVATAR_BUCKET = "avatars";
const ALLOWED_AVATAR_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"]
]);

const ALLOWED_AVATAR_DATA_PREFIXES = new Map([
  ["data:image/jpeg;base64,", "image/jpeg"],
  ["data:image/png;base64,", "image/png"],
  ["data:image/webp;base64,", "image/webp"]
]);

const DEFAULT_ATTENDANCE_RULES: AttendanceRules = {
  present_until: "08:00:00",
  late_from: "08:15:00",
  absent_from: "10:00:00",
  scan_cooldown_seconds: 60
};

const attendanceRulesSchema = z.object({
  present_until: z.string().regex(/^\d{2}:\d{2}$/),
  late_from: z.string().regex(/^\d{2}:\d{2}$/),
  absent_from: z.string().regex(/^\d{2}:\d{2}$/),
  scan_cooldown_seconds: z.coerce.number().int().min(0).max(3600)
});

function getSupabase() {
  return createSupabaseServerClient();
}

function isWithinRange(value: string, start: string, end: string) {
  return value >= start && value <= end;
}

function sortUsers(users: AppUser[]) {
  const roleRank: Record<AppRole, number> = {
    admin: 0,
    staff: 1,
    student: 2
  };

  return [...users].sort((left, right) => {
    const roleDiff = roleRank[left.role] - roleRank[right.role];

    if (roleDiff !== 0) {
      return roleDiff;
    }

    return left.name.localeCompare(right.name, "en", { sensitivity: "base" });
  });
}

function mapUser(row: UserRow): AppUser {
  return {
    id: Number(row.id),
    name: row.name,
    username: row.username,
    email: row.email,
    uid: row.uid,
    avatar_data_url: row.avatar_data_url,
    role: row.role
  };
}

function toSessionUser(row: UserRow): SessionUser {
  return {
    id: Number(row.id),
    name: row.name,
    username: row.username,
    avatar_data_url: row.avatar_data_url,
    role: row.role
  };
}

function summarizeStatuses(rows: Array<Pick<AttendanceRow, "attendance_date" | "status">>, startDate: string, endDate: string) {
  const summary: SummaryStats = {
    present: 0,
    late: 0,
    absent: 0
  };

  for (const row of rows) {
    if (!isWithinRange(row.attendance_date, startDate, endDate)) {
      continue;
    }

    if (row.status === "Present") {
      summary.present += 1;
    } else if (row.status === "Late") {
      summary.late += 1;
    } else if (row.status === "Absent") {
      summary.absent += 1;
    }
  }

  return summary;
}

async function listRawUsers() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("app_users")
    .select("id, name, username, email, uid, avatar_data_url, avatar_storage_path, role, password_hash, pin_hash");

  if (error) {
    throw new Error(`Unable to load users from Supabase: ${error.message}`);
  }

  return (data ?? []) as UserRow[];
}

async function listUserIdsByRole(role: AppRole) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("app_users").select("id").eq("role", role);

  if (error) {
    throw new Error(`Unable to load ${role} users from Supabase: ${error.message}`);
  }

  return ((data ?? []) as Array<Pick<UserRow, "id">>).map((row) => Number(row.id));
}

async function getRawUserById(id: number) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("app_users")
    .select("id, name, username, email, uid, avatar_data_url, avatar_storage_path, role, password_hash, pin_hash")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load user from Supabase: ${error.message}`);
  }

  return (data as UserRow | null) ?? null;
}

async function listAttendanceRows(filters: {
  startDate?: string;
  endDate?: string;
  userId?: number;
  role?: AppRole;
  limit?: number;
}) {
  const supabase = getSupabase();
  let query = supabase
    .from("attendance_records")
    .select("id, user_id, attendance_date, time_in, time_out, status")
    .order("attendance_date", { ascending: false })
    .order("time_in", { ascending: false, nullsFirst: false });

  if (filters.userId) {
    query = query.eq("user_id", filters.userId);
  }

  if (filters.role) {
    const userIds = await listUserIdsByRole(filters.role);

    if (!userIds.length) {
      return [] as AttendanceRow[];
    }

    query = query.in("user_id", userIds);
  }

  if (filters.startDate) {
    query = query.gte("attendance_date", filters.startDate);
  }

  if (filters.endDate) {
    query = query.lte("attendance_date", filters.endDate);
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Unable to load attendance records from Supabase: ${error.message}`);
  }

  return (data ?? []) as AttendanceRow[];
}

async function listAttendanceStatuses(startDate: string, endDate: string, userId?: number, role?: AppRole) {
  const supabase = getSupabase();
  let query = supabase
    .from("attendance_records")
    .select("attendance_date, status")
    .gte("attendance_date", startDate)
    .lte("attendance_date", endDate);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  if (role) {
    const userIds = await listUserIdsByRole(role);

    if (!userIds.length) {
      return [] as Array<Pick<AttendanceRow, "attendance_date" | "status">>;
    }

    query = query.in("user_id", userIds);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Unable to load attendance summary from Supabase: ${error.message}`);
  }

  return (data ?? []) as Array<Pick<AttendanceRow, "attendance_date" | "status">>;
}

async function hydrateAttendance(rows: AttendanceRow[]) {
  if (!rows.length) {
    return [] as AttendanceRecord[];
  }

  const supabase = getSupabase();
  const userIds = [...new Set(rows.map((row) => row.user_id))];
  const { data, error } = await supabase
    .from("app_users")
    .select("id, name, username, uid, role")
    .in("id", userIds);

  if (error) {
    throw new Error(`Unable to load attendance users from Supabase: ${error.message}`);
  }

  const userMap = new Map(
    ((data ?? []) as Array<Pick<UserRow, "id" | "name" | "username" | "uid" | "role">>).map((row) => [Number(row.id), row])
  );

  return rows.flatMap((row) => {
    const user = userMap.get(row.user_id);

    if (!user) {
      return [];
    }

    return [
      {
        id: Number(row.id),
        attendance_date: row.attendance_date,
        time_in: row.time_in,
        time_out: row.time_out,
        status: row.status,
        name: user.name,
        username: user.username,
        uid: user.uid,
        role: user.role
      } satisfies AttendanceRecord
    ];
  });
}

export async function verifyLogin(login: string, password: string) {
  const normalizedLogin = login.trim().toLowerCase();
  const users = await listRawUsers();
  const row = users.find(
    (user) =>
      (user.role === "admin" || user.role === "staff") &&
      (user.username.trim().toLowerCase() === normalizedLogin ||
        user.email?.trim().toLowerCase() === normalizedLogin)
  );

  if (!row?.password_hash) {
    return null;
  }

  const valid = await bcrypt.compare(password, row.password_hash);

  if (!valid) {
    return null;
  }

  const normalizedRow = await ensureAvatarStored(row);
  return normalizedRow ? toSessionUser(normalizedRow) : null;
}

export async function getUserById(id: number) {
  const row = await getRawUserById(id);
  return row ? mapUser(row) : null;
}

export async function listUsers(role?: AppRole, search?: string) {
  const users = await listRawUsers();
  const normalizedSearch = search?.trim().toLowerCase();
  const filtered = users.filter((user) => {
    if (role && user.role !== role) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return (
      user.name.toLowerCase().includes(normalizedSearch) ||
      user.username.toLowerCase().includes(normalizedSearch) ||
      user.uid?.toLowerCase().includes(normalizedSearch) ||
      user.email?.toLowerCase().includes(normalizedSearch)
    );
  });

  return sortUsers(filtered.map(mapUser));
}

export async function getUserRoleCounts(): Promise<UserRoleCounts> {
  const users = await listRawUsers();

  const counts: UserRoleCounts = {
    total: users.length,
    admins: 0,
    staff: 0,
    students: 0
  };

  for (const user of users) {
    if (user.role === "admin") {
      counts.admins += 1;
    } else if (user.role === "staff") {
      counts.staff += 1;
    } else if (user.role === "student") {
      counts.students += 1;
    }
  }

  return counts;
}

export async function countAdminUsers() {
  const supabase = getSupabase();
  const { count, error } = await supabase
    .from("app_users")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin");

  if (error) {
    throw new Error(`Unable to count admin users in Supabase: ${error.message}`);
  }

  return Number(count ?? 0);
}

async function ensureUserUniqueness(input: {
  username: string;
  email?: string;
  uid?: string;
  excludeId?: number;
}) {
  const users = await listRawUsers();
  const normalizedUsername = input.username.trim().toLowerCase();
  const normalizedEmail = input.email?.trim().toLowerCase();
  const normalizedUid = input.uid?.trim();

  for (const user of users) {
    if (input.excludeId && Number(user.id) === input.excludeId) {
      continue;
    }

    if (user.username.trim().toLowerCase() === normalizedUsername) {
      throw new Error("That username is already assigned to another user.");
    }

    if (normalizedEmail && user.email?.trim().toLowerCase() === normalizedEmail) {
      throw new Error("That email is already assigned to another user.");
    }

    if (normalizedUid && user.uid?.trim() === normalizedUid) {
      throw new Error("That uid is already assigned to another user.");
    }
  }
}

export async function saveUser(formData: FormData, currentAdminId: number) {
  const validation = userSchema.safeParse({
    name: formValue(formData, "name"),
    username: formValue(formData, "username"),
    email: formValue(formData, "email"),
    uid: formValue(formData, "uid"),
    role: formValue(formData, "role"),
    password: formValue(formData, "password"),
    pin: formValue(formData, "pin")
  });

  if (!validation.success) {
    const issue = validation.error.issues[0];

    if (issue?.path[0] === "name") {
      throw new Error("Full name is required.");
    }

    if (issue?.path[0] === "username") {
      throw new Error("Username must be 10 characters or less.");
    }

    if (issue?.path[0] === "email") {
      throw new Error("Please enter a valid email address.");
    }

    if (issue?.path[0] === "role") {
      throw new Error("Please select a valid role.");
    }

    throw new Error("Please complete the user form correctly.");
  }

  const parsed = validation.data;

  const idValue = formData.get("id");
  const id = idValue ? Number(idValue) : null;
  const email = parsed.email?.trim() || null;
  const uid = parsed.uid?.trim() || null;
  const supabase = getSupabase();

  await ensureUserUniqueness({
    username: parsed.username,
    email: email ?? undefined,
    uid: uid ?? undefined,
    excludeId: id ?? undefined
  });

  if (id) {
    const existing = await getRawUserById(id);

    if (!existing) {
      throw new Error("User not found.");
    }

    if (existing.role === "admin" && parsed.role !== "admin" && (await countAdminUsers()) <= 1) {
      throw new Error("At least one admin account must remain in the system.");
    }

    const payload: Partial<UserRow> = {
      name: parsed.name.trim(),
      username: parsed.username.trim(),
      email,
      uid,
      role: parsed.role
    };

    if (parsed.password) {
      payload.password_hash = await bcrypt.hash(parsed.password, 10);
    }

    if (parsed.pin) {
      payload.pin_hash = await bcrypt.hash(parsed.pin, 10);
    }

    const { error } = await supabase.from("app_users").update(payload).eq("id", id);

    if (error) {
      throw new Error(`Unable to update user in Supabase: ${error.message}`);
    }

    return;
  }

  if (!parsed.password) {
    if (parsed.role !== "student") {
      throw new Error("Password is required when creating a user.");
    }
  }

  const passwordSeed = parsed.password || randomBytes(24).toString("hex");
  const passwordHash = await bcrypt.hash(passwordSeed, 10);
  const pinHash = parsed.pin ? await bcrypt.hash(parsed.pin, 10) : null;

  if (currentAdminId <= 0) {
    throw new Error("Invalid admin session.");
  }

  const { error } = await supabase.from("app_users").insert({
    name: parsed.name.trim(),
    username: parsed.username.trim(),
    email,
    uid,
    avatar_data_url: null,
    avatar_storage_path: null,
    password_hash: passwordHash,
    pin_hash: pinHash,
    role: parsed.role
  });

  if (error) {
    throw new Error(`Unable to create user in Supabase: ${error.message}`);
  }
}

export async function deleteUser(userId: number, currentAdminId: number) {
  const existing = await getUserById(userId);

  if (!existing) {
    throw new Error("User not found.");
  }

  if (existing.id === currentAdminId) {
    throw new Error("You cannot delete the account you are currently using.");
  }

  if (existing.role === "admin" && (await countAdminUsers()) <= 1) {
    throw new Error("At least one admin account must remain in the system.");
  }

  const supabase = getSupabase();
  const { error } = await supabase.from("app_users").delete().eq("id", userId);

  if (error) {
    throw new Error(`Unable to delete user from Supabase: ${error.message}`);
  }
}

export async function getAccountProfile(userId: number) {
  const row = await getRawUserById(userId);

  if (!row?.password_hash) {
    return null;
  }

  const normalized = await ensureAvatarStored(row);

  if (!normalized?.password_hash) {
    return null;
  }

  return {
    id: normalized.id,
    name: normalized.name,
    username: normalized.username,
    email: normalized.email,
    role: normalized.role,
    avatar_data_url: normalized.avatar_data_url,
    avatar_storage_path: normalized.avatar_storage_path ?? null,
    password_hash: normalized.password_hash
  } satisfies InternalAccountProfile;
}

function validateAvatarFile(file: File) {
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    throw new Error("Profile picture must be a JPG, PNG, or WEBP image.");
  }

  if (file.size > 4 * 1024 * 1024) {
    throw new Error("Profile picture must be 4 MB or smaller.");
  }
}

function canManageAvatarStorage() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function resolveAvatarExtension(contentType: string) {
  const extension = ALLOWED_AVATAR_TYPES.get(contentType);

  if (!extension) {
    throw new Error("Unsupported profile picture format.");
  }

  return extension;
}

async function uploadAvatarBufferToStorage(userId: number, buffer: Buffer, contentType: string) {
  const extension = resolveAvatarExtension(contentType);
  const supabase = getSupabase();
  const objectPath = `${userId}/${randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(objectPath, buffer, {
    contentType,
    upsert: false
  });

  if (error) {
    throw new Error(`Unable to upload profile picture: ${error.message}`);
  }

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(objectPath);

  return {
    avatarDataUrl: data.publicUrl,
    avatarStoragePath: objectPath
  };
}

async function uploadAvatarToStorage(userId: number, file: File) {
  validateAvatarFile(file);
  const buffer = Buffer.from(await file.arrayBuffer());
  return uploadAvatarBufferToStorage(userId, buffer, file.type);
}

function isInlineAvatarDataUrl(value: string | null | undefined) {
  return typeof value === "string" && value.startsWith("data:image/");
}

async function migrateLegacyAvatarToStorage(userId: number, avatarDataUrl: string) {
  const matchedPrefix = Array.from(ALLOWED_AVATAR_DATA_PREFIXES.keys()).find((prefix) =>
    avatarDataUrl.startsWith(prefix)
  );

  if (!matchedPrefix) {
    throw new Error("Unsupported legacy profile picture format.");
  }

  const contentType = ALLOWED_AVATAR_DATA_PREFIXES.get(matchedPrefix);

  if (!contentType) {
    throw new Error("Unsupported legacy profile picture format.");
  }

  const encoded = avatarDataUrl.slice(matchedPrefix.length);
  const buffer = Buffer.from(encoded, "base64");
  return uploadAvatarBufferToStorage(userId, buffer, contentType);
}

async function ensureAvatarStored<T extends { id: number; avatar_data_url: string | null; avatar_storage_path?: string | null }>(
  row: T | null
) {
  if (!row || !isInlineAvatarDataUrl(row.avatar_data_url) || row.avatar_storage_path || !canManageAvatarStorage()) {
    return row;
  }

  const avatarDataUrl = row.avatar_data_url;

  if (!avatarDataUrl) {
    return row;
  }

  const migrated = await migrateLegacyAvatarToStorage(row.id, avatarDataUrl);
  const supabase = getSupabase();
  const { error } = await supabase
    .from("app_users")
    .update({
      avatar_data_url: migrated.avatarDataUrl,
      avatar_storage_path: migrated.avatarStoragePath
    })
    .eq("id", row.id);

  if (error) {
    throw new Error(`Unable to save migrated profile picture: ${error.message}`);
  }

  return {
    ...row,
    avatar_data_url: migrated.avatarDataUrl,
    avatar_storage_path: migrated.avatarStoragePath
  };
}

async function deleteAvatarFromStorage(storagePath: string | null) {
  if (!storagePath || !canManageAvatarStorage()) {
    return;
  }

  const supabase = getSupabase();
  await supabase.storage.from(AVATAR_BUCKET).remove([storagePath]);
}

export async function updateOwnAccount(userId: number, formData: FormData) {
  const existing = await getAccountProfile(userId);

  if (!existing) {
    throw new Error("Account not found.");
  }

  const name = String(formData.get("name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const emailRaw = String(formData.get("email") ?? "").trim();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const removeAvatar = String(formData.get("removeAvatar") ?? "") === "on";
  const uploadedFile = formData.get("profilePicture");

  if (!name) {
    throw new Error("Full name is required.");
  }

  if (!username) {
    throw new Error("Username is required.");
  }

  if (username.length > 10) {
    throw new Error("Username must be 10 characters or less.");
  }

  let email: string | null = null;

  if (emailRaw) {
    const emailValidation = z.string().email().safeParse(emailRaw);

    if (!emailValidation.success) {
      throw new Error("Please enter a valid email address.");
    }

    email = emailValidation.data;
  }

  await ensureUserUniqueness({
    username,
    email: email ?? undefined,
    excludeId: userId
  });

  let avatarDataUrl = existing.avatar_data_url;
  let avatarStoragePath = existing.avatar_storage_path;

  if (removeAvatar) {
    avatarDataUrl = null;
    avatarStoragePath = null;
  }

  if (uploadedFile instanceof File && uploadedFile.size > 0) {
    if (!canManageAvatarStorage()) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured for avatar uploads.");
    }

    const uploadedAvatar = await uploadAvatarToStorage(userId, uploadedFile);
    avatarDataUrl = uploadedAvatar.avatarDataUrl;
    avatarStoragePath = uploadedAvatar.avatarStoragePath;
  }

  let passwordHash = existing.password_hash;

  if (newPassword || confirmPassword) {
    if (!currentPassword) {
      throw new Error("Current password is required to change your password.");
    }

    const validPassword = await bcrypt.compare(currentPassword, existing.password_hash);

    if (!validPassword) {
      throw new Error("Current password is incorrect.");
    }

    if (newPassword.length < 4) {
      throw new Error("New password must be at least 4 characters.");
    }

    if (newPassword !== confirmPassword) {
      throw new Error("New password and confirmation do not match.");
    }

    passwordHash = await bcrypt.hash(newPassword, 10);
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from("app_users")
    .update({
      name,
      username,
      email,
      avatar_data_url: avatarDataUrl,
      avatar_storage_path: avatarStoragePath,
      password_hash: passwordHash
    })
    .eq("id", userId);

  if (error) {
    throw new Error(`Unable to update account settings in Supabase: ${error.message}`);
  }

  if (existing.avatar_storage_path && existing.avatar_storage_path !== avatarStoragePath) {
    await deleteAvatarFromStorage(existing.avatar_storage_path);
  }

  return {
    id: existing.id,
    name,
    username,
    role: existing.role,
    email,
    avatar_data_url: avatarDataUrl
  };
}

export async function getAttendanceRules(): Promise<AttendanceRules> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("app_settings")
    .select("id, present_until, late_from, absent_from, scan_cooldown_seconds")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load attendance rules from Supabase: ${error.message}`);
  }

  const row = (data as AttendanceRuleRow | null) ?? null;

  if (!row) {
    return DEFAULT_ATTENDANCE_RULES;
  }

  return {
    present_until: row.present_until,
    late_from: row.late_from,
    absent_from: row.absent_from,
    scan_cooldown_seconds: Number(row.scan_cooldown_seconds ?? DEFAULT_ATTENDANCE_RULES.scan_cooldown_seconds)
  };
}

export async function updateAttendanceRules(formData: FormData) {
  const validation = attendanceRulesSchema.safeParse({
    present_until: formValue(formData, "presentUntil"),
    late_from: formValue(formData, "lateFrom"),
    absent_from: formValue(formData, "absentFrom"),
    scan_cooldown_seconds: formValue(formData, "scanCooldownSeconds")
  });

  if (!validation.success) {
    throw new Error("Please complete the attendance time rules correctly.");
  }

  const parsed = validation.data;
  const presentUntil = toDatabaseTime(parsed.present_until);
  const lateFrom = toDatabaseTime(parsed.late_from);
  const absentFrom = toDatabaseTime(parsed.absent_from);

  if (!(presentUntil < lateFrom && lateFrom < absentFrom)) {
    throw new Error("Present time must be earlier than Late, and Late must be earlier than Absent.");
  }

  const supabase = getSupabase();
  const { error } = await supabase.from("app_settings").upsert(
    {
      id: 1,
      present_until: presentUntil,
      late_from: lateFrom,
      absent_from: absentFrom,
      scan_cooldown_seconds: parsed.scan_cooldown_seconds
    },
    {
      onConflict: "id"
    }
  );

  if (error) {
    throw new Error(`Unable to save attendance rules in Supabase: ${error.message}`);
  }
}

export async function processAttendanceScan(uid: string, pin: string) {
  const normalizedUid = uid.trim();
  const normalizedPin = pin.trim();

  if (!normalizedUid || !normalizedPin) {
    return { ok: false as const, message: "DENIED" };
  }

  const supabase = getSupabase();
  const { data: userData, error: userError } = await supabase
    .from("app_users")
    .select("id, name, uid, pin_hash")
    .eq("uid", normalizedUid)
    .maybeSingle();

  if (userError) {
    throw new Error(`Unable to verify RFID user in Supabase: ${userError.message}`);
  }

  const user = (userData as Pick<UserRow, "id" | "name" | "uid" | "pin_hash"> | null) ?? null;

  if (!user?.pin_hash) {
    return { ok: false as const, message: "DENIED" };
  }

  const validPin = await bcrypt.compare(normalizedPin, user.pin_hash);

  if (!validPin) {
    return { ok: false as const, message: "DENIED" };
  }

  const rules = await getAttendanceRules();
  const now = getNowInManila();
  const { data: existingData, error: existingError } = await supabase
    .from("attendance_records")
    .select("id, attendance_date, time_in, time_out")
    .eq("user_id", user.id)
    .eq("attendance_date", now.date)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Unable to load attendance scan state from Supabase: ${existingError.message}`);
  }

  const existing = (existingData as Pick<AttendanceRow, "id" | "attendance_date" | "time_in" | "time_out"> | null) ?? null;

  if (!existing) {
    const status: AttendanceStatus =
      now.time >= rules.absent_from
        ? "Absent"
        : now.time >= rules.late_from
          ? "Late"
          : "Present";

    const { error } = await supabase.from("attendance_records").insert({
      user_id: user.id,
      attendance_date: now.date,
      time_in: now.time,
      status
    });

    if (error) {
      throw new Error(`Unable to save time-in to Supabase: ${error.message}`);
    }

    return { ok: true as const, message: "SUCCESS", action: "TIME_IN" };
  }

  if (existing.time_out) {
    return { ok: false as const, message: "DENIED" };
  }

  const firstTap = new Date(`${existing.attendance_date}T${existing.time_in}+08:00`);
  const secondsSinceFirstTap = Math.floor((now.jsDate.getTime() - firstTap.getTime()) / 1000);

  if (secondsSinceFirstTap < rules.scan_cooldown_seconds) {
    return { ok: false as const, message: "DENIED" };
  }

  const { error } = await supabase
    .from("attendance_records")
    .update({
      time_out: now.time
    })
    .eq("id", existing.id);

  if (error) {
    throw new Error(`Unable to save time-out to Supabase: ${error.message}`);
  }

  return { ok: true as const, message: "SUCCESS", action: "TIME_OUT" };
}

export async function getDailySummary(date: string, viewerUserId?: number, role?: AppRole): Promise<SummaryStats> {
  const rows = await listAttendanceStatuses(date, date, viewerUserId, role);
  return summarizeStatuses(rows, date, date);
}

export async function getOverallSummary(viewerUserId?: number, role?: AppRole): Promise<SummaryStats> {
  const rows = await listAttendanceRows({
    userId: viewerUserId,
    role
  });

  const summary: SummaryStats = {
    present: 0,
    late: 0,
    absent: 0
  };

  for (const row of rows) {
    if (row.status === "Present") {
      summary.present += 1;
    } else if (row.status === "Late") {
      summary.late += 1;
    } else if (row.status === "Absent") {
      summary.absent += 1;
    }
  }

  return summary;
}

export async function getPeriodSummary(startDate: string, endDate: string, viewerUserId?: number, role?: AppRole) {
  const rows = await listAttendanceStatuses(startDate, endDate, viewerUserId, role);
  return summarizeStatuses(rows, startDate, endDate);
}

export async function getReportsOverview(input: {
  today: string;
  weeklyStart: string;
  monthlyStart: string;
  selectedStart: string;
  selectedEnd: string;
  viewerUserId?: number;
  role?: AppRole;
}): Promise<ReportsOverview> {
  const rangeStart = [input.weeklyStart, input.monthlyStart, input.selectedStart].sort()[0];
  const rangeEnd = [input.today, input.selectedEnd].sort().at(-1) ?? input.today;
  const rows = await listAttendanceStatuses(rangeStart, rangeEnd, input.viewerUserId, input.role);

  return {
    daily: summarizeStatuses(rows, input.today, input.today),
    weekly: summarizeStatuses(rows, input.weeklyStart, input.today),
    monthly: summarizeStatuses(rows, input.monthlyStart, input.today),
    selected: summarizeStatuses(rows, input.selectedStart, input.selectedEnd)
  };
}

export async function listRecentAttendance(limit = 8, viewerUserId?: number, role?: AppRole) {
  const rows = await listAttendanceRows({
    userId: viewerUserId,
    role,
    limit
  });

  return hydrateAttendance(rows);
}

export async function listAttendance(filters: {
  dateFrom?: string;
  dateTo?: string;
  userId?: number;
  viewerUserId?: number;
  role?: AppRole;
}) {
  const rows = await listAttendanceRows({
    startDate: filters.dateFrom,
    endDate: filters.dateTo,
    userId: filters.viewerUserId ?? filters.userId,
    role: filters.role,
    limit: 500
  });
  const hydrated = await hydrateAttendance(rows);

  return hydrated.sort((left, right) => {
    if (left.attendance_date !== right.attendance_date) {
      return right.attendance_date.localeCompare(left.attendance_date);
    }

    const nameDiff = left.name.localeCompare(right.name, "en", { sensitivity: "base" });

    if (nameDiff !== 0) {
      return nameDiff;
    }

    return (right.time_in ?? "").localeCompare(left.time_in ?? "");
  });
}

export async function getTrendSeries(startDate: string, endDate: string, viewerUserId?: number, role?: AppRole) {
  const rows = await listAttendanceStatuses(startDate, endDate, viewerUserId, role);
  const byDate = new Map<string, { present: number; late: number }>();

  for (const row of rows) {
    const bucket = byDate.get(row.attendance_date) ?? { present: 0, late: 0 };

    if (row.status === "Present") {
      bucket.present += 1;
    } else if (row.status === "Late") {
      bucket.late += 1;
    }

    byDate.set(row.attendance_date, bucket);
  }

  const labels: string[] = [];
  const present: number[] = [];
  const late: number[] = [];
  const cursor = new Date(`${startDate}T00:00:00+08:00`);
  const end = new Date(`${endDate}T00:00:00+08:00`);

  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    labels.push(
      new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "2-digit",
        timeZone: "Asia/Manila"
      }).format(cursor)
    );

    const value = byDate.get(key);
    present.push(value?.present ?? 0);
    late.push(value?.late ?? 0);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return { labels, present, late };
}

export async function getSettingsSnapshot() {
  const rules = await getAttendanceRules();

  return {
    appName: "RFID Attendance Management System",
    timezone: "Asia/Manila",
    presentUntil: rules.present_until,
    lateFrom: rules.late_from,
    absentFrom: rules.absent_from,
    cooldown: rules.scan_cooldown_seconds,
    database: "Supabase"
  };
}

export function defaultAttendanceDateFilters() {
  const today = currentDateString();
  return {
    dateFrom: today,
    dateTo: today
  };
}
