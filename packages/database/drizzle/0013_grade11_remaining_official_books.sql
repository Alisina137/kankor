-- Remaining Grade 11 official textbooks from user-provided Ministry of Education PDFs.
-- Adds four of the five remaining Grade 11 books: Islamic Studies (Hanafi), Mathematics, Pashto for Dari speakers, and Physics.
-- Tafseer Sharif is added by migration 0014.

INSERT INTO "subjects" ("code","name_fa","name_ps","active","sort_order","created_at","updated_at")
VALUES
  ('islamic-studies','تعلیم و تربیه اسلامی','اسلامي ښوونه او روزنه',true,40,now(),now()),
  ('math','ریاضی','ریاضي',true,20,now(),now()),
  ('physics','فزیک','فزیک',true,30,now(),now()),
  ('pashto','پشتو','پښتو',true,60,now(),now())
ON CONFLICT ("code") DO UPDATE SET
  "name_fa"=EXCLUDED."name_fa",
  "name_ps"=COALESCE(EXCLUDED."name_ps","subjects"."name_ps"),
  "active"=true,
  "sort_order"=EXCLUDED."sort_order",
  "updated_at"=now();

INSERT INTO "books" (
  "subject_id","grade_id","code","title_fa","title_ps","edition_year",
  "source_metadata","active","sort_order","created_at","updated_at"
)
SELECT s."id",g."id",v.code,v.title_fa,v.title_ps,v.edition_year,v.source_metadata,true,v.sort_order,now(),now()
FROM "grades" g
JOIN (
  VALUES
    ('islamic-studies','islamic-studies-grade-11-hanafi-fa-1398','تعلیم و تربیه اسلامی صنف یازدهم','اسلامي ښوونه او روزنه یوولسم ټولګی',1398,
      '{"publisher":"ریاست ارتباط و آگاهی عامه وزارت معارف","curriculumDeveloper":"ریاست عمومی انکشاف نصاب تعلیمی و تألیف کتب درسی","language":"fa","madhhab":"hanafi","sourceFilename":"G11-Dr-Islamic_Study_Hanafi(1).pdf","sourceType":"official_textbook","pages":154}'::jsonb,10),
    ('math','math-grade-11-fa-1398','ریاضی صنف یازدهم','ریاضي یوولسم ټولګی',1398,
      '{"publisher":"ریاست ارتباط و آگاهی عامه وزارت معارف","curriculumDeveloper":"ریاست عمومی انکشاف نصاب تعلیمی و تألیف کتب درسی","language":"fa","sourceFilename":"G11-Dr-Math(2).pdf","sourceType":"official_textbook","pages":332}'::jsonb,20),
    ('pashto','pashto-grade-11-dari-speakers-1398','پشتو صنف یازدهم (برای دری‌زبانان)','پښتو یوولسم ټولګی (د دري ژبو لپاره)',1398,
      '{"publisher":"د پوهنې وزارت د اړیکو او عامه پوهاوي ریاست","curriculumDeveloper":"د تعلیمي نصاب د پراختیا او درسي کتابونو د تألیف لوی ریاست","language":"ps","sourceFilename":"G11-Dr-Pashto(1).pdf","sourceType":"official_textbook","pages":194}'::jsonb,30),
    ('physics','physics-grade-11-fa-1399','فزیک صنف یازدهم','فزیک یوولسم ټولګی',1399,
      '{"publisher":"ریاست ارتباط و آگاهی عامه وزارت معارف","curriculumDeveloper":"ریاست عمومی انکشاف نصاب تعلیمی و تألیف کتب درسی","language":"fa","sourceFilename":"G11-Dr-Physic(1).pdf","sourceType":"official_textbook","pages":222}'::jsonb,40)
) AS v(subject_code,code,title_fa,title_ps,edition_year,source_metadata,sort_order) ON true
JOIN "subjects" s ON s."code"=v.subject_code
WHERE g."number"=11
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

