from .common import STRING
FLASHCARD_SCHEMA = {
    "type": "object",
    "required": [
        "course_slug",
        "exercise_type",
        "cards"
    ],
    "properties": {
        "course_slug": STRING,
        "exercise_type": {"const": "flashcards"},
        "cards": {
            "type": "array",
            "minItems": 1,
            "items": {
                "type": "object",
                "required": [
                    "id",
                    "front",
                    "back"
                ],
                "properties": {
                    "id": STRING,
                    "front": STRING,
                    "back": STRING
                }
            }
        }
    }
}
