"""
Limite de rajada por conversa — protege contra um contato malicioso ou um
bug de cliente WhatsApp mandando uma enxurrada de mensagens, o que
esgotaria o teto mensal de IA da empresa (ver `ai_agent._monthly_ai_usage`)
em minutos.

Janela deslizante em memória — mesmo trade-off já aceito em
`message_buffer.py` pra escala atual (uma única instância).
"""
import time

DEFAULT_MAX_CALLS = 20
DEFAULT_WINDOW_SECONDS = 60.0

_hits: dict[str, list[float]] = {}


def allow(key: str, max_calls: int = DEFAULT_MAX_CALLS, window_seconds: float = DEFAULT_WINDOW_SECONDS) -> bool:
    now = time.monotonic()
    hits = [t for t in _hits.get(key, []) if now - t < window_seconds]
    hits.append(now)
    _hits[key] = hits
    return len(hits) <= max_calls
