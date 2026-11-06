type PromptSuggestionButtonProps = {
    text: string
    onClick: () => void
}

const PromptSuggestionButton = ({text, onClick }: PromptSuggestionButtonProps) =>{
    return(
        <button type="button" className="prompt-suggestion-button" onClick={onClick}>
            {text}
        </button>
    )
}

export default PromptSuggestionButton
