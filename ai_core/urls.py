from django.urls import path
from . import views

app_name = "ai_core"

urlpatterns = [ 
    path("lesson/generate/", views.generate_lesson, name="generate_lesson"),
    path("quiz/generate/", views.generate_quiz, name="generate_quiz"),
]