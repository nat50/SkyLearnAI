import json
import logging
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from ai_core.services import GeminiService, LessonService, QuizGenerationError, QuizService
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from ai_core.models import AIGeneration

logger = logging.getLogger("ai_core")

@login_required
def ai_upload_center(request):
    """View for the AI Upload Center frontend."""
    return render(request, "ai_core/ai_upload_center.html")


@csrf_exempt
@login_required
@require_http_methods(["POST"])
def process_ai_document(request):
    """Handle document upload and create AIGeneration records."""
    if "document_file" not in request.FILES:
        return JsonResponse({"error": "No file uploaded"}, status=400)
        
    uploaded_files = request.FILES.getlist("document_file")
    ai_goal = request.POST.get("ai_goal", "summarize")
    detail_level = request.POST.get("detail_level", "standard")
    output_language = request.POST.get("output_language", "en")
    
    # Store settings temporarily in prompt or use as needed later
    initial_prompt = f"Goal: {ai_goal}, Detail: {detail_level}, Language: {output_language}"

    generated_ids = []
    try:
        for uploaded_file in uploaded_files:
            # Create a new AIGeneration record for each file
            gen_record = AIGeneration.objects.create(
                document_file=uploaded_file,
                prompt=initial_prompt,
                status="PENDING"
            )
            generated_ids.append(gen_record.id)
            # Note: In a real app, you would trigger a Celery task here:
            # process_document_task.delay(gen_record.id)
        
        return JsonResponse({
            "status": "success", 
            "message": f"{len(uploaded_files)} file(s) uploaded successfully",
            "generation_ids": generated_ids
        })
    except Exception as e:
        logger.error(f"Failed to save AI documents: {e}")
        return JsonResponse({"error": "Failed to process upload"}, status=500)



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
