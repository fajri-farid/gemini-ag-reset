let session: Promise<void> | undefined;

export function ensureCommunitySession() {
  session ??= fetch("/api/community/session", { method: "POST", keepalive: true })
    .then((response) => {
      if (!response.ok) throw new Error("Community session unavailable.");
    })
    .catch((error: unknown) => {
      session = undefined;
      throw error;
    });
  return session;
}

export async function postCommunityMutation(path: string, body: string, keepalive = false) {
  await ensureCommunitySession();
  const send = () => fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive,
  });
  const response = await send();
  if (response.status !== 401) return response;
  session = undefined;
  await ensureCommunitySession();
  return send();
}
