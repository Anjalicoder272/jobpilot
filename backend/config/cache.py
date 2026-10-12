"""Redis cache that never takes the site down.

Redis is a speed-up, not a source of truth: everything it holds can be rebuilt from PostgreSQL or the
original API. So if Redis is unreachable (free instance restarting, network blip), every cache call
logs a warning and behaves like a cache miss instead of raising, and the request carries on.
"""
import logging

from django.core.cache.backends.redis import RedisCache

log = logging.getLogger(__name__)


def _fail_safe(name: str, default=None):
    method = getattr(RedisCache, name)

    def wrapper(self, *args, **kwargs):
        try:
            return method(self, *args, **kwargs)
        except Exception as error:  # redis.ConnectionError, TimeoutError, ...
            log.warning("Redis %s failed, treating as a cache miss: %s", name, error)
            return default() if callable(default) else default

    wrapper.__name__ = name
    return wrapper


class FailSafeRedisCache(RedisCache):
    def get(self, key, default=None, version=None):
        # On failure return the caller's default: DRF throttles call get(key, []) and need a list back.
        try:
            return super().get(key, default, version)
        except Exception as error:
            log.warning("Redis get failed, treating as a cache miss: %s", error)
            return default

    set = _fail_safe("set", False)
    add = _fail_safe("add", False)  # DRF throttles call add/set; False means "not stored", never a 500
    touch = _fail_safe("touch", False)
    delete = _fail_safe("delete", False)
    get_many = _fail_safe("get_many", dict)
    set_many = _fail_safe("set_many", list)
    delete_many = _fail_safe("delete_many")
    has_key = _fail_safe("has_key", False)
    incr = _fail_safe("incr", 0)
    clear = _fail_safe("clear", False)