-- Islamic Studies (Hanafi): three source sections, 42 lessons.
INSERT INTO "chapters" ("book_id","number","title_fa","title_ps","active","sort_order","created_at","updated_at")
SELECT b."id",v.number,v.title_fa,v.title_ps,true,v.number,now(),now()
FROM "books" b
CROSS JOIN (VALUES
  (1,'بخش عقاید','د عقایدو برخه'),
  (2,'بخش حدیث','د حدیث برخه'),
  (3,'بخش فقه','د فقه برخه')
) AS v(number,title_fa,title_ps)
WHERE b."code"='islamic-studies-grade-11-hanafi-fa-1398'
ON CONFLICT ("book_id","number") DO UPDATE SET
  "title_fa"=EXCLUDED."title_fa","title_ps"=EXCLUDED."title_ps","active"=true,"sort_order"=EXCLUDED."sort_order","updated_at"=now();

INSERT INTO "topics" ("chapter_id","code","title_fa","title_ps","active","sort_order","created_at","updated_at")
SELECT c."id",v.code,v.title_fa,NULL,true,v.lesson_no,now(),now()
FROM "chapters" c
JOIN "books" b ON b."id"=c."book_id"
JOIN (VALUES
  (1,1,'islamic-g11-l01','درس اول: کتاب‌های آسمانی'),
  (1,2,'islamic-g11-l02','درس دوم: وحی'),
  (1,3,'islamic-g11-l03','درس سوم: ایمان به انبیا و رسولان'),
  (1,4,'islamic-g11-l04','درس چهارم: صفات انبیا و رسولان'),
  (1,5,'islamic-g11-l05','درس پنجم: پیامبران اولوالعزم'),
  (1,6,'islamic-g11-l06','درس ششم: معجزه و سحر'),
  (1,7,'islamic-g11-l07','درس هفتم: کرامت و استدراج'),
  (1,8,'islamic-g11-l08','درس هشتم: قضا و قدر'),
  (1,9,'islamic-g11-l09','درس نهم: برزخ'),
  (1,10,'islamic-g11-l10','درس دهم: بعث و حشر'),
  (1,11,'islamic-g11-l11','درس یازدهم: شفاعت حضرت محمد ﷺ'),
  (2,12,'islamic-g11-l12','درس دوازدهم: غیبت گناه بزرگ است'),
  (2,13,'islamic-g11-l13','درس سیزدهم: مسلمان آینه مسلمان است'),
  (2,14,'islamic-g11-l14','درس چهاردهم: اهمیت مشوره'),
  (2,15,'islamic-g11-l15','درس پانزدهم: کمک به مساکین'),
  (2,16,'islamic-g11-l16','درس شانزدهم: تعلیم و تربیت دختران'),
  (2,17,'islamic-g11-l17','درس هفدهم: کسب روزی حلال'),
  (2,18,'islamic-g11-l18','درس هژدهم: آسانی در دین'),
  (2,19,'islamic-g11-l19','درس نزدهم: لعنت گفتن'),
  (2,20,'islamic-g11-l20','درس بیستم: اعتدال در کارها'),
  (2,21,'islamic-g11-l21','درس بیست و یکم: اسباب برخورداری از سایه عرش الهی در آخرت'),
  (2,22,'islamic-g11-l22','درس بیست و دوم: آداب نشستن در راه'),
  (3,23,'islamic-g11-l23','درس بیست و سوم: خانواده'),
  (3,24,'islamic-g11-l24','درس بیست و چهارم: نکاح'),
  (3,25,'islamic-g11-l25','درس بیست و پنجم: مقدمات نکاح'),
  (3,26,'islamic-g11-l26','درس بیست و ششم: ارکان و شرایط نکاح'),
  (3,27,'islamic-g11-l27','درس بیست و هفتم: ولایت'),
  (3,28,'islamic-g11-l28','درس بیست و هشتم: کفالت'),
  (3,29,'islamic-g11-l29','درس بیست و نهم: محرمات نکاح'),
  (3,30,'islamic-g11-l30','درس سی‌ام: محرمات رضاعی'),
  (3,31,'islamic-g11-l31','درس سی و یکم: محرمات موقت'),
  (3,32,'islamic-g11-l32','درس سی و دوم: متعه'),
  (3,33,'islamic-g11-l33','درس سی و سوم: مهر'),
  (3,34,'islamic-g11-l34','درس سی و چهارم: ولیمه'),
  (3,35,'islamic-g11-l35','درس سی و پنجم: حقوق زن و شوهر'),
  (3,36,'islamic-g11-l36','درس سی و ششم: حقوق شوهر بر زن'),
  (3,37,'islamic-g11-l37','درس سی و هفتم: حجاب'),
  (3,38,'islamic-g11-l38','درس سی و هشتم: راه حل مشکلات میان زن و شوهر'),
  (3,39,'islamic-g11-l39','درس سی و نهم: طلاق'),
  (3,40,'islamic-g11-l40','درس چهلم: انواع طلاق'),
  (3,41,'islamic-g11-l41','درس چهل و یکم: انواع دیگر تفریق (۱)'),
  (3,42,'islamic-g11-l42','درس چهل و دوم: انواع دیگر تفریق (۲)')
) AS v(chapter_no,lesson_no,code,title_fa)
ON v.chapter_no=c."number"
WHERE b."code"='islamic-studies-grade-11-hanafi-fa-1398'
AND NOT EXISTS (SELECT 1 FROM "topics" t WHERE t."chapter_id"=c."id" AND t."code"=v.code);

