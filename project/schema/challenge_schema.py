STRING = {"type": "string"}

CHALLENGE_SCHEMA = {
    "type": "object",
    "required": [
        "course_slug",
        "exercise_type",
        "generated_at",
        "version",
        "total_challenges",
        "challenges"
    ],
    "properties": {
        "course_slug": STRING,

        "exercise_type": {
            "const": "dataset_challenge"
        },

        "generated_at": STRING,

        "version": {
            "type": "integer"
        },

        "total_challenges": {
            "type": "integer",
            "minimum": 1
        },

        "challenges": {
            "type": "array",
            "minItems": 1,

            "items": {
                "type": "object",

                "required": [
                    "id",
                    "title",
                    "dataset_file",
                    "difficulty",
                    "estimated_minutes",
                    "concepts_tested",
                    "context",
                    "instructions",
                    "starter_code",
                    "solution_code",
                    "expected_output",
                    "validation_rules",
                    "learning_outcome"
                ],

                "properties": {

                    "id": STRING,

                    "title": STRING,

                    "dataset_file": STRING,

                    "difficulty": {
                        "enum": [
                            "easy",
                            "medium",
                            "hard"
                        ]
                    },

                    "estimated_minutes": {
                        "type": "integer",
                        "minimum": 1
                    },

                    "concepts_tested": {
                        "type": "array",
                        "minItems": 1,
                        "items": STRING
                    },

                    "context": STRING,

                    "instructions": {
                        "type": "array",
                        "minItems": 1,

                        "items": {
                            "type": "object",

                            "required": [
                                "step",
                                "description",
                                "variable_name"
                            ],

                            "properties": {
                                "step": {
                                    "type": "integer"
                                },

                                "description": STRING,

                                "variable_name": STRING,

                                "hint": STRING
                            }
                        }
                    },

                    "starter_code": STRING,

                    "solution_code": STRING,

                    "expected_output": STRING,

                    "output_description": STRING,

                    "validation_rules": {
                        "type": "object",

                        "required": [
                            "check_type",
                            "tolerance",
                            "key_variables"
                        ],

                        "properties": {

                            "check_type": STRING,

                            "tolerance": {
                                "type": "number"
                            },

                            "key_variables": {
                                "type": "array",
                                "minItems": 1,
                                "items": STRING
                            }
                        }
                    },

                    "hints": {
                        "type": "array",
                        "items": STRING
                    },

                    "answer_reveal_after": {
                        "type": "integer"
                    },

                    "learning_outcome": STRING,

                    "pre_loaded_data": {
                        "type": "object"
                    }
                }
            }
        }
    }
}
