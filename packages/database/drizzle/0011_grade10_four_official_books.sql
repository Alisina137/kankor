-- Grade 10 official Dari textbooks: Biology, Chemistry, Dari, Geography.
-- Sources: user-provided Ministry of Education PDFs.
-- Curriculum structure only; no questions are invented by this migration.

-- ---------------------------------------------------------------------------
-- Subjects
-- ---------------------------------------------------------------------------
INSERT INTO "subjects" ("code","name_fa","name_ps","active","sort_order","created_at","updated_at")
VALUES
  ('biology','بیولوژی',NULL,true,70,now(),now()),
  ('chemistry','کیمیا',NULL,true,80,now(),now()),
  ('dari','دری',NULL,true,90,now(),now()),
  ('geography','جغرافیه',NULL,true,100,now(),now())
ON CONFLICT ("code") DO UPDATE SET
  "name_fa"=EXCLUDED."name_fa",
  "active"=true,
  "sort_order"=EXCLUDED."sort_order",
  "updated_at"=now();

-- ---------------------------------------------------------------------------
-- Books
-- ---------------------------------------------------------------------------
INSERT INTO "books" (
  "subject_id","grade_id","code","title_fa","title_ps","edition_year",
  "source_metadata","active","sort_order","created_at","updated_at"
)
SELECT s."id",g."id",v.code,v.title_fa,NULL,v.edition_year,v.source_metadata,true,v.sort_order,now(),now()
FROM "grades" g
JOIN (
  VALUES
    ('biology','biology-grade-10-fa-1398','بیولوژی صنف دهم',1398,
      '{"publisher":"ریاست ارتباط و آگاهی عامه وزارت معارف","curriculumDeveloper":"ریاست عمومی انکشاف نصاب تعلیمی و تألیف کتب درسی","language":"fa","sourceFilename":"G10-Dr-Biology(1).pdf","sourceType":"official_textbook","pages":122}'::jsonb,30),
    ('chemistry','chemistry-grade-10-fa-1398','کیمیا صنف دهم',1398,
      '{"publisher":"ریاست ارتباط و آگاهی عامه وزارت معارف","curriculumDeveloper":"ریاست عمومی انکشاف نصاب تعلیمی و تألیف کتب درسی","language":"fa","sourceFilename":"G10-Dr-Chemistry(1).pdf","sourceType":"official_textbook","pages":262}'::jsonb,40),
    ('dari','dari-grade-10-fa-1399','زبان و ادبیات دری صنف دهم',1399,
      '{"publisher":"ریاست ارتباط و آگاهی عامه وزارت معارف","curriculumDeveloper":"ریاست عمومی انکشاف نصاب تعلیمی و تألیف کتب درسی","language":"fa","sourceFilename":"G10-Dr-Dari(1).pdf","sourceType":"official_textbook","pages":162}'::jsonb,50),
    ('geography','geography-grade-10-fa-1398','جغرافیه صنف دهم',1398,
      '{"publisher":"ریاست ارتباط و آگاهی عامه وزارت معارف","curriculumDeveloper":"ریاست عمومی انکشاف نصاب تعلیمی و تألیف کتب درسی","language":"fa","sourceFilename":"G10-Dr-Geography(1).pdf","sourceType":"official_textbook","pages":238}'::jsonb,60)
) AS v(subject_code,code,title_fa,edition_year,source_metadata,sort_order)
  ON true
JOIN "subjects" s ON s."code"=v.subject_code
WHERE g."number"=10
ON CONFLICT ("code") DO UPDATE SET
  "subject_id"=EXCLUDED."subject_id",
  "grade_id"=EXCLUDED."grade_id",
  "title_fa"=EXCLUDED."title_fa",
  "edition_year"=EXCLUDED."edition_year",
  "source_metadata"=EXCLUDED."source_metadata",
  "active"=true,
  "sort_order"=EXCLUDED."sort_order",
  "updated_at"=now();

