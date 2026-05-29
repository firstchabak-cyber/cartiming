// 커스텀 서비스워커 — next-pwa 가 자동 생성 sw.js 에 합쳐줌.
// 웹 푸시 수신 + 알림 클릭 처리.

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "카타이밍", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "카타이밍";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: data.url || "/notifications" },
    tag: data.tag || undefined,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/notifications";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // 이미 열린 창이 있으면 그 창으로 이동
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client) client.navigate(url);
            return;
          }
        }
        // 없으면 새 창
        if (self.clients.openWindow) return self.clients.openWindow(url);
      }),
  );
});
