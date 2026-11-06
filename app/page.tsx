"use client"
import Image from "next/image";
import f1GPTLogo from "./assets/nycTrans.webp";
import React, { useRef, useState } from "react";
import {useChat, Message} from "ai/react"
import Bubble from "./components/Bubble";
import LoadingBubble from "./components/LoadingBubbles";
import PromptSuggestionRow from "./components/PromptSuggestionRow";

const MAX_MESSAGE_CHARS = 500

const Home = () => {
    const [hasError, setHasError] = useState(false)
    const lastPrompt = useRef("")
    const { append, input, setInput, isLoading, messages, handleInputChange, handleSubmit} = useChat({
        onError: (error) => {
            console.warn("Chat request failed:", error.message)
            setHasError(true)
            // Give the question back so it can be resent
            setInput(lastPrompt.current)
        },
    })

    const handlePrompt = (promtText: string) => {
        setHasError(false)
        lastPrompt.current = promtText
        const msg: Message = {
            id: crypto.randomUUID(),
            content: promtText,
            role: "user"
        }
        append(msg)
    }

    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        setHasError(false)
        lastPrompt.current = input
        handleSubmit(e)
    }

    const noMessages = messages.length === 0
    const canSend = !isLoading && input.trim().length > 0

    return(
        <main>
            <Image className="img" src={f1GPTLogo} width={250} alt="NYC GPT Logo"/>

            <section className={noMessages ? "" : "populated"} aria-live="polite">
                {noMessages ? (
                    <>
                    <p className="start-text">Yo, I&apos;m NYC GPT — ask me anything about the five boroughs.</p>
                    <br/>
                    <PromptSuggestionRow onPromptClick={handlePrompt}/>
                    </>
                ) : (
                    <>
                    {messages.map((message, index) => <Bubble key={message.id ?? index} message={message}/>)}
                    {isLoading && <LoadingBubble/>}
                    </>
                )}
                {hasError && !isLoading && (
                    <div className="assistant bubble error" role="alert">
                        NYC GPT is taking a break, try again in a moment.
                    </div>
                )}
            </section>
            <form onSubmit={onSubmit}>
                    <label htmlFor="question" className="visually-hidden">Ask NYC GPT a question</label>
                    <input
                    id="question"
                    aria-label="Ask NYC GPT a question"
                    className="question-box"
                    onChange={handleInputChange}
                    value={input}
                    maxLength={MAX_MESSAGE_CHARS}
                    placeholder="ask me anything"/>
                    <button type="submit" aria-label="Send" title="Send" disabled={!canSend}>
                        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M13 6l6 6-6 6"/>
                        </svg>
                    </button>
                </form>
        </main>
    );
};

export default Home;
