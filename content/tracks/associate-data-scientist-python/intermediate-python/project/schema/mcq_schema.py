from .common import STRING
MCQ_SCHEMA = {
    "type": "object",
    "required": [
        "course_slug",
        "exercise_type",
        "questions"
    ],
    "properties": {
        "course_slug": STRING,
        "exercise_type": {"const": "mcq"},
        "questions": {
            "type": "array",
            "minItems": 1,
            "items": {
                "type": "object",
                "required": [
                    "id",
                    "concept_id",
                    "question_text",
                    "options",
                    "correct_option"
                ],
                "properties": {
                    "id": STRING,
                    "concept_id": STRING,
                    "question_text": STRING,
                    "correct_option": {
                        "enum": ["a", "b", "c", "d"]
                    },
                    "options": {
                        "type": "object",
                        "required": ["a", "b", "c", "d"],
                        "properties": {
                            "a": STRING,
                            "b": STRING,
                            "c": STRING,
                            "d": STRING
                        }
                    }
                }
            }
        }
    }
}
