const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const User = require('../models/User');

// Đảm bảo .env backend được load khi chạy test / import controller lẻ
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

/** Giống công thức trong User model (Mifflin–St Jeor) — dùng khi autoStats chưa được lưu */
function estimateBmrTdee(user) {
  const w = user?.measurements?.weight;
  const h = user?.measurements?.height;
  const age = user?.age;
  const gender = user?.gender;
  const activity = user?.activityLevel ?? 1.55;
  if (w == null || h == null || age == null || !gender) {
    return { bmr: null, tdee: null };
  }
  let bmr = 10 * w + 6.25 * h - 5 * age;
  bmr = gender === 'male' ? bmr + 5 : bmr - 161;
  bmr = Math.round(bmr);
  const tdee = Math.round(bmr * activity);
  return { bmr, tdee };
}

function buildUserContextBlock(user) {
  const est = estimateBmrTdee(user);
  const tdee =
    user?.autoStats?.tdee != null && user.autoStats.tdee > 0
      ? user.autoStats.tdee
      : est.tdee;
  const bmr =
    user?.autoStats?.bmr != null && user.autoStats.bmr > 0 ? user.autoStats.bmr : est.bmr;
  const bmi =
    user?.autoStats?.bmi != null
      ? user.autoStats.bmi
      : user?.measurements?.weight && user?.measurements?.height
        ? Math.round((user.measurements.weight / (user.measurements.height / 100) ** 2) * 10) / 10
        : null;

  return {
    text: [
      `Tên: ${user?.name || 'User'}`,
      `Giới tính: ${user?.gender ?? 'chưa cập nhật'}, Tuổi: ${user?.age ?? '—'}`,
      `Cân nặng: ${user?.measurements?.weight ?? '—'} kg, Chiều cao: ${user?.measurements?.height ?? '—'} cm`,
      `Mức vận động (hệ số): ${user?.activityLevel ?? '—'}`,
      `Mục tiêu: ${user?.goals?.targetType ?? '—'}, Cân mục tiêu: ${user?.goals?.targetWeight ?? '—'} kg`,
      `BMR ước tính: ${bmr != null ? `${bmr} kcal/ngày` : '— (cần đủ tuổi, giới, cân, cao)'}`,
      `TDEE ước tính: ${tdee != null ? `${tdee} kcal/ngày` : '— (cần đủ hồ sơ)'}`,
      `BMI: ${bmi ?? '—'}`,
    ].join('\n'),
    tdee,
    bmr,
  };
}

function normalizeChatHistory(messages, lastUserText) {
  if (!Array.isArray(messages)) return [];
  let list = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && String(m.content || '').trim())
    .map((m) => ({ role: m.role, content: String(m.content).trim() }));
  const u = String(lastUserText || '').trim();
  const last = list[list.length - 1];
  if (last && last.role === 'user' && last.content === u) {
    list = list.slice(0, -1);
  }
  return list.slice(-16);
}

function buildGeminiSystemInstruction(contextBlockText) {
  return (
    'Bạn là **HealthFlow Coach**, trợ lý dinh dưỡng và tập luyện cho ứng dụng theo dõi sức khỏe HealthFlow tại Việt Nam.\n\n' +
    'Nguyên tắc:\n' +
    '- Trả lời bằng **tiếng Việt** tự nhiên, trừ khi người dùng yêu cầu tiếng Anh.\n' +
    '- Ngắn gọn nhưng đủ ý; có thể dùng gạch đầu dòng khi gợi ý thực đơn hoặc lịch tập.\n' +
    '- **Luôn căn cứ** TDEE/BMR/BMI và mục tiêu trong ngữ cảnh khi tư vấn calo; nếu số liệu là "—", hãy nói rõ cần cập nhật Hồ sơ (cân, cao, tuổi, giới).\n' +
    '- Gợi ý món ăn Việt Nam khi hợp lý (phở, bún, cháo, bánh mì, trứng, sữa chua, yến mạch…), kèm lưu ý phần lớn / đường / protein.\n' +
    '- Không chẩn đoán bệnh; khuyên gặp bác sĩ/dinh dưỡng khi có bệnh lý hoặc mang thai.\n' +
    '- Không bịa số đo cá nhân; chỉ dùng số trong ngữ cảnh bên dưới.\n\n' +
    '--- Ngữ cảnh người dùng (ưu tiên khi trả lời) ---\n' +
    contextBlockText
  );
}

function geminiModelCandidates() {
  const preferred = (process.env.GEMINI_MODEL || '').trim();
  /** Free tier: một số vùng có limit:0 cho gemini-2.0-flash — ưu tiên 1.5/2.5 trước */
  const fallbacks = [
    'gemini-1.5-flash-002',
    'gemini-1.5-flash-8b',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-001',
    'gemini-1.5-pro-002',
  ];
  const seen = new Set();
  const out = [];
  for (const m of [preferred || null, ...fallbacks]) {
    if (!m || seen.has(m)) continue;
    seen.add(m);
    out.push(m);
  }
  return out;
}

