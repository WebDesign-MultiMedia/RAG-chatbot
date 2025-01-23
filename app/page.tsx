"use client"
import Image from "next/image";
import f1GPTLogo from "./assets/nycTrans.webp";
import React from "react";
import {useChat, Message} from "ai/react"
import Bubble from "./components/Bubble";
import LoadingBubble from "./components/LoadingBubbles";
import PromptSuggestionRow from "./components/PromptSuggestionRow";


const Home = () => {
    const { append, input, isLoading, messages, handleInputChange, handleSubmit} = useChat()

    const handlePrompt = (promtText: string) => {
        const msg: Message = {
            id: crypto.randomUUID(),
            content: promtText,
            role: "user"
        }
        append(msg)
    }

    const noMessages = messages.length === 0 

    return(
        <main>
            <Image className="img" src={f1GPTLogo} width={250} alt="F1GPT Logo"/>

            <section className={noMessages ? "" : "populated"}>
                {noMessages ? (
                    <>
                    <p className="start-text">YERRRRRRR Testing testing  .....</p>
                    <br/>
                    <PromptSuggestionRow onPromptClick={handlePrompt}/>
                    </>
                ) : (
                    <>
                    {messages.map((message, index) => <Bubble key={message.id ?? index} message={message}/>)}
                    {isLoading && <LoadingBubble/>}
                    </>
                )}
            </section>
            <form onSubmit={handleSubmit}>
                    <input 
                    className="question-box" 
                    onChange={handleInputChange} 
                    value={input} 
                    placeholder="ask me anything"/>
                    <button type="submit"> ? </button>
                </form>
        </main>
    );
};

export default Home;