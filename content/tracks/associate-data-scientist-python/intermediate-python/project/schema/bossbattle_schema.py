from .common import STRING
BOSS_SCHEMA = {
    "type": "array",
    "minItems": 1,
    "items": {
        "type": "object",
        "required": [
            "id",
            "question_text",
            "options",
            "correct_option"
        ],
        "properties": {
            "id": STRING,
            "question_text": STRING,
            "correct_option": {
                "enum": ["a", "b", "c", "d"]
            },
            "options": {
                "type": "object",
                "required": ["a", "b", "c", "d"]
            }
        }
    }
}