-- Mathematics: eight official chapters. Chapter-level topics for initial navigation.
INSERT INTO "chapters" ("book_id","number","title_fa","title_ps","active","sort_order","created_at","updated_at")
SELECT b."id",v.number,v.title_fa,NULL,true,v.number,now(),now()
FROM "books" b
CROSS JOIN (VALUES
  (1,'مقاطع مخروطی'),
  (2,'مثلثات'),
  (3,'هندسه فضایی'),
  (4,'ترادف‌ها و سلسله‌ها'),
  (5,'لگاریتم و توابع اکسپوننشیلی'),
  (6,'ماتریکس‌ها و دترمینانت‌ها'),
  (7,'هندسه تحلیلی'),
  (8,'احتمالات')
) AS v(number,title_fa)
WHERE b."code"='math-grade-11-fa-1398'
ON CONFLICT ("book_id","number") DO UPDATE SET
  "title_fa"=EXCLUDED."title_fa","active"=true,"sort_order"=EXCLUDED."sort_order","updated_at"=now();

INSERT INTO "topics" ("chapter_id","code","title_fa","title_ps","active","sort_order","created_at","updated_at")
SELECT c."id",'math-g11-c'||lpad(c."number"::text,2,'0'),c."title_fa",NULL,true,1,now(),now()
FROM "chapters" c JOIN "books" b ON b."id"=c."book_id"
WHERE b."code"='math-grade-11-fa-1398'
AND NOT EXISTS (SELECT 1 FROM "topics" t WHERE t."chapter_id"=c."id" AND t."code"='math-g11-c'||lpad(c."number"::text,2,'0'));

-- Pashto for Dari speakers: 28 official lessons.
INSERT INTO "chapters" ("book_id","number","title_fa","title_ps","active","sort_order","created_at","updated_at")
SELECT b."id",1,'درس‌های پشتو صنف یازدهم','د پښتو یوولسم ټولګي درسونه',true,1,now(),now()
FROM "books" b WHERE b."code"='pashto-grade-11-dari-speakers-1398'
ON CONFLICT ("book_id","number") DO UPDATE SET
  "title_fa"=EXCLUDED."title_fa","title_ps"=EXCLUDED."title_ps","active"=true,"updated_at"=now();

