import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = join(here, "..", "..", "..");
loadEnv({ path: join(repositoryRoot, ".env") });

const connectionString = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DIRECT_DATABASE_URL or DATABASE_URL is required in the repository root .env file.");
}

const books = {
  "history-grade-10-fa-1398": {
    language: "fa",
    grade: 10,
    subjectFa: "تاریخ",
    subjectPs: "تاریخ",
    bookFa: "تاریخ صنف دهم",
    bookPs: "د لسم ټولګي تاریخ",
    publisher: "وزارت معارف",
    editionYear: 1398,
    sourceFilename: "G10-Dr-History.pdf",
    startPages: [
      3,5,7,9,11,13,15,17,21,25,29,31,33,35,39,41,43,47,49,53,
      57,59,63,65,69,73,77,81,85,89,93,97,99,103,107,113,117,123,127,129,131,133,135,139,141,145
    ]
  },
  "pashto-grade-10-dari-speakers-1398": {
    language: "ps",
    grade: 10,
    subjectFa: "پشتو",
    subjectPs: "پښتو",
    bookFa: "پشتو صنف دهم (برای دری‌زبانان)",
    bookPs: "پښتو لسم ټولګی (د دري ژبو لپاره)",
    publisher: "د پوهنې وزارت",
    editionYear: 1398,
    sourceFilename: "G10-Dr-Pashto(1).pdf",
    startPages: [
      1,5,9,15,19,27,33,37,41,45,51,57,65,71,77,83,89,99,105,111,117,123,129,133,139,145,151,159
    ]
  }
};

function chooseAlternatives(items, currentIndex, valueFn, count = 3) {
  const result = [];
  for (let offset = 1; result.length < count && offset <= items.length; offset++) {
    const candidate = items[(currentIndex + offset) % items.length];
    const value = valueFn(candidate);
    if (!result.includes(value)) result.push(value);
  }
  return result;
}

function numericAlternatives(value, min, max) {
  const candidates = [value - 1, value + 1, value + 2, value - 2, value + 3, value - 3]
    .filter((candidate) => candidate >= min && candidate <= max && candidate !== value);
  return [...new Set(candidates)].slice(0, 3);
}

function pageAlternatives(value) {
  return [value + 2, Math.max(1, value - 2), value + 4].filter((v, i, a) => v !== value && a.indexOf(v) === i).slice(0, 3);
}

function makeChoices(correct, wrong, correctIndex) {
  const pool = wrong.filter((item) => item !== correct).slice(0, 3);
  while (pool.length < 3) pool.push("—");
  const values = [...pool];
  values.splice(Math.max(0, Math.min(3, correctIndex)), 0, correct);
  const keys = ["A", "B", "C", "D"];
  return {
    choices: values.map((text, index) => ({ key: keys[index], text: String(text) })),
    correctChoice: keys[Math.max(0, Math.min(3, correctIndex))]
  };
}