-- ---------------------------------------------------------------------------
-- Biology — 9 official chapters
-- ---------------------------------------------------------------------------
INSERT INTO "chapters" ("book_id","number","title_fa","title_ps","active","sort_order","created_at","updated_at")
SELECT b."id",v.number,v.title_fa,NULL,true,v.number,now(),now()
FROM "books" b
CROSS JOIN (VALUES
  (1,'میتودهای علمی'),
  (2,'متابولیزم و مرکبات غیر عضوی'),
  (3,'مرکبات عضوی'),
  (4,'امراض و وقایه'),
  (5,'جنتیک و اهمیت آن'),
  (6,'صفات ارثی'),
  (7,'تطبیق جنتیک'),
  (8,'ایکالوژی و اجزای آن'),
  (9,'حرکت مواد و انرژی در ایکوسیستم')
) AS v(number,title_fa)
WHERE b."code"='biology-grade-10-fa-1398'
ON CONFLICT ("book_id","number") DO UPDATE SET
  "title_fa"=EXCLUDED."title_fa","active"=true,"sort_order"=EXCLUDED."sort_order","updated_at"=now();

-- Biology TOC exposes chapter-level curriculum; use one selectable topic per official chapter.
INSERT INTO "topics" ("chapter_id","code","title_fa","title_ps","active","sort_order","created_at","updated_at")
SELECT c."id",'biology-g10-c'||lpad(c."number"::text,2,'0'),c."title_fa",NULL,true,1,now(),now()
FROM "chapters" c
JOIN "books" b ON b."id"=c."book_id"
WHERE b."code"='biology-grade-10-fa-1398'
  AND NOT EXISTS (
    SELECT 1 FROM "topics" t
    WHERE t."chapter_id"=c."id" AND t."code"='biology-g10-c'||lpad(c."number"::text,2,'0')
  );

-- ---------------------------------------------------------------------------
-- Chemistry — 9 chapters
-- ---------------------------------------------------------------------------
INSERT INTO "chapters" ("book_id","number","title_fa","title_ps","active","sort_order","created_at","updated_at")
SELECT b."id",v.number,v.title_fa,NULL,true,v.number,now(),now()
FROM "books" b
CROSS JOIN (VALUES
  (1,'تیوری انکشاف اتومی'),
  (2,'ترتیب الکترونی و خواص دوره‌یی عناصر'),
  (3,'روابط کیمیاوی'),
  (4,'ساختمان مالیکول‌ها و قطبیت آن‌ها'),
  (5,'قوای بین مالیکولی'),
  (6,'حالات ماده'),
  (7,'تعاملات کیمیاوی'),
  (8,'تعاملات اکسیدیشن - ریدکشن'),
  (9,'قوانین و محاسبات در کیمیا')
) AS v(number,title_fa)
WHERE b."code"='chemistry-grade-10-fa-1398'
ON CONFLICT ("book_id","number") DO UPDATE SET
  "title_fa"=EXCLUDED."title_fa","active"=true,"sort_order"=EXCLUDED."sort_order","updated_at"=now();