function isGeminiModelMissingError(err) {
  const msg = (err && err.message) || String(err);
  return /404|not found|is not found|NOT_FOUND|not supported for generateContent/i.test(msg);
}

/** Chỉ dừng hẳn khi key sai / cấm; 429 thường theo từng model → thử model khác */
function isNonRetryableGeminiError(err) {
  const s = err && err.status;
  if (s === 401 || s === 403) return true;
  const msg = (err && err.message) || '';
  if (/API key not valid|API_KEY_INVALID|PERMISSION_DENIED/i.test(msg)) return true;
  return false;
}

/**
 * Dùng generateContent + một prompt (không systemInstruction API) để tránh 400 với một số key/phiên bản.
 */
async function callGeminiSingleModel(apiKey, modelName, userText, contextBlockText, messages) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      maxOutputTokens: 1024,
      temperature: 0.65,
    },
  });

  const systemAndContext = buildGeminiSystemInstruction(contextBlockText);
  const prior = normalizeChatHistory(messages, userText);
  const lines = [];
  for (const m of prior) {
    lines.push(m.role === 'assistant' ? `Trợ lý: ${m.content}` : `Người dùng: ${m.content}`);
  }
  lines.push(`Người dùng: ${userText}`);
  const combined = `${systemAndContext}\n\n--- Hội thoại ---\n${lines.join('\n\n')}\n\nHãy trả lời tin nhắn cuối của người dùng:`;

  const result = await model.generateContent(combined);
  const response = result.response;

  let text = '';
  try {
    text = response.text();
  } catch {
    const c = response.candidates?.[0];
    const parts = c?.content?.parts;
    if (parts?.length) {
      text = parts.map((p) => p.text).filter(Boolean).join('');
    } else if (response.promptFeedback?.blockReason) {
      throw new Error(`Nội dung bị chặn (blockReason: ${response.promptFeedback.blockReason}). Thử câu hỏi khác.`);
    } else {
      throw new Error('Gemini không trả về candidate (có thể bị safety filter).');
    }
  }

  return (text || '').trim() || 'Không nhận được phản hồi từ Gemini.';
}

async function callGeminiSdk(userText, contextBlockText, messages) {
  const rawKey = process.env.GEMINI_API_KEY;
  const apiKey = typeof rawKey === 'string' ? rawKey.trim() : '';
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY trống sau khi trim — kiểm tra file backend/.env');
  }

  const candidates = geminiModelCandidates();
  let lastErr;

  for (const modelName of candidates) {
    try {
      const out = await callGeminiSingleModel(apiKey, modelName, userText, contextBlockText, messages);
      if (modelName !== candidates[0]) {
        console.log(`chatController: Gemini OK với model "${modelName}".`);
      }
      return out;
    } catch (e) {
      lastErr = e;
      if (isNonRetryableGeminiError(e)) {
        throw e;
      }
      const tryNext =
        isGeminiModelMissingError(e) ||
        e.status === 400 ||
        e.status === 404 ||
        e.status === 429 ||
        /Too Many Requests|RESOURCE_EXHAUSTED|quota exceeded|limit:\s*0/i.test(e.message || '');
      if (tryNext) {
        console.warn(`chatController: model "${modelName}" — ${(e.message || e).slice(0, 120)}`);
        continue;
      }
      throw e;
    }
  }

  throw lastErr || new Error('Không có model Gemini khả dụng');
}

function buildGeminiTroubleshooting(err) {
  const status = err && err.status;
  const msg = (err && err.message) || String(err);
  const lines = [];
  if (status === 403 || /PERMISSION_DENIED|API key not valid|API_KEY_INVALID/i.test(msg)) {
    lines.push(
      '**Quyền / API key (403):** Với backend Node.js, trong Google AI Studio → API key → **Application restrictions** phải là **None** (không chọn “HTTP referrers”).'
    );
    lines.push('Nếu dùng Google Cloud: bật **Generative Language API** cho đúng project gắn với key.');
  } else if (status === 429 || /RESOURCE_EXHAUSTED|quota|Too Many Requests/i.test(msg)) {
    lines.push(
      '**Quota (429):** Nếu thấy `limit: 0` cho một model (vd. gemini-2.0-flash), free tier có thể **không cấp quota** model đó ở project/vùng của bạn — server sẽ thử model khác; hoặc đặt `GEMINI_MODEL=gemini-1.5-flash-002` trong `backend/.env`.'
    );
    lines.push('Đợi ~30–60s nếu là giới hạn theo phút; xem https://ai.google.dev/gemini-api/docs/rate-limits . Có thể bật billing trên Google Cloud để tăng hạn mức.');
  } else if (status === 400 || /Bad Request|invalid argument/i.test(msg)) {
    lines.push('**Yêu cầu không hợp lệ (400):** Xóa `GEMINI_MODEL` trong `.env` để server tự chọn model; hoặc thử `GEMINI_MODEL=gemini-2.0-flash-001`.');
  }
  return lines.length ? lines.join('\n') : '';
}

const OPENAI_SYSTEM =
  'You are HealthFlow Coach for a Vietnamese health app. Answer in Vietnamese unless asked otherwise. ' +
  'Use the user context numbers for calorie advice. No medical diagnosis. Be practical and concise.';

