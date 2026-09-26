-- Five remaining Grade 10 official textbooks supplied by the user.
-- Sources: Ministry of Education PDFs for Geology, Islamic Education (Hanafi),
-- Mathematics, Physics, and Tafseer Sharif.
-- Curriculum structure only; no questions are invented by this migration.

-- ---------------------------------------------------------------------------
-- Subjects
-- ---------------------------------------------------------------------------
INSERT INTO "subjects" ("code","name_fa","name_ps","active","sort_order","created_at","updated_at")
VALUES
  ('geology','جیولوژی',NULL,true,110,now(),now()),
  ('islamic-studies','تعلیم و تربیه اسلامی','اسلامي ښوونه او روزنه',true,40,now(),now()),
  ('math','ریاضی','ریاضي',true,20,now(),now()),
  ('physics','فزیک','فزیک',true,30,now(),now()),
  ('tafseer','تفسیر','تفسیر',true,45,now(),now())
ON CONFLICT ("code") DO UPDATE SET
  "name_fa"=EXCLUDED."name_fa",
  "name_ps"=COALESCE(EXCLUDED."name_ps","subjects"."name_ps"),
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
    ('geology','geology-grade-10-fa-1398','جیولوژی صنف دهم',1398,
      '{"publisher":"ریاست ارتباط و آگاهی عامه وزارت معارف","curriculumDeveloper":"ریاست عمومی انکشاف نصاب تعلیمی و تألیف کتب درسی","language":"fa","sourceFilename":"G10-Dr-Geology(1).pdf","sourceType":"official_textbook","pages":158}'::jsonb,70),
    ('islamic-studies','islamic-studies-grade-10-hanafi-fa-1398','تعلیم و تربیه اسلامی صنف دهم',1398,
      '{"publisher":"وزارت معارف","curriculumDeveloper":"ریاست عمومی انکشاف نصاب تعلیمی و تألیف کتب درسی","language":"fa","madhhab":"hanafi","sourceFilename":"G10-Dr-Islamic_Study_hanafi.pdf","sourceType":"official_textbook","pages":146}'::jsonb,80),
    ('math','math-grade-10-fa-1398','ریاضی صنف دهم',1398,
      '{"publisher":"ریاست ارتباط و آگاهی عامه وزارت معارف","curriculumDeveloper":"ریاست عمومی انکشاف نصاب تعلیمی و تألیف کتب درسی","language":"fa","sourceFilename":"G10-Dr-Math(1).pdf","sourceType":"official_textbook","pages":420}'::jsonb,90),
    ('physics','physics-grade-10-fa-1398','فزیک صنف دهم',1398,
      '{"publisher":"ریاست ارتباط و آگاهی عامه وزارت معارف","curriculumDeveloper":"ریاست عمومی انکشاف نصاب تعلیمی و تألیف کتب درسی","language":"fa","sourceFilename":"G10-Dr-physic(1).pdf","sourceType":"official_textbook","pages":254}'::jsonb,100),
    ('tafseer','tafseer-grade-10-fa-1398','تفسیر شریف صنف دهم',1398,
      '{"publisher":"ریاست ارتباط و آگاهی عامه وزارت معارف","curriculumDeveloper":"ریاست عمومی انکشاف نصاب تعلیمی و تألیف کتب درسی","language":"fa","sourceFilename":"G10-Dr-Tafseer(1).pdf","sourceType":"official_textbook","pages":105}'::jsonb,110)
) AS v(subject_code,code,title_fa,edition_year,source_metadata,sort_order) ON true
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
-- Geology — 8 official sections represented as chapters; 21 official chapter
-- headings represented as selectable topics.
-- ---------------------------------------------------------------------------
INSERT INTO "chapters" ("book_id","number","title_fa","title_ps","active","sort_order","created_at","updated_at")
SELECT b."id",v.number,v.title_fa,NULL,true,v.number,now(),now()
FROM "books" b
CROSS JOIN (VALUES
  (1,'منرال‌ها'),
  (2,'سنگ‌ها'),
  (3,'پروسه‌های خارجی'),
  (4,'طبقه‌بندی زمین'),
  (5,'زلزله'),
  (6,'ولکانولوژی'),
  (7,'تاریخ زمین'),
  (8,'ابحار')
) AS v(number,title_fa)
WHERE b."code"='geology-grade-10-fa-1398'
ON CONFLICT ("book_id","number") DO UPDATE SET
  "title_fa"=EXCLUDED."title_fa","active"=true,"sort_order"=EXCLUDED."sort_order","updated_at"=now();

