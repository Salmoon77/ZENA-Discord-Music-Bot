// src/lib/checkVote.js
export async function checkVote(userId) {
  const botId = "1335614699064262666"; // 봇의 디스코드 유저 ID
  const res = await fetch(
    `https://koreanbots.dev/api/v2/bots/${botId}/vote?userID=${userId}`,
    {
      headers: {
        Authorization: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEzMzU2MTQ2OTkwNjQyNjI2NjYiLCJpYXQiOjE3NTgzNzc3MDN9.D2iOSLwbkm17zgfYGJ-kWP8DDEtg9l8aM_X3PpaSarPNyNJrCs2SkzS-dZz4kk46o5v7idUWXFFSSwamEIODrEq2XiowsavyVfoEGUbFXNY_Hl0LRH8ULBRnbNVAnBX6hXULso4SDKu9G1zrnGkVCxcUlhP6knZk0QuZ-T9PGw0" // ✅ 반드시 Koreanbots API 키
      }
    }
  );

  if (!res.ok) {
    console.error("Koreanbots API 오류:", await res.text());
    return false;
  }

  const data = await res.json();
  return data?.data?.voted || false;
}

