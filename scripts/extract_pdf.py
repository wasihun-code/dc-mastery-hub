import os
import sys
import json
import argparse
import time
import pdfplumber
from google import genai
from google.genai import errors

def extract_text(pdf_path, label="PAGE"):
    text_content = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for i, page in enumerate(pdf.pages):
                page_text = page.extract_text()
                if page_text:
                    text_content.append(f"[{label} {i+1}]\n{page_text}\n")
    except Exception as e:
        print(f"Error extracting PDF {pdf_path}: {e}", file=sys.stderr)
    return "\n".join(text_content)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--slides", required=True)
    parser.add_argument("--glossary")
    parser.add_argument("--course-slug", required=True)
    parser.add_argument("--api-key", required=True)
    args = parser.parse_args()

    # 1. Extract Text
    print(f"Extracting text from {args.slides}...", file=sys.stderr)
    full_text = extract_text(args.slides, "PAGE")
    
    if args.glossary:
        print(f"Extracting glossary from {args.glossary}...", file=sys.stderr)
        glossary_text = extract_text(args.glossary, "GLOSSARY")
        full_text += f"\n\n[GLOSSARY SECTION]\n{glossary_text}"

    # 2. Get Persona/Instructions
    script_dir = os.path.dirname(os.path.abspath(__file__))
    persona_path = os.path.join(script_dir, "../agents/pdf-extractor.md")
    
    if not os.path.exists(persona_path):
        print(f"Error: Persona file not found at {persona_path}", file=sys.stderr)
        sys.exit(1)
        
    with open(persona_path, "r") as f:
        persona = f.read()

    # 3. Build Prompt
    try:
        with pdfplumber.open(args.slides) as pdf:
            num_pages = len(pdf.pages)
    except Exception as e:
        print(f"Error opening slides PDF for page count: {e}", file=sys.stderr)
        num_pages = 0

    prompt = f"""{persona}

---

Course: {args.course_slug}
Total pages: {num_pages}

Here is the full extracted text from the course slides:

{full_text}

Extract all concepts from this course material.
Return ONLY valid JSON matching the format in your 
instructions. No markdown, no explanation, just JSON."""

    # 4. Call Gemini API with Retries
    print("Calling Gemini API (gemini-3.5-flash)...", file=sys.stderr)
    
    client = genai.Client(api_key=args.api_key)
    max_retries = 5
    retry_delay = 10 # Initial delay in seconds
    
    for attempt in range(max_retries):
        try:
            # Using gemini-3.5-flash as the latest frontier model in June 2026
            response = client.models.generate_content(
                model='gemini-3.5-flash',
                contents=prompt
            )
            raw = response.text.strip()
            
            # Robust JSON extraction
            json_str = raw
            if "```json" in raw:
                json_str = raw.split("```json")[1].split("```")[0].strip()
            elif "```" in raw:
                json_str = raw.split("```")[1].split("```")[0].strip()
            
            # Parse and add course_slug
            result = json.loads(json_str)
            result["course_slug"] = args.course_slug
            result["total_pages"] = num_pages
            
            # Output to stdout
            print(json.dumps(result))
            return # Success!

        except Exception as e:
            # Check for 429 Resource Exhausted
            err_str = str(e)
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                if attempt < max_retries - 1:
                    print(f"Rate limit hit (429). Retrying in {retry_delay}s... (Attempt {attempt+1}/{max_retries})", file=sys.stderr)
                    time.sleep(retry_delay)
                    retry_delay *= 2 # Exponential backoff
                    continue
                else:
                    print(f"Max retries reached. API error: {e}", file=sys.stderr)
                    sys.exit(1)
            else:
                print(f"Error during API call or processing: {e}", file=sys.stderr)
                sys.exit(1)

if __name__ == "__main__":
    main()
