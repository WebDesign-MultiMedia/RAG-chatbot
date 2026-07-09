# NYC GPT

A retrieval-augmented AI chatbot with real New York City attitude. It answers questions about the five boroughs — the subway, the bridges, the neighborhoods, the history — by pulling context from a vector database and streaming a GPT-4o answer back to you.

Built with Next.js (App Router), the Vercel AI SDK, OpenAI, and DataStax AstraDB.

## How it works

1. `scripts/loadDb.ts` scrapes a set of NYC-related Wikipedia pages, splits the text into chunks, embeds each chunk with OpenAI, and stores the vectors in an AstraDB collection.
2. `app/api/chat/route.ts` embeds the user's latest message, does a vector similarity search against that collection, and stuffs the top matches into a system prompt as context for GPT-4o.
3. `app/page.tsx` is the chat UI — a taxi-yellow-and-black interface with borough prompt suggestions, backed by `useChat` from the `ai` package for streaming responses.

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your own keys:

```bash
cp .env.local.example .env.local
```

| Variable | Description |
| --- | --- |
| `OPENAI_API_KEY` | OpenAI API key, used for embeddings and chat completions |
| `ASTRA_DB_NAMESPACE` | AstraDB keyspace (defaults to `default_keyspace`) |
| `ASTRA_DB_COLLECTION` | Name of the vector collection to create/use, e.g. `nyc_gpt` |
| `ASTRA_DB_API_ENDPOINT` | Your AstraDB database's API endpoint |
| `ASTRA_DB_APPLICATION_TOKEN` | AstraDB application token |

You'll need an [OpenAI account](https://platform.openai.com) and a free [AstraDB database](https://astra.datastax.com) with vector search enabled.

### 3. Seed the vector database

This creates the collection and scrapes/embeds the NYC source pages defined in `scripts/loadDb.ts`:

```bash
npm run seed
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start asking about the boroughs.

## Scripts

- `npm run dev` — start the local dev server
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run seed` — (re)populate the AstraDB vector collection
- `npm run lint` — run ESLint
