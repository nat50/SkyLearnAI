"""Chatbot service for student interactions."""
import logging
from .base import BaseLLMService
from .rag import search_chunks

logger = logging.getLogger("ai_core")

CHATBOT_SYSTEM_PROMPT = (
    "You are an expert educational assistant for the SkyLearn Learning Management System. "
    "Your role is to assist students by answering their questions formally and accurately. "
    "If context from the lesson materials is provided below, you must base your answer "
    "primarily on that text. If the answer is not contained within the context, state "
    "that clearly, but provide general helpful information if possible."
)

class ChatbotService:
    """Service to handle chatbot queries using RAG context."""

    def __init__(self, llm_service: BaseLLMService):
        """Initialize with a specific LLM provider."""
        self.llm_service = llm_service

    def answer_query(self, query: str, upload_ids: list[int] = None, top_k: int = 3) -> str:
        """
        Generate a response to a student query, utilizing document context if available.

        Args:
            query: The question submitted by the student.
            upload_ids: An optional list of integer IDs representing the documents to search.
            top_k: The number of relevant document chunks to retrieve.

        Returns:
            The generated response string.
        """
        context = ""
        
        # If document IDs are provided, execute a semantic search
        if upload_ids:
            logger.info(f"Retrieving context for query across uploads: {upload_ids}")
            context = search_chunks(query=query, upload_ids=upload_ids, top_k=top_k)

        message = self._build_message(query, context)
        
        # Execute the request via the base LLM service
        return self.llm_service.chat(message, system_prompt=CHATBOT_SYSTEM_PROMPT)

    @staticmethod
    def _build_message(query: str, context: str) -> str:
        """Construct the user message payload, integrating RAG context if available."""
        if not context:
            return query

        return (
            f"Below is reference material retrieved from the lesson documents:\n\n"
            f"=== CONTEXT START ===\n"
            f"{context}\n"
            f"=== CONTEXT END ===\n\n"
            f"Student Question: {query}\n"
        )