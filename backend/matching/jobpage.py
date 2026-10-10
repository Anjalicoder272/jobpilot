"""
Read a job description from a link the user pastes (Naukri, company careers page, Greenhouse, Lever...).

Safety: the server fetches the URL, so we block anything that could reach internal machines (SSRF):
only http/https, no private/local/reserved IP addresses (checked again on every redirect), a 10-second
timeout and a 2 MB size limit. Many sites (e.g. LinkedIn) block automatic reading; then we ask the user to paste.
"""
import html
import http.client
import ipaddress
import json
import re
import socket
import time
import urllib.parse
import urllib.request
from html.parser import HTMLParser

MAX_BYTES = 2 * 1024 * 1024
TIMEOUT = 10
TOTAL_DEADLINE = 15
ALLOWED_PORTS = {80, 443, 8080, 8443}


class UnsafeURL(ValueError):
    pass


def _is_public(address: str) -> bool:
    ip = ipaddress.ip_address(address.split("%")[0])
    if ip.version == 6 and ip.ipv4_mapped:
        ip = ip.ipv4_mapped
    return ip.is_global and not ip.is_multicast


def check_url_is_public(url: str) -> None:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        raise UnsafeURL("Use a normal http(s) job link.")
    if parsed.username or parsed.password:
        raise UnsafeURL("That address isn't allowed.")
    try:
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
    except ValueError:
        raise UnsafeURL("That address isn't allowed.")
    if port not in ALLOWED_PORTS:
        raise UnsafeURL("That address isn't allowed.")
    try:
        infos = socket.getaddrinfo(parsed.hostname, port)
    except (socket.gaierror, UnicodeError):
        raise UnsafeURL("That website couldn't be found.")
    if not infos or not all(_is_public(info[4][0]) for info in infos):
        raise UnsafeURL("That address isn't allowed.")


def _verify_peer(sock) -> None:
    # DNS can answer differently between our check and the real connect (DNS rebinding),
    # so the address actually connected to is checked too.
    if not _is_public(sock.getpeername()[0]):
        sock.close()
        raise UnsafeURL("That address isn't allowed.")


class _SafeHTTPConnection(http.client.HTTPConnection):
    def connect(self):
        super().connect()
        _verify_peer(self.sock)


class _SafeHTTPSConnection(http.client.HTTPSConnection):
    def connect(self):
        super().connect()
        _verify_peer(self.sock)


class _SafeHTTPHandler(urllib.request.HTTPHandler):
    def http_open(self, req):
        return self.do_open(_SafeHTTPConnection, req)


class _SafeHTTPSHandler(urllib.request.HTTPSHandler):
    def https_open(self, req):
        return self.do_open(_SafeHTTPSConnection, req, context=self._context)


