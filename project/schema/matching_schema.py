from .common import STRING
MATCHING_SCHEMA = {
    "type": "object",
    "required": [
        "course_slug",
        "exercise_type",
        "rounds"
    ],
    "properties": {
        "course_slug": STRING,
        "exercise_type": {"const": "matching"},
        "rounds": {
            "type": "array",
            "minItems": 1,
            "items": {
                "type": "object",
                "required": [
                    "round_number",
                    "pairs"
                ],
                "properties": {
                    "round_number": {
                        "type": "integer"
                    },
                    "pairs": {
                        "type": "array",
                        "minItems": 1,
                        "items": {
                            "type": "object",
                            "required": [
                                "id",
                                "term",
                                "match"
                            ],
                            "properties": {
                                "id": STRING,
                                "term": STRING,
                                "match": STRING
                            }
                        }
                    }
                }
            }
        }
    }
}
