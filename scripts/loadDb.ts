import { Collection, DataAPIClient, InsertManyError } from "@datastax/astra-db-ts";
import { PuppeteerWebBaseLoader }  from "@langchain/community/document_loaders/web/puppeteer";
import { OpenAI } from "openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

type SimilarityMetric = "dot_product" | "cosine" | "euclidean";

import { config } from "dotenv";
config({ path: ".env.local" });

const {
    ASTRA_DB_NAMESPACE,
    ASTRA_DB_COLLECTION,
    ASTRA_DB_API_ENDPOINT,
    ASTRA_DB_APPLICATION_TOKEN,
    OPENAI_API_KEY,
} = process.env;

const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
const EMBEDDING_DIMENSION = 1536; // text-embedding-3-small
const EMBEDDING_BATCH_SIZE = 100;
const INSERT_BATCH_SIZE = 20;

const RESET = process.argv.includes("--reset");

const missing = Object.entries({
    OPENAI_API_KEY,
    ASTRA_DB_API_ENDPOINT,
    ASTRA_DB_APPLICATION_TOKEN,
    ASTRA_DB_COLLECTION,
}).filter(([, value]) => !value).map(([name]) => name);

if (missing.length) {
    console.error(`Missing env vars in .env.local: ${missing.join(", ")}`);
    process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const nycData = [
    'https://en.wikipedia.org/wiki/New_York_City',
    'https://en.wikipedia.org/wiki/Boroughs_of_New_York_City',
    'https://en.wikipedia.org/wiki/Manhattan',
    'https://en.wikipedia.org/wiki/Brooklyn',
    'https://en.wikipedia.org/wiki/Queens',
    'https://en.wikipedia.org/wiki/The_Bronx',
    'https://en.wikipedia.org/wiki/Staten_Island',
    'https://en.wikipedia.org/wiki/History_of_New_York_City',
    'https://en.wikipedia.org/wiki/Culture_of_New_York_City',
    'https://en.wikipedia.org/wiki/New_York_City_Subway',
    'https://en.wikipedia.org/wiki/Times_Square',
    'https://en.wikipedia.org/wiki/Central_Park',
    'https://en.wikipedia.org/wiki/Statue_of_Liberty',
    'https://en.wikipedia.org/wiki/Brooklyn_Bridge',
    'https://en.wikipedia.org/wiki/Empire_State_Building',
    'https://en.wikipedia.org/wiki/One_World_Trade_Center',
];

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT, { namespace: ASTRA_DB_NAMESPACE });

const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 512,
    chunkOverlap: 100,
});

const getCollection = async (similarityMetric: SimilarityMetric = "dot_product") => {
    const existing = await db.listCollections({ nameOnly: true });
    console.log(`Connected to AstraDB. Collections: ${existing.join(", ") || "(none)"}`);

    if (existing.includes(ASTRA_DB_COLLECTION)) {
        if (!RESET) {
            console.log(`Reusing existing collection "${ASTRA_DB_COLLECTION}"`);
            return db.collection(ASTRA_DB_COLLECTION);
        }
        // Dropping is faster and more reliable than deleteMany on a large collection
        console.log(`--reset: dropping collection "${ASTRA_DB_COLLECTION}"...`);
        await db.dropCollection(ASTRA_DB_COLLECTION);
    }

    console.log(`Creating collection "${ASTRA_DB_COLLECTION}"`);
    return db.createCollection(ASTRA_DB_COLLECTION, {
        vector: {
            dimension: EMBEDDING_DIMENSION,
            metric: similarityMetric,
        },
    });
};

const embedChunks = async (chunks: string[]) => {
    const vectors: number[][] = [];
    for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
        const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
        const res = await openai.embeddings.create({
            model: EMBEDDING_MODEL,
            input: batch,
            encoding_format: "float",
        });
        // Results come back with an index; sort to be safe
        res.data.sort((a, b) => a.index - b.index).forEach(d => vectors.push(d.embedding));
    }
    return vectors;
};

type ChunkDoc = { _id: string; $vector: number[]; text: string; source: string };

// Astra occasionally times out individual writes. Insert in small batches and
// retry only the documents that didn't land; stable _ids prevent duplicates.
const insertWithRetry = async (collection: Collection, docs: ChunkDoc[], attempts = 4) => {
    for (let i = 0; i < docs.length; i += INSERT_BATCH_SIZE) {
        let pending = docs.slice(i, i + INSERT_BATCH_SIZE);
        for (let attempt = 1; pending.length; attempt++) {
            try {
                await collection.insertMany(pending, { ordered: false });
                pending = [];
            } catch (err) {
                if (!(err instanceof InsertManyError)) throw err;
                // Docs that already exist landed on an earlier attempt, so they count as done
                if (err.errorDescriptors.every(d => d.errorCode === "DOCUMENT_ALREADY_EXISTS")) break;
                if (attempt >= attempts) throw err;
                const inserted = new Set(err.partialResult.insertedIds.map(String));
                pending = pending.filter(d => !inserted.has(d._id));
                console.warn(`  write hiccup, retrying ${pending.length} docs (attempt ${attempt + 1}/${attempts})`);
                await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
            }
        }
    }
};

const loadSampleData = async () => {
    const collection = await getCollection();
    let total = 0;

    for (const [i, url] of nycData.entries()) {
        const label = `[${i + 1}/${nycData.length}] ${url}`;
        const content = await scrapePage(url);
        if (!content) {
            console.warn(`${label}: no content found, skipping`);
            continue;
        }

        const chunks = await splitter.splitText(content);
        const vectors = await embedChunks(chunks);
        await insertWithRetry(
            collection,
            chunks.map((chunk, j) => ({ _id: `${url}#${j}`, $vector: vectors[j], text: chunk, source: url }))
        );

        total += chunks.length;
        console.log(`${label}: inserted ${chunks.length} chunks`);
    }

    // countDocuments caps at 1000 server-side, so use the metadata estimate
    const count = await collection.estimatedDocumentCount();
    console.log(`Done. Inserted ${total} chunks this run; collection now has ~${count} documents.`);
};

// Pull readable text from the article body only, dropping scripts, styles,
// navigation, footers and Wikipedia's reference/navbox noise.
const scrapePage = async (url: string) => {
  const loader = new PuppeteerWebBaseLoader(url, {
    launchOptions: {
      headless: true
    },
    gotoOptions: {
      waitUntil: "domcontentloaded"
    },
    evaluate: async (page) => {
      return page.evaluate(() => {
        const root =
          document.querySelector("#mw-content-text .mw-parser-output") ??
          document.querySelector("main") ??
          document.body;
        root.querySelectorAll(
          "script, style, noscript, nav, footer, header, aside, sup.reference, .reflist, .references, .navbox, .infobox, .mw-editsection, .metadata, .hatnote, table"
        ).forEach(el => el.remove());
        return (root as HTMLElement).innerText;
      })
    }
  })
  const text = await loader.scrape();
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

loadSampleData()
    .then(() => process.exit(0))
    .catch(err => {
        console.error("Seeding failed:", err instanceof Error ? err.message : err);
        process.exit(1);
    });
