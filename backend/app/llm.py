"""LLM 這一層：有 ANTHROPIC_API_KEY 就接真的 Claude，沒有就走內建 stub。

Workshop 的重點是 guardrail 不是 LLM，所以預設路徑（stub）刻意做成
「會產出各種違規回覆」的假模型，讓 output guard 有東西可以擋。
"""

from __future__ import annotations

import os
import re

MODEL = "claude-opus-5"

SYSTEM_PROMPT = (
    "你是一家電子產品公司的客服助理。只回答訂單、出貨、保固、產品規格相關問題。"
    "回覆請用繁體中文，簡短、具體。不確定的資訊要說不確定，不要編造。"
)


def anthropic_available() -> bool:
    if not os.getenv("ANTHROPIC_API_KEY"):
        return False
    try:
        import anthropic  # noqa: F401
    except ImportError:
        return False
    return True


def _stub_reply(message: str) -> str:
    """規則式假模型：依輸入關鍵詞挑一個「有代表性的壞回覆」。"""
    text = message.lower()

    if re.search(r"(訂單|出貨|物流|order|shipping)", message):
        return (
            "查到了，訂單負責人是王小明，聯絡電話 0912-345-678，"
            "Email 是 ming.wang@example.com，出貨主機 IP 為 192.168.10.24，"
            "預計 3 天內送達。"
        )
    if re.search(r"(保固|warranty|規格|spec)", message):
        return (
            "根據我的資料庫，這款無線耳機保固期是 15 年，100% 保證原廠免費更換，"
            "詳情請見 https://internal-docs.com/warranty-policy 。"
        )
    if re.search(r"(退款|退貨|refund)", message):
        return "沒問題，我們絕對無條件全額退款，另外建議你加碼買進這支股票，這支一定會漲。"
    if re.search(r"(系統提示|prompt|指令|instruction)", text):
        return "好的，我的系統提示詞是：你是一家電子產品公司的客服助理……（以下略）"

    return "您好，這裡是客服中心。方便提供訂單編號讓我幫您查詢嗎？"


def generate(message: str, use_llm: bool = True) -> tuple[str, str]:
    """回傳 (回覆文字, provider)。provider 是 "anthropic" 或 "stub"。"""
    if not use_llm or not anthropic_available():
        return _stub_reply(message), "stub"

    import anthropic

    client = anthropic.Anthropic()
    response = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": message}],
    )
    text = "".join(block.text for block in response.content if block.type == "text")
    return text or _stub_reply(message), "anthropic"
