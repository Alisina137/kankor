-- Grade 11 official Dari textbooks: Biology, Chemistry, Dari, Geography, History.
-- Sources: user-provided Ministry of Education PDFs.
-- Curriculum structure only; no questions are invented by this migration.

INSERT INTO "subjects" ("code","name_fa","name_ps","active","sort_order","created_at","updated_at")
VALUES
  ('biology','بیولوژی',NULL,true,70,now(),now()),
  ('chemistry','کیمیا',NULL,true,80,now(),now()),
  ('dari','دری',NULL,true,90,now(),now()),
  ('geography','جغرافیه',NULL,true,100,now(),now()),
  ('history','تاریخ',NULL,true,50,now(),now())
ON CONFLICT ("code") DO UPDATE SET
  "name_fa"=EXCLUDED."name_fa","active"=true,"sort_order"=EXCLUDED."sort_order","updated_at"=now();

INSERT INTO "books" (
  "subject_id","grade_id","code","title_fa","title_ps","edition_year",
  "source_metadata","active","sort_order","created_at","updated_at"
)
SELECT s."id",g."id",v.code,v.title_fa,NULL,v.edition_year,v.source_metadata,true,v.sort_order,now(),now()
FROM "grades" g
JOIN (
  VALUES
    ('biology','biology-grade-11-fa-1398','بیولوژی صنف یازدهم',1398,
      '{"publisher":"ریاست ارتباط و آگاهی عامه وزارت معارف","curriculumDeveloper":"ریاست عمومی انکشاف نصاب تعلیمی و تألیف کتب درسی","language":"fa","sourceFilename":"G11-Dr-Biology.pdf","sourceType":"official_textbook","pages":170}'::jsonb,30),
    ('chemistry','chemistry-grade-11-fa-1398','کیمیا صنف یازدهم',1398,
      '{"publisher":"ریاست ارتباط و آگاهی عامه وزارت معارف","curriculumDeveloper":"ریاست عمومی انکشاف نصاب تعلیمی و تألیف کتب درسی","language":"fa","sourceFilename":"G11-Dr-Chemistry.pdf","sourceType":"official_textbook","pages":242}'::jsonb,40),
    ('dari','dari-grade-11-fa-1399','زبان و ادبیات دری صنف یازدهم',1399,
      '{"publisher":"ریاست ارتباط و آگاهی عامه وزارت معارف","curriculumDeveloper":"ریاست عمومی انکشاف نصاب تعلیمی و تألیف کتب درسی","language":"fa","sourceFilename":"G11-Dr-Dari(1).pdf","sourceType":"official_textbook","pages":178}'::jsonb,50),
    ('geography','geography-grade-11-fa-1398','جغرافیه صنف یازدهم',1398,
      '{"publisher":"ریاست ارتباط و آگاهی عامه وزارت معارف","curriculumDeveloper":"ریاست عمومی انکشاف نصاب تعلیمی و تألیف کتب درسی","language":"fa","sourceFilename":"G11-Dr-Geography.pdf","sourceType":"official_textbook","pages":194}'::jsonb,60),
    ('history','history-grade-11-fa-1398','تاریخ صنف یازدهم',1398,
      '{"publisher":"ریاست ارتباط و آگاهی عامه وزارت معارف","curriculumDeveloper":"ریاست عمومی انکشاف نصاب تعلیمی و تألیف کتب درسی","language":"fa","sourceFilename":"G11-Dr-History.pdf","sourceType":"official_textbook","pages":154}'::jsonb,20)
) AS v(subject_code,code,title_fa,edition_year,source_metadata,sort_order) ON true
JOIN "subjects" s ON s."code"=v.subject_code
WHERE g."number"=11
ON CONFLICT ("code") DO UPDATE SET
  "subject_id"=EXCLUDED."subject_id","grade_id"=EXCLUDED."grade_id","title_fa"=EXCLUDED."title_fa",
  "edition_year"=EXCLUDED."edition_year","source_metadata"=EXCLUDED."source_metadata",
  "active"=true,"sort_order"=EXCLUDED."sort_order","updated_at"=now();

