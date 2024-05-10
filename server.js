const express = require('express');
const app = express();

app.use(express.static('public')); // папка 'public' с HTML, CSS, JS

/*
// Endpoint для запуска игры и получения UUID
app.get('/start-game', (req, res) => {
  res.json({ uuid }); // Отправляем UUID клиенту
  res.sendFile(path.join(__dirname, 'index.html'));
});
*/

// Endpoint для получения результатов игры
app.post('/submit-results', express.json(), (req, res) => {
  const results = req.body;
  console.log('Результаты игры:', results);
  res.status(200).send('Результаты успешно получены');
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));