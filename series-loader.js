// series-loader.js
// يحمّل series.json ويستبدل محتوى SERIES تلقائياً
// لا يحتاج أي تعديل على index.html سوى سطر <script>

(function() {
  async function loadSeriesFromJson() {
    // انتظر انتهاء تحميل الصفحة بالكامل أولاً
    try {
      const res = await fetch('series.json?t=' + Date.now());
      if (!res.ok) {
        console.warn('⚠️ series.json غير موجود — سيُستخدم الاحتياطي الداخلي.');
        return;
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.items || []);
      if (!list || list.length === 0) {
        console.warn('⚠️ series.json فارغ.');
        return;
      }

      // استبدال محتوى المصفوفة (لا إعادة تعيينها) — مسموح حتى مع const
      SERIES.length = 0;
      list.forEach(s => {
        if (s && s.id && s.name) SERIES.push(s);
      });

      console.log('✅ تم تحميل ' + SERIES.length + ' موسوعة من series.json');

      // إعادة بناء القائمة الجانبية (sidebar) بالموسوعات الجديدة
      if (typeof buildSidebar === 'function') {
        try { buildSidebar(); } catch(e) { console.warn(e); }
      }

      // إعادة رسم الصفحة الحالية (حتى تظهر الموسوعات في القوائم)
      if (location.hash) {
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
    } catch (e) {
      console.warn('❌ خطأ في تحميل series.json:', e);
    }
  }

  window.addEventListener('load', loadSeriesFromJson);
})();