INSERT INTO "topics" ("chapter_id","code","title_fa","title_ps","active","sort_order","created_at","updated_at")
SELECT c."id",v.code,v.title_fa,NULL,true,v.sort_order,now(),now()
FROM "chapters" c
JOIN "books" b ON b."id"=c."book_id"
JOIN (VALUES
  (1,'chemistry-g10-01-01','تاریخچهٔ انکشاف تیوری اتومی',1),
  (1,'chemistry-g10-01-02','ساختمان اتوم',2),
  (1,'chemistry-g10-01-03','طیف اتومی',3),
  (1,'chemistry-g10-01-04','تیوری اتومی بور',4),
  (1,'chemistry-g10-01-05','تیوری معاصر اتومی',5),
  (1,'chemistry-g10-01-06','ساختمان الکترونی اتوم‌های چندین الکترونی',6),

  (2,'chemistry-g10-02-01','تاریخچهٔ ساختمان سیستم پریودیک',1),
  (2,'chemistry-g10-02-02','ساختمان الکترونی عناصر',2),
  (2,'chemistry-g10-02-03','خواص عناصر و تغییر متناوب آن در جدول دوره‌یی عناصر',3),
  (2,'chemistry-g10-02-04','خواص عناصر انتقالی',4),

  (3,'chemistry-g10-03-01','مشخصات روابط کیمیاوی و سمبول‌های لیویس',1),
  (3,'chemistry-g10-03-02','قانون اوکتیت و ساختمان لیویس',2),
  (3,'chemistry-g10-03-03','انواع روابط کیمیاوی',3),
  (3,'chemistry-g10-03-04','رابطهٔ آیونی',4),
  (3,'chemistry-g10-03-05','رابطهٔ اشتراکی',5),

  (4,'chemistry-g10-04-01','قشر والنسی اتوم مرکزی مالیکول‌ها',1),
  (4,'chemistry-g10-04-02','مالیکول‌های خطی',2),
  (4,'chemistry-g10-04-03','مالیکول‌های مسطح',3),
  (4,'chemistry-g10-04-04','مالیکول‌های چهار سطحی',4),
  (4,'chemistry-g10-04-05','ساختمان مالیکول آب',5),
  (4,'chemistry-g10-04-06','ساختمان مالیکول امونیا',6),
  (4,'chemistry-g10-04-07','انواع مالیکول‌ها: قطبی، غیر قطبی و آیونی',7),

  (5,'chemistry-g10-05-01','تفاوت روابط کیمیاوی و قوای بین مالیکولی',1),
  (5,'chemistry-g10-05-02','انواع قوای جذب بین مالیکولی',2),
  (5,'chemistry-g10-05-03','تأثیر قوه‌ها بر خواص فزیکی مواد',3),

  (6,'chemistry-g10-06-01','جامدات، مایعات و گازات',1),
  (6,'chemistry-g10-06-02','مشاهدات اولیهٔ جامدات',2),
  (6,'chemistry-g10-06-03','بلورها',3),
  (6,'chemistry-g10-06-04','انواع جامدات',4),
  (6,'chemistry-g10-06-05','خواص جامدات',5),
  (6,'chemistry-g10-06-06','مایعات',6),
  (6,'chemistry-g10-06-07','خواص عمومی مایعات',7),
  (6,'chemistry-g10-06-08','مقایسه انتشار مایعات با گازات',8),
  (6,'chemistry-g10-06-09','تبخیر و فشار بخار مایعات',9),
  (6,'chemistry-g10-06-10','درجه غلیان مایعات',10),
  (6,'chemistry-g10-06-11','حرارت و تغییرات ماده',11),
  (6,'chemistry-g10-06-12','انجماد مایعات',12),
  (6,'chemistry-g10-06-13','گازات',13),
  (6,'chemistry-g10-06-14','صفات گازات',14),
  (6,'chemistry-g10-06-15','قانون بایل',15),
  (6,'chemistry-g10-06-16','قانون چارلس',16),
  (6,'chemistry-g10-06-17','اصل اوگدرو',17),
  (6,'chemistry-g10-06-18','قوانین گازات ایدیال',18),
  (6,'chemistry-g10-06-19','محاسبه حجم مولی گاز ایدیال در شرایط STP',19),

  (7,'chemistry-g10-07-01','مفهوم معادلهٔ کیمیاوی',1),
  (7,'chemistry-g10-07-02','انواع تعاملات کیمیاوی',2),

  (8,'chemistry-g10-08-01','تعریف اکسیدیشن و ریدکشن',1),
  (8,'chemistry-g10-08-02','نمبر اکسیدیشن عناصر',2),
  (8,'chemistry-g10-08-03','انواع تعاملات اکسیدیشن - ریدکشن',3),
  (8,'chemistry-g10-08-04','میتود ترتیب بیلانس تعاملات اکسیدیشن - ریدکشن',4),
  (8,'chemistry-g10-08-05','تعاملات ریدوکس در محیط‌های مختلف',5),
  (8,'chemistry-g10-08-06','بیلانس تعاملات اکسیدیشن - ریدکشن با پراکسایدها',6),
  (8,'chemistry-g10-08-07','حالت‌های خاص توازن تعاملات ریدوکس',7),

  (9,'chemistry-g10-09-01','پایه‌های مسایل علمی',1),
  (9,'chemistry-g10-09-02','قانون بقای ماده یا تحفظ کتله',2),
  (9,'chemistry-g10-09-03','قانون نسبت‌های ثابت',3),
  (9,'chemistry-g10-09-04','قانون نسبت‌های متعدد یا قانون دالتن',4),
  (9,'chemistry-g10-09-06','قانون نسبت‌های حجمی',6),
  (9,'chemistry-g10-09-07','قانون اوگدرو',7),
  (9,'chemistry-g10-09-08','کتله اتومی نسبتی',8),
  (9,'chemistry-g10-09-09','کتلهٔ مالیکولی نسبتی',9),
  (9,'chemistry-g10-09-10','مول: اتوم-گرام و مالیکول-گرام',10),
  (9,'chemistry-g10-09-11','دریافت فیصدی عناصر متشکلهٔ مالیکول‌های مرکبات',11),
  (9,'chemistry-g10-09-12','فورمول تجربی و فورمول مالیکولی',12)
) AS v(chapter_number,code,title_fa,sort_order)
  ON v.chapter_number=c."number"
