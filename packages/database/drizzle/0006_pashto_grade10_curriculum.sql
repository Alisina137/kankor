-- Grade 10 Pashto (for Dari-speaking students) — Ministry of Education, print year 1398 SH.
-- Source: user-provided official textbook PDF G10-Dr-Pashto(1).pdf.
-- The book is organized as 28 lessons; a single structural chapter groups those lessons for Practice navigation.

INSERT INTO "subjects" (
  "code", "name_fa", "name_ps", "active", "sort_order", "created_at", "updated_at"
)
VALUES (
  'pashto', 'پشتو', 'پښتو', true, 60, now(), now()
)
ON CONFLICT ("code") DO UPDATE SET
  "name_fa" = EXCLUDED."name_fa",
  "name_ps" = EXCLUDED."name_ps",
  "active" = true,
  "updated_at" = now();

INSERT INTO "books" (
  "subject_id", "grade_id", "code", "title_fa", "title_ps", "edition_year",
  "source_metadata", "active", "sort_order", "created_at", "updated_at"
)
SELECT
  s."id",
  g."id",
  'pashto-grade-10-dari-speakers-1398',
  'پشتو صنف دهم (برای دری‌زبانان)',
  'پښتو لسم ټولګی (د دري ژبو لپاره)',
  1398,
  '{"publisher":"د پوهنې وزارت","curriculumDeveloper":"د تعلیمي نصاب د پراختیا او درسي کتابونو د تألیف لوی ریاست","language":"ps","sourceFilename":"G10-Dr-Pashto(1).pdf","sourceType":"official_textbook","pages":178}'::jsonb,
  true,
  20,
  now(),
  now()
FROM "subjects" s
JOIN "grades" g ON g."number" = 10
WHERE s."code" = 'pashto'
ON CONFLICT ("code") DO UPDATE SET
  "subject_id" = EXCLUDED."subject_id",
  "grade_id" = EXCLUDED."grade_id",
  "title_fa" = EXCLUDED."title_fa",
  "title_ps" = EXCLUDED."title_ps",
  "edition_year" = EXCLUDED."edition_year",
  "source_metadata" = EXCLUDED."source_metadata",
  "active" = true,
  "updated_at" = now();

INSERT INTO "chapters" (
  "book_id", "number", "title_fa", "title_ps", "active", "sort_order", "created_at", "updated_at"
)
SELECT
  b."id",
  1,
  'درس‌های کتاب پشتو صنف دهم',
  'د پښتو لسم ټولګي درسونه',
  true,
  1,
  now(),
  now()
FROM "books" b
WHERE b."code" = 'pashto-grade-10-dari-speakers-1398'
ON CONFLICT ("book_id", "number") DO UPDATE SET
  "title_fa" = EXCLUDED."title_fa",
  "title_ps" = EXCLUDED."title_ps",
  "active" = true,
  "updated_at" = now();

