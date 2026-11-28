self.addEventListener("push", (event) => {
  let title = "Gemini Resets";
  let body = "Open Gemini Resets to see the latest updates.";
  let tag = "gemini-update";

  if (event.data) {
    try {
      const parsed = event.data.json();
      if (parsed && typeof parsed === "object") {
        if (typeof parsed.title === "string" && parsed.title.trim()) title = parsed.title;
        if (typeof parsed.body === "string" && parsed.body.trim()) body = parsed.body;
        if (typeof parsed.tag === "string" && parsed.tag.trim()) tag = parsed.tag;
      }
    } catch {
      // Still show a neutral notification if a push has no usable payload.
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/pwa/icon-192.png",
      badge: "/icon.png",
      tag,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        const home = new URL("/", self.location.origin);
        const homeClient = windowClients.find((client) => {
          const url = new URL(client.url);
          return url.origin === home.origin && url.pathname === home.pathname;
        });
        return homeClient ? homeClient.focus() : self.clients.openWindow(home.href);
      }),
  );
});