INSERT INTO "topics" ("chapter_id","code","title_fa","title_ps","active","sort_order","created_at","updated_at")
SELECT c."id",v.code,v.title_fa,NULL,true,v.sort_order,now(),now()
FROM "chapters" c
JOIN "books" b ON b."id"=c."book_id"
JOIN (VALUES
  (1,'geology-g10-t01','مفهوم منرال‌ها و خواص فزیکی آنها',1),
  (1,'geology-g10-t02','تصنیف منرال‌ها',2),
  (1,'geology-g10-t03','منابع منرالی افغانستان',3),
  (2,'geology-g10-t04','سنگ‌های ناریه',1),
  (2,'geology-g10-t05','سنگ‌های رسوبی',2),
  (2,'geology-g10-t06','سنگ‌های میتامورفیکی',3),
  (3,'geology-g10-t07','فعالیت‌های جیولوژیکی آب‌های سطحی',1),
  (3,'geology-g10-t08','فعالیت جیولوژیکی یخچال‌ها',2),
  (3,'geology-g10-t09','فعالیت جیولوژیکی بادها',3),
  (4,'geology-g10-t10','هسته زمین',1),
  (4,'geology-g10-t11','دور شدن قاره‌ها',2),
  (4,'geology-g10-t12','گسترش بستر ابحار و بحیره‌ها',3),
  (4,'geology-g10-t13','پلیت‌ها چیست',4),
  (5,'geology-g10-t14','تعریف و میکانیزم زلزله‌ها',1),
  (5,'geology-g10-t15','جیولوژی ساختمانی',2),
  (6,'geology-g10-t16','ماهیت و عوامل فوران',1),
  (6,'geology-g10-t17','حوادث طبیعی',2),
  (7,'geology-g10-t18','پالینتولوژی',1),
  (7,'geology-g10-t19','ستراتیگرافی',2),
  (8,'geology-g10-t20','تصنیف ابحار',1),
  (8,'geology-g10-t21','اوشیانوگرافی فزیکی',2)
) AS v(chapter_number,code,title_fa,sort_order)
  ON v.chapter_number=c."number"
WHERE b."code"='geology-grade-10-fa-1398'
AND NOT EXISTS (
  SELECT 1 FROM "topics" t
  WHERE t."chapter_id"=c."id" AND t."code"=v.code
);

-- ---------------------------------------------------------------------------
-- Islamic Education (Hanafi) — 3 source sections, 47 lessons.
-- ---------------------------------------------------------------------------
INSERT INTO "chapters" ("book_id","number","title_fa","title_ps","active","sort_order","created_at","updated_at")
SELECT b."id",v.number,v.title_fa,NULL,true,v.number,now(),now()
FROM "books" b
CROSS JOIN (VALUES
  (1,'بخش عقاید'),
  (2,'بخش حدیث شریف'),
  (3,'بخش فقه')
) AS v(number,title_fa)
WHERE b."code"='islamic-studies-grade-10-hanafi-fa-1398'
ON CONFLICT ("book_id","number") DO UPDATE SET
  "title_fa"=EXCLUDED."title_fa","active"=true,"sort_order"=EXCLUDED."sort_order","updated_at"=now();

