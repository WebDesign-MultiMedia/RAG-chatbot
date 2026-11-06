import { Avatar } from "./Bubble"

const LoadingBubble = () => {
    return (
        <div className="msg assistant">
            <Avatar />
            <div className="assistant bubble typing">
                <span className="loader" aria-hidden="true" />
                <span className="visually-hidden">NYC GPT is thinking…</span>
            </div>
        </div>
    )
}

export default LoadingBubble
