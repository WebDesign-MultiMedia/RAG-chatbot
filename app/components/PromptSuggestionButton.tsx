import type { ReactNode } from "react"

type PromptSuggestionButtonProps = {
    badge: ReactNode
    label: string
    text: string
    onClick: () => void
}

const PromptSuggestionButton = ({ badge, label, text, onClick }: PromptSuggestionButtonProps) => {
    return (
        <button type="button" className="prompt-suggestion-button" onClick={onClick}>
            <span className="badge" aria-hidden="true">{badge}</span>
            <span className="suggestion-copy">
                <span className="suggestion-label">{label}</span>
                <span className="suggestion-text">{text}</span>
            </span>
        </button>
    )
}

export default PromptSuggestionButton
