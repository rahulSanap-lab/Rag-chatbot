import os
import json
import logging
from typing import AsyncGenerator, List, Dict, Any, Optional
from app.utils.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an AI Document Assistant.

Answer ONLY using the retrieved document context provided below.

If the answer is not available in the uploaded documents, reply:
"I couldn't find that information in the uploaded documents."

Never make up information.
Always mention the source document and page number if available in your response text."""

class LLMService:
    def __init__(self):
        pass

    def _get_api_key(self) -> str:
        key = os.getenv("GROQ_API_KEY", "").strip() or getattr(settings, "GROQ_API_KEY", "").strip()
        if not key:
            try:
                from dotenv import load_dotenv
                env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
                load_dotenv(dotenv_path=env_path, override=True)
                key = os.getenv("GROQ_API_KEY", "").strip()
            except Exception:
                pass
        if not key:
            raise ValueError(
                "GROQ_API_KEY is not configured. Please open backend/.env and set your Groq API key "
                "(e.g. GROQ_API_KEY=gsk_...). Get a free API key at https://console.groq.com/"
            )
        return key

    def _clean_model_name(self, model_name: str) -> str:
        valid_models = [
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant",
            "deepseek-r1-distill-llama-70b",
            "mixtral-8x7b-32768"
        ]
        if model_name in valid_models:
            return model_name
        return "llama-3.3-70b-versatile"

    def _get_client(self):
        from groq import Groq
        api_key = self._get_api_key()
        return Groq(api_key=api_key)

    def generate_response(
        self,
        prompt: str,
        context: str,
        model_name: str = "llama-3.3-70b-versatile",
        temperature: float = 0.2,
        max_tokens: int = 1024
    ) -> str:
        client = self._get_client()
        full_prompt = f"{SYSTEM_PROMPT}\n\n--- DOCUMENT CONTEXT ---\n{context}\n-----------------------\n\nUser Question: {prompt}\n\nAnswer:"
        model = self._clean_model_name(model_name)

        try:
            response = client.chat.completions.create(
                messages=[{"role": "user", "content": full_prompt}],
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Groq generation error: {e}")
            raise RuntimeError(f"Failed to generate response from Groq ({model}): {str(e)}")

    async def generate_response_stream(
        self,
        prompt: str,
        context: str,
        model_name: str = "llama-3.3-70b-versatile",
        temperature: float = 0.2,
        max_tokens: int = 1024
    ) -> AsyncGenerator[str, None]:
        client = self._get_client()
        full_prompt = f"{SYSTEM_PROMPT}\n\n--- DOCUMENT CONTEXT ---\n{context}\n-----------------------\n\nUser Question: {prompt}\n\nAnswer:"
        model = self._clean_model_name(model_name)

        try:
            stream = client.chat.completions.create(
                messages=[{"role": "user", "content": full_prompt}],
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True
            )
            for chunk in stream:
                content = chunk.choices[0].delta.content
                if content:
                    yield content
        except Exception as e:
            logger.warning(f"Groq stream error: {e}, falling back to single batch generation")
            full_text = self.generate_response(prompt, context, model, temperature, max_tokens)
            yield full_text

    def generate_document_summary(self, text: str) -> str:
        try:
            client = self._get_client()
            prompt = f"Please provide a concise, well-structured executive summary of the following document:\n\n{text[:6000]}"
            response = client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.3-70b-versatile",
                temperature=0.3,
                max_tokens=500
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            return f"Summary generation unavailable: {str(e)}"

    def generate_followup_questions(self, query: str, answer: str) -> List[str]:
        try:
            client = self._get_client()
            prompt = f"Based on the following query and answer, suggest 3 relevant short follow-up questions the user might ask next. Return ONLY a valid JSON array of strings.\n\nQuery: {query}\nAnswer: {answer}"
            response = client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.3-70b-versatile",
                temperature=0.3,
                max_tokens=200
            )
            text = response.choices[0].message.content.strip()
            if text.startswith("```json"):
                text = text[7:].rstrip("`").strip()
            elif text.startswith("```"):
                text = text[3:].rstrip("`").strip()
            return json.loads(text)
        except Exception:
            return [
                "Can you explain more details about this?",
                "What other documents mention this subject?",
                "Could you summarize the main key points?"
            ]

llm_service = LLMService()
