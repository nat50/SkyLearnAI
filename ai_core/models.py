from django.db import models

# Create your models here.
class AIGeneration(models.Model):
    topic = models.CharField(max_length=255)
    prompt = models.TextField()

    html_content = models.TextField(null=True, blank=True)

    status = models.CharField(
        max_length=20,
        choices=[
            ("PENDING", "Pending"),
            ("PROCESSING", "Processing"),
            ("SUCCESS", "Success"),
            ("FAILED", "Failed"),
        ],
        default="PENDING"
    )

    error_message = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
