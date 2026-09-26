-- Grade 11 Tafseer Sharif — official Ministry of Education Dari textbook.
-- Source: user-provided G11-Dr-Tafseer(1).pdf, print year 1398 SH.
-- The source table of contents lists 20 lessons.

INSERT INTO "subjects" (
  "code","name_fa","name_ps","active","sort_order","created_at","updated_at"
)
VALUES (
  'tafseer','تفسیر','تفسیر',true,45,now(),now()
)
ON CONFLICT ("code") DO UPDATE SET
  "name_fa"=EXCLUDED."name_fa",
  "name_ps"=EXCLUDED."name_ps",
  "active"=true,
  "sort_order"=EXCLUDED."sort_order",
  "updated_at"=now();

INSERT INTO "books" (
  "subject_id","grade_id","code","title_fa","title_ps","edition_year",
  "source_metadata","active","sort_order","created_at","updated_at"
)
SELECT
  s."id",
  g."id",
  'tafseer-grade-11-fa-1398',
  'تفسیر شریف صنف یازدهم',
  'تفسیر شریف یوولسم ټولګی',
  1398,
  '{"publisher":"ریاست ارتباط و آگاهی عامه وزارت معارف","curriculumDeveloper":"ریاست عمومی انکشاف نصاب تعلیمی و تألیف کتب درسی","language":"fa","sourceFilename":"G11-Dr-Tafseer(1).pdf","sourceType":"official_textbook","pages":102}'::jsonb,
  true,
  15,
  now(),
  now()
FROM "subjects" s
JOIN "grades" g ON g."number"=11
WHERE s."code"='tafseer'
ON CONFLICT ("code") DO UPDATE SET
  "subject_id"=EXCLUDED."subject_id",
  "grade_id"=EXCLUDED."grade_id",
  "title_fa"=EXCLUDED."title_fa",
  "title_ps"=EXCLUDED."title_ps",
  "edition_year"=EXCLUDED."edition_year",
  "source_metadata"=EXCLUDED."source_metadata",
  "active"=true,
  "sort_order"=EXCLUDED."sort_order",
  "updated_at"=now();

INSERT INTO "chapters" (
  "book_id","number","title_fa","title_ps","active","sort_order","created_at","updated_at"
)
SELECT
  b."id",1,'درس‌های تفسیر شریف صنف یازدهم','د یوولسم ټولګي د تفسیر شریف درسونه',
  true,1,now(),now()
FROM "books" b
WHERE b."code"='tafseer-grade-11-fa-1398'
ON CONFLICT ("book_id","number") DO UPDATE SET
  "title_fa"=EXCLUDED."title_fa",
  "title_ps"=EXCLUDED."title_ps",
  "active"=true,
  "updated_at"=now();

INSERT INTO "topics" (
  "chapter_id","code","title_fa","title_ps","active","sort_order","created_at","updated_at"
)
SELECT c."id",v.code,v.title_fa,NULL,true,v.sort_order,now(),now()
FROM "chapters" c
JOIN "books" b ON b."id"=c."book_id"
JOIN (VALUES
  ('tafseer-g11-l01','درس اول: دلایل وجود و وحدانیت خداوند در کاینات (۱)',1),
  ('tafseer-g11-l02','درس دوم: دلایل وجود و وحدانیت خداوند در کاینات (۲)',2),
  ('tafseer-g11-l03','درس سوم: مراحل خلقت انسان در پرتو قرآن کریم',3),
  ('tafseer-g11-l04','درس چهارم: ارزش و جایگاه انسان در کاینات',4),
  ('tafseer-g11-l05','درس پنجم: مقام و منزلت آیت‌الکرسی',5),
  ('tafseer-g11-l06','درس ششم: زمین برای منفعت انسان',6),
  ('tafseer-g11-l07','درس هفتم: محبت خداوند در پیروی پیامبر است',7),
  ('tafseer-g11-l08','درس هشتم: اسلام دین کامل و همه‌جانبه است',8),
  ('tafseer-g11-l09','درس نهم: نماز فریضهٔ همیشگی و انقطاع‌ناپذیر',9),
  ('tafseer-g11-l10','درس دهم: جهاد، رمز پیروزی و اصلاح جامعه',10),
  ('tafseer-g11-l11','درس یازدهم: روزه و فواید آن',11),
  ('tafseer-g11-l12','درس دوازدهم: حیات جهانى مؤمنان',12),
  ('tafseer-g11-l13','درس سیزدهم: نیکی و احسان به دیگران',13),
  ('tafseer-g11-l14','درس چهاردهم: استفاده از رزق حلال و اجتناب از حرام',14),
  ('tafseer-g11-l15','درس پانزدهم: پاداش انفاق در راه خدا',15),
  ('tafseer-g11-l16','درس شانزدهم: مساوات انسانی در قرآن کریم',16),
  ('tafseer-g11-l17','درس هفدهم: صفات بندگان خاص خداوند',17),
  ('tafseer-g11-l18','درس هژدهم: نقش مؤمنان در تهذیب جامعه',18),
  ('tafseer-g11-l19','درس نزدهم: منزلت مؤمنان محبوب و فقیر در اسلام',19),
  ('tafseer-g11-l20','درس بیستم: وحدت و همبستگی مؤمنان',20)
) AS v(code,title_fa,sort_order) ON true
WHERE b."code"='tafseer-grade-11-fa-1398' AND c."number"=1
AND NOT EXISTS (
  SELECT 1 FROM "topics" t WHERE t."chapter_id"=c."id" AND t."code"=v.code
);
