"""Redis cache layer: web-search results and query embeddings are served from the cache,
and a dead Redis behaves like a cache miss instead of breaking requests."""
import fakeredis
import pytest
from django.core.cache import caches
from django.test import override_settings

from config.cache import FailSafeRedisCache
from experiences.models import Experience, Question
from matching import embeddings, websearch
from matching.models import ExperienceSearch

REDIS_CACHE = {
    "default": {
        "BACKEND": "config.cache.FailSafeRedisCache",
        "LOCATION": "redis://fake:6379/0",
        "KEY_PREFIX": "jobpilot-test",
        "OPTIONS": {"socket_connect_timeout": 1, "socket_timeout": 1},
    }
}
TAVILY_RESULT = [{
    "title": "Acme SDE-1 Interview Experience", "url": "https://leetcode.com/discuss/interview-experience/1",
    "content": "Acme SDE-1 rounds: DSA, LLD and a frontend machine coding round.",
}]


@pytest.fixture
def redis_cache():
    """A real RedisCache backend talking to an in-memory fake Redis server."""
    server = fakeredis.FakeServer()
    options = {**REDIS_CACHE["default"]["OPTIONS"], "connection_class": fakeredis.FakeConnection, "server": server}
    with override_settings(CACHES={"default": {**REDIS_CACHE["default"], "OPTIONS": options}}):
        caches["default"].clear()
        yield caches["default"]


@pytest.fixture
def tavily(monkeypatch, settings):
    settings.TAVILY_API_KEY = "test-key"
    calls = []

    def fake_tavily(query):
        calls.append(query)
        return TAVILY_RESULT

    monkeypatch.setattr(websearch, "_tavily", fake_tavily)
    return calls


@pytest.mark.django_db
def test_backend_is_redis(redis_cache):
    assert isinstance(redis_cache, FailSafeRedisCache)
    redis_cache.set("ping", {"ok": 1}, 30)
    assert redis_cache.get("ping") == {"ok": 1}


@pytest.mark.django_db
def test_web_search_served_from_redis(redis_cache, tavily, django_assert_num_queries):
    first = websearch.find_real_experiences("Acme", "SDE-1")
    assert len(first) == 1 and len(tavily) == 1
    assert redis_cache.get("web-exp:acme:sde_1") == first

    with django_assert_num_queries(0):  # second search: Redis only, no database, no API call
        second = websearch.find_real_experiences("ACME", "sde 1")
    assert second == first and len(tavily) == 1


@pytest.mark.django_db
def test_postgres_result_warms_redis(redis_cache, tavily):
    websearch.find_real_experiences("Acme", "SDE-1")
    redis_cache.clear()  # e.g. Redis restarted and lost everything
    again = websearch.find_real_experiences("Acme", "SDE-1")
    assert len(tavily) == 1 and again  # rebuilt from PostgreSQL, not the API
    assert redis_cache.get("web-exp:acme:sde_1") == again


@pytest.mark.django_db
def test_refresh_bypasses_cache(redis_cache, tavily):
    websearch.find_real_experiences("Acme", "SDE-1")
    websearch.find_real_experiences("Acme", "SDE-1", refresh=True)
    assert len(tavily) == 2


@pytest.mark.django_db
def test_query_embedding_cached(redis_cache, monkeypatch):
    calls = []
    monkeypatch.setattr(embeddings, "embed_texts", lambda texts, task: calls.append(texts) or [[0.1, 0.2]])
    assert embeddings.query_embedding("System  Design") == [0.1, 0.2]
    assert embeddings.query_embedding("system design") == [0.1, 0.2]  # same text after normalising
    assert len(calls) == 1


@pytest.mark.django_db
@override_settings(CACHES={"default": {**REDIS_CACHE["default"], "LOCATION": "redis://127.0.0.1:1/0"}})
def test_dead_redis_is_a_cache_miss_not_an_error(tavily, client):
    cache = caches["default"]
    assert cache.get("anything") is None
    assert cache.set("anything", 1) is False
    # The feature still works end to end, straight from the API + PostgreSQL.
    assert websearch.find_real_experiences("Acme", "SDE-1")
    assert ExperienceSearch.objects.count() == 1
    # And throttled API endpoints still answer instead of failing with a 500.
    assert client.get("/api/health/").status_code == 200
    assert client.get("/api/ai/status/").status_code == 200
