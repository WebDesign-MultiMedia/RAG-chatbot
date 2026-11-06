import PromptSuggestionButton from "./PromptSuggestionButton"

type PromptSuggestionRowProps = {
    onPromptClick: (prompt: string) => void
}

const prompts = [
    { badge: "BX", label: "The Bronx", text: "What is the Bronx known for?" },
    { badge: "M", label: "Manhattan", text: "What are the must-see spots in Manhattan?" },
    { badge: "BK", label: "Brooklyn", text: "How was the Brooklyn Bridge built?" },
    { badge: "Q", label: "Queens", text: "Why is Queens so diverse?" },
    { badge: "SI", label: "Staten Island", text: "What's worth seeing on Staten Island?" },
    {
        badge: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="3" width="14" height="14" rx="3" />
                <path d="M5 11h14M9 21l1.5-4M15 21l-1.5-4" />
                <circle cx="9" cy="14" r="0.6" fill="currentColor" />
                <circle cx="15" cy="14" r="0.6" fill="currentColor" />
            </svg>
        ),
        label: "The Subway",
        text: "How old is the NYC subway?",
    },
]

const PromptSuggestionRow = ({ onPromptClick }: PromptSuggestionRowProps) => {
    return (
        <div className="prompt-suggestion-row">
            {prompts.map(p => (
                <PromptSuggestionButton
                    key={p.label}
                    badge={p.badge}
                    label={p.label}
                    text={p.text}
                    onClick={() => onPromptClick(p.text)}
                />
            ))}
        </div>
    )
}

export default PromptSuggestionRow
