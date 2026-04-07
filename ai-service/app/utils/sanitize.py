def sanitize_text(value: str, *, max_length: int) -> str:
    if not isinstance(value, str):
        return ""

    cleaned = "".join(
        char for char in value if ord(char) >= 32 or char in "\n\t\r"
    )
    cleaned = " ".join(cleaned.replace("\r", " ").split())
    return cleaned[:max_length].strip()
