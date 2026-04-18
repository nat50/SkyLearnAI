"""YOLO Farm AIoT lesson generation service.

Specialised pipeline that creates interactive lessons based on the
Yolo:Bit / OhStem textbook.  Lessons include executable Python /
MicroPython code blocks that can be run directly in the browser via
Pyodide.
"""

import logging
from .base import BaseLLMService

logger = logging.getLogger("ai_core")

YOLO_FARM_SYSTEM_PROMPT = (
    "You are a professional lecturer specializing in AIoT and Yolo:Farm "
    "(OhStem platform, Yolo:Bit microcontroller). "
    "Your task is to create detailed, interactive lessons based on the "
    "Yolo:Bit textbook content provided as context.\n\n"
    "KEY RULES:\n"
    "1. Create lessons in the SAME LANGUAGE as the topic or context provided.\n"
    "2. Return pure HTML only (no <html>, <head>, or <body> tags).\n"
    "3. Include EXECUTABLE Python code examples. Each code block MUST be "
    "wrapped exactly like this:\n"
    '   <div class="yolo-code-block" data-code-id="UNIQUE_ID">\n'
    "     <pre><code>...python code here...</code></pre>\n"
    "   </div>\n"
    "   where UNIQUE_ID is a short unique slug such as 'iou_calc', "
    "'sensor_read', etc.\n"
    "4. Each code block MUST be self-contained and runnable in a standard "
    "Python environment.  Use only the Python standard library, math, "
    "and basic data structures.  Do NOT import hardware-specific modules "
    "(machine, neopixel, mqtt, etc.) in runnable blocks.\n"
    "5. For hardware-specific code (GPIO, I2C, sensors, actuators, MQTT), "
    "present it in a SEPARATE non-runnable block using a normal "
    "<pre><code> without the wrapping div.  Add a clear note that this "
    "code runs on the Yolo:Bit device, not in the browser.\n"
    "6. Provide a rich explanation BEFORE and AFTER every code block so "
    "learners understand the purpose, logic, and expected output.\n"
    "7. When the context from the textbook is available, integrate and "
    "reference it.  Expand on the textbook content with additional "
    "explanations, diagrams described in text, and deeper examples.\n"
    "8. Topics include but are not limited to: Yolo:Bit basics, "
    "sensors (DHT20, soil moisture, light / GDD), actuators (relay, pump, "
    "LED RGB), LCD display, IoT with OhStem / MQTT, AI voice recognition, "
    "AI training, smart irrigation, environment monitoring, anomaly "
    "detection, harvest classification.\n"
    "9. Use the following HTML tags for structure: "
    "<h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, "
    "<blockquote>, <table>.\n"
    "10. Do NOT use markdown or any format other than HTML.\n"
    "11. Do NOT include any inline CSS style attributes, especially "
    "font-family or font-size.\n"
)


class YoloFarmLessonService:
    """Generate Yolo:Farm AIoT lesson content with interactive code blocks."""

    def __init__(self, llm_service: BaseLLMService):
        self.llm_service = llm_service

    def generate(
        self,
        topic: str,
        requirements: str = None,
        context: str = None,
    ) -> str:
        """Generate an HTML lesson with interactive code for Yolo:Farm.

        Args:
            topic: The lesson topic (e.g. "Cảm biến độ ẩm đất").
            requirements: Optional user-specified requirements.
            context: RAG-retrieved content from the Yolo:Farm textbook.

        Returns:
            HTML string containing lesson content and code blocks.
        """
        message = (
            f"Create a detailed, interactive Yolo:Farm AIoT lesson on "
            f"the topic: {topic}\n\n"
            "The lesson MUST include at least 2 runnable Python code "
            "examples wrapped in <div class=\"yolo-code-block\"> as "
            "specified in the instructions.  Make the code educational "
            "and progressively more complex."
        )

        if requirements:
            message += f"\n\nAdditional requirements:\n{requirements}"

        if context:
            message += (
                "\n\nBelow is reference material from the Yolo:Farm "
                "textbook.  Use this content as the primary source of "
                "truth and expand upon it:\n\n"
                f"{context}"
            )

        return self.llm_service.chat(
            message, system_prompt=YOLO_FARM_SYSTEM_PROMPT
        )
