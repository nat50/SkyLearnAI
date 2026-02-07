import json
import logging
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from ai_core.services import GeminiService, LessonService

logger = logging.getLogger("ai_core")


@login_required
@require_http_methods(["POST"])
def generate_lesson(request):
    """Generate a lesson in HTML format for a given topic."""
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    topic = data.get("topic", "").strip()
    if not topic:
        return JsonResponse({"error": "Topic is required"}, status=400)

    # Optional RAG context (placeholder for future use)
    context = data.get("context", None)

    try:
        llm = GeminiService()
        service = LessonService(llm)
        html_content = service.generate(topic, context)
        return JsonResponse({"topic": topic, "content": html_content})
    except Exception as e:
        logger.error(f"Lesson generation failed: {e}")
        return JsonResponse({"error": "AI service unavailable"}, status=503)