INSERT INTO "topics" ("chapter_id","code","title_fa","title_ps","active","sort_order","created_at","updated_at")
SELECT c."id",v.code,v.title_fa,NULL,true,v.lesson_no,now(),now()
FROM "chapters" c
JOIN "books" b ON b."id"=c."book_id"
JOIN (VALUES
  (1,1,'islamic-g10-l01','درس اول: علم عقاید'),
  (1,2,'islamic-g10-l02','درس دوم: ایمان به وجود الله تعالی'),
  (1,3,'islamic-g10-l03','درس سوم: وحدانیت الله تعالی'),
  (1,4,'islamic-g10-l04','درس چهارم: توحید الوهیت'),
  (1,5,'islamic-g10-l05','درس پنجم: نام‌ها و صفات الله تعالی'),
  (1,6,'islamic-g10-l06','درس ششم: صفت‌های الله تعالی'),
  (1,7,'islamic-g10-l07','درس هفتم: صفات ذاتی الله تعالی (۱)'),
  (1,8,'islamic-g10-l08','درس هشتم: صفات ذاتی الله تعالی (۲)'),
  (1,9,'islamic-g10-l09','درس نهم: کلام صفت الله تعالی است'),
  (1,10,'islamic-g10-l10','درس دهم: ایمان به ملائکه'),
  (2,11,'islamic-g10-l11','درس یازدهم: اهمیت حدیث'),
  (2,12,'islamic-g10-l12','درس دوازدهم: تدبیر در کارها'),
  (2,13,'islamic-g10-l13','درس سیزدهم: اهمیت صلح و آشتی در میان مردم'),
  (2,14,'islamic-g10-l14','درس چهاردهم: سهولت در کارها'),
  (2,15,'islamic-g10-l15','درس پانزدهم: جلوگیری از ظلم و ستم'),
  (2,16,'islamic-g10-l16','درس شانزدهم: درمان غضب'),
  (2,17,'islamic-g10-l17','درس هفدهم: بهترین مردم'),
  (2,18,'islamic-g10-l18','درس هژدهم: شعبه‌های ایمان'),
  (2,19,'islamic-g10-l19','درس نزدهم: تعصب'),
  (2,20,'islamic-g10-l20','درس بیستم: منزلت مؤمن'),
  (2,21,'islamic-g10-l21','درس بیست و یکم: صبر بر تکالیف'),
  (2,22,'islamic-g10-l22','درس بیست و دوم: حقوق مسلمان'),
  (2,23,'islamic-g10-l23','درس بیست و سوم: دورویی'),
  (2,24,'islamic-g10-l24','درس بیست و چهارم: آداب خواب کردن'),
  (3,25,'islamic-g10-l25','درس بیست و پنجم: اسلام نظام زندگی است'),
  (3,26,'islamic-g10-l26','درس بیست و ششم: نظام اقتصادی اسلام'),
  (3,27,'islamic-g10-l27','درس بیست و هفتم: خصوصیت‌های اقتصاد اسلامی'),
  (3,28,'islamic-g10-l28','درس بیست و هشتم: برتری‌های اقتصاد اسلامی'),
  (3,29,'islamic-g10-l29','درس بیست و نهم: رهنمایی قرآن کریم در مورد میراث (۱)'),
  (3,30,'islamic-g10-l30','درس سی‌ام: رهنمایی قرآن کریم در مورد میراث (۲)'),
  (3,31,'islamic-g10-l31','درس سی و یکم: رهنمایی قرآن کریم در مورد میراث (۳)'),
  (3,32,'islamic-g10-l32','درس سی و دوم: مبادی علم میراث'),
  (3,33,'islamic-g10-l33','درس سی و سوم: ذوی الفروض و سهام آنها'),
  (3,34,'islamic-g10-l34','درس سی و چهارم: احوال ذوی الفروض از جمله زنان'),
  (3,35,'islamic-g10-l35','درس سی و پنجم: عصبات'),
  (3,36,'islamic-g10-l36','درس سی و ششم: مخارج سهام'),
  (3,37,'islamic-g10-l37','درس سی و هفتم: عول'),
  (3,38,'islamic-g10-l38','درس سی و هشتم: تماثل، تداخل، توافق و تباین در بین دو عدد'),
  (3,39,'islamic-g10-l39','درس سی و نهم: تصحیح'),
  (3,40,'islamic-g10-l40','درس چهلم: طریقه تقسیم متروکه بین ورثه'),
  (3,41,'islamic-g10-l41','درس چهل و یکم: تخارج'),
  (3,42,'islamic-g10-l42','درس چهل و دوم: رد'),
  (3,43,'islamic-g10-l43','درس چهل و سوم: جهاد'),
  (3,44,'islamic-g10-l44','درس چهل و چهارم: دست آوردهای جهاد'),
  (3,45,'islamic-g10-l45','درس چهل و پنجم: چه کسانی به جهاد مکلف اند؟'),
  (3,46,'islamic-g10-l46','درس چهل و ششم: انواع جهاد از نظر اسلام'),
  (3,47,'islamic-g10-l47','درس چهل و هفتم: صلح و احکام آن')
) AS v(chapter_number,lesson_no,code,title_fa)
  ON v.chapter_number=c."number"
