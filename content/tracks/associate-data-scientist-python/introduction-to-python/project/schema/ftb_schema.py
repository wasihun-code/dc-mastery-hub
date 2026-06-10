from .common import STRING
FTB_SCHEMA = {
    "type": "array",
    "minItems": 1,
    "items": {
        "type": "object",
        "required": [
            "id",
            "code_template",
            "blanks"
        ],
        "properties": {
            "id": STRING,
            "code_template": STRING,
            "blanks": {
                "type": "array",
                "minItems": 1,
                "items": {
                    "type": "object",
                    "required": [
                        "position",
                        "answer"
                    ],
                    "properties": {
                        "position": {
                            "type": "integer"
                        },
                        "answer": STRING
                    }
                }
            }
        }
    }
}
