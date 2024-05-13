<?php
header('Content-Type: text/plain');

session_start();

$data = json_decode(file_get_contents("php://input"), true);
$userUuid = $data['user_uuid'];
$gameUuid = $data['game_uuid'];
$score = $data['score'];
$final = $data['final'];

// Храним последний промежуточный счет в сессии
if (!$final) {
    $_SESSION['last_intermediate_score'] = $score;
    echo 'continue';
} else {
    $lastScore = $_SESSION['last_intermediate_score'] ?? 0;
    $scoreDifference = abs($score - $lastScore);

    // Проверяем разницу между последним промежуточным счетом и финальным счетом
    if ($scoreDifference <= 200) {
        // Это финальный счет, отправляем его на внешний сервер
        $token = '[orlOkjalbof7';
        $url = 'https://enjoytomorrow.ge/system/store-game-score/';
        $postData = http_build_query([
            'user_uuid' => $userUuid,
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
    } else {
        echo "Score manipulation detected"; // Выявлено несоответствие счетов
    }
}
?>