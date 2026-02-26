import json
import logging
from io import BytesIO
import os
from django.conf import settings
from django.core.files.base import ContentFile
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from ai_core.services import GeminiService, LessonService, QuizGenerationError, QuizService
from course.models import Course, Upload
from django.shortcuts import get_object_or_404, render
from django.views.decorators.csrf import csrf_exempt
from ai_core.models import AIGeneration
from docx import Document
from htmldocx import HtmlToDocx

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


@csrf_exempt
@login_required
@require_http_methods(["POST"])
def save_lesson_doc(request):
    """Convert generated lesson HTML to Word (.docx) and save to Course Documents."""
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
        
    course_slug = data.get("course_slug")
    topic = data.get("topic")
    html_content = data.get("html_content")
    
    if not all([course_slug, topic, html_content]):
        return JsonResponse({"error": "Missing required fields"}, status=400)
        
    course = get_object_or_404(Course, slug=course_slug)
    
    # Generate DOCX
    document = Document()
    document.add_heading(f"Bài giảng: {topic}", 0)
    
    # Parse HTML and append to document
    new_parser = HtmlToDocx()
    new_parser.add_html_to_document(html_content, document)
    
    # Save the Document to a stream
    result = BytesIO()
    document.save(result)
    
    # Save the DOCX to the database
    file_name = f"bai_giang_ai_{topic.replace(' ', '_')[:30]}.docx"
    
    upload = Upload.objects.create(
        title=f"AI Lesson: {topic}",
        course=course,
    )
    # Save file content
    upload.file.save(file_name, ContentFile(result.getvalue()))
    
    return JsonResponse({
        "status": "success",
        "message": "Lesson saved successfully to Course Documents"
    })
