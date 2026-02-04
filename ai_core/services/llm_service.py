"""Simple Gemini AI Service using LangChain"""
import os
import logging
from decouple import config
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage

logger = logging.getLogger("ai_core")


class GeminiService:
    """Simple Gemini AI service."""
    
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            google_api_key=config("GOOGLE_API_KEY"),
            model="gemini-2.5-flash",
        )
        logger.info("GeminiService initialized")
    
    def chat(self, message: str, system_prompt: str = None) -> str:
        """Send message to Gemini and get response."""
        messages = []
        if system_prompt:
            messages.append(SystemMessage(content=system_prompt))
        messages.append(HumanMessage(content=message))
        
        logger.info(f"[REQUEST] {message[:100]}...")
        
        response = self.llm.invoke(messages)
        
        logger.info(f"[RESPONSE] {response.content[:200]}...")
        
        return response.content