function faQuestions(ctx) {
  const { topic, topics, topicIndex, chapterTitles, page, config } = ctx;
  const title = topic.title_fa;
  const lessonNumber = topic.sort_order;
  const otherTitles = chooseAlternatives(topics, topicIndex, (item) => item.title_fa);
  const otherChapters = chapterTitles.filter((item) => item !== topic.chapter_title_fa).slice(0, 3);
  while (otherChapters.length < 3) otherChapters.push(["بخش تمرین", "ضمیمه", "مقدمه"][otherChapters.length]);
  const bookWrong = ["پشتو صنف دهم", "فزیک صنف دهم", "جغرافیه صنف دهم"];
  const subjectWrong = ["جغرافیه", "فزیک", "کیمیا"];
  const publisherWrong = ["وزارت تحصیلات عالی", "یک مرکز خصوصی", "دانشگاه کابل"];
  const sourceWrong = ["فورم تاریخی کانکور", "سوال تولیدشده بدون منبع", "جزوه خصوصی"];
  const languageWrong = ["پشتو", "انگلیسی", "عربی"];

  return [
    {
      q: `عنوان درست درس شماره ${lessonNumber} کدام است؟`,
      correct: title, wrong: otherTitles,
      explanation: `طبق فهرست رسمی کتاب، درس شماره ${lessonNumber} «${title}» است.`
    },
    {
      q: `«${title}» درس شماره چندم کتاب است؟`,
      correct: String(lessonNumber), wrong: numericAlternatives(lessonNumber, 1, topics.length).map(String),
      explanation: `این عنوان به درس شماره ${lessonNumber} مربوط است.`
    },
    {
      q: `درس «${title}» مربوط به کدام کتاب است؟`,
      correct: config.bookFa, wrong: bookWrong,
      explanation: `این درس در کتاب رسمی «${config.bookFa}» آمده است.`
    },
    {
      q: `درس «${title}» مربوط به کدام صنف است؟`,
      correct: "صنف دهم", wrong: ["صنف نهم", "صنف یازدهم", "صنف دوازدهم"],
      explanation: "این کتاب برای صنف دهم است."
    },
    {
      q: `مضمون درس «${title}» چیست؟`,
      correct: config.subjectFa, wrong: subjectWrong,
      explanation: `این درس بخشی از مضمون ${config.subjectFa} است.`
    },
    {
      q: `سال چاپ این کتاب درسی کدام است؟`,
      correct: String(config.editionYear), wrong: ["1396", "1397", "1399"],
      explanation: `سال چاپ ثبت‌شده کتاب ${config.editionYear} هجری شمسی است.`
    },
    {
      q: `ناشر کتاب «${config.bookFa}» کدام نهاد است؟`,
      correct: config.publisher, wrong: publisherWrong,
      explanation: `کتاب از سوی ${config.publisher} منتشر شده است.`
    },
    {
      q: `درس «${title}» در فهرست کتاب از کدام صفحه آغاز می‌شود؟`,
      correct: String(page), wrong: pageAlternatives(page).map(String),
      explanation: `بر اساس فهرست کتاب، آغاز این درس صفحه ${page} است.`
    },
    {
      q: "منبع این سوال آزمایشی چیست؟",
      correct: "کتاب درسی رسمی", wrong: sourceWrong,
      explanation: "این بانک اولیه برای آزمایش اپ از ساختار کتاب درسی رسمی ساخته شده است."
    },
    {
      q: `درس «${title}» در کدام فصل قرار دارد؟`,
      correct: topic.chapter_title_fa, wrong: otherChapters,
      explanation: `این درس زیر فصل «${topic.chapter_title_fa}» ثبت شده است.`
    }
  ];
}

function psQuestions(ctx) {
  const { topic, topics, topicIndex, page, config } = ctx;
  const title = topic.title_ps || topic.title_fa;
  const lessonNumber = topic.sort_order;
  const otherTitles = chooseAlternatives(topics, topicIndex, (item) => item.title_ps || item.title_fa);
  return [
    {
      q: `د ${lessonNumber}م لوست سم سرلیک کوم دی؟`,
      correct: title, wrong: otherTitles,
      explanation: `د کتاب د لیک لړ له مخې د ${lessonNumber}م لوست سرلیک «${title}» دی.`
    },
    {
      q: `«${title}» د کتاب څووم لوست دی؟`,
      correct: String(lessonNumber), wrong: numericAlternatives(lessonNumber, 1, topics.length).map(String),
      explanation: `دا د کتاب ${lessonNumber}م لوست دی.`
    },
    {
      q: `«${title}» په کوم کتاب کې دی؟`,
      correct: config.bookPs, wrong: ["د لسم ټولګي تاریخ", "د لسم ټولګي فزیک", "د لسم ټولګي جغرافیه"],
      explanation: `دا لوست د «${config.bookPs}» برخه ده.`
    },
    {
      q: `دا لوست د کوم ټولګي لپاره دی؟`,
      correct: "لسم ټولګی", wrong: ["نهم ټولګی", "یوولسم ټولګی", "دولسم ټولګی"],
      explanation: "دا رسمي درسي کتاب د لسم ټولګي لپاره دی."
    },
    {
      q: `د «${title}» مضمون کوم دی؟`,
      correct: config.subjectPs, wrong: ["تاریخ", "فزیک", "جغرافیه"],
      explanation: `دا لوست د ${config.subjectPs} مضمون برخه ده.`
    },
    {
      q: "د دې کتاب د چاپ کال کوم دی؟",
      correct: String(config.editionYear), wrong: ["1396", "1397", "1399"],
      explanation: `د کتاب د چاپ کال ${config.editionYear} هجري شمسي دی.`
    },
    {
      q: `د «${config.bookPs}» خپروونکی کومه اداره ده؟`,
      correct: config.publisher, wrong: ["د لوړو زده کړو وزارت", "خصوصي ښوونیز مرکز", "کابل پوهنتون"],
      explanation: `کتاب د ${config.publisher} له خوا خپور شوی دی.`
    },
    {
      q: `«${title}» د کتاب په کوم مخ پیلېږي؟`,
      correct: String(page), wrong: pageAlternatives(page).map(String),
      explanation: `د لیک لړ له مخې دا لوست په ${page} مخ پیلېږي.`
    },
    {
      q: "د دې ازمایښتي پوښتنې سرچینه څه ده؟",
      correct: "رسمي درسي کتاب", wrong: ["تاریخي کانکور فورمه", "بې سرچینې تولید شوې پوښتنه", "خصوصي جزوه"],
      explanation: "دا لومړنی ازمایښتي بانک د رسمي درسي کتاب له جوړښت څخه جوړ شوی دی."
    },
    {
      q: `«${title}» د کومې برخې لاندې ثبت شوی؟`,
      correct: topic.chapter_title_ps || topic.chapter_title_fa,
      wrong: ["ضمیمه", "سریزه", "ازمایښتي برخه"],
      explanation: `دا لوست د «${topic.chapter_title_ps || topic.chapter_title_fa}» لاندې ثبت شوی دی.`
    }
  ];
}

