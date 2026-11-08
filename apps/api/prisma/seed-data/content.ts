export interface SeedFaq {
  questionAr: string;
  questionEn: string;
  answerAr: string;
  answerEn: string;
  category: string;
  sortOrder: number;
}

export interface SeedPage {
  slug: string;
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
}

export interface SeedSetting {
  key: string;
  value: unknown;
}

export const seedFaqs: SeedFaq[] = [
  {
    category: 'ORDERS',
    sortOrder: 1,
    questionAr: 'كيف أتابع حالة طلبي؟',
    questionEn: 'How can I track my order?',
    answerAr:
      'بعد تأكيد الطلب يصلك بريد إلكتروني برقم الطلب. يمكنك أيضًا التواصل مع الدعم مع ذكر رقم الطلب وسنوافيك بحالة الشحن فور تحديثها.',
    answerEn:
      'After your order is confirmed you receive an email with the order number. You can also contact support with that number and we will share the shipping status as soon as it updates.',
  },
  {
    category: 'ORDERS',
    sortOrder: 2,
    questionAr: 'هل يمكنني تعديل أو إلغاء طلبي؟',
    questionEn: 'Can I edit or cancel my order?',
    answerAr:
      'يمكن تعديل أو إلغاء الطلب قبل تجهيزه للشحن. تواصل معنا سريعًا عبر صفحة الدعم أو واتساب مع رقم الطلب.',
    answerEn:
      'You can edit or cancel an order before it is packed for shipping. Contact us quickly through the support page or WhatsApp with your order number.',
  },
  {
    category: 'SHIPPING',
    sortOrder: 1,
    questionAr: 'ما هي مدة الشحن داخل مصر؟',
    questionEn: 'How long does delivery take inside Egypt?',
    answerAr:
      'القاهرة والجيزة: من 1 إلى 2 يوم عمل. باقي المحافظات: من 2 إلى 4 أيام عمل. يتم الشحن في نفس اليوم للطلبات المؤكدة قبل الساعة 2 ظهرًا.',
    answerEn:
      'Cairo and Giza: 1–2 business days. Other governorates: 2–4 business days. Orders confirmed before 2 PM are dispatched the same day.',
  },
  {
    category: 'SHIPPING',
    sortOrder: 2,
    questionAr: 'هل يوجد شحن مجاني؟',
    questionEn: 'Is shipping free?',
    answerAr:
      'نعم، الشحن مجاني للطلبات التي تتجاوز قيمتها 2000 جنيه مصري بعد الخصومات. تظهر تكلفة الشحن النهائية في صفحة إتمام الطلب.',
    answerEn:
      'Yes, shipping is free for orders above 2,000 EGP after discounts. The final shipping cost is shown at checkout.',
  },
  {
    category: 'PAYMENTS',
    sortOrder: 1,
    questionAr: 'ما طرق الدفع المتاحة؟',
    questionEn: 'Which payment methods do you accept?',
    answerAr:
      'نقبل الدفع عند الاستلام، فودافون كاش، وإنستاباي. يتم تأكيد تحويل المحفظة يدويًا من فريقنا بعد إرسال صورة الإيصال.',
    answerEn:
      'We accept cash on delivery, Vodafone Cash and InstaPay. Wallet transfers are manually verified by our team after you submit the receipt.',
  },
  {
    category: 'PAYMENTS',
    sortOrder: 2,
    questionAr: 'هل الدفع عند الاستلام متاح لكل المحافظات؟',
    questionEn: 'Is cash on delivery available everywhere?',
    answerAr:
      'الدفع عند الاستلام متاح لمعظم المحافظات. قد يُطلب تأكيد هاتفي للطلبات ذات القيمة المرتفعة قبل الشحن.',
    answerEn:
      'Cash on delivery is available in most governorates. High-value orders may require a phone confirmation before dispatch.',
  },
  {
    category: 'RETURNS',
    sortOrder: 1,
    questionAr: 'ما سياسة الاستبدال والاسترجاع؟',
    questionEn: 'What is your return policy?',
    answerAr:
      'يمكنك طلب الاستبدال أو الاسترجاع خلال 14 يومًا من الاستلام بشرط أن يكون المنتج بحالته الأصلية وغير مستخدم. المنتجات الإلكترونية المخصصة غير قابلة للاسترجاع إلا إذا كانت معيبة.',
    answerEn:
      'You can request an exchange or return within 14 days of delivery provided the product is unused and in its original condition. Custom electronic items are non-returnable unless defective.',
  },
  {
    category: 'RETURNS',
    sortOrder: 2,
    questionAr: 'ماذا أفعل إذا وصل المنتج معيبًا؟',
    questionEn: 'What if the product arrives defective?',
    answerAr:
      'أرسل لنا صورة أو فيديو يوضح المشكلة خلال 48 ساعة من الاستلام عبر صفحة الدعم، وسنرتب استبدالًا فوريًا أو استردادًا كاملًا.',
    answerEn:
      'Send us a photo or video showing the issue within 48 hours of delivery through the support page and we will arrange an immediate replacement or full refund.',
  },
  {
    category: 'PRODUCTS',
    sortOrder: 1,
    questionAr: 'هل المنتجات أصلية؟',
    questionEn: 'Are your products genuine?',
    answerAr:
      'نختبر كل شحنة قبل عرضها. بعض القطع تُستورد كنسخ متوافقة عالية الجودة ونذكر ذلك بوضوح في وصف المنتج.',
    answerEn:
      'Every batch is tested before listing. Some parts are imported as high-quality compatible clones and this is clearly stated in the product description.',
  },
  {
    category: 'PRODUCTS',
    sortOrder: 2,
    questionAr: 'هل تقدمون دعمًا فنيًا بعد الشراء؟',
    questionEn: 'Do you offer technical support after purchase?',
    answerAr:
      'نعم. يمكنك فتح تذكرة دعم أو التواصل عبر واتساب وسيساعدك فريقنا في التوصيل والتشغيل وأساسيات البرمجة.',
    answerEn:
      'Yes. Open a support ticket or contact us on WhatsApp and our team will help with wiring, setup and programming basics.',
  },
  {
    category: 'GENERAL',
    sortOrder: 1,
    questionAr: 'هل توفرون فواتير ضريبية؟',
    questionEn: 'Do you provide tax invoices?',
    answerAr:
      'نعم، اطلب الفاتورة الضريبية عند إنشاء الطلب أو خلال 24 ساعة عبر الدعم مع ذكر بيانات الشركة.',
    answerEn:
      'Yes. Request a tax invoice during checkout or within 24 hours through support with your company details.',
  },
  {
    category: 'GENERAL',
    sortOrder: 2,
    questionAr: 'هل لديكم فرع لزيارته؟',
    questionEn: 'Do you have a physical store?',
    answerAr:
      'البيع حاليًا عبر المتجر الإلكتروني مع إمكانية الاستلام من القاهرة بعد التنسيق عبر الدعم. نخطط لافتتاح معرض قريبًا.',
    answerEn:
      'We currently sell online with Cairo pickup available after arranging it through support. A showroom is planned soon.',
  },
];

