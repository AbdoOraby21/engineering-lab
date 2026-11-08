# Admin Guide — Engineernig Lab Store

## Available Languages: Arabic (العربية) & English

This guide is written in both languages. Use the language switcher in the top-right corner of the admin panel to toggle.

---

## 1. Daily Routine (المهام اليومية / اليومية)

### English
- **Morning**: Check pending payment proofs (Orders → Payment Proof Review Queue). Approve or reject proofs that are complete and legible.
- **Morning**: Run low‑stock digest (admin panel → Settings → Low‑Stock Threshold). Review products with stock ≤ threshold and reorder if needed.
- **Afternoon**: Check expired orders (Orders → Status → EXPIRED). Send cancellation emails and restore stock.
- **End of day**: Verify that backup ran successfully (control panel → Backups). Confirm no pending alerts in Sentry.

### العربية
- **صباح**: تحقق من إثباتات الدفع المعلقة (طلبات → قائمة انتظار مراجعة الإثباتات). Approve أو reject الإثباتات الكاملة والمقروءة.
- **صباح**: تشغيل مسح المخزون المنخفض (لوحة التحكم → الإعدادات → حد المخزون المنخفض). مراجعة المنتجات whose stock ≤ threshold وإعادة طلب إذا لزم الأمر.
- **بعد الظهر**: التحقق من الطلبات المنتهية期限 (طلبات → الحالة → منتهية). إرسال إيميلات الإلغاء واستعادة المخزون.
- **نهاية اليوم**: التأكد من أن النسخ الاحتياطية نجحت (لوحة التحكم → النسخ الاحتياطية). التأكد من عدم وجود تنبيهات pending في Sentry.

---

## 2. Adding a Product (إضافة منتج)

### English
1. Navigate to **Products → Add Product**.
2. Fill in the **English name**, **Arabic name**, **SKU**, **price (in piasters)**.
3. Assign a **Category** and **Brand** from the dropdowns.
4. Add **images** (upload up to 8 photos; the first becomes the primary).
5. Set **stock quantity**, **low‑stock threshold**, **isActive**.
6. Optionally mark as **featured**, **on sale**, or a **bundle**.
7. Click **Save**.

### العربية
1. انتقل إلى **منتجات → إضافة منتج**.
2. أدخل الاسم الإنجليزي والاسم العربي، والـ SKU، والسعر (بالبياسترات).
3. اختر فئة (Category) وعلامة تجارية (Brand) من القوائم المنسدلة.
4. أضف صوراً (حتى 8 صور؛ تصبح الصورة الأولى الرئيسية).
5. حدد كمية المخزون، حد المخزون المنخفض، وحالة النشاط (isActive).
6. خيار مميز (featured) أو في عرض (on sale) أو مجمع (bundle).
7. اضغط حفظ.

---

## 3. Handling Orders & Payment Proofs (معالجة الطلبات وإثباتات الدفع)

### English
- **Orders pending payment**: Orders stay `PENDING_PAYMENT` until the payment deadline (`paymentDeadlineAt`). 
  - If the customer uploads a proof, the proof enters the **review queue**.
  - **Approve** → order status changes to `CONFIRMED`, customer gets email + WhatsApp notice.
  - **Reject** → order stays `PENDING_PAYMENT`, customer gets email to re‑submit.
- **Payment proof submission**: Customer uploads a screenshot/transfer slip via the order page. 
  - Admin reviews in **Orders → Payment Proof Review Queue**.
  - Each proof is logged; admin can add a note and change status.
- **Expired orders**: If `paymentDeadlineAt` passes without proof, the order auto‑changes to `EXPIRED`, stock is restored, and the customer gets a cancellation email.

### العربية
- **طلبات الانتظار للدفع**: تبقى الطلبات状态为 `PENDING_PAYMENT` حتى انتهاء مهلة الدفع (`paymentDeadlineAt`). 
  - إذا قام العميل برفع إثبات، يدخل الإثبات قائمة الانتظار للمراجعة.
  - **Approve** → يتم تغيير حالة الطلب إلى `CONFIRMED`، ويرسل للعملاء إيميل + إشعار واتساب.
  - **Reject** → تظل الحالة `PENDING_PAYMENT`، ويرسل للعملاء إيميل لإعادة الرفع.
- **رفع إثبات الدفع**: يرفع العميل صورة/slip تحويل عبر صفحة الطلب. 
  - admin يرى في **طلبات → قائمة انتظار إثباتات الدفع**.
  - يمكن للإدministrator إضافة ملاحظة وتغيير الحالة.
- **طلبات منتهية期限**: إذا انتهت مهلة الدفع دون رفع إثبات، يتحول الطلب تلقائياً إلى `EXPIRED`، يستعاد المخزون، ويرسل للعميل إيميل إلغاء.

