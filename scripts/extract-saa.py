#!/usr/bin/env python3
"""SAA-C03 기출 PDF에서 문항·해설을 추출해 app/data/*-saa.json 으로 저장한다.

원본 PDF는 상업 자료라 저장소에 포함하지 않는다(.gitignore). 데이터를 다시
만들어야 할 때만 원본을 docs/AWS SAA/ 에 두고 실행한다.

    python3 scripts/extract-saa.py

의존성: pypdf, cryptography (AES 암호화 해제용)
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

try:
    import pypdf
except ImportError:  # pragma: no cover - 실행 환경 안내용
    sys.exit("pypdf 가 필요합니다: python3 -m pip install --user pypdf cryptography")

ROOT = Path(__file__).resolve().parent.parent
PDF_PATH = ROOT / "docs" / "AWS SAA" / "SAA-C03_Examtopics_V18.35_KOR.pdf"
PDF_PASSWORD = "aws1602"
QUESTIONS_OUT = ROOT / "app" / "data" / "questions-saa.json"
EXPLANATIONS_OUT = ROOT / "app" / "data" / "explanations-saa.json"

QUESTION_MARKER = re.compile(r"(?m)^[ \t]*Q(\d+)[ \t]*$")
CHOICE_MARKER = re.compile(r"(?m)^([A-F])[.)][ \t]+")
ANSWER_MARKER = re.compile(r"Answer[ \t]*:[ \t]*")
ANSWER_LETTERS = re.compile(r"^([A-F](?:[ \t]*,[ \t]*[A-F])*)")
EXPLANATION_LABEL = re.compile(r"^\s*설명\s*\d*\s*[:：]\s*[・·]?\s*")
URL_LINE = re.compile(r"^https?://\S+$")


def load_pages() -> list[str]:
    reader = pypdf.PdfReader(str(PDF_PATH))
    if reader.is_encrypted and not reader.decrypt(PDF_PASSWORD):
        sys.exit("PDF 암호 해제에 실패했습니다.")
    return [page.extract_text() or "" for page in reader.pages]


def pages_with_images() -> set[int]:
    """이미지 지문이 있는 페이지 번호(1-based)."""
    reader = pypdf.PdfReader(str(PDF_PATH))
    if reader.is_encrypted:
        reader.decrypt(PDF_PASSWORD)
    found = set()
    for index, page in enumerate(reader.pages):
        try:
            if len(page.images) > 0:
                found.add(index + 1)
        except Exception:
            continue
    return found


def join_lines(raw: str) -> str:
    """PDF 추출 줄바꿈을 복원한다.

    줄 끝에 공백이 남아 있으면 문장이 자연스럽게 이어진 것이므로 공백으로
    잇고, 공백 없이 끊겼으면 URL 등 토큰 중간에서 잘린 것이므로 그대로
    붙인다.
    """
    lines = raw.split("\n")
    out = ""
    for index, line in enumerate(lines):
        if index == 0:
            out = line
            continue
        separator = " " if out.endswith((" ", "\t")) else ""
        out = out.rstrip(" \t") + separator + line.lstrip(" \t")
    return re.sub(r"[ \t]+", " ", out).strip()


def squash(text: str) -> str:
    """중복 판정용으로 공백을 없애고 소문자화한다."""
    return re.sub(r"\s+", "", text).lower()


def split_blocks(text: str) -> list[tuple[int, int, str]]:
    """(문항번호, 시작 오프셋, 본문) 목록."""
    matches = list(QUESTION_MARKER.finditer(text))
    blocks = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        blocks.append((int(match.group(1)), match.start(), text[match.end() : end]))
    return blocks


def parse_choices(stem: str) -> tuple[str, list[str]]:
    markers = list(CHOICE_MARKER.finditer(stem))
    if not markers:
        return join_lines(stem), []

    # A. 부터가 선택지. 그 앞이 지문이다.
    first = next((m for m in markers if m.group(1) == "A"), None)
    if first is None:
        return join_lines(stem), []
    markers = [m for m in markers if m.start() >= first.start()]

    question = join_lines(stem[: first.start()])
    choices = []
    expected = "ABCDEF"
    kept = []
    for marker in markers:
        # 순서대로(A, B, C, ...) 등장하는 마커만 선택지로 인정한다.
        if marker.group(1) == expected[len(kept)]:
            kept.append(marker)
    for index, marker in enumerate(kept):
        end = kept[index + 1].start() if index + 1 < len(kept) else len(stem)
        choices.append(join_lines(stem[marker.end() : end]))
    return question, choices


def parse_explanation(rest: str) -> tuple[str, list[str]]:
    """해설 본문과 참고 링크를 분리한다."""
    lines = rest.split("\n")
    body_lines: list[str] = []
    for line in lines:
        body_lines.append(line)
    body = join_lines("\n".join(body_lines))

    references = re.findall(r"https?://[^\s]+", body)
    for url in references:
        body = body.replace(url, " ")
    body = EXPLANATION_LABEL.sub("", body)
    body = re.sub(r"설명\s*\d*\s*[:：]\s*[・·]?\s*", "\n\n", body)
    body = re.sub(r"[ \t]+", " ", body)
    body = re.sub(r"\n{3,}", "\n\n", body).strip()

    seen = []
    for url in references:
        url = url.rstrip(".,)")
        if url not in seen:
            seen.append(url)
    return body, seen


def main() -> None:
    if not PDF_PATH.exists():
        sys.exit(f"원본 PDF 를 찾을 수 없습니다: {PDF_PATH}")

    pages = load_pages()
    image_pages = pages_with_images()

    # 페이지 경계를 기록해 두면 블록이 어느 페이지에 걸쳐 있는지 알 수 있다.
    offsets = []
    cursor = 0
    for page in pages:
        offsets.append(cursor)
        cursor += len(page) + 1
    text = "\n".join(pages)

    def page_of(offset: int) -> int:
        low, high = 0, len(offsets) - 1
        while low < high:
            mid = (low + high + 1) // 2
            if offsets[mid] <= offset:
                low = mid
            else:
                high = mid - 1
        return low + 1

    questions = []
    explanations = {}
    skipped_images = []
    skipped_malformed = []
    used_ids: set[str] = set()
    seen_questions: dict[str, int] = {}
    skipped_duplicate = []
    skipped_no_explanation = []

    blocks = split_blocks(text)
    for number, offset, block in blocks:
        answer_match = ANSWER_MARKER.search(block)
        if not answer_match:
            skipped_malformed.append((number, "Answer 없음"))
            continue

        stem = block[: answer_match.start()]
        rest = block[answer_match.end() :]

        letters_match = ANSWER_LETTERS.match(rest)
        if not letters_match:
            skipped_malformed.append((number, "정답 문자 파싱 실패"))
            continue
        letters = [item.strip() for item in letters_match.group(1).split(",")]
        rest = rest[letters_match.end() :]

        question_text, choices = parse_choices(stem)
        if len(choices) < 4:
            # 선택지가 이미지로만 제시된 문항(IAM 정책 스크린샷 등).
            skipped_images.append(number)
            continue

        answers = sorted("ABCDEF".index(letter) for letter in letters)
        if any(index >= len(choices) for index in answers):
            skipped_malformed.append((number, "정답이 선택지 범위를 벗어남"))
            continue

        start_page = page_of(offset)
        end_page = page_of(offset + len(block))
        if image_pages & set(range(start_page, end_page + 1)):
            skipped_images.append(number)
            continue

        if not question_text or len(question_text) < 10:
            skipped_malformed.append((number, "지문이 비어 있음"))
            continue

        # 원본 PDF 에 번호가 중복된 문항이 있어 뒤에 나온 쪽에 접미사를 붙인다.
        question_id = f"saa-{number:04d}"
        if question_id in used_ids:
            suffix = 2
            while f"{question_id}-{suffix}" in used_ids:
                suffix += 1
            question_id = f"{question_id}-{suffix}"

        # 원본에 같은 문항이 다른 번호로 중복 수록된 경우가 있다.
        answer_text = "|".join(squash(choices[index]) for index in answers)
        dedupe_key = squash(question_text) + "|" + answer_text
        if dedupe_key in seen_questions:
            skipped_duplicate.append((number, seen_questions[dedupe_key]))
            continue

        # 해설 본문이 없고 참고 링크만 있는 문항도 링크는 남긴다.
        body, references = parse_explanation(rest)
        if not body and not references:
            skipped_no_explanation.append(number)
            continue

        seen_questions[dedupe_key] = number
        used_ids.add(question_id)
        questions.append(
            {
                "id": question_id,
                "source": f"SAA-C03 · Q{number}",
                "question": question_text,
                "choices": choices,
                "answers": answers,
            }
        )

        entry = {}
        if body:
            entry["body"] = body
        if references:
            entry["references"] = references
        explanations[question_id] = entry

    QUESTIONS_OUT.write_text(
        json.dumps(questions, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    EXPLANATIONS_OUT.write_text(
        json.dumps(explanations, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    multi = sum(1 for item in questions if len(item["answers"]) > 1)
    print(f"문항 {len(questions)}개 (복수정답 {multi}개), 해설 {len(explanations)}개")
    print(f"이미지 지문으로 제외: {len(skipped_images)}개 {skipped_images}")
    print(f"중복 문항으로 제외: {len(skipped_duplicate)}개 {skipped_duplicate}")
    print(f"해설 없어 제외: {len(skipped_no_explanation)}개 {skipped_no_explanation}")
    if skipped_malformed:
        print(f"파싱 실패로 제외: {len(skipped_malformed)}개 {skipped_malformed[:20]}")


if __name__ == "__main__":
    main()
