import json
import logging
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from ai_core.services import GeminiService, LessonService, QuizGenerationError, QuizService
from django.views.decorators.csrf import csrf_exempt

logger = logging.getLogger("ai_core")

@csrf_exempt
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

@csrf_exempt
@login_required
@require_http_methods(["POST"])
def generate_quiz(request):
    """Generate multiple-choice questions from lesson content."""
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    lesson_content = data.get("lesson_content", "").strip()
    if not lesson_content:
        return JsonResponse({"error": "lesson_content is required"}, status=400)

    num_questions = data.get("num_questions", 5)
    if not isinstance(num_questions, int):
        return JsonResponse({"error": "num_questions must be an integer"}, status=400)

    difficulty = data.get("difficulty", None)
    if difficulty and difficulty not in ("easy", "medium", "hard"):
        return JsonResponse(
            {"error": "difficulty must be 'easy', 'medium', or 'hard'"}, status=400
        )

    try:
        llm = GeminiService()
        service = QuizService(llm)
        questions = service.generate(lesson_content, num_questions, difficulty)
        return JsonResponse({"questions": questions, "count": len(questions)})
    except QuizGenerationError as e:
        logger.error(f"Quiz generation failed: {e}")
        return JsonResponse({"error": "Quiz generation failed"}, status=502)
    except Exception as e:
        logger.error(f"Quiz generation error: {e}")
        return JsonResponse({"error": "AI service unavailable"}, status=503)
