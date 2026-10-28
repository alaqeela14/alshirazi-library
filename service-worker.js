/* ============================================================
   Kill Switch: هذا الملف يلغي نفسه ويمسح كل الكاش
   ثم يعيد تحميل كل النوافذ المفتوحة بالنسخة الجديدة.
   بعد أن ينتشر بين جميع الزوار، يمكن حذفه نهائياً.
   ============================================================ */

const CACHE_PREFIX = 'alshirazi-';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 1. امسح كل الكاشات
      const keys = await caches.keys();
      await Promise.all(
        keys.filter(k => k.startsWith(CACHE_PREFIX) || k.includes('alshirazi'))
            .map(k => caches.delete(k))
      );
      // 2. ألغِ تسجيل هذا الـ SW نهائياً
      await self.registration.unregister();
      // 3. أعد تحميل كل النوافذ المفتوحة
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(client => client.navigate(client.url));
    })()
  );
});

// لا نتدخل في fetch إطلاقاً — الشبكة هي المصدر الوحيد
