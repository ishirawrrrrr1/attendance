export const db = {
  async query() {
    throw new Error("Legacy SQL client removed. Use Supabase query helpers instead.");
  }
};