WHERE b."code"='islamic-studies-grade-10-hanafi-fa-1398'
AND NOT EXISTS (
  SELECT 1 FROM "topics" t
  WHERE t."chapter_id"=c."id" AND t."code"=v.code
);

-- ---------------------------------------------------------------------------
-- Mathematics — 9 official chapters. A selectable topic mirrors each chapter.
-- ---------------------------------------------------------------------------
INSERT INTO "chapters" ("book_id","number","title_fa","title_ps","active","sort_order","created_at","updated_at")
SELECT b."id",v.number,v.title_fa,NULL,true,v.number,now(),now()
FROM "books" b
CROSS JOIN (VALUES
  (1,'پولینوم'),
  (2,'رابطه'),
  (3,'تابع'),
  (4,'توابع مثلثاتی'),
  (5,'تطبیقات مثلثات'),
  (6,'اعداد مختلط'),
  (7,'هندسه تحلیلی'),
  (8,'احصائیه'),
  (9,'منطق (ریاضی)')
) AS v(number,title_fa)
WHERE b."code"='math-grade-10-fa-1398'
ON CONFLICT ("book_id","number") DO UPDATE SET
  "title_fa"=EXCLUDED."title_fa","active"=true,"sort_order"=EXCLUDED."sort_order","updated_at"=now();

INSERT INTO "topics" ("chapter_id","code","title_fa","title_ps","active","sort_order","created_at","updated_at")
SELECT c."id",'math-g10-c'||lpad(c."number"::text,2,'0'),c."title_fa",NULL,true,1,now(),now()
FROM "chapters" c
JOIN "books" b ON b."id"=c."book_id"
WHERE b."code"='math-grade-10-fa-1398'
AND NOT EXISTS (
  SELECT 1 FROM "topics" t
  WHERE t."chapter_id"=c."id" AND t."code"='math-g10-c'||lpad(c."number"::text,2,'0')
);

-- ---------------------------------------------------------------------------
-- Physics — 9 official chapters. A selectable topic mirrors each chapter.
-- ---------------------------------------------------------------------------
INSERT INTO "chapters" ("book_id","number","title_fa","title_ps","active","sort_order","created_at","updated_at")
SELECT b."id",v.number,v.title_fa,NULL,true,v.number,now(),now()
FROM "books" b
CROSS JOIN (VALUES
  (1,'فزیک چیست'),
  (2,'اندازه‌گیری'),
  (3,'نور و خواص نور'),
  (4,'انکسار'),
  (5,'عدسیه‌ها'),
  (6,'برق ساکن'),
  (7,'سرکت و جریان'),
  (8,'مقناطیس'),
  (9,'القای الکترومقناطیسی و برق متناوب')
) AS v(number,title_fa)
WHERE b."code"='physics-grade-10-fa-1398'
ON CONFLICT ("book_id","number") DO UPDATE SET
  "title_fa"=EXCLUDED."title_fa","active"=true,"sort_order"=EXCLUDED."sort_order","updated_at"=now();

INSERT INTO "topics" ("chapter_id","code","title_fa","title_ps","active","sort_order","created_at","updated_at")
SELECT c."id",'physics-g10-c'||lpad(c."number"::text,2,'0'),c."title_fa",NULL,true,1,now(),now()
FROM "chapters" c
JOIN "books" b ON b."id"=c."book_id"
WHERE b."code"='physics-grade-10-fa-1398'
AND NOT EXISTS (
  SELECT 1 FROM "topics" t
  WHERE t."chapter_id"=c."id" AND t."code"='physics-g10-c'||lpad(c."number"::text,2,'0')
);

