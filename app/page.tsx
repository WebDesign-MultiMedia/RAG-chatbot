"use client"
import Image from "next/image";
import logo from "./assets/nycTrans.webp";
import React, { useEffect, useRef, useState } from "react";
import {useChat, Message} from "ai/react"
import Bubble from "./components/Bubble";
import LoadingBubble from "./components/LoadingBubbles";
import PromptSuggestionRow from "./components/PromptSuggestionRow";

const MAX_MESSAGE_CHARS = 500

const Home = () => {
    const [hasError, setHasError] = useState(false)
    const lastPrompt = useRef("")
    const endRef = useRef<HTMLDivElement>(null)
    const { append, input, setInput, isLoading, messages, handleInputChange, handleSubmit} = useChat({
        onError: (error) => {
            console.warn("Chat request failed:", error.message)
            setHasError(true)
            // Give the question back so it can be resent
            setInput(lastPrompt.current)
        },
    })

    // Keep the newest message in view while answers stream in
    // (skipped on the empty welcome screen so short phones start at the top)
    useEffect(() => {
        if (messages.length === 0 && !hasError) return
        endRef.current?.scrollIntoView({ block: "end" })
    }, [messages, isLoading, hasError])

    const handlePrompt = (promptText: string) => {
        setHasError(false)
        lastPrompt.current = promptText
        const msg: Message = {
            id: crypto.randomUUID(),
            content: promptText,
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
        <main className="shell">
            <div className="checker" aria-hidden="true" />

            <header className="topbar">
                <Image className="topbar-logo" src={logo} width={40} height={40} alt="" />
                <div className="brand">
                    <span className="wordmark">NYC <span>GPT</span></span>
                    <span className="tagline">Your streetwise guide to the five boroughs</span>
                </div>
                <span className="status"><span className="status-dot" aria-hidden="true" />Online</span>
            </header>

            <section className={noMessages ? "conversation empty" : "conversation"} aria-live="polite">
                {noMessages ? (
                    <div className="hero">
                        <div className="halo">
                            <Image className="hero-logo" src={logo} width={170} height={170} alt="NYC GPT logo" priority />
                        </div>
                        <h1 className="headline">Ask the <span>city.</span></h1>
                        <p className="start-text">
                            Yo, I&apos;m NYC GPT. History, neighborhoods, the subway, the bridges — ask me anything about the five boroughs.
                        </p>
                        <PromptSuggestionRow onPromptClick={handlePrompt}/>
                    </div>
                ) : (
                    <div className="thread">
                        {messages.map((message, index) => <Bubble key={message.id ?? index} message={message}/>)}
                        {isLoading && messages[messages.length - 1]?.role === "user" && <LoadingBubble/>}
                    </div>
                )}
                {hasError && !isLoading && (
                    <div className="thread">
                        <div className="msg assistant">
                            <div className="assistant bubble error" role="alert">
                                NYC GPT is taking a break, try again in a moment.
                            </div>
                        </div>
                    </div>
                )}
                <div ref={endRef} />
            </section>

            <form className="composer" onSubmit={onSubmit}>
                <label htmlFor="question" className="visually-hidden">Ask NYC GPT a question</label>
                <input
                    id="question"
                    aria-label="Ask NYC GPT a question"
                    className="question-box"
                    onChange={handleInputChange}
                    value={input}
                    maxLength={MAX_MESSAGE_CHARS}
                    autoComplete="off"
                    placeholder="Ask me anything about NYC…"/>
                {input.length > 0 && (
                    <span className="counter" aria-hidden="true">{input.length}/{MAX_MESSAGE_CHARS}</span>
                )}
                <button type="submit" aria-label="Send" title="Send" disabled={!canSend}>
                    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M13 6l6 6-6 6"/>
                    </svg>
                </button>
            </form>
            <p className="fineprint">Answers are grounded in NYC Wikipedia articles and may not be perfect.</p>
        </main>
    );
};

export default Home;
