<?php
header('Content-Type: text/plain');

$data = json_decode(file_get_contents("php://input"), true);
$userUuid = $data['user_uuid'];
$gameUuid = $data['game_uuid'];
$score = $data['score'];
$token = 'Butgug3Queph)';

// Отправка данных через cURL на удаленный сервер
$url = 'https://enjoytomorrow.ge/system/game-log/';
$postData = http_build_query([
    'user_uuid' => $userUuid,
    'game_uuid' => $gameUuid,
    'score' => $score,
    'token' => $token
]);

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

echo $response; // Ожидаем получить "ok"
?>