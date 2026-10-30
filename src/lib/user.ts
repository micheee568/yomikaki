import { db } from "@/lib/db";

export const LOCAL_USER_EMAIL = "me@yomikaki.local";

/**
 * Yomikaki is a personal, single-user app, so there is no login: everything
 * belongs to one local user, created on first use. All queries still filter
 * by userId, so adding real accounts later doesn't change the data model.
 */
export async function getCurrentUser() {
  return db.user.upsert({
    where: { email: LOCAL_USER_EMAIL },
    update: {},
    create: { email: LOCAL_USER_EMAIL },
  });
}
