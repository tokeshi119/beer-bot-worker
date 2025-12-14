import { Buffer } from "node:buffer";
import { validateSignature } from "@line/bot-sdk";

/**
 * API Gateway HTTP API v2 イベントから署名を検証する
 * @param body - API Gatewayから受け取ったbody（文字列またはbase64エンコードされた文字列）
 * @param isBase64Encoded - bodyがbase64エンコードされているかどうか
 * @param signature - x-line-signatureヘッダーの値
 * @param channelSecret - LINE Channel Secret
 * @returns 署名検証が成功した場合true、失敗した場合false
 */
export function verifyLineSignature(
  body: string | null | undefined,
  isBase64Encoded: boolean | undefined,
  signature: string | null | undefined,
  channelSecret: string
): boolean {
  if (!body) {
    return false;
  }

  if (!signature) {
    return false;
  }

  // base64エンコードされている場合はデコード
  let rawBody: string | Buffer;
  if (isBase64Encoded) {
    try {
      rawBody = Buffer.from(body, "base64");
    } catch (err) {
      console.error("Failed to decode base64 body:", err);
      return false;
    }
  } else {
    rawBody = body;
  }

  // LINE SDKの署名検証関数を使用
  return validateSignature(rawBody, channelSecret, signature);
}
