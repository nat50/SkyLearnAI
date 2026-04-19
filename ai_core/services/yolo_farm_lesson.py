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
    "4. Each code block MUST be actual Yolo:Bit MicroPython code "
    "that uses OhStem libraries. The interactive browser environment "
    "MOCKS hardware modules, so you CAN and MUST use code like "
    "`from yolobit import *`, `pin0.read_analog()`, `display.scroll()`, "
    "and `import time` for `time.sleep()`. Do not write simulated/fake "
    "Python logic—write the EXACT code shown in the OhStem textbook.\n"
    "5. Do NOT separate hardware code into non-runnable blocks. ALL "
    "Yolo:Bit code must be placed inside the interactive `<div class=\"yolo-code-block\">` "
    "so the user can click 'Run' and see the simulated module outputs printed in the browser.\n"
    "6. Provide a rich explanation BEFORE every code block so "
    "learners understand the purpose and logic. Do NOT provide any "
    "explanation AFTER the code block, let the interactive output "
    "speak for itself.\n"
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
    "    - NEVER use `while True:` loops. The code runs in a browser "
    "sandbox that CANNOT run infinite loops.\n"
    "    - Instead, use `for i in range(5):` (or similar finite loops) "
    "to demonstrate repeated behaviour.\n"
    "    - Always include `time.sleep(1)` inside loops so the simulator "
    "can show incremental output.\n"
    "    - If the textbook shows `while True:`, convert it to "
    "`for i in range(5):`.\n"
    "13. DYNAMIC SIMULATOR UI CONFIGURATION (CRITICAL):\n"
    "    You must define what sliders (sensors) and devices (actuators) should "
    "appear in the simulator by adding JSON data attributes to the code block.\n"
    "    Add `data-sensors` and `data-actuators` to your `<div class=\"yolo-code-block\">`:\n"
    "    - `data-sensors`: JSON array of simulated sensor sliders. Include `pin` (0-20), `name` "
    "(contextual like 'Ánh sáng', 'Nhiệt độ', 'Độ ẩm'), `min` (0), `max` (4095), and `val` (default).\n"
    "      Example: `data-sensors='[{\"pin\": 0, \"name\": \"Mức ánh sáng\", \"min\": 0, \"max\": 4095, \"val\": 500}, {\"pin\": 1, \"name\": \"Độ ẩm đất\", \"min\": 0, \"max\": 100, \"val\": 50}]'`\n"
    "    - `data-actuators`: JSON array of simulated external output devices. Include `pin` (0-20), "
    "`name` ('Máy bơm', 'Quạt', 'Đèn LED'), and `type` ('pump', 'fan', 'light', 'servo', 'generic').\n"
    "      Example: `data-actuators='[{\"pin\": 11, \"name\": \"Máy tưới\", \"type\": \"pump\"}, {\"pin\": 12, \"name\": \"Quạt sưởi\", \"type\": \"fan\"}]'`\n"
    "    - IMPORTANT: Ensure the JSON strings are valid and single quotes wrap the attribute value.\n"
    "14. AVAILABLE DISPLAY FUNCTIONS:\n"
    "    - `display.show(Image.HEART)` – shows a pattern on the 5×5 LED "
    "matrix.\n"
    "    - `display.scroll('text')` – scrolls text on the LCD.\n"
    "    - `display.clear()` – turns off all LEDs and clears the LCD.\n"
    "15. CODE INTERACTION: Write Python code that matches the JSON config. If your `data-sensors` "
    "defines `pin: 0` as Light, then use `pin0.read_analog()` and conditionally turn on/off your "
    "`data-actuators` (e.g. `pin11.write_digital(1)` to turn ON the pump, `0` to turn OFF). This "
    "will make the simulator UI animate automatically (pump icon will spin, light icon will glow).\n"
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