const commonFooter =
  '<p>لأي استفسار إضافي تواصل معنا عبر <a href="/ar/contact">صفحة اتصل بنا</a> أو عبر واتساب.</p>';

export const seedPages: SeedPage[] = [
  {
    slug: 'about',
    titleAr: 'من نحن',
    titleEn: 'About Us',
    contentAr: `
      <h2>Engineering Lab — نبني، نبتكر، نصنع</h2>
      <p>بدأت Engineering Lab من شغف بسيط: أن يجد كل طالب ومهندس ومبتكر في مصر قطعًا إلكترونية أصلية بأسعار عادلة ودعم فني حقيقي. اليوم نوفر أكثر من 47 منتجًا من لوحات التطوير والمستشعرات والمكونات السلبية وأطقم المشاريع.</p>
      <p>كل منتج نختبره قبل الشحن، وكل طلب تحصل عليه مع ضمان استبدال 14 يومًا ودعم فني يساعدك حتى ترى مشروعك يعمل.</p>
      <h3>لماذا نحن؟</h3>
      <ul>
        <li>قطع مختبرة ومتوافقة مع المناهج الجامعية والمشاريع العملية.</li>
        <li>شحن سريع لكل محافظات مصر مع إمكانية الدفع عند الاستلام.</li>
        <li>فريق دعم يفهم Arduino وESP32 وRaspberry Pi وليس مجرد فريق مبيعات.</li>
      </ul>
      ${commonFooter}
    `,
    contentEn: `
      <h2>Engineering Lab — Build, Innovate, Create</h2>
      <p>Engineering Lab started from a simple idea: every student, engineer and maker in Egypt should find genuine electronic parts at fair prices with real technical support. Today we offer more than 47 products across development boards, sensors, passive components and project kits.</p>
      <p>We test every product before dispatch. Every order includes a 14-day replacement guarantee and technical support until your project works.</p>
      <h3>Why us?</h3>
      <ul>
        <li>Tested parts aligned with university curricula and practical projects.</li>
        <li>Fast delivery across Egypt with cash on delivery available.</li>
        <li>A support team that understands Arduino, ESP32 and Raspberry Pi — not just sales.</li>
      </ul>
      ${commonFooter.replace('/ar/contact', '/en/contact')}
    `,
  },
  {
    slug: 'returns',
    titleAr: 'سياسة الاسترجاع',
    titleEn: 'Return Policy',
    contentAr: `
      <h2>سياسة الاستبدال والاسترجاع</h2>
      <p>نريد أن تصل إليك القطعة المناسبة. يمكنك طلب الاستبدال أو الاسترجاع خلال <strong>14 يومًا</strong> من استلام الطلب.</p>
      <h3>الشروط</h3>
      <ul>
        <li>أن يكون المنتج غير مستخدم وبحالته الأصلية مع التغليف والملحقات.</li>
        <li>إرفاق رقم الطلب وصورة للمنتج عند التواصل.</li>
        <li>المنتجات المخصصة أو المبرمجة بناءً على طلب العميل غير قابلة للاسترجاع إلا إذا كانت معيبة.</li>
      </ul>
      <h3>المنتجات المعيبة</h3>
      <p>إذا وصل المنتج معيبًا، أرسل صورة أو فيديو خلال 48 ساعة من الاستلام وسنرتب استبدالًا أو استردادًا كاملًا بما في ذلك مصاريف الشحن.</p>
      <h3>الاسترداد</h3>
      <p>يتم الاسترداد بنفس وسيلة الدفع خلال 5–10 أيام عمل بعد استلام المنتج وفحصه.</p>
      ${commonFooter}
    `,
    contentEn: `
      <h2>Replacement and Return Policy</h2>
      <p>We want you to receive the right part. You can request an exchange or return within <strong>14 days</strong> of delivery.</p>
      <h3>Conditions</h3>
      <ul>
        <li>The product must be unused, in its original condition with packaging and accessories.</li>
        <li>Include your order number and a photo of the product when contacting us.</li>
        <li>Customized or customer-programmed items are non-returnable unless defective.</li>
      </ul>
      <h3>Defective items</h3>
      <p>If a product arrives defective, send a photo or video within 48 hours of delivery and we will arrange a replacement or full refund including shipping.</p>
      <h3>Refunds</h3>
      <p>Refunds are issued to the original payment method within 5–10 business days after we receive and inspect the item.</p>
      ${commonFooter.replace('/ar/contact', '/en/contact')}
    `,
  },
  {
    slug: 'privacy',
    titleAr: 'سياسة الخصوصية',
    titleEn: 'Privacy Policy',
    contentAr: `
      <h2>سياسة الخصوصية</h2>
      <p>نحترم خصوصيتك ونجمع فقط البيانات اللازمة لتنفيذ طلباتك وتحسين تجربتك.</p>
      <h3>البيانات التي نجمعها</h3>
      <ul>
        <li>بيانات الحساب: الاسم والبريد الإلكتروني ورقم الهاتف.</li>
        <li>بيانات الشحن: العنوان والمحافظة وملاحظات التوصيل.</li>
        <li>بيانات الاستخدام: الصفحات التي تزورها والمنتجات التي تشاهدها لتحسين التوصيات.</li>
      </ul>
      <h3>كيف نستخدم البيانات؟</h3>
      <p>لتجهيز الطلبات، إرسال تحديثات الشحن، الرد على تذاكر الدعم، وإرسال عروض فقط إذا وافقت على ذلك.</p>
      <h3>حقوقك</h3>
      <p>يمكنك طلب تعديل أو حذف بياناتك عبر صفحة الدعم. لا نبيع بياناتك لأي طرف ثالث.</p>
      ${commonFooter}
    `,
    contentEn: `
      <h2>Privacy Policy</h2>
      <p>We respect your privacy and only collect the data needed to fulfill orders and improve your experience.</p>
      <h3>Data we collect</h3>
      <ul>
        <li>Account data: name, email address and phone number.</li>
        <li>Shipping data: address, governorate and delivery notes.</li>
        <li>Usage data: pages you visit and products you view to improve recommendations.</li>
      </ul>
      <h3>How we use data</h3>
      <p>To process orders, send shipping updates, answer support tickets and send offers only when you opt in.</p>
      <h3>Your rights</h3>
      <p>You can request correction or deletion of your data through the support page. We never sell your data to third parties.</p>
      ${commonFooter.replace('/ar/contact', '/en/contact')}
    `,
  },
  {
    slug: 'terms',
    titleAr: 'الشروط والأحكام',
    titleEn: 'Terms & Conditions',
    contentAr: `
      <h2>الشروط والأحكام</h2>
      <p>باستخدامك متجر Engineering Lab فإنك توافق على الشروط التالية.</p>
      <h3>الطلبات والأسعار</h3>
      <ul>
        <li>كل الأسعار بالجنيه المصري وتشمل ضريبة القيمة المضافة حيث تنطبق.</li>
        <li>نحتفظ بحق إلغاء أي طلب إذا تبين وجود خطأ واضح في السعر أو نفاد المخزون.</li>
        <li>تأكيد الطلب يتم بعد التحقق من الدفع أو تأكيد الدفع عند الاستلام.</li>
      </ul>
      <h3>الملكية الفكرية</h3>
      <p>جميع الصور والنصوص والشعارات مملوكة لـ Engineering Lab ولا يجوز إعادة استخدامها دون إذن.</p>
      <h3>المسؤولية</h3>
      <p>المكونات الإلكترونية تُستخدم وفق خبرة العميل. نحن مسؤولون عن سلامة المنتج عند الاستلام، ولسنا مسؤولين عن التلف الناتج عن التوصيل الخاطئ أو الجهد الزائد.</p>
      ${commonFooter}
    `,
    contentEn: `
      <h2>Terms & Conditions</h2>
      <p>By using the Engineering Lab store you agree to the following terms.</p>
      <h3>Orders and pricing</h3>
      <ul>
        <li>All prices are in Egyptian pounds and include VAT where applicable.</li>
        <li>We may cancel an order if there is a clear pricing error or the item is out of stock.</li>
        <li>Orders are confirmed after payment verification or cash-on-delivery confirmation.</li>
      </ul>
      <h3>Intellectual property</h3>
      <p>All images, text and logos belong to Engineering Lab and may not be reused without permission.</p>
      <h3>Liability</h3>
      <p>Electronic components are used at the customer's discretion. We are responsible for the product condition on delivery, not for damage caused by incorrect wiring or overvoltage.</p>
      ${commonFooter.replace('/ar/contact', '/en/contact')}
    `,
  },
];

