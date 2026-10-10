"""
Smart (semantic) search with Gemini embeddings.

An embedding is a list of numbers that represents the *meaning* of a text, so "caching" and
"Redis TTL" end up close together even though they share no words. We store one per question and
compare them with cosine similarity in Python, which is fast enough for thousands of questions
and works on both SQLite and PostgreSQL. (At larger scale this would move to pgvector.)
"""
import json
import logging
import math
import time
import urllib.error
import urllib.request

from django.conf import settings

log = logging.getLogger(__name__)
DIMENSIONS = 768  # full size: noticeably better ranking than 256 in our tests


def embeddings_enabled() -> bool:
    return bool(settings.GEMINI_API_KEY)


def _post_json(url: str, body: dict, retries: int = 3) -> dict:
    """POST to Gemini; on 429 (rate limit) wait and retry, as the free tier allows few calls per minute."""
    for attempt in range(retries + 1):
        request = urllib.request.Request(
            url, data=json.dumps(body).encode(), method="POST",
            headers={"Content-Type": "application/json", "x-goog-api-key": settings.GEMINI_API_KEY},
        )
        try:
            with urllib.request.urlopen(request, timeout=40) as response:
                return json.loads(response.read())
        except urllib.error.HTTPError as error:
            if error.code != 429 or attempt == retries:
                raise
            wait = int(error.headers.get("Retry-After") or 15 * (attempt + 1))
            log.warning("Gemini rate limit hit; retrying in %ss", wait)
            time.sleep(wait)
    raise RuntimeError("unreachable")


def embed_texts(texts: list[str], task: str = "RETRIEVAL_DOCUMENT", batch_size: int = 20) -> list[list[float]]:
    """Return one vector per text. task: RETRIEVAL_DOCUMENT (stored questions) or RETRIEVAL_QUERY (searches)."""
    model = settings.GEMINI_EMBED_MODEL
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:batchEmbedContents"
    vectors = []
    for start in range(0, len(texts), batch_size):
        body = {"requests": [
            {"model": f"models/{model}", "content": {"parts": [{"text": t[:2000]}]},
             "taskType": task, "outputDimensionality": DIMENSIONS}
            for t in texts[start:start + batch_size]
        ]}
        vectors += [e["values"] for e in _post_json(url, body)["embeddings"]]
    return vectors


def cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm = math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b))
    return dot / norm if norm else 0.0


def embed_questions(questions) -> int:
    """Compute and save embeddings for the given Question objects. Returns how many were saved."""
    from experiences.models import Question

    questions = [q for q in questions if q.text]
    if not questions or not embeddings_enabled():
        return 0
    for q, vector in zip(questions, embed_texts([q.text for q in questions])):
        q.embedding = [round(v, 5) for v in vector]
    Question.objects.bulk_update(questions, ["embedding"])
    return len(questions)
