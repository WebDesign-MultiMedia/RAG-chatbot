import Image from "next/image"
import type { Message } from "ai/react"
import logo from "../assets/nycTrans.webp"

type BubbleProps = {
    message: Pick<Message, "content" | "role">
}

export const Avatar = () => (
    <span className="avatar" aria-hidden="true">
        <Image src={logo} alt="" width={28} height={28} />
    </span>
)

const Bubble = ({ message }: BubbleProps) => {
    const { content, role } = message
    return (
        <div className={`msg ${role}`}>
            {role === "assistant" && <Avatar />}
            <div className={`${role} bubble`}>{content}</div>
        </div>
    )
}

export default Bubble