export const seedSettings: SeedSetting[] = [
  { key: 'store.name', value: 'Engineering Lab' },
  { key: 'store.nameAr', value: 'Engineering Lab' },
  { key: 'contact.phone', value: '+20 100 000 0000' },
  { key: 'contact.email', value: 'support@engineeringlab.eg' },
  { key: 'contact.whatsapp', value: '+20 100 000 0000' },
  { key: 'contact.addressAr', value: 'القاهرة، مصر' },
  { key: 'contact.addressEn', value: 'Cairo, Egypt' },
  { key: 'contact.hoursAr', value: 'السبت - الخميس، 10 صباحًا - 7 مساءً' },
  { key: 'contact.hoursEn', value: 'Saturday - Thursday, 10 AM - 7 PM' },
  {
    key: 'social.links',
    value: {
      facebook: 'https://facebook.com/engineeringlab',
      instagram: 'https://instagram.com/engineeringlab',
      youtube: 'https://youtube.com/@engineeringlab',
    },
  },
  { key: 'shipping.freeThreshold', value: 200000 },
  {
    key: 'payment.methods',
    value: [
      {
        key: 'vodafone_cash',
        labelAr: 'فودافون كاش',
        labelEn: 'Vodafone Cash',
        valueAr: '01000000000',
        valueEn: '01000000000',
      },
      {
        key: 'instapay',
        labelAr: 'إنستاباي',
        labelEn: 'InstaPay',
        valueAr: 'support@engineeringlab.eg',
        valueEn: 'support@engineeringlab.eg',
      },
      {
        key: 'cash_on_delivery',
        labelAr: 'الدفع عند الاستلام',
        labelEn: 'Cash on Delivery',
        valueAr: 'متاح لمعظم المحافظات',
        valueEn: 'Available in most governorates',
      },
    ],
  },
];