-- The shared topics schema requires title_fa. This Pashto-source book has source lesson titles in Pashto only,
-- so preserve the exact source title in both title_fa (fallback/display compatibility) and title_ps rather than inventing a Dari translation.
INSERT INTO "topics" ("chapter_id","code","title_fa","title_ps","active","sort_order","created_at","updated_at")
SELECT c."id",v.code,v.title_ps,v.title_ps,true,v.lesson_no,now(),now()
FROM "chapters" c JOIN "books" b ON b."id"=c."book_id"
JOIN (VALUES
  (1,'pashto-g11-l01','لومړی لوست: حمد'),
  (2,'pashto-g11-l02','دویم لوست: نعت'),
  (3,'pashto-g11-l03','درېیم لوست: پندونه'),
  (4,'pashto-g11-l04','څلورم لوست: ژمنه (وعده)'),
  (5,'pashto-g11-l05','پنځم لوست: تشبیه'),
  (6,'pashto-g11-l06','شپږم لوست: د تشبیه ډولونه'),
  (7,'pashto-g11-l07','اووم لوست: نشه يي توکي'),
  (8,'pashto-g11-l08','اتم لوست: محاوره (پېژندپاڼه اخیستل)'),
  (9,'pashto-g11-l09','نهم لوست: پښتو تاریخي نثرونه'),
  (10,'pashto-g11-l10','لسم لوست: شعر'),
  (11,'pashto-g11-l11','یوولسم لوست: د پښتو ادبیاتو منځنۍ دوره'),
  (12,'pashto-g11-l12','دولسم لوست: محاوره (په روغتون کې د ناروغ پوښتنه)'),
  (13,'pashto-g11-l13','دیارلسم لوست: معاصر ادبي نثر'),
  (14,'pashto-g11-l14','څوارلسم لوست: ملي آرشیف'),
  (15,'pashto-g11-l15','پنځلسم لوست: ښځه او ټولنه'),
  (16,'pashto-g11-l16','شپاړسم لوست: شاه حسین هوتک'),
  (17,'pashto-g11-l17','اوولسم لوست: ټولنه او نوی نسل'),
  (18,'pashto-g11-l18','اتلسم لوست: علامه پوهاند عبدالشکور رشاد'),
  (19,'pashto-g11-l19','نولسم لوست: کیسه (روزنیزه)'),
  (20,'pashto-g11-l20','شلم لوست: کتاب او کتابتون'),
  (21,'pashto-g11-l21','یوویشتم لوست: بشري حقونه'),
  (22,'pashto-g11-l22','دوه ویشتم لوست: د مور دریځ'),
  (23,'pashto-g11-l23','درویشتم لوست: محاوره (جومات او ښوونځی)'),
  (24,'pashto-g11-l24','څلورویشتم لوست: پښتو قاموسونه'),
  (25,'pashto-g11-l25','پنځه ویشتم لوست: محاوره (د ژبې د زده کړې اهمیت)'),
  (26,'pashto-g11-l26','شپږویشتم لوست: سکندر خان خټک'),
  (27,'pashto-g11-l27','اووه ویشتم لوست: سوله'),
  (28,'pashto-g11-l28','اته ویشتم لوست: وروستی لوست')
) AS v(lesson_no,code,title_ps) ON true
WHERE b."code"='pashto-grade-11-dari-speakers-1398' AND c."number"=1
AND NOT EXISTS (SELECT 1 FROM "topics" t WHERE t."chapter_id"=c."id" AND t."code"=v.code);

-- Physics: eight official chapters. Chapter-level topics for initial navigation.
INSERT INTO "chapters" ("book_id","number","title_fa","title_ps","active","sort_order","created_at","updated_at")
SELECT b."id",v.number,v.title_fa,NULL,true,v.number,now(),now()
FROM "books" b
CROSS JOIN (VALUES
  (1,'تعادل میخانیکی'),
  (2,'حرکت یک‌بعدی'),
  (3,'حرکت‌های دوبعدی'),
  (4,'قوانین حرکت نیوتن'),
  (5,'کار، انرژی میخانیکی و طاقت'),
  (6,'مومنتم خطی و امپولس'),
  (7,'سکون نسبی سیال‌ها'),
  (8,'سیال‌های متحرک')
) AS v(number,title_fa)
WHERE b."code"='physics-grade-11-fa-1399'
ON CONFLICT ("book_id","number") DO UPDATE SET
  "title_fa"=EXCLUDED."title_fa","active"=true,"sort_order"=EXCLUDED."sort_order","updated_at"=now();

INSERT INTO "topics" ("chapter_id","code","title_fa","title_ps","active","sort_order","created_at","updated_at")
SELECT c."id",'physics-g11-c'||lpad(c."number"::text,2,'0'),c."title_fa",NULL,true,1,now(),now()
FROM "chapters" c JOIN "books" b ON b."id"=c."book_id"
WHERE b."code"='physics-grade-11-fa-1399'
AND NOT EXISTS (SELECT 1 FROM "topics" t WHERE t."chapter_id"=c."id" AND t."code"='physics-g11-c'||lpad(c."number"::text,2,'0'));
