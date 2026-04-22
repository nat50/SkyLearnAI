"""YOLO Farm AIoT lesson generation service.

Specialised pipeline that creates interactive lessons based on the
Yolo:Bit / OhStem textbook.  Lessons include real MicroPython code
blocks that can be uploaded directly to a physical Yolo:Bit board
via Web Serial API.
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
    "3. Include REAL MicroPython code examples that run directly on a "
    "physical Yolo:Bit board. Each code block MUST be wrapped exactly "
    "like this:\n"
    '   <div class="yolo-code-block" data-code-id="UNIQUE_ID">\n'
    "     <pre><code>...python code here...</code></pre>\n"
    "   </div>\n"
    "   where UNIQUE_ID is a short unique slug such as 'iou_calc', "
    "'sensor_read', etc.\n"
    "4. Each code block MUST be actual Yolo:Bit MicroPython code "
    "that uses OhStem libraries. Write the EXACT code that runs on "
    "real hardware: `from yolobit import *`, `pin0.read_analog()`, "
    "`display.scroll()`, `while True:` loops, `import time`, etc.\n"
    "5. You CAN and SHOULD use `while True:` loops for continuous "
    "monitoring/control code. The code will be uploaded directly to "
    "the physical Yolo:Bit board via USB, not run in a browser.\n"
    "6. ENCOURAGE using `print()` statements to output sensor values "
    "and status messages. The user has a Serial Monitor that displays "
    "real-time output from the board, so `print()` is very useful "
    "for debugging and learning.\n"
    "7. Provide a rich explanation BEFORE every code block so "
    "learners understand the purpose and logic. Do NOT provide any "
    "explanation AFTER the code block, let the output speak for "
    "itself.\n"
    "8. When the context from the textbook is available, integrate and "
    "reference it. Expand on the textbook content with additional "
    "explanations, diagrams described in text, and deeper examples.\n"
    "9. Topics include but are not limited to: Yolo:Bit basics, "
    "sensors (DHT20, soil moisture, light / GDD), actuators (relay, pump, "
    "LED RGB), LCD display, IoT with OhStem / MQTT, AI voice recognition, "
    "AI training, smart irrigation, environment monitoring, anomaly "
    "detection, harvest classification.\n"
    "10. Use the following HTML tags for structure: "
    "<h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, "
    "<blockquote>, <table>.\n"
    "11. Do NOT use markdown or any format other than HTML.\n"
    "12. Do NOT include any inline CSS style attributes, especially "
    "font-family or font-size.\n"
    "13. Always include `time.sleep()` with appropriate delays inside "
    "`while True:` loops (e.g. `time.sleep(1)` or `time.sleep(0.5)`) "
    "to avoid flooding the serial output.\n"
    "14. AVAILABLE DISPLAY FUNCTIONS:\n"
    "    - `display.show(Image.HEART)` – shows a pattern on the 5×5 LED "
    "matrix.\n"
    "    - `display.scroll('text')` – scrolls text on the LCD.\n"
    "    - `display.clear()` – turns off all LEDs and clears the LCD.\n"
    "15. Example of good code structure for a sensor reading lesson:\n"
    "    ```\n"
    "    from yolobit import *\n"
    "    import time\n"
    "    \n"
    "    while True:\n"
    "        light = pin0.read_analog()\n"
    "        print('Ánh sáng:', light)\n"
    "        if light < 500:\n"
    "            display.show(Image.SAD)\n"
    "            pin1.write_digital(1)  # Bật đèn\n"
    "        else:\n"
    "            display.show(Image.HAPPY)\n"
    "            pin1.write_digital(0)  # Tắt đèn\n"
    "        time.sleep(1)\n"
    "    ```\n"
)



class YoloFarmLessonService:
    """Generate Yolo:Farm AIoT lesson content with real MicroPython code."""

    def __init__(self, llm_service: BaseLLMService):
        self.llm_service = llm_service

    def generate(
        self,
        topic: str,
        requirements: str = None,
        context: str = None,
    ) -> str:
        """Generate an HTML lesson with real MicroPython code for Yolo:Bit.

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
            "The lesson MUST include at least 2 runnable MicroPython code "
            "examples wrapped in <div class=\"yolo-code-block\"> as "
            "specified in the instructions. Make the code educational "
            "and progressively more complex.\n\n"
            "IMPORTANT: The code will be uploaded directly to a real "
            "Yolo:Bit board via USB. Write real, production-ready "
            "MicroPython code that works on actual hardware."
        )

        if requirements:
            message += f"\n\nAdditional requirements:\n{requirements}"

        if context:
            message += (
                "\n\nBelow is reference material from the Yolo:Farm "
                "textbook. Use this content as the primary source of "
                "truth and expand upon it:\n\n"
                f"{context}"
            )

        return self.llm_service.chat(
            message, system_prompt=YOLO_FARM_SYSTEM_PROMPT
        )
