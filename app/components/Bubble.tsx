import type { Message } from "ai/react"

type BubbleProps = {
    message: Pick<Message, "content" | "role">
}

const Bubble = ({message}: BubbleProps) =>{
    const {content, role} = message
    return (
        <>
        <div className={`${role} bubble`}>{content}</div>
        </>
    )
}

export default Bubble