WHERE b."code"='chemistry-grade-10-fa-1398'
  AND NOT EXISTS (
    SELECT 1 FROM "topics" t WHERE t."chapter_id"=c."id" AND t."code"=v.code
  );

-- ---------------------------------------------------------------------------
-- Dari — source is organized as 28 lessons; use one structural chapter.
-- ---------------------------------------------------------------------------
INSERT INTO "chapters" ("book_id","number","title_fa","title_ps","active","sort_order","created_at","updated_at")
SELECT b."id",1,'درس‌های زبان و ادبیات دری صنف دهم',NULL,true,1,now(),now()
FROM "books" b
WHERE b."code"='dari-grade-10-fa-1399'
ON CONFLICT ("book_id","number") DO UPDATE SET
  "title_fa"=EXCLUDED."title_fa","active"=true,"updated_at"=now();

INSERT INTO "topics" ("chapter_id","code","title_fa","title_ps","active","sort_order","created_at","updated_at")
SELECT c."id",v.code,v.title_fa,NULL,true,v.sort_order,now(),now()
FROM "chapters" c
JOIN "books" b ON b."id"=c."book_id"
JOIN (VALUES
  ('dari-g10-l01','درس اول: ستایش خداوند',1),
  ('dari-g10-l02','درس دوم: خاتم پیغمبران',2),
  ('dari-g10-l03','درس سوم: فرهنگ مطالعه',3),
  ('dari-g10-l04','درس چهارم: علم بدیع',4),
  ('dari-g10-l05','درس پنجم: دقیقی بلخی',5),
  ('dari-g10-l06','درس ششم: عدالت اجتماعی',6),
  ('dari-g10-l07','درس هفتم: پایگاه انسان',7),
  ('dari-g10-l08','درس هشتم: ادبیات در قرن‌های نهم و دهم هجری',8),
  ('dari-g10-l09','درس نهم: بهارستان',9),
  ('dari-g10-l10','درس دهم: حقوق زن در جامعه',10),
  ('dari-g10-l11','درس یازدهم: کوشش و کامیابی',11),
  ('dari-g10-l12','درس دوازدهم: ابوالفضل بیهقی',12),
  ('dari-g10-l13','درس سیزدهم: موزیم ملی',13),
  ('dari-g10-l14','درس چهاردهم: من هم مانند شما استم',14),
  ('dari-g10-l15','درس پانزدهم: حفظ محیط زیست',15),
  ('dari-g10-l16','درس شانزدهم: پروین اعتصامی',16),
  ('dari-g10-l17','درس هفدهم: تفاهم و همدیگرپذیری',17),
  ('dari-g10-l18','درس هجدهم: بلخ باستان',18),
  ('dari-g10-l19','درس نزدهم: شاه عبدالله یمگی بدخشی',19),
  ('dari-g10-l20','درس بیستم: عوامل اعتیاد به مواد مخدر',20),
  ('dari-g10-l21','درس بیست و یکم: خانوادهٔ زبان‌ها',21),
  ('dari-g10-l22','درس بیست و دوم: غلام محی‌الدین انیس',22),
  ('dari-g10-l23','درس بیست و سوم: خداشناسی',23),
  ('dari-g10-l24','درس بیست و چهارم: ویکتور هوگو',24),
  ('dari-g10-l25','درس بیست و پنجم: هنرهای هفتگانه',25),
  ('dari-g10-l26','درس بیست و ششم: رباعی',26),
  ('dari-g10-l27','درس بیست و هفتم: بابرنامه',27),
  ('dari-g10-l28','درس بیست و هشتم: در صورت مواجه شدن با ماین چه باید کرد؟',28)
) AS v(code,title_fa,sort_order) ON true
WHERE b."code"='dari-grade-10-fa-1399' AND c."number"=1
  AND NOT EXISTS (
    SELECT 1 FROM "topics" t WHERE t."chapter_id"=c."id" AND t."code"=v.code
  );

