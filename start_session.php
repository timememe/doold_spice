<?php
header('Content-Type: application/json');

$userUuid = json_decode(file_get_contents("php://input"), true)['user_uuid'];
$gameUuid = uniqid('game_', true);
$gameStartTime = time();

// Это данные, которые будут отправлены на store_score.php
$data = [
    'user_uuid' => $userUuid,
    'game_uuid' => $gameUuid,
    'game_start_time' => $gameStartTime
];

echo json_encode([
    'gameUuid' => $gameUuid,
    'gameStartTime' => $gameStartTime
]);
?>