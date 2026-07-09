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

export async function POST(req: Request){
    try {
        if (!OPENAI_API_KEY) {
            return new Response(
                "Server is missing OPENAI_API_KEY. Add it to your .env.local file.",
                { status: 500 }
            )
        }

        const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

        const {messages} = await req.json()
        const latestMessage = messages[messages?.length - 1]?.content 

        const embedding = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: latestMessage,
            encoding_format:"float"
        })

        let docContext = "";

        try {
            if (!ASTRA_DB_APPLICATION_TOKEN || !ASTRA_DB_API_ENDPOINT || !ASTRA_DB_COLLECTION) {
                throw new Error("AstraDB environment variables are not configured")
            }

            const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN)
            const db = client.db(ASTRA_DB_API_ENDPOINT, { namespace: ASTRA_DB_NAMESPACE })
            const collection = await db.collection(ASTRA_DB_COLLECTION)
            const cursor = collection.find(null, {
                sort: {
                    $vector: embedding.data[0].embedding,
                },
                limit: 10
            })

            const documents = cursor.toArray()

           const docsMap =  (await documents)?.map(doc => doc.text)

            docContext = JSON.stringify(docsMap)

        } catch (err) {
            console.log("Error querying db...", err);
            docContext = ""
        }

        const template = {
            role: "system",
            content: `You are NYC GPT, a streetwise AI assistant who knows everything about New York City — the five boroughs, the subway, the food, the history, the culture, all of it. Answer like a local: confident, direct, a little bit of that NY energy, but always accurate and helpful. If the context below doesn't have the answer, just use what you already know about NYC and say so.
            ---------------------
            ${docContext}
            END CONTEXT
            ---------------------
            QUESTION: ${latestMessage}`
        }

       const response = await openai.chat.completions.create({
            model: "gpt-4o",
            stream: true,
            messages: [template, ...messages]
        })


        const stream = OpenAIStream(response)
        return new StreamingTextResponse(stream)
    } catch (err){        
        throw err 
    }
}