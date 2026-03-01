# 設定open claw 備忘

購買 https://api-docs.deepseek.com/zh-cn/2美元

Minimax ai
使用每個月的10美元方案api:sk-cp-rVxgqqKaCESKohdmBu-F5Legk3T7v55U7a6nPfTu5FZyIo_FdfCEml0pBv5-UxUA-GJLd1VbFI9dSi6Zdewk4Vp4StKnk5fMEr7Kw7s3IZTwqjV8-corQdc


cat > ~/.openclaw/openclaw.json <<EOF
{
  "gateway": {
    "mode": "local",
    "auth": {
      "token": "myai123"
    }
  },
  "agents": {
    "defaults": {
      "models": {
        "primary": "minimax/MiniMax-M2.1"
      },
      "systemPrompt": "你是一位專業的台灣 AI 助理，請一律使用繁體中文回答，語氣要自然親切，並使用台灣習慣用語（例如：影片、軟體、品質、支援）。"
    }
  },
  "providers": {
    "minimax": {
      "enabled": true,
      "apiKey": "sk-cp-rVxgqqKaCESKohdmBu-F5Legk3T7v55U7a6nPfTu5FZyIo_FdfCEml0pBv5-UxUA-GJLd1VbFI9dSi6Zdewk4Vp4StKnk5fMEr7Kw7s3IZTwqjV8-corQdc"
    }
  }
}
EOF

狀態: 一般
建立時間: 2026年2月9日 下午8:32
待整理: No
完成或暫停: 尚未開始