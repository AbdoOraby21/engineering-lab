-- Phase 6: Content, SEO & Growth
-- Blog, newsletter, slug redirects

-- Enums
CREATE TYPE "BlogPostStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SCHEDULED');
CREATE TYPE "SubscriberStatus" AS ENUM ('PENDING', 'ACTIVE', 'UNSUBSCRIBED');

-- BlogCategory
CREATE TABLE "BlogCategory" (
  "id" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "descriptionAr" TEXT,
  "descriptionEn" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BlogCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BlogCategory_slug_key" ON "BlogCategory"("slug");
CREATE INDEX "BlogCategory_isActive_sortOrder_idx" ON "BlogCategory"("isActive", "sortOrder");

-- BlogPost
CREATE TABLE "BlogPost" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "titleAr" TEXT NOT NULL,
  "titleEn" TEXT NOT NULL,
  "excerptAr" TEXT,
  "excerptEn" TEXT,
  "contentAr" TEXT NOT NULL,
  "contentEn" TEXT NOT NULL,
  "coverImageUrl" TEXT,
  "coverAltAr" TEXT,
  "coverAltEn" TEXT,
  "categoryId" TEXT,
  "tags" TEXT[] NOT NULL DEFAULT '{}',
  "status" "BlogPostStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3),
  "readingTimeMinutes" INTEGER NOT NULL DEFAULT 0,
  "authorId" TEXT,
  "seoTitleAr" TEXT,
  "seoTitleEn" TEXT,
  "seoDescriptionAr" TEXT,
  "seoDescriptionEn" TEXT,
  "viewCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");
CREATE INDEX "BlogPost_status_createdAt_idx" ON "BlogPost"("status", "createdAt");
CREATE INDEX "BlogPost_categoryId_idx" ON "BlogPost"("categoryId");

ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BlogCategory"("id") ON DELETE SET NULL;
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL;

-- BlogPostProduct
CREATE TABLE "BlogPostProduct" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "BlogPostProduct_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BlogPostProduct_postId_productId_key" ON "BlogPostProduct"("postId", "productId");

ALTER TABLE "BlogPostProduct" ADD CONSTRAINT "BlogPostProduct_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE;
ALTER TABLE "BlogPostProduct" ADD CONSTRAINT "BlogPostProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE;

-- Subscriber
CREATE TABLE "Subscriber" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "locale" TEXT NOT NULL DEFAULT 'ar',
  "status" "SubscriberStatus" NOT NULL DEFAULT 'PENDING',
  "source" TEXT,
  "token" TEXT NOT NULL,
  "confirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscriber_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Subscriber_email_key" ON "Subscriber"("email");
CREATE UNIQUE INDEX "Subscriber_token_key" ON "Subscriber"("token");
CREATE INDEX "Subscriber_status_createdAt_idx" ON "Subscriber"("status", "createdAt");