-- ---------------------------------------------------------------------------
-- Tafseer Sharif — 24 official lessons grouped under one structural chapter.
-- ---------------------------------------------------------------------------
INSERT INTO "chapters" ("book_id","number","title_fa","title_ps","active","sort_order","created_at","updated_at")
SELECT b."id",1,'درس‌های تفسیر شریف صنف دهم',NULL,true,1,now(),now()
FROM "books" b
WHERE b."code"='tafseer-grade-10-fa-1398'
ON CONFLICT ("book_id","number") DO UPDATE SET
  "title_fa"=EXCLUDED."title_fa","active"=true,"updated_at"=now();

INSERT INTO "topics" ("chapter_id","code","title_fa","title_ps","active","sort_order","created_at","updated_at")
SELECT c."id",v.code,v.title_fa,NULL,true,v.sort_order,now(),now()
FROM "chapters" c
JOIN "books" b ON b."id"=c."book_id"
JOIN (VALUES
  ('tafseer-g10-l01','درس اول: مفهوم و اهمیت علم تفسیر',1),
  ('tafseer-g10-l02','درس دوم: تفسیر سورة الفاتحة',2),
  ('tafseer-g10-l03','درس سوم: آغاز وحی با علم و قلم',3),
  ('tafseer-g10-l04','درس چهارم: تفسیر سورة الإخلاص',4),
  ('tafseer-g10-l05','درس پنجم: وحدانیت خداوند در ملک و آفرینش',5),
  ('tafseer-g10-l06','درس ششم: نام‌های نیکوی خداوند',6),
  ('tafseer-g10-l07','درس هفتم: انسان، بیهوده آفریده نشده',7),
  ('tafseer-g10-l08','درس هشتم: انسان در سایه نعمت‌های الهی',8),
  ('tafseer-g10-l09','درس نهم: دعوت به سوی خداوند',9),
  ('tafseer-g10-l10','درس دهم: ایمان و عمل صالح',10),
  ('tafseer-g10-l11','درس یازدهم: امانت و اهمیت آن در اسلام',11),
  ('tafseer-g10-l12','درس دوازدهم: مطابقت در گفتار و کردار',12),
  ('tafseer-g10-l13','درس سیزدهم: فرجام سرپیچی از ذکر خداوند',13),
  ('tafseer-g10-l14','درس چهاردهم: نیکویی چیست؟',14),
  ('tafseer-g10-l15','درس پانزدهم: صلح و اهمیت آن در اسلام',15),
  ('tafseer-g10-l16','درس شانزدهم: نصایح لقمان حکیم به فرزندش (۱)',16),
  ('tafseer-g10-l17','درس هفدهم: نصایح لقمان حکیم به فرزندش (۲)',17),
  ('tafseer-g10-l18','درس هژدهم: خودداری از بدگمانی، غیبت و تجسس',18),
  ('tafseer-g10-l19','درس نزدهم: آداب داخل شدن به خانه‌ها',19),
  ('tafseer-g10-l20','درس بیستم: حرمت شراب‌نوشی و قماربازی',20),
  ('tafseer-g10-l21','درس بیست و یکم: امر به عدل و احسان',21),
  ('tafseer-g10-l22','درس بیست و دوم: حقوق والدین',22),
  ('tafseer-g10-l23','درس بیست و سوم: حقوق خویشاوندان، مسکینان و مسافران',23),
  ('tafseer-g10-l24','درس بیست و چهارم: عدالت و مسؤولیت در معاملات',24)
) AS v(code,title_fa,sort_order) ON true
WHERE b."code"='tafseer-grade-10-fa-1398' AND c."number"=1
AND NOT EXISTS (
  SELECT 1 FROM "topics" t
  WHERE t."chapter_id"=c."id" AND t."code"=v.code
);