-- Biology — 12 official chapters
INSERT INTO "chapters" ("book_id","number","title_fa","title_ps","active","sort_order","created_at","updated_at")
SELECT b."id",v.number,v.title_fa,NULL,true,v.number,now(),now()
FROM "books" b
CROSS JOIN (VALUES
  (1,'مطالعه حجره و انواع میکروسکوپ‌ها'),
  (2,'ساختمان حجره، حجره پروکاریوت و یوکاریوت و اعضای حجره یوکاریوت'),
  (3,'حجره و محیط آن، انتقال غیر فعال و انتقال فعال'),
  (4,'ترکیب کیمیایی'),
  (5,'تنفس حجروی'),
  (6,'دوران حجره و تقسیم حجروی'),
  (7,'طبقه‌بندی حیوانات غیر فقاریه و مشخصات آن‌ها'),
  (8,'مقایسه سیستم‌های حیوانات غیر فقاریه'),
  (9,'حیوانات فقاریه و مشخصات حیوانات فقاریه'),
  (10,'مقایسه سیستم‌های فقاریه'),
  (11,'عمل متقابل بین جمعیت‌ها'),
  (12,'بایوم‌ها')
) AS v(number,title_fa)
WHERE b."code"='biology-grade-11-fa-1398'
ON CONFLICT ("book_id","number") DO UPDATE SET "title_fa"=EXCLUDED."title_fa","active"=true,"sort_order"=EXCLUDED."sort_order","updated_at"=now();

INSERT INTO "topics" ("chapter_id","code","title_fa","title_ps","active","sort_order","created_at","updated_at")
SELECT c."id",'biology-g11-c'||lpad(c."number"::text,2,'0'),c."title_fa",NULL,true,1,now(),now()
FROM "chapters" c JOIN "books" b ON b."id"=c."book_id"
WHERE b."code"='biology-grade-11-fa-1398'
AND NOT EXISTS (SELECT 1 FROM "topics" t WHERE t."chapter_id"=c."id" AND t."code"='biology-g11-c'||lpad(c."number"::text,2,'0'));

-- Chemistry — 11 official chapters
INSERT INTO "chapters" ("book_id","number","title_fa","title_ps","active","sort_order","created_at","updated_at")
SELECT b."id",v.number,v.title_fa,NULL,true,v.number,now(),now()
FROM "books" b
CROSS JOIN (VALUES
  (1,'غلظت محلول‌ها'),
  (2,'خواص محلول‌ها'),
  (3,'سرعت تعاملات کیمیاوی'),
  (4,'تعادل کیمیاوی'),
  (5,'محلول‌های آبی تیزاب‌ها و القلی‌ها'),
  (6,'تعاملات تیزاب‌ها و القلی‌ها'),
  (7,'تولید برق از تعاملات کیمیاوی'),
  (8,'تجزیه برقی'),
  (9,'فلزات'),
  (10,'غیر فلزات'),
  (11,'عناصر شبه فلزات')
) AS v(number,title_fa)
WHERE b."code"='chemistry-grade-11-fa-1398'
ON CONFLICT ("book_id","number") DO UPDATE SET "title_fa"=EXCLUDED."title_fa","active"=true,"sort_order"=EXCLUDED."sort_order","updated_at"=now();

INSERT INTO "topics" ("chapter_id","code","title_fa","title_ps","active","sort_order","created_at","updated_at")
SELECT c."id",'chemistry-g11-c'||lpad(c."number"::text,2,'0'),c."title_fa",NULL,true,1,now(),now()
FROM "chapters" c JOIN "books" b ON b."id"=c."book_id"
WHERE b."code"='chemistry-grade-11-fa-1398'
AND NOT EXISTS (SELECT 1 FROM "topics" t WHERE t."chapter_id"=c."id" AND t."code"='chemistry-g11-c'||lpad(c."number"::text,2,'0'));

-- Dari — 28 official lessons under one structural chapter
INSERT INTO "chapters" ("book_id","number","title_fa","title_ps","active","sort_order","created_at","updated_at")
SELECT b."id",1,'درس‌های زبان و ادبیات دری صنف یازدهم',NULL,true,1,now(),now()
FROM "books" b WHERE b."code"='dari-grade-11-fa-1399'
ON CONFLICT ("book_id","number") DO UPDATE SET "title_fa"=EXCLUDED."title_fa","active"=true,"updated_at"=now();