const client = new pg.Client({
  connectionString,
  application_name: "kankorprep-initial-test-question-bank"
});

await client.connect();

try {
  await client.query("BEGIN");
  let inserted = 0;
  let skipped = 0;

  for (const [bookCode, config] of Object.entries(books)) {
    const result = await client.query(
      `SELECT
        t.id AS topic_id,
        t.code AS topic_code,
        t.title_fa,
        t.title_ps,
        t.sort_order,
        c.title_fa AS chapter_title_fa,
        c.title_ps AS chapter_title_ps,
        c.number AS chapter_number
      FROM topics t
      JOIN chapters c ON c.id = t.chapter_id
      JOIN books b ON b.id = c.book_id
      WHERE b.code = $1
      ORDER BY t.sort_order ASC`,
      [bookCode]
    );

    const topics = result.rows;
    if (!topics.length) {
      throw new Error(`No topics found for ${bookCode}. Run npm run db:migrate first.`);
    }
    if (topics.length !== config.startPages.length) {
      throw new Error(`Topic/page mapping mismatch for ${bookCode}: ${topics.length} topics vs ${config.startPages.length} pages.`);
    }

    const chapterTitles = [...new Set(topics.map((topic) => topic.chapter_title_fa))];

    for (let topicIndex = 0; topicIndex < topics.length; topicIndex++) {
      const topic = topics[topicIndex];
      const page = config.startPages[topicIndex];
      const questions = config.language === "fa"
        ? faQuestions({ topic, topics, topicIndex, chapterTitles, page, config })
        : psQuestions({ topic, topics, topicIndex, chapterTitles, page, config });

      for (let index = 0; index < questions.length; index++) {
        const item = questions[index];
        const seedKey = `initial-test-bank:${bookCode}:${topic.topic_code}:q${String(index + 1).padStart(2, "0")}`;

        const existing = await client.query(
          `SELECT id FROM questions WHERE source_metadata->>'seedKey' = $1 LIMIT 1`,
          [seedKey]
        );
        if (existing.rowCount) {
          skipped += 1;
          continue;
        }

        const answerIndex = (topicIndex + index) % 4;
        const { choices, correctChoice } = makeChoices(item.correct, item.wrong, answerIndex);
        const sourceMetadata = {
          seedKey,
          sourceBookCode: bookCode,
          sourceFilename: config.sourceFilename,
          sourceType: "official_textbook",
          sourcePage: page,
          lessonNumber: topic.sort_order,
          lessonCode: topic.topic_code,
          purpose: "initial_testing",
          generationMethod: "curriculum_metadata",
          productionReady: false
        };

        await client.query(
          `INSERT INTO questions (
            topic_id, language, question_type, content, choices, correct_choice,
            short_explanation, detailed_explanation, worked_solution, difficulty,
            marks, source_type, source_metadata, verification_status, version,
            created_at, updated_at
          ) VALUES (
            $1, $2, 'single_choice', $3, $4::jsonb, $5,
            $6, $7, NULL, $8,
            '1', 'textbook_test', $9::jsonb, 'published', 1,
            now(), now()
          )`,
          [
            topic.topic_id,
            config.language,
            item.q,
            JSON.stringify(choices),
            correctChoice,
            item.explanation,
            item.explanation,
            index < 5 ? "easy" : "medium",
            JSON.stringify(sourceMetadata)
          ]
        );
        inserted += 1;
      }
    }
  }

  await client.query("COMMIT");
  console.log(`✓ Initial published test bank ready: ${inserted} inserted, ${skipped} already present.`);
  console.log("✓ Expected coverage: 10 published questions per imported lesson for Grade 10 History and Grade 10 Pashto.");
  console.log("ℹ These questions are for initial application testing and are tagged productionReady=false.");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