async function callOpenAI(userText, contextBlockText, messages) {
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const hist = normalizeChatHistory(messages, userText).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const body = {
    model,
    messages: [
      {
        role: 'system',
        content: `${OPENAI_SYSTEM}\n\nUser context:\n${contextBlockText}`,
      },
      ...hist,
      { role: 'user', content: userText },
    ],
    max_tokens: 900,
    temperature: 0.6,
  };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || 'Không nhận được phản hồi từ OpenAI.';
}

function fallbackAssistant(text, user, { keyPresent } = {}) {
  const t = (text || '').toLowerCase();
  const ctx = buildUserContextBlock(user);
  const tdeeLabel = ctx.tdee != null ? `${ctx.tdee}` : '— (vào Hồ sơ: cân, cao, tuổi, giới, mức vận động)';

  if (t.includes('chào') || t.includes('hello') || t.includes('hi ')) {
    return `Chào bạn! Tôi là HealthFlow Coach. Bạn muốn hỏi về ăn uống, tập luyện hay giấc ngủ?`;
  }
  if (t.includes('calo') || t.includes('calorie') || t.includes('ăn') || t.includes('sáng')) {
    return (
      `TDEE ước tính của bạn: **${tdeeLabel}** kcal/ngày. ` +
      (ctx.tdee == null
        ? 'Cập nhật đủ Hồ sơ để tôi tính chính xác. '
        : `Với giảm cân, thường thâm hụt khoảng 300–500 kcal/ngày so với TDEE (ăn đủ protein, rau). `) +
      `Ghi bữa ăn tại mục Dinh dưỡng và xem vòng calo trên Today. ` +
      (keyPresent
        ? 'API Gemini đang lỗi — sửa key/quota như hướng dẫn phía trên để có câu trả lời chi tiết hơn.'
        : 'Thêm **GEMINI_API_KEY** vào `backend/.env` và khởi động lại server để bật AI đầy đủ.')
    );
  }
  if (t.includes('tập') || t.includes('workout') || t.includes('gym')) {
    return `Chọn bài trong mục Bài tập, dùng timer nghỉ/set; xem nhóm cơ trên Thống kê. Khởi động 5–10 phút trước khi tập nặng.`;
  }
  if (t.includes('ngủ') || t.includes('sleep')) {
    return `Theo dõi giấc ngủ ở mục Giấc ngủ và Today. Ổn định giờ đi ngủ, hạn chế màn hình trước khi ngủ ~1 giờ.`;
  }
  if (t.includes('nước') || t.includes('water')) {
    return `Mục tiêu nước thường ~2 lít/ngày; cộng nhanh từ nút + trên Today hoặc trang Nước.`;
  }
  if (keyPresent) {
    return 'Đã có GEMINI_API_KEY nhưng API chưa gọi được — xem thông báo lỗi và mục gợi ý sửa phía trên.';
  }
  return (
    'Đang chạy **chế độ ngoại tuyến** (chưa có GEMINI_API_KEY / OPENAI_API_KEY). ' +
    'Thêm khóa vào `backend/.env` để dùng Gemini đầy đủ. Bạn vẫn có thể hỏi về calo, tập, ngủ, nước — tôi trả lời theo mẫu có sẵn.'
  );
}

exports.chat = async (req, res) => {
  try {
    const { message, messages } = req.body;
    const userText =
      typeof message === 'string'
        ? message.trim()
        : Array.isArray(messages) && messages.length
          ? String(messages[messages.length - 1]?.content || '').trim()
          : '';

    if (!userText) {
      return res.status(400).json({ success: false, message: 'Missing message' });
    }

    const user = await User.findById(req.user._id);
    const { text: contextBlockText } = buildUserContextBlock(user);

    let reply;
    let usedAI = false;
    let provider = null;

    const geminiKey = (process.env.GEMINI_API_KEY || '').trim();

    if (geminiKey) {
      reply = await callGeminiSdk(userText, contextBlockText, messages);
      usedAI = true;
      provider = 'gemini';
    } else if (process.env.OPENAI_API_KEY) {
      reply = await callOpenAI(userText, contextBlockText, messages);
      usedAI = true;
      provider = 'openai';
    } else {
      reply = fallbackAssistant(userText, user, { keyPresent: false });
    }

    res.json({ success: true, data: { reply, usedAI, provider } });
  } catch (err) {
    console.error('chatController:', err.message, err.status || '');
    const u = await User.findById(req.user._id).catch(() => req.user);
    const hint = buildGeminiTroubleshooting(err);
    const keyPresent = !!(process.env.GEMINI_API_KEY || '').trim();
    res.status(200).json({
      success: true,
      data: {
        reply: [
          `**Gemini / API:** ${err.message}`,
          hint ? `\n${hint}` : '',
          '\n---\n',
          fallbackAssistant(req.body?.message || '', u || req.user, { keyPresent }),
        ].join(''),
        usedAI: false,
        provider: null,
        degraded: true,
      },
    });
  }
};