class SafeRedirectHandler(urllib.request.HTTPRedirectHandler):
    max_redirections = 5

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        check_url_is_public(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def build_safe_opener():
    # Built by hand rather than with build_opener(), which would add proxy support from env vars.
    opener = urllib.request.OpenerDirector()
    for handler in (_SafeHTTPHandler(), _SafeHTTPSHandler(), SafeRedirectHandler(),
                    urllib.request.HTTPErrorProcessor(), urllib.request.HTTPDefaultErrorHandler()):
        opener.add_handler(handler)
    return opener


def _read_limited(response) -> bytes:
    """Read at most MAX_BYTES, and give up after TOTAL_DEADLINE even if the server trickles data."""
    started, chunks, size = time.monotonic(), [], 0
    while size < MAX_BYTES:
        if time.monotonic() - started > TOTAL_DEADLINE:
            raise ValueError("That page took too long to load. Paste the job description instead.")
        chunk = response.read(min(64 * 1024, MAX_BYTES - size))
        if not chunk:
            break
        chunks.append(chunk)
        size += len(chunk)
    return b"".join(chunks)


def _decode(raw: bytes, charset: str | None) -> str:
    try:
        return raw.decode(charset or "utf-8", errors="replace")
    except LookupError:
        return raw.decode("utf-8", errors="replace")


class _TextExtractor(HTMLParser):
    SKIP = {"script", "style", "noscript", "svg", "head", "nav", "footer"}

    def __init__(self):
        super().__init__()
        self.parts, self.skip_depth, self.title, self._in_title = [], 0, "", False
        self.json_ld = []
        self._in_json_ld = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "script" and attrs.get("type") == "application/ld+json":
            self._in_json_ld = True
            return
        if tag == "title":
            self._in_title = True
        if tag in self.SKIP:
            self.skip_depth += 1
        if tag in ("p", "li", "br", "div", "h1", "h2", "h3", "tr"):
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag == "script" and self._in_json_ld:
            self._in_json_ld = False
            return
        if tag == "title":
            self._in_title = False
        if tag in self.SKIP and self.skip_depth:
            self.skip_depth -= 1

    def handle_data(self, data):
        if self._in_json_ld:
            self.json_ld.append(data)
        elif self._in_title:
            self.title += data
        elif not self.skip_depth:
            self.parts.append(data)


def _strip_html(text: str) -> str:
    text = re.sub(r"<br\s*/?>|</p>|</li>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    return html.unescape(text)


def _find_job_posting(blobs: list[str]) -> dict | None:
    """Most job sites embed a schema.org JobPosting in JSON-LD: the cleanest source of the description."""
    for blob in blobs:
        try:
            data = json.loads(blob)
        except ValueError:
            continue
        items = data if isinstance(data, list) else data.get("@graph", [data]) if isinstance(data, dict) else []
        for item in items:
            if isinstance(item, dict) and item.get("@type") in ("JobPosting", ["JobPosting"]):
                return item
    return None


def _tidy(text: str) -> str:
    text = re.sub(r"[ \t\xa0]+", " ", text)
    return re.sub(r"\n\s*\n+", "\n\n", text).strip()


def split_title(page_title: str) -> tuple[str, str]:
    """Turn "Frontend Engineer at Acme — Gurgaon | LinkedIn Jobs" into ("Frontend Engineer", "Acme")."""
    title = re.split(r"\s+[|·]\s+", page_title)[0].strip()      # drop "| LinkedIn Jobs" style suffixes
    title = re.split(r"\s+[—–]\s+", title)[0].strip()             # drop "— City, Country"
    match = re.match(r"(.+?)\s+(?:at|@)\s+(.+)", title)
    if match:
        return match.group(1).strip()[:150], match.group(2).strip()[:120]
    return title[:150], ""


def fetch_job_page(url: str) -> dict:
    """Return {"text", "title", "company"} for a job link, or raise ValueError with a friendly message."""
    if len(url) > 2000:
        raise UnsafeURL("That link is too long.")
    check_url_is_public(url)
    opener = build_safe_opener()
    request = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (JobPilot job-description reader)",
        "Accept": "text/html,application/xhtml+xml",
    })
    try:
        with opener.open(request, timeout=TIMEOUT) as response:
            if "html" not in response.headers.get("Content-Type", "text/html"):
                raise ValueError("That link isn't a web page.")
            raw = _read_limited(response)
            charset = response.headers.get_content_charset()
    except UnsafeURL:
        raise
    except ValueError:
        raise
    except Exception:
        raise ValueError("Couldn't open that link. Paste the job description instead.")

    parser = _TextExtractor()
    parser.feed(_decode(raw, charset))
    posting = _find_job_posting(parser.json_ld)
    if posting and posting.get("description"):
        org = posting.get("hiringOrganization") or {}
        return {
            "text": _tidy(_strip_html(str(posting["description"])))[:12_000],
            "title": str(posting.get("title", ""))[:150],
            "company": str(org.get("name", "") if isinstance(org, dict) else "")[:120],
        }
    text = _tidy("".join(parser.parts))
    if len(text) < 300:
        raise ValueError("This site doesn't let us read the job automatically. "
                         "Please paste the job description instead.")
    role, company = split_title(_tidy(parser.title))
    return {"text": text[:12_000], "title": role, "company": company}