INSERT INTO "topics" ("chapter_id","code","title_fa","title_ps","active","sort_order","created_at","updated_at")
SELECT c."id",v.code,v.title_fa,NULL,true,v.sort_order,now(),now()
FROM "chapters" c JOIN "books" b ON b."id"=c."book_id"
JOIN (VALUES
 ('dari-g11-l01','درس اول: حمد',1),
 ('dari-g11-l02','درس دوم: سالار پیامبران',2),
 ('dari-g11-l03','درس سوم: زبان و ادبیات چیست؟',3),
 ('dari-g11-l04','درس چهارم: فولکلور و ادبیات',4),
 ('dari-g11-l05','درس پنجم: بهار',5),
 ('dari-g11-l06','درس ششم: فیض محمد کاتب هزاره',6),
 ('dari-g11-l07','درس هفتم: شعر و اقسام محتوایی آن',7),
 ('dari-g11-l08','درس هشتم: علم بیان',8),
 ('dari-g11-l09','درس نهم: انجمن‌های ادبی افغانستان',9),
 ('dari-g11-l10','درس دهم: نکوهش ظلم',10),
 ('dari-g11-l11','درس یازدهم: درخت بی‌بر',11),
 ('dari-g11-l12','درس دوازدهم: فارسی یا دری',12),
 ('dari-g11-l13','درس سیزدهم: نقش زنان در ادبیات معاصر دری',13),
 ('dari-g11-l14','درس چهاردهم: علامه صلاح‌الدین سلجوقی',14),
 ('dari-g11-l15','درس پانزدهم: نقش مسلمانان در تکامل علوم',15),
 ('dari-g11-l16','درس شانزدهم: روابط اجتماعی',16),
 ('dari-g11-l17','درس هفدهم: علم و عقل',17),
 ('dari-g11-l18','درس هژدهم: اندرزهای اخلاقی',18),
 ('dari-g11-l19','درس نزدهم: حکایت',19),
 ('dari-g11-l20','درس بیستم: نقش رسانه‌ها در بیداری اذهان عامه',20),
 ('dari-g11-l21','درس بیست و یکم: ادبیات دری در قرون 11 و 12',21),
 ('dari-g11-l22','درس بیست و دوم: تولستوی',22),
 ('dari-g11-l23','درس بیست و سوم: چرس و اضرار آن',23),
 ('dari-g11-l24','درس بیست و چهارم: واژه‌یابی در فرهنگ‌های زبان',24),
 ('dari-g11-l25','درس بیست و پنجم: تأثیرات روانی ماین‌ها',25),
 ('dari-g11-l26','درس بیست و ششم: مولانا خسته و تذکره‌نگاری',26),
 ('dari-g11-l27','درس بیست و هفتم: مردان پارو پامیزاد',27),
 ('dari-g11-l28','درس بیست و هشتم: سیاست‌نامه',28)
) AS v(code,title_fa,sort_order) ON true
WHERE b."code"='dari-grade-11-fa-1399' AND c."number"=1
AND NOT EXISTS (SELECT 1 FROM "topics" t WHERE t."chapter_id"=c."id" AND t."code"=v.code);

-- Geography — 7 chapters / 54 official lessons
INSERT INTO "chapters" ("book_id","number","title_fa","title_ps","active","sort_order","created_at","updated_at")
SELECT b."id",v.number,v.title_fa,NULL,true,v.number,now(),now()
FROM "books" b CROSS JOIN (VALUES
 (1,'زراعت و مالداری'),(2,'انرژی و معادن'),(3,'صنایع و تجارت'),
 (4,'آب و زراعت'),(5,'انرژی'),(6,'معادن و صنایع'),(7,'تجارت و توریزم')
) AS v(number,title_fa)
WHERE b."code"='geography-grade-11-fa-1398'
ON CONFLICT ("book_id","number") DO UPDATE SET "title_fa"=EXCLUDED."title_fa","active"=true,"sort_order"=EXCLUDED."sort_order","updated_at"=now();

