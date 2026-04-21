#!/usr/bin/env python3
"""Audit localization coverage and publish-safety risks."""

from __future__ import annotations

import tomllib
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
LOCALES = {
    "en-US": ("en_us", "en"),
    "ja-JP": ("ja_jp", "ja"),
}


def load_toml(path: Path) -> dict:
    return tomllib.loads(path.read_text(encoding="utf-8"))


def non_empty(value) -> bool:
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, list):
        return bool([item for item in value if str(item).strip()])
    return value is not None


def summarize_group(name: str, folder: Path, fields: list[str]) -> None:
    counts = {field: Counter() for field in fields}
    for path in sorted(folder.glob("*.toml")):
        data = load_toml(path)
        for field in fields:
            if non_empty(data.get(field)):
                counts[field]["base"] += 1
            for locale, suffixes in LOCALES.items():
                if any(non_empty(data.get(f"{field}_{suffix}")) for suffix in suffixes):
                    counts[field][locale] += 1

    print(name)
    for field in fields:
        field_counts = counts[field]
        print(
            f"  {field}: "
            f"base={field_counts['base']}, "
            f"en-US={field_counts['en-US']}, "
            f"ja-JP={field_counts['ja-JP']}"
        )
    print()


def audit_required_fields(name: str, folder: Path, fields: list[str]) -> list[str]:
    issues: list[str] = []
    for path in sorted(folder.glob("*.toml")):
        data = load_toml(path)
        slug = str(data.get("slug") or path.stem)
        for field in fields:
            if not non_empty(data.get(field)):
                continue
            for locale, suffixes in LOCALES.items():
                if not any(non_empty(data.get(f"{field}_{suffix}")) for suffix in suffixes):
                    issues.append(f"{name}/{slug}: missing {field} for {locale}")
    return issues


def audit_document_required_coverage() -> list[str]:
    issues: list[str] = []
    for path in sorted((CONTENT / "documents").glob("*.toml")):
        data = load_toml(path)
        slug = str(data.get("slug") or path.stem)
        for field in ["title", "summary"]:
            if not non_empty(data.get(field)):
                continue
            for locale, suffixes in LOCALES.items():
                if not any(non_empty(data.get(f"{field}_{suffix}")) for suffix in suffixes):
                    issues.append(f"documents/{slug}: missing {field} for {locale}")

        if non_empty(data.get("body")) or non_empty(data.get("source_path")):
            for locale, suffixes in LOCALES.items():
                has_localized_body = any(
                    non_empty(data.get(f"body_{suffix}")) or non_empty(data.get(f"source_path_{suffix}"))
                    for suffix in suffixes
                )
                if not has_localized_body:
                    issues.append(f"documents/{slug}: missing body/source_path coverage for {locale}")
    return issues


def audit_project_body_risk() -> None:
    long_fields = ["overview", "problem_solution", "architecture", "stack_notes", "production_notes"]
    metadata_fields = ["name", "headline", "summary"]
    risks: dict[str, list[str]] = defaultdict(list)

    for path in sorted((CONTENT / "projects").glob("*.toml")):
        data = load_toml(path)
        slug = str(data.get("slug") or path.stem)

        for locale, suffixes in LOCALES.items():
            has_localized_metadata = any(
                any(non_empty(data.get(f"{field}_{suffix}")) for suffix in suffixes)
                for field in metadata_fields
            )
            base_present_long_fields = [field for field in long_fields if non_empty(data.get(field))]
            has_complete_long_coverage = all(
                any(non_empty(data.get(f"{field}_{suffix}")) for suffix in suffixes)
                for field in base_present_long_fields
            ) if base_present_long_fields else False
            if has_localized_metadata and not has_complete_long_coverage:
                risks[locale].append(slug)

    print("project body localization risk")
    for locale in LOCALES:
        slugs = risks.get(locale, [])
        print(f"  {locale}: {len(slugs)} project(s) with localized metadata but no localized long fields")
        for slug in slugs[:10]:
            print(f"    - {slug}")
    print()


def audit_document_body_coverage() -> None:
    rows = []
    for path in sorted((CONTENT / "documents").glob("*.toml")):
        data = load_toml(path)
        slug = str(data.get("slug") or path.stem)
        source = str(data.get("source_path") or "").strip()
        localized_body = {locale: False for locale in LOCALES}
        for locale, suffixes in LOCALES.items():
            localized_body[locale] = any(
                non_empty(data.get(f"body_{suffix}")) or non_empty(data.get(f"source_path_{suffix}"))
                for suffix in suffixes
            )
        if source and not any(localized_body.values()):
            rows.append(slug)

    print("document source-only coverage")
    print(f"  base source_path docs without localized body/source_path variants: {len(rows)}")
    for slug in rows[:10]:
        print(f"    - {slug}")
    print()


def main() -> None:
    summarize_group("posts", CONTENT / "posts", ["title", "summary", "body"])
    summarize_group("daily", CONTENT / "daily", ["title", "summary", "body"])
    summarize_group(
        "projects",
        CONTENT / "projects",
        ["name", "headline", "summary", "overview", "problem_solution", "architecture", "stack_notes", "production_notes"],
    )
    summarize_group("documents", CONTENT / "documents", ["title", "summary", "body", "source_path"])
    audit_project_body_risk()
    audit_document_body_coverage()

    issues: list[str] = []
    issues.extend(audit_required_fields("posts", CONTENT / "posts", ["title", "summary", "body"]))
    issues.extend(audit_required_fields("daily", CONTENT / "daily", ["title", "summary", "body"]))
    issues.extend(
        audit_required_fields(
            "projects",
            CONTENT / "projects",
            ["headline", "summary", "overview", "problem_solution", "architecture", "stack_notes", "production_notes"],
        )
    )
    issues.extend(audit_document_required_coverage())

    if issues:
        print("required localization coverage failures")
        for issue in issues:
            print(f"  - {issue}")
        sys.exit(1)

    print("required localization coverage: OK")


if __name__ == "__main__":
    main()
