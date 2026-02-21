from django.urls import path
from . import views

app_name = "ai_core"

urlpatterns = [
    path("upload-center/", views.ai_upload_center, name="ai_upload_center"),
    path("process-document/", views.process_ai_document, name="process_ai_document"),
    path("lesson/generate/", views.generate_lesson, name="generate_lesson"),
    path("quiz/generate/", views.generate_quiz, name="generate_quiz"),
]