-- Grade 10 History (Dari) — Ministry of Education, print year 1398 SH.
-- Source: user-provided official textbook PDF G10-Dr-History.pdf.
-- This migration imports curriculum structure only: subject, book, chapters, and lessons/topics.

INSERT INTO "subjects" (
  "code", "name_fa", "name_ps", "active", "sort_order", "created_at", "updated_at"
)
VALUES (
  'history', 'تاریخ', NULL, true, 50, now(), now()
)
ON CONFLICT ("code") DO UPDATE SET
  "name_fa" = EXCLUDED."name_fa",
  "active" = true,
  "updated_at" = now();

INSERT INTO "books" (
  "subject_id", "grade_id", "code", "title_fa", "title_ps", "edition_year", "active", "sort_order", "created_at", "updated_at"
)
SELECT
  s."id",
  g."id",
  'history-grade-10-fa-1398',
  'تاریخ صنف دهم',
  NULL,
  1398,
  true,
  10,
  now(),
  now()
FROM "subjects" s
JOIN "grades" g ON g."number" = 10
WHERE s."code" = 'history'
ON CONFLICT ("code") DO UPDATE SET
  "subject_id" = EXCLUDED."subject_id",
  "grade_id" = EXCLUDED."grade_id",
  "title_fa" = EXCLUDED."title_fa",
  "edition_year" = EXCLUDED."edition_year",
  "active" = true,
  "updated_at" = now();

INSERT INTO "chapters" (
  "book_id", "number", "title_fa", "title_ps", "active", "sort_order", "created_at", "updated_at"
)
SELECT b."id", v.number, v.title_fa, NULL, true, v.number, now(), now()
FROM "books" b
CROSS JOIN (
  VALUES
    (1, 'آریایی‌ها'),
    (2, 'مدنیت‌های اولیه در افغانستان'),
    (3, 'مدنیت‌های قدیم جهان'),
    (4, 'تاریخ اسلام')
) AS v(number, title_fa)
WHERE b."code" = 'history-grade-10-fa-1398'
ON CONFLICT ("book_id", "number") DO UPDATE SET
  "title_fa" = EXCLUDED."title_fa",
  "active" = true,
  "sort_order" = EXCLUDED."sort_order",
  "updated_at" = now();

