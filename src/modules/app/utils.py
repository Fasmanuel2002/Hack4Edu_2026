
def classify_prompt(text: str, model: str, client: OpenAI) -> dict:
    """Route a user prompt: does it need repository context, does it want code, and under which file name.

    On the local server thinking is disabled and the reply capped: a routing
    JSON needs no reasoning, and with it every turn lost seconds. OpenAI's
    GPT-5 models reject those parameters, so they are only sent elsewhere.
    Any failure falls back to ``DEFAULT_ROUTE``.
    """
    local_only = {} if is_openai_client(client) else {"extra_body": NO_THINKING_BODY, "max_tokens": 200, "temperature": 0}
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": CLASSIFIER_SYSTEM_PROMPT},
                {"role": "user", "content": text},
            ],
            response_format={"type": "json_object"},
            **local_only,
        )
        data = json.loads(response.choices[0].message.content or "")
    except Exception as error:  # a routing failure must not kill the turn
        print(f"Clasificador: respuesta no válida ({type(error).__name__}: {error}); se usa la ruta por defecto.")
        return dict(DEFAULT_ROUTE)
    wants_code = bool(data.get("wants_code", False))
    return {
        # Generated code must follow the repository's conventions, so it always retrieves.
        "needs_rag": bool(data.get("needs_rag", True)) or wants_code,
        "wants_code": wants_code,
        "suggested_filename": data.get("suggested_filename") or None,
    }