INSERT INTO "topics" (
  "chapter_id", "code", "title_fa", "title_ps", "active", "sort_order", "created_at", "updated_at"
)
SELECT c."id", v.code, v.title_fa, v.title_ps, true, v.sort_order, now(), now()
FROM "chapters" c
JOIN "books" b ON b."id" = c."book_id"
JOIN (
  VALUES
    ('pashto-g10-l01', 'درس اول: دعا', 'لومړی لوست: دعا', 1),
    ('pashto-g10-l02', 'درس دوم: نعت', 'دویم لوست: نعت', 2),
    ('pashto-g10-l03', 'درس سوم: عبدالرحمن بابا', 'درېیم لوست: عبدالرحمن بابا', 3),
    ('pashto-g10-l04', 'درس چهارم: بد نیتی (قصهٔ مردمی)', 'څلورم لوست: بد نیتي (ولسي کیسه)', 4),
    ('pashto-g10-l05', 'درس پنجم: نحو پشتو', 'پنځم لوست: پښتو نحوه', 5),
    ('pashto-g10-l06', 'درس ششم: ورزش (گفتگو)', 'شپږم لوست: ورزش (خبرې اترې)', 6),
    ('pashto-g10-l07', 'درس هفتم: نصیحت', 'اووم لوست: نصیحت', 7),
    ('pashto-g10-l08', 'درس هشتم: زرغونه کاکړه (رح)', 'اتم لوست: زرغونه کاکړه (رح)', 8),
    ('pashto-g10-l09', 'درس نهم: وحدت ملی', 'نهم لوست: ملي یووالی', 9),
    ('pashto-g10-l10', 'درس دهم: تاریخچهٔ کوتاه نثر پشتو', 'لسم لوست: د پښتو نثر لنډه تاریخچه', 10),
    ('pashto-g10-l11', 'درس یازدهم: علم بدیع — بخش اول (صنایع لفظی)', 'یوولسم لوست: د بدیع علم — لومړۍ برخه: لفظي صنعتونه', 11),
    ('pashto-g10-l12', 'درس دوازدهم: علم بدیع — بخش دوم (صنایع معنوی)', 'دولسم لوست: د بدیع علم — دویمه برخه: معنوي صنعتونه', 12),
    ('pashto-g10-l13', 'درس سیزدهم: خیرالبیان', 'دیارلسم لوست: خیرالبیان', 13),
    ('pashto-g10-l14', 'درس چهاردهم: عبدالرحمن پژواک', 'څوارلسم لوست: عبدالرحمن پژواک', 14),
    ('pashto-g10-l15', 'درس پانزدهم: میرمن حمیده', 'پنځلسم لوست: میرمن حمیده', 15),
    ('pashto-g10-l16', 'درس شانزدهم: امیر حمزه شینواری', 'شپاړسم لوست: امیر حمزه شینواری', 16),
    ('pashto-g10-l17', 'درس هفدهم: دورهٔ باستانی ادبیات پشتو', 'اوولسم لوست: د پښتو ادبیاتو لرغونې دوره', 17),
    ('pashto-g10-l18', 'درس هجدهم: تاریخچهٔ لویه جرگه‌ها', 'اتلسم لوست: د لویو جرګو تاریخچه', 18),
    ('pashto-g10-l19', 'درس نوزدهم: داستان کوتاه در ادبیات پشتو', 'نولسم لوست: په پښتو ادب کې لنډه کیسه', 19),
    ('pashto-g10-l20', 'درس بیستم: نامه‌های ادبی', 'شلم لوست: ادبي لیکونه', 20),
    ('pashto-g10-l21', 'درس بیست و یکم: سیند (نثر ادبی هنری نو)', 'یوویشتم لوست: سیند (نوی ادبي هنري نثر)', 21),
    ('pashto-g10-l22', 'درس بیست و دوم: محاوره (یادگیری زبان انگلیسی)', 'دوه ویشتم لوست: محاوره (د انګلیسي ژبې د زده کړې)', 22),
    ('pashto-g10-l23', 'درس بیست و سوم: فکر و عمل', 'درویشتم لوست: فکر او عمل', 23),
    ('pashto-g10-l24', 'درس بیست و چهارم: رهنمود آموزشی پاچا خان', 'څلورویشتم لوست: د پاچا خان تعلیمي لارښوونې', 24),
    ('pashto-g10-l25', 'درس بیست و پنجم: مثل‌ها', 'پنځه ویشتم لوست: متلونه', 25),
    ('pashto-g10-l26', 'درس بیست و ششم: محاوره (میراث باستانی و تاریخی کشور)', 'شپږویشتم لوست: محاوره (د هیواد د لرغوني او تاریخي میراث)', 26),
    ('pashto-g10-l27', 'درس بیست و هفتم: محاوره (آموزش عصری و رسمی در کشور)', 'اووه ویشتم لوست: محاوره (په هیواد کې د عصري او رسمي زده کړې)', 27),
    ('pashto-g10-l28', 'درس بیست و هشتم: رسوم پشتنی', 'اته ویشتم لوست: پښتني دودونه', 28)
) AS v(code, title_fa, title_ps, sort_order)
  ON true
WHERE b."code" = 'pashto-grade-10-dari-speakers-1398'
  AND c."number" = 1
  AND NOT EXISTS (
    SELECT 1 FROM "topics" existing
    WHERE existing."chapter_id" = c."id"
      AND existing."code" = v.code
  );