INSERT INTO "topics" (
  "chapter_id", "code", "title_fa", "title_ps", "active", "sort_order", "created_at", "updated_at"
)
SELECT c."id", v.code, v.title_fa, NULL, true, v.sort_order, now(), now()
FROM "chapters" c
JOIN "books" b ON b."id" = c."book_id"
JOIN (
  VALUES
    (1, 'history-g10-l01', 'درس اول: تمدن آریانا', 1),
    (1, 'history-g10-l02', 'درس دوم: مدنیت ویدی', 2),
    (1, 'history-g10-l03', 'درس سوم: مدنیت اوستایی', 3),
    (1, 'history-g10-l04', 'درس چهارم: تاریخ اساطیری افغانستان — حکمرانی پیشدادیان', 4),
    (1, 'history-g10-l05', 'درس پنجم: تاریخ اساطیری افغانستان — حکمرانی کیانیان', 5),
    (1, 'history-g10-l06', 'درس ششم: تاریخ اساطیری افغانستان — سلسله سوم: اسپه', 6),
    (1, 'history-g10-l07', 'درس هفتم: افغانستان قدیم و هخامنشی‌ها', 7),
    (1, 'history-g10-l08', 'درس هشتم: افغانستان قدیم و یونانی‌ها', 8),
    (1, 'history-g10-l09', 'درس نهم: افغانستان قدیم و موریایی‌ها', 9),

    (2, 'history-g10-l10', 'درس دهم: دولت‌های مستقل یونان-باختری', 10),
    (2, 'history-g10-l11', 'درس یازدهم: خصوصیات مدنیت یونان-باختری', 11),
    (2, 'history-g10-l12', 'درس دوازدهم: آی‌خانم، شهر مشهور دوره یونان-باختری', 12),
    (2, 'history-g10-l13', 'درس سیزدهم: ساک‌ها', 13),
    (2, 'history-g10-l14', 'درس چهاردهم: امپراتوری کوشانی‌ها', 14),
    (2, 'history-g10-l15', 'درس پانزدهم: بگرام، پایتخت امپراتوری کوشانی', 15),
    (2, 'history-g10-l16', 'درس شانزدهم: هده، مرکز فرهنگی امپراتوری کوشانیان', 16),
    (2, 'history-g10-l17', 'درس هفدهم: بامیان، مرکز عقیدتی کوشانی‌ها', 17),
    (2, 'history-g10-l18', 'درس هجدهم: کیداریان یا کوشانیان کوچک', 18),
    (2, 'history-g10-l19', 'درس نزدهم: امپراتوری یفتلی‌ها', 19),
    (2, 'history-g10-l20', 'درس بیستم: اوضاع افغانستان مقارن ظهور اسلام', 20),

    (3, 'history-g10-l21', 'درس بیست و یکم: مدنیت‌های قدیم جهان', 21),
    (3, 'history-g10-l22', 'درس بیست و دوم: تمدن بین‌النهرین', 22),
    (3, 'history-g10-l23', 'درس بیست و سوم: تمدن و فرهنگ بین‌النهرین', 23),
    (3, 'history-g10-l24', 'درس بیست و چهارم: تمدن مصر', 24),
    (3, 'history-g10-l25', 'درس بیست و پنجم: فرهنگ و تمدن مصر', 25),
    (3, 'history-g10-l26', 'درس بیست و ششم: تمدن فارس', 26),
    (3, 'history-g10-l27', 'درس بیست و هفتم: تمدن هند', 27),
    (3, 'history-g10-l28', 'درس بیست و هشتم: تمدن چین', 28),
    (3, 'history-g10-l29', 'درس بیست و نهم: تمدن یونان', 29),
    (3, 'history-g10-l30', 'درس سی‌ام: تمدن روم', 30),
    (3, 'history-g10-l31', 'درس سی و یکم: تمدن امریکا', 31),

    (4, 'history-g10-l32', 'درس سی و دوم: اوضاع جهان و شبه جزیره عربستان مقارن ظهور اسلام', 32),
    (4, 'history-g10-l33', 'درس سی و سوم: زندگانی حضرت پیامبر ﷺ از تولد تا بعثت', 33),
    (4, 'history-g10-l34', 'درس سی و چهارم: بیعت عقبه', 34),
    (4, 'history-g10-l35', 'درس سی و پنجم: غزوات', 35),
    (4, 'history-g10-l36', 'درس سی و ششم: صلح حدیبیه — بیعت الرضوان', 36),
    (4, 'history-g10-l37', 'درس سی و هفتم: فتح مکه مکرمه', 37),
    (4, 'history-g10-l38', 'درس سی و هشتم: خلفای راشدین', 38),
    (4, 'history-g10-l39', 'درس سی و نهم: حضرت عمر فاروق', 39),
    (4, 'history-g10-l40', 'درس چهلم: حضرت عثمان', 40),
    (4, 'history-g10-l41', 'درس چهل و یکم: حضرت علی', 41),
    (4, 'history-g10-l42', 'درس چهل و دوم: نگاه مختصری به دوره درخشان خلفای راشدین', 42),
    (4, 'history-g10-l43', 'درس چهل و سوم: امویان', 43),
    (4, 'history-g10-l44', 'درس چهل و چهارم: وضعیت اقتصادی، اداری، فرهنگی و نظامی در زمان اموی‌ها', 44),
    (4, 'history-g10-l45', 'درس چهل و پنجم: عباسیان', 45),
    (4, 'history-g10-l46', 'درس چهل و ششم: اوضاع سیاسی، اداری، فرهنگی و اقتصادی دوره عباسیان', 46)
) AS v(chapter_number, code, title_fa, sort_order)
  ON v.chapter_number = c."number"
WHERE b."code" = 'history-grade-10-fa-1398'
  AND NOT EXISTS (
    SELECT 1
    FROM "topics" existing
    WHERE existing."chapter_id" = c."id"
      AND existing."code" = v.code
  );
