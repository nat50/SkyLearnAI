"""Lesson generation service."""
import logging
from .base import BaseLLMService

logger = logging.getLogger("ai_core")

LESSON_SYSTEM_PROMPT = (
    "Bạn là một giảng viên đại học chuyên nghiệp. "
    "Nhiệm vụ của bạn là tạo bài giảng chi tiết bằng tiếng Việt. "
    "Kết quả trả về phải ở dạng HTML thuần (không bao gồm thẻ <html>, <head>, <body>), "
    "sử dụng các thẻ <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <blockquote>, <table> "
    "để trình bày nội dung rõ ràng và có cấu trúc. "
    "Không sử dụng markdown hay bất kỳ định dạng nào ngoài HTML."
)


class LessonService:
    """Generate lesson content using a given LLM provider."""

    def __init__(self, llm_service: BaseLLMService):
        self.llm_service = llm_service

    def generate(self, topic: str, context: str = None) -> str:
        """Generate an HTML lesson for the given topic.

        Args:
            topic: The lesson topic.
            context: Additional context from RAG chunks (optional, for future use).
        """
        message = f"Hãy tạo một bài giảng chi tiết về chủ đề: {topic}"

        if context:
            message += (
                "\n\nDưới đây là tài liệu tham khảo, "
                "hãy tích hợp nội dung này vào bài giảng nếu cần:\n\n"
                f"{context}"
            )

        return self.llm_service.chat(message, system_prompt=LESSON_SYSTEM_PROMPT)