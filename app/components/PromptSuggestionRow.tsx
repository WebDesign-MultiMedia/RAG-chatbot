import PromptSuggestionButton  from "./PromptSuggestionButton"

type PromptSuggestionRowProps = {
    onPromptClick: (prompt: string) => void
}

const PromptSuggestionRow = ({onPromptClick}: PromptSuggestionRowProps) =>{

    const prompts = [
        "Bronx",
        "Manhattan",
        "Brooklyn",
        "Staten Island",
        "Queens",
    ]

    return (
        <>
        <div className="prompt-suggestion-row">
            {prompts.map((prompt, index) => <PromptSuggestionButton key={`suggestion-${index}`}
                text={prompt} onClick={() => onPromptClick(prompt)}/>)}
        </div>
        </>
    )
}

export default PromptSuggestionRow