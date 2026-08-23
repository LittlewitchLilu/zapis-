// Подписи вопросов — ключи должны совпадать с атрибутами name полей формы
const QUESTION_LABELS = {
  name: 'Имя',
  service: 'Какая услуга интересует',
  time: 'Удобное время',
  worry: 'Что волнует',
  goal: 'Что хочет получить от работы'
};

function formatMessage(answers) {
  const lines = Object.entries(answers)
    .map(([key, value]) => `${QUESTION_LABELS[key] || key}: ${value}`)
    .join('\n');
  return `Спасибо за анкету! Вот что вы указали:\n\n${lines}`;
}

async function sendVkMessage(userId, text) {
  const params = new URLSearchParams({
    user_id: userId,
    message: text,
    random_id: Math.floor(Math.random() * 1e9).toString(),
    access_token: process.env.VK_GROUP_TOKEN,
    v: process.env.VK_API_VERSION || '5.199'
  });

  const res = await fetch('https://api.vk.com/method/messages.send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });

  const data = await res.json();
  if (data.error) {
    console.error('VK API error:', data.error);
    throw new Error(data.error.error_msg || 'VK API error');
  }
  return data.response;
}

// Vercel сам превращает этот файл (api/submit.js) в адрес /api/submit
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const { vk_user_id, allowed_messages, answers } = req.body || {};

  if (!vk_user_id) {
    res.status(400).json({ ok: false, error: 'vk_user_id отсутствует' });
    return;
  }

  console.log('Новая анкета от', vk_user_id, answers);

  try {
    if (allowed_messages) {
      await sendVkMessage(vk_user_id, formatMessage(answers));
    } else {
      console.warn(`Пользователь ${vk_user_id} не разрешил сообщения — первое письмо не отправлено.`);
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Не удалось отправить сообщение' });
  }
};