-- ---------------------------------------------------------------------------
-- Geography — 7 chapters, 68 lessons
-- ---------------------------------------------------------------------------
INSERT INTO "chapters" ("book_id","number","title_fa","title_ps","active","sort_order","created_at","updated_at")
SELECT b."id",v.number,v.title_fa,NULL,true,v.number,now(),now()
FROM "books" b
CROSS JOIN (VALUES
  (1,'مبادی'),
  (2,'اقلیم افغانستان'),
  (3,'کوه‌ها، دشت‌ها و دریاها'),
  (4,'محیط زیست'),
  (5,'آفات طبیعی'),
  (6,'کهکشان، سیاره‌ها و زمین'),
  (7,'اقلیم')
) AS v(number,title_fa)
WHERE b."code"='geography-grade-10-fa-1398'
ON CONFLICT ("book_id","number") DO UPDATE SET
  "title_fa"=EXCLUDED."title_fa","active"=true,"sort_order"=EXCLUDED."sort_order","updated_at"=now();

INSERT INTO "topics" ("chapter_id","code","title_fa","title_ps","active","sort_order","created_at","updated_at")
SELECT c."id",v.code,v.title_fa,NULL,true,v.lesson_number,now(),now()
FROM "chapters" c
JOIN "books" b ON b."id"=c."book_id"
JOIN (VALUES
  (1,1,'geography-g10-l01','درس اول: نقشه، نقشه‌های طبیعی و سیاسی'),
  (1,2,'geography-g10-l02','درس دوم: نقشه‌های اقتصادی و نقشه‌های مواصلاتی'),
  (1,3,'geography-g10-l03','درس سوم: مقیاس'),
  (1,4,'geography-g10-l04','درس چهارم: استعمال رنگ در نقشه'),
  (1,5,'geography-g10-l05','درس پنجم: ارتسام نقشه'),
  (1,6,'geography-g10-l06','درس ششم: استفاده از عکس‌های اقمار مصنوعی'),

  (2,7,'geography-g10-l07','درس هفتم: اقلیم افغانستان و فکتورهای مهم اقلیمی'),
  (2,8,'geography-g10-l08','درس هشتم: حرارت'),
  (2,9,'geography-g10-l09','درس نهم: رطوبت'),
  (2,10,'geography-g10-l10','درس دهم: مناطق اقلیمی افغانستان'),
  (2,11,'geography-g10-l11','درس یازدهم: اقلیم منطقهٔ ستپ'),

  (3,12,'geography-g10-l12','درس دوازدهم: وضع جیولوژیکی افغانستان'),
  (3,13,'geography-g10-l13','درس سیزدهم: ساختمان و اشکال اراضی'),
  (3,14,'geography-g10-l14','درس چهاردهم: سلسله‌کوه‌ها و اهمیت آن در زندگی'),
  (3,15,'geography-g10-l15','درس پانزدهم: سلسله هندوکش'),
  (3,16,'geography-g10-l16','درس شانزدهم: کوه بابا'),
  (3,17,'geography-g10-l17','درس هفدهم: کوه سلیمان'),
  (3,18,'geography-g10-l18','درس هجدهم: نقاط هموار، دشت‌ها و ریگستان‌ها'),
  (3,19,'geography-g10-l19','درس نزدهم: حیوانات'),
  (3,20,'geography-g10-l20','درس بیستم: جنگل‌ها'),
  (3,21,'geography-g10-l21','درس بیست و یکم: فرش نباتی'),
  (3,22,'geography-g10-l22','درس بیست و دوم: گردش آب در طبیعت (سایکل آب)'),
  (3,23,'geography-g10-l23','درس بیست و سوم: اهمیت آب در اقتصاد زراعتی، تولید انرژی و حیات'),
  (3,24,'geography-g10-l24','درس بیست و چهارم: حوزه‌های آبگیر'),
  (3,25,'geography-g10-l25','درس بیست و پنجم: حوزهٔ آمو'),
  (3,26,'geography-g10-l26','درس بیست و ششم: حوزهٔ کابل'),
  (3,27,'geography-g10-l27','درس بیست و هفتم: حوزهٔ آبگیر هلمند و سیستان'),
  (3,28,'geography-g10-l28','درس بیست و هشتم: حوزهٔ هریرود'),
  (3,29,'geography-g10-l29','درس بیست و نهم: حوزه‌های بسته'),
  (3,30,'geography-g10-l30','درس سی‌ام: جهیل‌های معروف افغانستان'),
  (3,31,'geography-g10-l31','درس سی و یکم: خشک‌سالی و کمبود آب'),

  (4,32,'geography-g10-l32','درس سی و دوم: محیط طبیعی'),
  (4,33,'geography-g10-l33','درس سی و سوم: حفاظت جنگل‌ها'),
  (4,34,'geography-g10-l34','درس سی و چهارم: حفاظت حیات وحش'),
  (4,35,'geography-g10-l35','درس سی و پنجم: حفاظت آب، خاک و هوا'),
  (4,36,'geography-g10-l36','درس سی و ششم: آلودگی هوای شهر'),
  (4,37,'geography-g10-l37','درس سی و هفتم: ازدیاد عراده‌جات کهنه و آلودگی شهر'),
  (4,38,'geography-g10-l38','درس سی و هشتم: خرابی و آلودگی جاده‌ها و کوچه‌ها'),

  (5,39,'geography-g10-l39','درس سی و نهم: زلزله'),
  (5,40,'geography-g10-l40','درس چهلم: خطرات زلزله'),
  (5,41,'geography-g10-l41','درس چهل و یکم: سنجش میزان زلزله'),
  (5,42,'geography-g10-l42','درس چهل و دوم: حوزه‌های زلزله‌خیز کشور'),
  (5,43,'geography-g10-l43','درس چهل و سوم: سیلاب'),
  (5,44,'geography-g10-l44','درس چهل و چهارم: خطرات سیل و راه‌های مقابله با آن'),
  (5,45,'geography-g10-l45','درس چهل و پنجم: آتشفشان'),
  (5,46,'geography-g10-l46','درس چهل و ششم: حوزه‌های آتشفشانی قبلی در کشور'),

  (6,47,'geography-g10-l47','درس چهل و هفتم: نظریات دربارهٔ پیدایش جهان'),
  (6,48,'geography-g10-l48','درس چهل و هشتم: کهکشان'),
  (6,49,'geography-g10-l49','درس چهل و نهم: منظومهٔ شمسی'),
  (6,50,'geography-g10-l50','درس پنجاهم: سیاره‌های منظومهٔ شمسی'),
  (6,51,'geography-g10-l51','درس پنجاه و یکم: ساختمان زمین'),
  (6,52,'geography-g10-l52','درس پنجاه و دوم: دریاهای معروف جهان'),
  (6,53,'geography-g10-l53','درس پنجاه و سوم: پستی‌ها و بلندی‌های قطعات خشکهٔ زمین'),
  (6,54,'geography-g10-l54','درس پنجاه و چهارم: مهتاب و مشخصات عمومی آن'),
  (6,55,'geography-g10-l55','درس پنجاه و پنجم: خسوف و کسوف'),
  (6,56,'geography-g10-l56','درس پنجاه و ششم: انواع حرکت زمین'),
  (6,57,'geography-g10-l57','درس پنجاه و هفتم: کمیات وضعیهٔ جغرافیایی'),

  (7,58,'geography-g10-l58','درس پنجاه و هشتم: اقلیم چیست'),
  (7,59,'geography-g10-l59','درس پنجاه و نهم: وزش بادها'),
  (7,60,'geography-g10-l60','درس شصتم: عوامل مؤثر اقلیم'),
  (7,61,'geography-g10-l61','درس شصت و یکم: انواع اقلیم'),
  (7,62,'geography-g10-l62','درس شصت و دوم: طبقات اتموسفیر'),
  (7,63,'geography-g10-l63','درس شصت و سوم: اتموسفیر زمین'),
  (7,64,'geography-g10-l64','درس شصت و چهارم: نقش اتموسفیر در اقلیم'),
  (7,65,'geography-g10-l65','درس شصت و پنجم: ابزارهای سنجش و مشاهدات هواشناسی'),
  (7,66,'geography-g10-l66','درس شصت و ششم: چگونگی تشکیل باد'),
  (7,67,'geography-g10-l67','درس شصت و هفتم: ابر‌بندی‌ها (Clouds)'),
  (7,68,'geography-g10-l68','درس شصت و هشتم: تغییرات بارندگی نظر به ارتفاع')
) AS v(chapter_number,lesson_number,code,title_fa)
  ON v.chapter_number=c."number"
WHERE b."code"='geography-grade-10-fa-1398'
  AND NOT EXISTS (
    SELECT 1 FROM "topics" t WHERE t."chapter_id"=c."id" AND t."code"=v.code
  );