INSERT INTO "topics" ("chapter_id","code","title_fa","title_ps","active","sort_order","created_at","updated_at")
SELECT c."id",v.code,v.title_fa,NULL,true,v.lesson_number,now(),now()
FROM "chapters" c JOIN "books" b ON b."id"=c."book_id"
JOIN (VALUES
 (1,1,'geography-g11-l01','درس اول: زراعت و اهمیت اقتصادی آن'),
 (1,2,'geography-g11-l02','درس دوم: شیوه‌های زراعت'),
 (1,3,'geography-g11-l03','درس سوم: تولیدات مهم زراعتی'),
 (1,4,'geography-g11-l04','درس چهارم: توزیع جغرافیایی زراعت'),
 (1,5,'geography-g11-l05','درس پنجم: مالداری و اهمیت اقتصادی آن'),
 (1,6,'geography-g11-l06','درس ششم: شیوه‌های مالداری'),
 (1,7,'geography-g11-l07','درس هفتم: حیوانات وحشی'),
 (1,8,'geography-g11-l08','درس هشتم: بررسی وضعیت زراعت و مالداری در افغانستان'),
 (2,9,'geography-g11-l09','درس نهم: انرژی و اهمیت آن'),
 (2,10,'geography-g11-l10','درس دهم: منابع انرژی قابل تجدید و غیر قابل تجدید'),
 (2,11,'geography-g11-l11','درس یازدهم: برق'),
 (2,12,'geography-g11-l12','درس دوازدهم: برق آبی'),
 (2,13,'geography-g11-l13','درس سیزدهم: برق حرارتی'),
 (2,14,'geography-g11-l14','درس چهاردهم: زغال سنگ و معادن آن در کشور'),
 (2,15,'geography-g11-l15','درس پانزدهم: نفت و گاز'),
 (2,16,'geography-g11-l16','درس شانزدهم: حوزه‌های نفت‌خیز کشور'),
 (2,17,'geography-g11-l17','درس هفدهم: فلزات'),
 (2,18,'geography-g11-l18','درس هژدهم: اهمیت اقتصادی معادن فلزات'),
 (2,19,'geography-g11-l19','درس نزدهم: معادن سنگ‌های ساختمانی'),
 (2,20,'geography-g11-l20','درس بیستم: احجار کریمه'),
 (2,21,'geography-g11-l21','درس بیست و یکم: بررسی وضعیت انرژی و معادن'),
 (3,22,'geography-g11-l22','درس بیست و دوم: صنایع و اهمیت آن در افغانستان'),
 (3,23,'geography-g11-l23','درس بیست و سوم: صنایع دستی و صنایع ماشینی'),
 (3,24,'geography-g11-l24','درس بیست و چهارم: توریسم و اهمیت اقتصادی آن'),
 (3,25,'geography-g11-l25','درس بیست و پنجم: مناطق توریستی کشور'),
 (3,26,'geography-g11-l26','درس بیست و ششم: تجارت و اهمیت آن'),
 (3,27,'geography-g11-l27','درس بیست و هفتم: تجارت داخلی و خارجی'),
 (3,28,'geography-g11-l28','درس بیست و هشتم: میزان صادرات و واردات کشور'),
 (3,29,'geography-g11-l29','درس بیست و نهم: بانک'),
 (3,30,'geography-g11-l30','درس سی‌ام: نحوه عملکرد بانک'),
 (3,31,'geography-g11-l31','درس سی و یکم: بررسی وضعیت تجارت و صنایع'),
 (4,32,'geography-g11-l32','درس سی و دوم: آب و سرمایه‌گذاری روی آن در جهان'),
 (4,33,'geography-g11-l33','درس سی و سوم: پروژه‌های بزرگ آبیاری و تصفیه آب'),
 (4,34,'geography-g11-l34','درس سی و چهارم: زراعت و روش‌های جدید آن'),
 (4,35,'geography-g11-l35','درس سی و پنجم: میزان تولید انواع محصولات زراعتی در کشورهای پیشرفته جهان'),
 (5,36,'geography-g11-l36','درس سی و ششم: انرژی و اهمیت آن در جهان'),
 (5,37,'geography-g11-l37','درس سی و هفتم: انواع انرژی'),
 (5,38,'geography-g11-l38','درس سی و هشتم: نفت در جهان'),
 (5,39,'geography-g11-l39','درس سی و نهم: گاز طبیعی'),
 (5,40,'geography-g11-l40','درس چهلم: زغال سنگ در جهان'),
 (5,41,'geography-g11-l41','درس چهل و یکم: توزیع جغرافیایی منابع انرژی'),
 (6,42,'geography-g11-l42','درس چهل و دوم: معادن و اهمیت آن در جهان'),
 (6,43,'geography-g11-l43','درس چهل و سوم: شیوه‌های استخراج معادن'),
 (6,44,'geography-g11-l44','درس چهل و چهارم: انواع صنایع و اهمیت آن در جهان'),
 (6,45,'geography-g11-l45','درس چهل و پنجم: عوامل مؤثر در انکشاف صنعتی'),
 (7,46,'geography-g11-l46','درس چهل و ششم: تجارت جهانی و اهمیت آن'),
 (7,47,'geography-g11-l47','درس چهل و هفتم: تجارت جهانی یا بین‌المللی'),
 (7,48,'geography-g11-l48','درس چهل و هشتم: مناطق آزاد تجارتی و مفهوم آن'),
 (7,49,'geography-g11-l49','درس چهل و نهم: سازمان تجارت جهانی'),
 (7,50,'geography-g11-l50','درس پنجاهم: توریسم و اهمیت جهانی آن'),
 (7,51,'geography-g11-l51','درس پنجاه و یکم: مناطق و کشورهای مهم توریستی جهان'),
 (7,52,'geography-g11-l52','درس پنجاه و دوم: منابع جذب توریسم و سازمان جهانی توریسم'),
 (7,53,'geography-g11-l53','درس پنجاه و سوم: حمل و نقل جهانی و اهمیت آن'),
 (7,54,'geography-g11-l54','درس پنجاه و چهارم: انواع حمل و نقل و رقابت‌ها')
) AS v(chapter_number,lesson_number,code,title_fa)
ON v.chapter_number=c."number"
WHERE b."code"='geography-grade-11-fa-1398'
AND NOT EXISTS (SELECT 1 FROM "topics" t WHERE t."chapter_id"=c."id" AND t."code"=v.code);

