import os
import sys
import json
import argparse
import pdfplumber

def extract_pdf_pages(pdf_path):
    pages_data = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for i, page in enumerate(pdf.pages):
                text = page.extract_text() or ""
                pages_data.append({"page": i + 1, "text": text})
    except Exception as e:
        print(f"Error extracting PDF {pdf_path}: {e}", file=sys.stderr)
        raise e
    return pages_data

def main():
    parser = argparse.ArgumentParser(description="Extract raw text from course PDFs.")
    parser.add_argument("--slides", required=True, help="Path to slides PDF")
    parser.add_argument("--glossary", help="Path to glossary PDF (optional)")
    parser.add_argument("--course-slug", required=True, help="Course slug")
    args = parser.parse_args()

    try:
        # Extract slides
        slides_pages = extract_pdf_pages(args.slides)
        
        # Extract glossary if provided
        glossary_pages = []
        if args.glossary and os.path.exists(args.glossary):
            glossary_pages = extract_pdf_pages(args.glossary)

        # Output JSON
        result = {
            "course_slug": args.course_slug,
            "total_pages": len(slides_pages),
            "pages": slides_pages,
            "glossary_pages": glossary_pages
        }

        print(json.dumps(result))
        sys.exit(0)

    except Exception as e:
        print(f"Extraction failed: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
