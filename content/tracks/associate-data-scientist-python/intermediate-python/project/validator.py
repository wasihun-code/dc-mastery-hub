#!/usr/bin/env python3

import json
import sys
from pathlib import Path

from jsonschema import Draft202012Validator
from schema import SCHEMAS


EXPECTED_FILES = {
    "mcq.json",
    "flashcards.json",
    "matching.json",
    "bossbattle.json",
    "ftb.json",
    "challenge.json",
}


def separator():
    print("=" * 80)


def load_json(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return True, json.load(f), None
    except Exception as e:
        return False, None, str(e)


def validate_schema(filename, data):
    schema = SCHEMAS.get(filename)

    if schema is None:
        return [f"No schema registered for {filename}"]

    validator = Draft202012Validator(schema)

    errors = []

    for error in validator.iter_errors(data):
        location = "/".join(
            str(x)
            for x in error.absolute_path
        )

        if not location:
            location = "<root>"

        errors.append(
            f"{location}: {error.message}"
        )

    return sorted(errors)


def count_items(filename, data):

    try:

        if filename == "mcq.json":
            return len(data["questions"])

        if filename == "flashcards.json":
            return len(data["cards"])

        if filename == "matching.json":
            return sum(
                len(r["pairs"])
                for r in data["rounds"]
            )

        if filename == "bossbattle.json":
            return len(data)

        if filename == "ftb.json":
            return len(data)

    except Exception:
        pass

    return 0


# -------------------------------------------------------
# Integrity Checks
# -------------------------------------------------------

def check_duplicate_ids(items):

    ids = []
    duplicates = []

    for item in items:

        item_id = item.get("id")

        if item_id in ids:
            duplicates.append(item_id)

        ids.append(item_id)

    return duplicates


def check_mcq(data):

    errors = []

    questions = data.get("questions", [])

    duplicates = check_duplicate_ids(
        questions
    )

    if duplicates:
        errors.append(
            f"Duplicate IDs: {duplicates}"
        )

    for q in questions:

        qid = q.get("id")

        options = q.get("options", {})

        correct = q.get(
            "correct_option"
        )

        if correct not in options:
            errors.append(
                f"{qid}: correct_option "
                f"'{correct}' not found "
                f"in options"
            )

    expected = data.get(
        "total_questions"
    )

    if expected is not None:

        actual = len(questions)

        if expected != actual:
            errors.append(
                f"total_questions "
                f"mismatch "
                f"(expected={expected}, "
                f"actual={actual})"
            )

    return errors


def check_flashcards(data):

    errors = []

    cards = data.get("cards", [])

    duplicates = check_duplicate_ids(
        cards
    )

    if duplicates:
        errors.append(
            f"Duplicate IDs: {duplicates}"
        )

    all_ids = {
        c.get("id")
        for c in cards
    }

    for card in cards:

        card_id = card.get("id")

        related = card.get(
            "related_card_ids",
            []
        )

        for rel in related:

            if rel not in all_ids:
                errors.append(
                    f"{card_id}: "
                    f"missing related "
                    f"card '{rel}'"
                )

    expected = data.get(
        "total_cards"
    )

    if expected is not None:

        actual = len(cards)

        if expected != actual:
            errors.append(
                f"total_cards mismatch "
                f"(expected={expected}, "
                f"actual={actual})"
            )

    return errors


def check_matching(data):

    errors = []

    all_pairs = []

    for round_obj in data.get(
        "rounds",
        []
    ):
        all_pairs.extend(
            round_obj.get(
                "pairs",
                []
            )
        )

    duplicates = check_duplicate_ids(
        all_pairs
    )

    if duplicates:
        errors.append(
            f"Duplicate IDs: {duplicates}"
        )

    for pair in all_pairs:

        pair_id = pair.get("id")

        match = pair.get("match")

        wrong = pair.get(
            "wrong_matches",
            []
        )

        if match in wrong:
            errors.append(
                f"{pair_id}: correct "
                f"match appears in "
                f"wrong_matches"
            )

        if len(wrong) < 2:
            errors.append(
                f"{pair_id}: fewer than "
                f"2 wrong_matches"
            )

    expected = data.get(
        "total_pairs"
    )

    if expected is not None:

        actual = len(all_pairs)

        if expected != actual:
            errors.append(
                f"total_pairs mismatch "
                f"(expected={expected}, "
                f"actual={actual})"
            )

    return errors


def check_bossbattle(data):

    errors = []

    duplicates = check_duplicate_ids(
        data
    )

    if duplicates:
        errors.append(
            f"Duplicate IDs: {duplicates}"
        )

    for q in data:

        qid = q.get("id")

        options = q.get(
            "options",
            {}
        )

        correct = q.get(
            "correct_option"
        )

        if correct not in options:
            errors.append(
                f"{qid}: invalid "
                f"correct_option"
            )

    return errors


def check_ftb(data):

    errors = []

    duplicates = check_duplicate_ids(
        data
    )

    if duplicates:
        errors.append(
            f"Duplicate IDs: {duplicates}"
        )

    for item in data:

        item_id = item.get("id")

        blanks = item.get(
            "blanks",
            []
        )

        for blank in blanks:

            pos = blank.get(
                "position"
            )

            if (
                not isinstance(
                    pos,
                    int
                )
                or pos <= 0
            ):
                errors.append(
                    f"{item_id}: invalid "
                    f"blank position "
                    f"{pos}"
                )

    return errors


def run_integrity_checks(
    filename,
    data
):

    if filename == "mcq.json":
        return check_mcq(data)

    if filename == "challenge.json":
        return check_challenge(data)

    if filename == "flashcards.json":
        return check_flashcards(
            data
        )

    if filename == "matching.json":
        return check_matching(
            data
        )

    if filename == "bossbattle.json":
        return check_bossbattle(
            data
        )

    if filename == "ftb.json":
        return check_ftb(data)

    return []


def validate_file(path):

    separator()
    print(f"FILE: {path.name}")
    separator()

    valid, data, error = load_json(
        path
    )

    if not valid:

        print("❌ Invalid JSON")
        print(error)

        return

    print("✅ Valid JSON")

    schema_errors = validate_schema(
        path.name,
        data
    )

    if schema_errors:

        print(
            "❌ Schema Validation Failed"
        )

        for err in schema_errors:
            print(
                f"   • {err}"
            )

        return

    print(
        "✅ File Structure Confirmed"
    )

    integrity_errors = (
        run_integrity_checks(
            path.name,
            data
        )
    )

    if integrity_errors:

        print(
            "❌ Integrity Checks Failed"
        )

        for err in integrity_errors:
            print(
                f"   • {err}"
            )

    else:
        print(
            "✅ Integrity Checks Passed"
        )

    print(
        f"📊 Total Items: "
        f"{count_items(path.name, data)}"
    )

def check_challenge(data):

    errors = []

    challenges = data.get(
        "challenges",
        []
    )

    duplicates = check_duplicate_ids(
        challenges
    )

    if duplicates:
        errors.append(
            f"Duplicate IDs: {duplicates}"
        )

    expected = data.get(
        "total_challenges"
    )

    actual = len(challenges)

    if expected != actual:
        errors.append(
            f"total_challenges mismatch "
            f"(expected={expected}, "
            f"actual={actual})"
        )

    return errors

def main():

    if len(sys.argv) != 2:

        print(
            "Usage:\n"
            "python validate_excersies.py "
            "<folder>"
        )

        return

    folder = Path(sys.argv[1])

    if not folder.exists():

        print(
            f"Folder not found: "
            f"{folder}"
        )

        return

    files = sorted(
        folder.glob("*.json")
    )

    if not files:

        print(
            "No files found."
        )

        return

    separator()
    print(
        "EXERCISE VALIDATION REPORT"
    )
    separator()

    for file in files:

        try:
            validate_file(file)

        except Exception as e:

            print(
                f"❌ Error processing "
                f"{file.name}"
            )

            print(str(e))

    found = {
        f.name
        for f in files
    }

    missing = (
        EXPECTED_FILES - found
    )

    print()
    separator()
    print("SUMMARY")
    separator()

    print(
        f"Files Found: "
        f"{len(found)}"
    )

    print(
        f"Files Missing: "
        f"{len(missing)}"
    )

    if missing:

        print()

        for file in sorted(
            missing
        ):
            print(
                f"❌ Missing: "
                f"{file}"
            )

    else:
        print(
            "\n✅ All expected "
            "files present"
        )

    separator()


if __name__ == "__main__":

    try:
        main()

    except Exception as e:

        print(
            f"Fatal Error: {e}"
        )
