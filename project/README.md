# Project Maintenance & Verification Tools

This directory contains internal utilities and scripts used to maintain curriculum integrity and codebase health.

## ✅ Challenge Verification (`verify_challenges.js`)

This is the primary integration test for the Python execution sandbox. It performs the following for every challenge defined in the curriculum:
1.  **Dependency Check:** Verifies that all files referenced in `pre_loaded_data` actually exist on disk.
2.  **Execution Test:** Runs the provided `solution_code` through the stateless sandbox.
3.  **Rule Validation:** Asserts that all `validation_rules` evaluate to `True`.
4.  **Error Diagnosis:** If a challenge fails, it attempts to diagnose the root cause (e.g., missing imports, undefined variables, syntax errors) and logs it in the report.

**Run the verification:**
```bash
npm run verify-challenges
```
*Outputs to `project/challenge_verification_report.md`.*

## 📐 Schema Validation (`validator.py`)

A Python utility for ensuring that the JSON exercise files follow the required schema and do not contain duplicate IDs or malformed metadata.

**Usage:**
```bash
python project/validator.py path/to/exercises/
```

## 🛠️ Migration Tools

- **`migrate_challenges.js`**: Automatically transforms legacy challenge formats into the new stateless architecture.
- **`fix_wide_gdp.cjs`**: Post-processing script to reshape specific economic datasets required for Pandas melting exercises.
