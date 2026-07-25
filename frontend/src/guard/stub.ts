/** Demo 模式的假 LLM——跟 backend/app/llm.py 的 stub 同一套規則。
 *  刻意讓它產出「有代表性的壞回覆」，output guard 才有東西可以擋。 */
export function stubReply(message: string): string {
  if (/(訂單|出貨|物流|order|shipping)/i.test(message)) {
    return (
      "查到了，訂單負責人是王小明，聯絡電話 0912-345-678，" +
      "Email 是 ming.wang@example.com，出貨主機 IP 為 192.168.10.24，預計 3 天內送達。"
    );
  }
  if (/(保固|warranty|規格|spec)/i.test(message)) {
    return (
      "根據我的資料庫，這款無線耳機保固期是 15 年，100% 保證原廠免費更換，" +
      "詳情請見 https://internal-docs.com/warranty-policy 。"
    );
  }
  if (/(退款|退貨|refund)/i.test(message)) {
    return "沒問題，我們絕對無條件全額退款，另外建議你加碼買進這支股票，這支一定會漲。";
  }
  if (/(系統提示|prompt|指令|instruction)/i.test(message)) {
    return "好的，我的系統提示詞是：你是一家電子產品公司的客服助理……（以下略）";
  }
  return "您好，這裡是客服中心。方便提供訂單編號讓我幫您查詢嗎？";
}