---

## 4. Coupons & Discounts (الكوبونات والخصومات)

### English
1. Go to **Coupons → Add Coupon**.
2. Set **code**, **discount type** (percentage or fixed amount), **value**, **usage limit per user**, **total usage limit**, **valid from / until**.
3. Optionally restrict to specific **categories** or **products**.
4. Click **Save**. The coupon can be applied at checkout.

### العربية
1. اذهب إلى **الكوبونات → إضافة كوبون**.
2. أكد الكود، نوع الخصم (نسبة مئوية أو مبلغ ثابت)، القيمة، الحد الأقصى للاستخدام لكل مستخدم، الحد الإجمالي للاستخدام.
3. خيار تقييد إلى فئات أو منتجات محددة.
4. اضغط حفظ. يمكن تطبيق الكود عند الدفع.

---

## 5. Banners & Static Pages (البنرات والصفحات الثابتة)

### English
- **Banners**: **Banners → Add Banner** → upload image, set link URL, enable/disable, set display order.
- **Static Pages**: **Content → Pages** → add/ edit **About**, **Returns**, **Privacy**, **Terms**. Use the WYSIWYG editor; content is multilingual (Arabic/English tabs).

### العربية
- **البنرات**: **البنرات → إضافة بانر** → ارفع صورة، أضف رابطًا، فعّل/ألغِ التنشيط، حدد order الترتيبي.
- **الصفحات الثابتة**: **المحتوى → صفحات** → أضف/ عدل **من نحن، إرجاع، خصوصية، شروط**. محرر WYSIWYG؛ المحتوى متعدد اللغات (تبويبات عربية وإنجليزية).

---

## 6. Settings (الإعدادات)

### English
- **Store name & address**: English + Arabic versions.
- **Shipping fees**: Per‑governorate table (add/ edit rates).
- **Return window**: Days (e.g., 30 days).
- **Payment expiry**: Default deadline in hours (usually 24–48).
- **Email settings**: `STORE_EMAIL`, SMTP config (if switching from MailHog).
- **WhatsApp**: Enable/ disable; paste `WHATSAPP_ACCESS_TOKEN` and `PHONE_NUMBER_ID` if using WhatsApp notifications.
- **Google OAuth**: Toggle `GOOGLE_OAUTH_ENABLED`; configure `GOOGLE_CLIENT_ID/SECRET` for production origins.

### العربية
- **اسم المتجر و العنوان**: باللغة الإنجليزية والعربية.
- **رسوم الشحن**: جدول بالسعر لكل محافظة (إضافة/ تعديل).
- **فترة الإرجاع**: عدد الأيام (مثال: 30 يوماً).
- **مدة انتهاء الدفع**: المدة الافتراضية بالساعات (عادة 24–48).
- **إعدادات الإيميل**: `STORE_EMAIL`, إعدادات SMTP (إذا كنت تنتقل من MailHog).
- **واتساب**: تفعيل/إلغاء التفعيل؛ لصق `WHATSAPP_ACCESS_TOKEN` و `PHONE_NUMBER_ID` إذا كنت تستخدم إشعارات واتساب.
- **تسجيل الدخول بواسطة Google**: تفعيل `GOOGLE_OAUTH_ENABLED`;配置 `GOOGLE_CLIENT_ID/SECRET` للمنشآت الإنتاجية.

---

## 7. Quick Daily Checklist (فحص سريع يومي)

### English
- [ ] Payment proofs reviewed & approved/rejected.
- [ ] Low‑stock products inspected; reorder if needed.
- [ ] Expired orders checked; stock restored if needed.
- [ ] Sentry alerts checked (no new errors).
- [ ] Backup status confirmed (success).
- [ ] WhatsApp/Email notifications test‑sent (if configured).

### العربية
- [ ] تم مراجعة وإثباتات الدفع والإقرار/الرفض.
- [ ]Products with low stockChecked; reorder if needed.
- [ ]Expired ordersChecked; stock restored if needed.
- [ ]Notifications SentryChecked (لا توجد أخطاء جديدة).
- [ ]Backup status confirmed (success).
- [ ]Notifications WhatsApp/Email test‑sent (إذا تمت التكوين).

---

## 8. Need Help?

- **Technical issues**: Open a ticket in the internal issue tracker or contact the developer.
- **Feature requests**: Use the product roadmap board; priority is given to Arabic‑language enhancements and payment‑method integrations.
- **Urgent outage**: Check Sentry for error spikes; restart the API container (`docker restart engineering-lab-api-prod`) if health checks fail.

---

*Guide version: v1.0.0 – updated for Phase 8 deployment.*