-- History — 38 listed curriculum topics under one structural chapter
INSERT INTO "chapters" ("book_id","number","title_fa","title_ps","active","sort_order","created_at","updated_at")
SELECT b."id",1,'تاریخ افغانستان و جهان در قرون وسطی و جدید',NULL,true,1,now(),now()
FROM "books" b WHERE b."code"='history-grade-11-fa-1398'
ON CONFLICT ("book_id","number") DO UPDATE SET "title_fa"=EXCLUDED."title_fa","active"=true,"updated_at"=now();

INSERT INTO "topics" ("chapter_id","code","title_fa","title_ps","active","sort_order","created_at","updated_at")
SELECT c."id",v.code,v.title_fa,NULL,true,v.sort_order,now(),now()
FROM "chapters" c JOIN "books" b ON b."id"=c."book_id"
JOIN (VALUES
 ('history-g11-l01','اوضاع عمومی افغانستان مقارن ظهور اسلام',1),
 ('history-g11-l02','ورود و انتشار اسلام در افغانستان',2),
 ('history-g11-l03','افغانستان در عصر اموی‌ها',3),
 ('history-g11-l04','انتقال قدرت از اموی‌ها به عباسی‌ها',4),
 ('history-g11-l05','افغانستان در عصر عباسی‌ها',5),
 ('history-g11-l06','تأثیر متقابل اعراب مسلمان و مردم افغانستان',6),
 ('history-g11-l07','طاهریان و صفاریان',7),
 ('history-g11-l08','سامانیان',8),
 ('history-g11-l09','غزنویان و سلجوقیان',9),
 ('history-g11-l10','غوریان و خوارزم شاهیان',10),
 ('history-g11-l11','مغول‌ها و آل کرت',11),
 ('history-g11-l12','تیمور گورکانی و جانشینانش',12),
 ('history-g11-l13','اقتصاد و فرهنگ در زمان مغولان و تیموریان',13),
 ('history-g11-l14','اوضاع افغانستان قبل از قیام قندهار',14),
 ('history-g11-l15','بابریان و افغانستان',15),
 ('history-g11-l16','صفوی‌ها و افغانستان',16),
 ('history-g11-l17','قیام قندهار به رهبری حاجی میرویس نیکه',17),
 ('history-g11-l18','تشکیل دولت هوتکی در ایران',18),
 ('history-g11-l19','اقتصاد و فرهنگ در دوره هوتکیان',19),
 ('history-g11-l20','شاهان افغانی در هند',20),
 ('history-g11-l21','لودی‌ها و سوری‌ها',21),
 ('history-g11-l22','ایران در قرون وسطی',22),
 ('history-g11-l23','ایران در قرون جدید',23),
 ('history-g11-l24','هند در قرون وسطی',24),
 ('history-g11-l25','هند در قرون جدید',25),
 ('history-g11-l26','علم، فرهنگ و هنر در دوره بابری‌های هند',26),
 ('history-g11-l27','چین در قرون وسطی',27),
 ('history-g11-l28','چین در قرون جدید',28),
 ('history-g11-l29','اوضاع اقتصادی، فرهنگی و هنری چین',29),
 ('history-g11-l30','اروپا در قرون وسطی',30),
 ('history-g11-l31','جنگ‌های صلیبی',31),
 ('history-g11-l32','رنسانس در اروپا',32),
 ('history-g11-l33','تحولات فکری و علمی اروپا در قرون جدید',33),
 ('history-g11-l34','تحولات سیاسی اروپا در قرون جدید',34),
 ('history-g11-l35','انقلاب صنعتی انگلستان',35),
 ('history-g11-l36','تشکیل دولت عثمانی',36),
 ('history-g11-l37','انقلاب استقلال ایالات متحده امریکا',37),
 ('history-g11-l38','زمینه‌های رشد و شکوفایی ایالات متحده امریکا',38)
) AS v(code,title_fa,sort_order) ON true
WHERE b."code"='history-grade-11-fa-1398' AND c."number"=1
AND NOT EXISTS (SELECT 1 FROM "topics" t WHERE t."chapter_id"=c."id" AND t."code"=v.code);
