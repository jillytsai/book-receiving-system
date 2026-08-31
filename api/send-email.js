export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { fileName, fileBase64, toEmail, stats } = req.body || {};

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ 
      error: '尚未在 Vercel 設定 RESEND_API_KEY 環境變數。請在 Vercel 專案設定中加入 RESEND_API_KEY。' 
    });
  }

  const primaryEmail = toEmail || 'jilly@mail.nptu.edu.tw';
  const fallbackEmail = 'jillytsai@gmail.com';
  const total = stats?.total || 0;
  const received = stats?.received || 0;
  const pending = stats?.pending || (total - received);
  const percent = total > 0 ? Math.round((received / total) * 100) : 0;

  const buildEmailPayload = (target) => ({
    from: '圖書點收系統 <onboarding@resend.dev>',
    to: [target],
    subject: `【圖書點收報告】${fileName || '圖書點收結果.xlsx'}（點收進度：${percent}%）`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5; margin-top: 0;">📚 圖書點收系統 — 點收結果報告</h2>
        <p>您好，以下是本次圖書點收的最新進度報告與清單：</p>
        
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>📁 檔案名稱：</strong> ${fileName || '圖書點收結果.xlsx'}</p>
          <p style="margin: 5px 0;"><strong>📊 總書目數量：</strong> ${total} 筆</p>
          <p style="margin: 5px 0; color: #10b981;"><strong>✅ 已點收數量：</strong> ${received} 筆</p>
          <p style="margin: 5px 0; color: #ef4444;"><strong>❌ 未到館數量：</strong> ${pending} 筆</p>
          <p style="margin: 5px 0;"><strong>📈 點收完成率：</strong> ${percent}%</p>
        </div>

        <p>完整的點收明細與缺漏標註（紅字）已夾帶於附件 Excel 檔案中，請查收。</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">此信件由「圖書點收系統」自動發送，請勿直接回覆。</p>
      </div>
    `,
    attachments: fileBase64 ? [
      {
        filename: fileName || '圖書點收結果.xlsx',
        content: fileBase64
      }
    ] : []
  });

  try {
    let response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(buildEmailPayload(primaryEmail))
    });

    let data = await response.json();
    let sentTo = primaryEmail;

    // If sending to primary email failed due to free domain restriction, fallback to account email
    if (!response.ok && primaryEmail !== fallbackEmail) {
      console.warn(`Primary email ${primaryEmail} failed (${data.message}), falling back to ${fallbackEmail}...`);
      response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(buildEmailPayload(fallbackEmail))
      });
      data = await response.json();
      sentTo = fallbackEmail;
    }

    if (!response.ok) {
      console.error('Resend API Error:', data);
      return res.status(response.status).json({ 
        error: data.message || '發送 Email 失敗',
        detail: data
      });
    }

    return res.status(200).json({ success: true, id: data.id, sentTo });
  } catch (error) {
    console.error('Send Email Exception:', error);
    return res.status(500).json({ error: error.message || '伺服器發生未預期的錯誤' });
  }
}