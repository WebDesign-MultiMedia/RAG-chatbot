import OpenAI from "openai";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { DataAPIClient } from '@datastax/astra-db-ts';

const {
    ASTRA_DB_NAMESPACE,
    ASTRA_DB_COLLECTION,
    ASTRA_DB_API_ENDPOINT,
    ASTRA_DB_APPLICATION_TOKEN,
    OPENAI_API_KEY,
} = process.env;

const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

// Cost and abuse limits for the public demo
const MAX_MESSAGE_CHARS = 500;
const MAX_HISTORY_MESSAGES = 10;
const MAX_RESPONSE_TOKENS = 500;
const RATE_LIMIT_MAX_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

// In-memory, per-instance rate limiter. Good enough for a demo: it resets on
// cold starts and isn't shared between serverless instances.
const requestLog = new Map<string, number[]>();

const isRateLimited = (ip: string) => {
    const now = Date.now();
    const recent = (requestLog.get(ip) ?? []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    recent.push(now);
    requestLog.set(ip, recent);

    // Keep the map from growing forever
    if (requestLog.size > 5000) {
        for (const [key, times] of requestLog) {
            if (times.every(t => now - t >= RATE_LIMIT_WINDOW_MS)) requestLog.delete(key);
        }
    }

    return recent.length > RATE_LIMIT_MAX_REQUESTS;
};

const jsonError = (error: string, status: number) =>
    Response.json({ error }, { status });

type ChatMessage = { role: "user" | "assistant"; content: string };

const getDocContext = async (openai: OpenAI, query: string) => {
    if (!ASTRA_DB_APPLICATION_TOKEN || !ASTRA_DB_API_ENDPOINT || !ASTRA_DB_COLLECTION) {
        console.error("[chat] AstraDB env vars missing, answering without retrieved context");
        return "";
    }

    try {
        const embedding = await openai.embeddings.create({
            model: EMBEDDING_MODEL,
            input: query,
            encoding_format: "float"
        });

        const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
        const db = client.db(ASTRA_DB_API_ENDPOINT, { namespace: ASTRA_DB_NAMESPACE });
        const collection = db.collection(ASTRA_DB_COLLECTION);
        const documents = await collection.find({}, {
            sort: {
                $vector: embedding.data[0].embedding,
            },
            limit: 10
        }).toArray();

        return documents.map(doc => doc.text).join("\n---\n");
    } catch (err) {
        console.error("[chat] Vector search failed, answering without retrieved context:", err instanceof Error ? err.message : err);
        return "";
    }
};

export async function POST(req: Request){
    if (!OPENAI_API_KEY) {
        console.error("[chat] OPENAI_API_KEY is not set");
        return jsonError("Server is not configured: missing OPENAI_API_KEY.", 500);
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    if (isRateLimited(ip)) {
        return jsonError("Slow down! Too many questions, try again in a minute.", 429);
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return jsonError("Request body must be JSON.", 400);
    }

    const rawMessages = (body as { messages?: unknown })?.messages;
    if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
        return jsonError("Request must include a non-empty messages array.", 400);
    }

    // Only pass through user/assistant text; never let the client inject system prompts
    const messages: ChatMessage[] = rawMessages
        .filter(m => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
        .map(m => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS * 4) }))
        .slice(-MAX_HISTORY_MESSAGES);

    const latestMessage = messages[messages.length - 1];
    if (!latestMessage || latestMessage.role !== "user" || !latestMessage.content.trim()) {
        return jsonError("The last message must be a non-empty user message.", 400);
    }
    if (latestMessage.content.length > MAX_MESSAGE_CHARS) {
        return jsonError(`Keep it under ${MAX_MESSAGE_CHARS} characters, pal.`, 400);
    }

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const docContext = await getDocContext(openai, latestMessage.content);

    const template = {
        role: "system" as const,
        content: `You are NYC GPT, a streetwise AI assistant who knows everything about New York City — the five boroughs, the subway, the food, the history, the culture, all of it. Answer like a local: confident, direct, a little bit of that NY energy, but always accurate and helpful. Use the context below when it's relevant. If the context doesn't have the answer, just use what you already know about NYC and say so.
        Reply in plain text only, no Markdown (no asterisks, headings or bullet symbols), in one to three short paragraphs.
        Today's date is ${new Date().toISOString().slice(0, 10)}; use it for anything involving ages or "how long ago".
        ---------------------
        START CONTEXT
        ${docContext}
        END CONTEXT
        ---------------------`
    };

    try {
        const response = await openai.chat.completions.create({
            model: CHAT_MODEL,
            stream: true,
            max_tokens: MAX_RESPONSE_TOKENS,
            messages: [template, ...messages]
        });

        const stream = OpenAIStream(response);
        return new StreamingTextResponse(stream);
    } catch (err) {
        const status = err instanceof OpenAI.APIError ? err.status : undefined;
        console.error(`[chat] OpenAI chat completion failed (status ${status ?? "n/a"}):`, err instanceof Error ? err.message : err);
        return jsonError("NYC GPT couldn't reach the language model. Try again shortly.", 503);
    }
}
