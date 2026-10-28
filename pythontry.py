import os, time, httpx
from dotenv import load_dotenv

load_dotenv()
BASE = "https://api.runpod.ai/v2/9wtkichoxa6gez"
H = {"Authorization": f"Bearer {os.environ['LLM_API_KEY']}"}
MODEL = "google/gemma-3-4b-it"
STOP = ["<END_OF_RESPONSE>", "[Student Question]:", "#### EXAMPLE",
        "[Reference Blocks]:", "[Tutor Response]:"]
msgs = [{"role": "user", "content": "ping"}]

VARIANTS = {
    "1 minimo": {"model": MODEL, "messages": msgs, "max_tokens": 8},
    "2 +temp+seed": {"model": MODEL, "messages": msgs, "max_tokens": 8,
                     "temperature": 0.0, "seed": 42},
    "3 +stop": {"model": MODEL, "messages": msgs, "max_tokens": 8, "stop": STOP},
    "4 modelo del .env": {"model": os.environ["LLM_MODEL"], "messages": msgs,
                          "max_tokens": 8},
}

with httpx.Client(headers=H, timeout=30) as c:
    for name, payload in VARIANTS.items():
        body = {"input": {"openai_route": "/v1/chat/completions",
                          "openai_input": payload}}
        jid = c.post(f"{BASE}/run", json=body).json()["id"]
        t0 = time.time()
        while True:
            s = c.get(f"{BASE}/status/{jid}").json()
            if s.get("status") in ("COMPLETED", "FAILED", "CANCELLED", "TIMED_OUT"):
                break
            time.sleep(3)
        detail = s.get("error") or s.get("output")
        print(f"{name}: {s['status']} en {time.time()-t0:.0f}s -> {str(detail)[:500]}\n")