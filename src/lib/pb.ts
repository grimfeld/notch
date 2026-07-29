import PocketBase from "pocketbase";

const serverUrl = import.meta.env.VITE_POCKETBASE_URL;
if (!serverUrl) {
  throw new Error("VITE_POCKETBASE_URL is not set — configure it in .env");
}

const pb = new PocketBase(serverUrl.replace(/\/+$/, ""));

export function getPb(): PocketBase {
  return pb;
}

export function isAuthed(): boolean {
  return pb.authStore.isValid;
}

export async function login(email: string, password: string): Promise<void> {
  await pb.collection("users").authWithPassword(email, password);
}

export function logout(): void {
  pb.authStore.clear();
}

/** PocketBase error shape check: network failures have status 0. */
export function isNetworkError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    (err as { status: number }).status === 0
  );
}