-- SlugRedirect
CREATE TABLE "SlugRedirect" (
  "id" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "target" TEXT NOT NULL,
  "isPermanent" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SlugRedirect_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SlugRedirect_source_key" ON "SlugRedirect"("source");

-- Add blogPosts relation to User (no column needed, handled by BlogPost.authorId)

-- Seed BlogCategories
INSERT INTO "BlogCategory" ("id", "nameAr", "nameEn", "slug", "descriptionAr", "descriptionEn", "sortOrder", "isActive", "createdAt", "updatedAt") VALUES
  ('bc-arduino', 'أردوينو', 'Arduino', 'arduino', 'دروس ومشاريع باستخدام لوحة أردوينو', 'Tutorials and projects using Arduino boards', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('bc-esp32', 'ESP32', 'ESP32', 'esp32', 'مشاريع إنترنت الأشياء باستخدام ESP32', 'IoT projects using ESP32', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('bc-sensors', 'حساسات', 'Sensors', 'sensors', 'كيفية استخدام الحساسات المختلفة', 'How to use various sensors', 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('bc-electronics', 'الإلكترونيات', 'Electronics', 'electronics', 'أساسيات الإلكترونيات والمكونات', 'Electronics basics and components', 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Seed 5 BlogPosts (5 starter tutorials in both languages)
INSERT INTO "BlogPost" (
  "id", "slug", "titleAr", "titleEn", "excerptAr", "excerptEn", "contentAr", "contentEn",
  "coverAltAr", "coverAltEn", "categoryId", "tags", "status", "publishedAt",
  "readingTimeMinutes", "authorId", "seoTitleAr", "seoTitleEn", "seoDescriptionAr", "seoDescriptionEn",
  "viewCount", "createdAt", "updatedAt"
) VALUES
  ('bp-hcsr04', 'hc-sr04-arduino-distance-sensor', 'مستشعر المسافة HC-SR04 مع أردوينو', 'HC-SR04 Distance Sensor with Arduino',
   'تعلّم如何 استخدام مستشعر الأمواج فوق الصوتية HC-SR04 لقياس المسافة مع أردوينو.', 'Learn how to use the HC-SR04 ultrasonic sensor to measure distance with Arduino.',
   '## HC-SR04 مع أردوينو\n\nاستخدام مستشعر الأمواج فوق الصوتية لقياس المسافة وعرضها على شاشة مراقبة المنفذ.\n\n### المكونات\n- لوحة أردوينو أونو\n- مستشعر HC-SR04\n- أسلاك توصيل\n\n### الكود\n```cpp\n#include <NewPing.h>\n```',
   '## HC-SR04 Distance Sensor with Arduino\n\nLearn to use the ultrasonic sensor to measure distance and display it on the serial monitor.\n\n### Components\n- Arduino Uno\n- HC-SR04 sensor\n- Jumper wires\n\n### Code\n```cpp\n#include <NewPing.h>\n```',
   'مستشعر HC-SR04', 'HC-SR04 sensor', 'bc-arduino',
   '{"HC-SR04","أردوينو","مسافة","أندرويد"}', 'PUBLISHED', CURRENT_TIMESTAMP, 5, NULL,
   'مستشعر المسافة HC-SR04 مع أردوينو - دليل كامل', 'HC-SR04 Distance Sensor with Arduino - Complete Guide',
   'دليل تفاعلي لقياس المسافة باستخدام مستشعر HC-SR04 ولوحة أردوينو.', 'Interactive guide to measuring distance using HC-SR04 sensor and Arduino board.', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('bp-dht11', 'dht11-temperature-humidity-arduino', 'مستشعر DHT11 لدرجة الحرارة والرطوبة', 'DHT11 Temperature and Humidity Sensor with Arduino',
   'مراقبة درجة الحرارة والرطوبة باستخدام مستشعر DHT11 ولوحة أردوينو.', 'Monitor temperature and humidity using the DHT11 sensor with Arduino.',
   '## مستشعر DHT11\n\nقراءة قيم درجة الحرارة والرطوبة من مستشعر DHT11 وإرسالها عبر منفذ السلسلة.\n\n### المكونات\n- أردوينو\n- مستشعر DHT11\n- مقاومة 10K أوم\n\n### الكود\n```cpp\n#include <DHT.h>\n```',
   '## DHT11 Temperature and Humidity Sensor\n\nRead temperature and humidity values from the DHT11 sensor and send them over the serial port.\n\n### Components\n- Arduino\n- DHT11 sensor\n- 10K Ohm resistor\n\n### Code\n```cpp\n#include <DHT.h>\n```',
   'مستشعر DHT11', 'DHT11 sensor', 'bc-sensors',
   '{"DHT11","حرارة","رطوبة","أردوينو"}', 'PUBLISHED', CURRENT_TIMESTAMP, 4, NULL,
   'مستشعر DHT11 لدرجة الحرارة والرطوبة مع أردوينو', 'DHT11 Temperature Humidity Sensor with Arduino',
   'مراقبة درجة الحرارة والرطوبة باستخدام مستشعر DHT11 ولوحة أردوينو.', 'Monitor temperature and humidity using the DHT11 sensor with Arduino.', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('bp-sg90', 'sg90-servo-motor-arduino-control', 'التحكم بمحرك سيرفو SG90 مع أردوينو', 'SG90 Servo Motor Control with Arduino',
   'كيفية التحكم بمحرك سيرفو SG90 وتحديد زاويته باستخدام أردوينو.', 'How to control the SG90 servo motor and set its angle using Arduino.',
   '## محرك سيرفو SG90\n\nالتحكم في زاوية محرك السيرفو SG90 باستخدام مكتبة Servo المدمجة.\n\n### المكونات\n- أردوينو\n- محرك سيرفو SG90\n- مصدر طاقة خارجي (اختياري)\n\n### الكود\n```cpp\n#include <Servo.h>\n```',
   '## SG90 Servo Motor Control\n\nControl the SG90 servo motor angle using the built-in Servo library.\n\n### Components\n- Arduino\n- SG90 servo motor\n- External power supply (optional)\n\n### Code\n```cpp\n#include <Servo.h>\n```',
   'محرك سيرفو SG90', 'SG90 servo motor', 'bc-arduino',
   '{"SG90","سيرفو","محرك","أردوينو"}', 'PUBLISHED', CURRENT_TIMESTAMP, 4, NULL,
   'التحكم بمحرك سيرفو SG90 مع أردوينو - دليل كامل', 'SG90 Servo Motor Control with Arduino - Complete Guide',
   'كيفية التحكم بمحرك سيرفو SG90 وتحديد زاويته باستخدام أردوينو.', 'How to control the SG90 servo motor and set its angle using Arduino.', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('bp-esp32', 'getting-started-esp32-iot', 'بدء العمل مع ESP32 وإنترنت الأشياء', 'Getting Started with ESP32 and IoT',
   'مقدمة حول لوحة ESP32 وكيفية 연결ها بشبكة الواي فاي وبناء مشروع إنترنت أشياء أول.', 'Introduction to the ESP32 board, connecting to Wi-Fi, and building your first IoT project.',
   '## لوحة ESP32\n\nبدء استخدام لوحة ESP32 المتقدمة مع دعم الواي فاي والبلوتوث.\n\n### المكونات\n- لوحة ESP32\n- كابل USB\n\n### الكود\n```cpp\n#include <WiFi.h>\n```',
   '## Getting Started with ESP32 and IoT\n\nGet started with the advanced ESP32 board with Wi-Fi and Bluetooth support.\n\n### Components\n- ESP32 board\n- USB cable\n\n### Code\n```cpp\n#include <WiFi.h>\n```',
   'لوحة ESP32', 'ESP32 board', 'bc-esp32',
   '{"ESP32","إنترنت أشياء","واي فاي","لوحة تطوير"}', 'PUBLISHED', CURRENT_TIMESTAMP, 6, NULL,
   'بدء العمل مع ESP32 وإنترنت الأشياء - دليل المبتدئين', 'Getting Started with ESP32 and IoT - Beginner Guide',
   'مقدمة حول لوحة ESP32 وكيفية الاتصال بشبكة الواي فاي وبناء مشروع إنترنت أشياء أول.', 'Introduction to the ESP32 board, connecting to Wi-Fi, and building your first IoT project.', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('bp-led-resistor', 'choosing-led-resistors-electronics-basics', 'اختيار مقاومات الليد الصحيح', 'Choosing LED Resistors - Electronics Basics',
   'كيفية حساب قيمة المقاومة المناسبة للليد حسب جهد المصدر والتيار المطلوب.', 'How to calculate the correct resistor value for an LED based on source voltage and required current.',
   '## مقاومات الليد\n\nحساب قيمة المقاومة باستخدام قانون أوم: R = (Vsource - Vled) / Iled.\n\n### مثال\nليد أحمر بجهد 2 فولت وتيار 20 ملي أمبير مع مصدر 5 فولت.\n```cpp\nint R = (5 - 2) / 0.02; // 150 أوم\n```',
   '## LED Resistors\n\nCalculate resistor value using Ohm''s law: R = (Vsource - Vled) / Iled.\n\n### Example\nRed LED at 2V forward voltage and 20mA current with 5V source.\n```cpp\nint R = (5 - 2) / 0.02; // 150 ohm\n```',
   'مقاومات الليد', 'LED resistors', 'bc-electronics',
   '{"ليد","مقاومة","أوم","إلكترونيات"}', 'PUBLISHED', CURRENT_TIMESTAMP, 3, NULL,
   'اختيار مقاومات الليد الصحيح - أساسيات الإلكترونيات', 'Choosing LED Resistors - Electronics Basics',
   'كيفية حساب قيمة المقاومة المناسبة للليد حسب جهد المصدر والتيار المطلوب.', 'How to calculate the correct resistor value for an LED based on source voltage and required current.', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Seed BlogPostProduct links (use placeholder product slugs resolved by seed.ts; here we insert post-product links after products exist via a data migration in seed.ts)

