// RequestAnimFrame: a browser API for getting smooth animations
window.requestAnimFrame = (function() {
  return window.requestAnimationFrame ||
         window.webkitRequestAnimationFrame ||
         window.mozRequestAnimationFrame ||
         window.oRequestAnimationFrame ||
         window.msRequestAnimationFrame ||
         function(callback) {
           window.setTimeout(callback, 1000 / 60);
         };
})();


const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

// После получения UUID из URL
const userUuid = urlParams.get('uuid');

let scoreInterval;

function startSession(userUuid) {
  fetch('start_session.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_uuid: userUuid })
  })
  .then(response => response.json())
  .then(data => {
    sessionStorage.setItem('gameUuid', data.gameUuid);
    sessionStorage.setItem('gameStartTime', data.gameStartTime);
  })
  .catch(error => {
    console.error('Error starting session:', error);
  });
}

function sendScore(userUuid, gameUuid, score) {
  fetch('store_score.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_uuid: userUuid,
      game_uuid: gameUuid,
      score: score,
      final: false  // 
    })
  })
  .then(response => response.text()) // 
  .then(data => {
    console.log('Score validated:', data);
  })
  .catch(error => {
    console.error('Error validating score:', error);
  });
}

function sendFinal(userUuid, gameUuid, score) {
  fetch('store_score.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_uuid: userUuid,
      game_uuid: gameUuid,
      score: score,
      final: true  // 
    })
  })
  .then(response => response.text()) // 
  .then(data => {
    console.log('Final score stored:', data);
  })
  .catch(error => {
    console.error('Error storing final score:', error);
  });
}

startSession(userUuid);
const gameUuid = sessionStorage.getItem('gameUuid');

let multiply = 4;
let lastGrassY = 0, lastCloudsY = 0, lastCloudsX = 0, lastFarCloudsY = 0, lastFarCloudsX = 0, lastStageY = 0, lastMountainsY = 0, lastScoreUpdate = -1;

var canvas = document.getElementById('canvas'),
  ctx = canvas.getContext('2d');

var width = 422; //window.innerWidth; //480; //window.innerWidth; //422,
  height = 552; //window.innerHeight / 2; //640; //window.innerHeight; //552;

canvas.width = width;
canvas.height = height;

function paintCanvas() {
  ctx.clearRect(0, 0, width, height);
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('playButton').addEventListener('click', function() {
    // Скрываем попап при нажатии на 'Play'
    init();  // Скрываем меню
  });

  document.getElementById('resetButton').addEventListener('click', function() {
    reset();  // Reset the game
  });
});

/**/
window.addEventListener('resize', resizeCanvas, false);

function resizeCanvas() {
  const canvas = document.getElementById('canvas');
  const aspectRatio = 422 / 552; // Соотношение сторон

  // Вычислите новые размеры с учётом максимально возможного заполнения по высоте или ширине
  var newWidth = window.innerWidth;
  var newHeight = window.innerHeight;
  var newWidthToHeight = newWidth / newHeight;

  if (newWidthToHeight > aspectRatio) {
      newWidth = newHeight * aspectRatio;
  } else {
      newHeight = newWidth / aspectRatio;
  }

  canvas.width = newWidth;
  canvas.height = newHeight;

  redrawCanvas(); // Перерисовываем элементы на канвасе
}

function redrawCanvas() {
  // Пересчет параметров игры
  var prevWidth = width;
  var prevHeight = height;
  width = canvas.width;
  height = canvas.height;

  // Обновление базы
  base.width = width;
  base.y = height - base.height; // Удержание базы в нижней части канваса

  // Обновление игрока
  player.x = (width / 2) - (player.width / 2); // Центрирование игрока по горизонтали
  player.y = Math.max(player.y, height - player.height); // Убедиться, что игрок не выходит за пределы канваса снизу
  player.vy = Math.min(player.vy, height / 50); // Адаптация скорости падения к новой высоте

  // Обновление платформ
  platforms.forEach(function(platform) {
    platform.x = (platform.x / prevWidth) * width; // Масштабирование позиции по горизонтали
    platform.y = (platform.y / prevHeight) * height; // Масштабирование позиции по вертикали
    platform.width = Math.max(70, width / 6); // Обновление ширины платформы
  });

  // Перерисовка всех элементов
  paintCanvas(); // Функция для очистки и перерисовки канваса
  base.draw(); // Перерисовка базы
  player.draw(); // Перерисовка игрока
  platforms.forEach(platform => platform.draw()); // Перерисовка всех платформ
}


//Variables for game
var platforms = [],
  image = document.getElementById("sprite"),
  player, platformCount = 10,
  position = 0,
  gravity = 0.2,
  animloop,
  flag = 0,
  menuloop, broken = 0,
  dir, score = 0, firstRun = true;

//Base object
var Base = function() {
  this.height = 5;
  this.width = width;

  //Sprite clipping
  this.cx = 0;
  this.cy = 614 * multiply;
  this.cwidth = 100 * multiply;
  this.cheight = 5 * multiply;

  this.moved = 0;

  this.x = 0;
  this.y = height - this.height;

  this.draw = function() {
    try {
      ctx.drawImage(image, this.cx, this.cy, this.cwidth, this.cheight, this.x, this.y, this.width, this.height);
    } catch (e) {
      console.error("Ошибка: ", e);
    }
  };
};

var base = new Base();

//Player object
var Player = function() {
  this.vy = 11;
  this.vx = 0;

  this.isMovingLeft = false;
  this.isMovingRight = false;
  this.isDead = false;

  this.width = 55;
  this.height = 40;

  //Sprite clipping
  this.cx = 0;
  this.cy = 0;
  this.cwidth = 110 * multiply; //110
  this.cheight = 80 * multiply; //80

  this.dir = "left";

  this.x = width / 2 - this.width / 2;
  this.y = height;

  //Function to draw it
  this.draw = function() {
    try {
      if (this.dir == "right") this.cy = 121 * multiply;
      else if (this.dir == "left") this.cy = 201 * multiply;
      else if (this.dir == "right_land") this.cy = 289 * multiply;
      else if (this.dir == "left_land") this.cy = 371 * multiply;

      ctx.drawImage(image, this.cx, this.cy, this.cwidth, this.cheight, this.x, this.y, this.width, this.height);
    } catch (e) {
      console.error("Ошибка: ", e);
    }
  };

  this.jump = function() {
    this.vy = -8;
  };

  this.jumpHigh = function() {
    this.vy = -16;
  };

};

player = new Player();

//Platform class

function Platform() {
  this.width = 70;
  this.height = 17;

  this.x = Math.random() * (width - this.width);
  this.y = position;

  position += (height / platformCount);

  this.flag = 0;
  this.state = 0;

  //Sprite clipping
  this.cx = 0;
  this.cy = 0;
  this.cwidth = 105 * multiply;
  this.cheight = 30 * multiply;

  //Function to draw it
  this.draw = function() {
    try {

      if (this.type == 1) this.cy = 0;
      else if (this.type == 2) this.cy = 60 * multiply;
      else if (this.type == 3 && this.flag === 0) this.cy = 31 * multiply;
      else if (this.type == 3 && this.flag == 1) this.cy = 1000 * multiply;
      else if (this.type == 4 && this.state === 0) this.cy = 90 * multiply;
      else if (this.type == 4 && this.state == 1) this.cy = 1000 * multiply;

      ctx.drawImage(image, this.cx, this.cy, this.cwidth, this.cheight, this.x, this.y, this.width, this.height);
    } catch (e) {
      console.error("Ошибка: ", e);
    }
  };

  //Platform types
  //1: Normal
  //2: Moving
  //3: Breakable (Go through)
  //4: Vanishable 
  //Setting the probability of which type of platforms should be shown at what score
  if (score >= 5000) this.types = [2, 3, 3, 3, 4, 4, 4, 4];
  else if (score >= 2000 && score < 5000) this.types = [2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4];
  else if (score >= 1000 && score < 2000) this.types = [2, 2, 2, 3, 3, 3, 3, 3];
  else if (score >= 500 && score < 1000) this.types = [1, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3];
  else if (score >= 100 && score < 500) this.types = [1, 1, 1, 1, 2, 2];
  else this.types = [1];

  this.type = this.types[Math.floor(Math.random() * this.types.length)];

  //We can't have two consecutive breakable platforms otherwise it will be impossible to reach another platform sometimes!
  if (this.type == 3 && broken < 1) {
    broken++;
  } else if (this.type == 3 && broken >= 1) {
    this.type = 1;
    broken = 0;
  }

  this.moved = 0;
  this.vx = 1;
}

for (var i = 0; i < platformCount; i++) {
  platforms.push(new Platform());
}

//Broken platform object
var Platform_broken_substitute = function() {
  this.height = 30;
  this.width = 70;

  this.x = 0;
  this.y = 0;

  //Sprite clipping
  this.cx = 0;
  this.cy = 554 * multiply;
  this.cwidth = 105 * multiply;
  this.cheight = 60 * multiply;

  this.appearance = false;

  this.draw = function() {
    try {
      if (this.appearance === true) ctx.drawImage(image, this.cx, this.cy, this.cwidth, this.cheight, this.x, this.y, this.width, this.height);
      else return;
    } catch (e) {
      console.error("Ошибка: ", e);
    }
  };
};

var platform_broken_substitute = new Platform_broken_substitute();

//Spring Class
var spring = function() {
  this.x = 0;
  this.y = 0;

  this.width = 26;
  this.height = 30;

  //Sprite clipping
  this.cx = 0;
  this.cy = 0;
  this.cwidth = 45 * multiply;
  this.cheight = 53 * multiply;

  this.state = 0; 

  this.draw = function() {
    try {
      if (this.state === 0) this.cy = 445 * multiply;
      else if (this.state == 1) this.cy = 501 * multiply;

      ctx.drawImage(image, this.cx, this.cy, this.cwidth, this.cheight, this.x, this.y, this.width, this.height);
    } catch (e) {
      console.error("Ошибка: ", e);
    }
  };
};

var Spring = new spring();


// Рисуем смену дня и ночи

var gradients = [
  ["#012459", "#001322"],  // Утро
  ["#003972", "#001322"],  // День
  ["#003972", "#001322"],  // Вечер
  ["#004372", "#00182b"],  // Ночь
  ["#004372", "#011d34"],  // Утро
  ["#016792", "#00182b"],  // День
  ["#07729f", "#042c47"],  // Вечер
  ["#12a1c0", "#07506e"],  // Ночь
  ["#74d4cc", "#1386a6"],  // Утро
  ["#efeebc", "#61d0cf"],  // День
  ["#fee154", "#a3dec6"],  // Вечер
  ["#fdc352", "#e8ed92"],  // Ночь
  ["#ffac6f", "#ffe467"],  // Утро
  ["#fda65a", "#ffe467"],  // День
  ["#fd9e58", "#ffe467"],  // Вечер
  ["#f18448", "#ffd364"],
  ["#f06b7e", "#f9a856"],  // Утро
  ["#ca5a92", "#f4896b"],  // День
  ["#5b2c83", "#d1628b"],  // Вечер
  ["#371a79", "#713684"],  // Ночь
  ["#28166b", "#45217c"],  // Утро
  ["#192861", "#372074"],  // День
  ["#040b3c", "#233072"],  // Вечер
  ["#040b3c", "#012459"]
];

function init() {
  //Variables for the game
  var dir = "left",
    jumpCount = 0;
  
  firstRun = false;

  ////////////////////////////

  scoreInterval = setInterval(() => {
    // Эти значения должны обновляться на основе игрового процесса
    const currentScore = score; // Замените на функцию получения текущего счета
    sendScore(userUuid, gameUuid, currentScore);
    //console.log("interval:", score);
  }, 2000);  // Отправляем данные каждые 2 секунды

  ///////////////////////////

  //Function for clearing canvas in each consecutive frame  
  
  function updateBackground(score) {
    const grassSpeed = 0.1;  // Speed at which grass moves
    const cloudSpeed = 0.1;  // Speed at which clouds move
    const farCloudSpeed = 0.01;  // Speed at which far clouds move
    const stageSpeed = 0.1;  // Speed at which stage moves
    const mountainSpeed = 0.05;  // Speed at which mountains move

    // Calculate the new background positions
    let grassY = +(score * grassSpeed) % window.innerHeight;
    let cloudsY = +(score * cloudSpeed) % window.innerHeight;
    let cloudsX = -(score * cloudSpeed) % window.innerWidth;
    let farcloudsY = +(score * farCloudSpeed) % window.innerHeight;
    let farcloudsX = -(score * farCloudSpeed) % window.innerWidth;
    let stageY = +(score * stageSpeed) % window.innerHeight;
    let mountainsY = +(score * mountainSpeed) % window.innerHeight;

    // Update only if significant changes are detected
    if (Math.floor(score / 300) !== lastScoreUpdate || lastGrassY !== grassY || lastCloudsY !== cloudsY || lastCloudsX !== cloudsX || lastFarCloudsY !== farcloudsY || lastFarCloudsX !== farcloudsX || lastStageY !== stageY || lastMountainsY !== mountainsY) {
        lastScoreUpdate = Math.floor(score / 300);
        lastGrassY = grassY;
        lastCloudsY = cloudsY;
        lastCloudsX = cloudsX;
        lastFarCloudsY = farcloudsY;
        lastFarCloudsX = farcloudsX;
        lastStageY = stageY;
        lastMountainsY = mountainsY;

        // Calculate the gradient index
        let gradientIndex = score / 300 % gradients.length;  // Adjust as per your scoring system
        let currentGradient = gradients[Math.floor(gradientIndex)];

        // Update the background style of the canvas
        const canvas = document.getElementById('canvas');
        canvas.style.backgroundImage = `url("assets/grass_anim.gif"), 
        url("assets/stage_anim.gif"), 
        url("assets/bg_mountains.png"),
        url("assets/bg_clouds.png"),
        url("assets/bg_farclouds.png"),
        linear-gradient(to bottom, ${currentGradient[0]}, ${currentGradient[1]})`;
        canvas.style.backgroundPosition = `0 ${grassY}px, 0 ${stageY}px, 0 ${mountainsY}px, ${cloudsX}px ${cloudsY}px, ${farcloudsX}px ${farcloudsY}px, 0 0`;
    }
  }

  function setCanvasBackground(colors) {
      let ctx = canvas.getContext('2d');
      let grd = ctx.createLinearGradient(0, 0, 0, canvas.height);

      // Распределение цветов по градиенту
      colors.forEach((color, idx) => {
          grd.addColorStop(idx / (colors.length - 1), color);
      });

      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  

  //Player related calculations and functions

  function playerCalc() {
    if (dir == "left") {
      player.dir = "left";
      if (player.vy < -7 && player.vy > -15) player.dir = "left_land";
    } else if (dir == "right") {
      player.dir = "right";
      if (player.vy < -7 && player.vy > -15) player.dir = "right_land";
    }

    //Adding keyboard controls
    document.onkeydown = function(e) {
      var key = e.keyCode;
      
      if (key == 37) {
        dir = "left";
        player.isMovingLeft = true;
      } else if (key == 39) {
        dir = "right";
        player.isMovingRight = true;
      }
      
      /*
      if(key == 32) {
        if(firstRun === true)
          init();
        else 
          reset();
      }
      */
    };

    document.onkeyup = function(e) {
      var key = e.keyCode;
    
      if (key == 37) {
        dir = "left";
        player.isMovingLeft = false;
      } else if (key == 39) {
        dir = "right";
        player.isMovingRight = false;
      }
    };

    document.getElementById('leftButton').addEventListener('touchstart', function() {
      dir = "left";
      player.dir = "left";  // Указываем направление анимации
      player.isMovingLeft = true;
    }, { passive: false });
    document.getElementById('leftButton').addEventListener('touchend', function() {
        dir = "left";
        player.isMovingLeft = false;
        if (player.vy < -7 && player.vy > -15) player.dir = "left_land";  // Завершение анимации прыжка
        else player.dir = "left";  // Возвращение к стандартной анимации
    }, { passive: false });
  
    document.getElementById('rightButton').addEventListener('touchstart', function() {
        dir = "right";
        player.dir = "right";  // Указываем направление анимации
        player.isMovingRight = true;
    }, { passive: false });
    document.getElementById('rightButton').addEventListener('touchend', function() {
        dir = "right";
        player.isMovingRight = false;
        if (player.vy < -7 && player.vy > -15) player.dir = "right_land";  // Завершение анимации прыжка
        else player.dir = "right";  // Возвращение к стандартной анимации
    }, { passive: false });

    //Accelerations produces when the user hold the keys
    if (player.isMovingLeft === true) {
      player.x += player.vx;
      player.vx -= 0.15;
    } else {
      player.x += player.vx;
      if (player.vx < 0) player.vx += 0.1;
    }

    if (player.isMovingRight === true) {
      player.x += player.vx;
      player.vx += 0.15;
    } else {
      player.x += player.vx;
      if (player.vx > 0) player.vx -= 0.1;
    }

    // Speed limits!
    if(player.vx > 8)
      player.vx = 8;
    else if(player.vx < -8)
      player.vx = -8;

    //console.log(player.vx);
    
    //Jump the player when it hits the base
    if ((player.y + player.height) > base.y && base.y < height) player.jump();

    //Gameover if it hits the bottom 
    if (base.y > height && (player.y + player.height) > height && player.isDead != "lol") player.isDead = true;

    //Make the player move through walls
    if (player.x > width) player.x = 0 - player.width;
    else if (player.x < 0 - player.width) player.x = width;

    //Movement of player affected by gravity
    if (player.y >= (height / 2) - (player.height / 2)) {
      player.y += player.vy;
      player.vy += gravity;
    }

    //When the player reaches half height, move the platforms to create the illusion of scrolling and recreate the platforms that are out of viewport...
    else {
      platforms.forEach(function(p, i) {

        if (player.vy < 0) {
          p.y -= player.vy;
        }

        if (p.y > height) {
          platforms[i] = new Platform();
          platforms[i].y = p.y - height;
        }

      });

      base.y -= player.vy;
      player.vy += gravity;

      if (player.vy >= 0) {
        player.y += player.vy;
        player.vy += gravity;
      }

      score++;
    }

    //Make the player jump when it collides with platforms
    collides();

    if (player.isDead === true) gameOver();
  }

  //Spring algorithms

  function springCalc() {
    var s = Spring;
    var p = platforms[0];

    if (p.type == 1 || p.type == 2) {
      s.x = p.x + p.width / 2 - s.width / 2;
      s.y = p.y - p.height - 10;

      if (s.y > height / 1.1) s.state = 0;

      s.draw();
    } else {
      s.x = 0 - s.width;
      s.y = 0 - s.height;
    }
  }

  //Platform's horizontal movement (and falling) algo

  function platformCalc() {
    var subs = platform_broken_substitute;

    platforms.forEach(function(p, i) {
      if (p.type == 2) {
        if (p.x < 0 || p.x + p.width > width) p.vx *= -1;

        p.x += p.vx;
      }

      if (p.flag == 1 && subs.appearance === false && jumpCount === 0) {
        subs.x = p.x;
        subs.y = p.y;
        subs.appearance = true;

        jumpCount++;
      }

      p.draw();
    });

    if (subs.appearance === true) {
      subs.draw();
      subs.y += 8;
    }

    if (subs.y > height) subs.appearance = false;
  }

  function collides() {
    //Platforms
    platforms.forEach(function(p, i) {
      if (player.vy > 0 && p.state === 0 && (player.x + 15 < p.x + p.width) && (player.x + player.width - 15 > p.x) && (player.y + player.height > p.y) && (player.y + player.height < p.y + p.height)) {

        if (p.type == 3 && p.flag === 0) {
          p.flag = 1;
          jumpCount = 0;
          return;
        } else if (p.type == 4 && p.state === 0) {
          player.jump();
          p.state = 1;
        } else if (p.flag == 1) return;
        else {
          player.jump();
        }
      }
    });

    //Springs
    var s = Spring;
    if (player.vy > 0 && (s.state === 0) && (player.x + 15 < s.x + s.width) && (player.x + player.width - 15 > s.x) && (player.y + player.height > s.y) && (player.y + player.height < s.y + s.height)) {
      s.state = 1;
      player.jumpHigh();
    }

  }

  function updateScore() {
    var scoreText = document.getElementById("score");
    scoreText.innerHTML = score;
    //sendScore(userUuid, gameUuid, score);
  }

  function gameOver() {
    platforms.forEach(function(p, i) {
      p.y -= 12;
    });

    if(player.y > height/2 && flag === 0) {
      player.y -= 8;
      player.vy = 0;
    } 
    else if(player.y < height / 2) flag = 1;
    else if(player.y + player.height > height) {
      showGoMenu();
      hideScore();
      player.isDead = "lol";
      clearInterval(scoreInterval);
      sendFinal(userUuid, gameUuid, score);
      //console.log("final:", score);
    }
  }

  //Function to update everything

  function update() {
    paintCanvas();

    updateBackground(score);

    platformCalc();

    springCalc();

    playerCalc();
    player.draw();

    base.draw();

    updateScore();
  }

  menuLoop = function(){return;};
  animloop = function() {
    update();
    requestAnimFrame(animloop);
  };

  animloop();
  
  showScore();
  hideMenu();  
}

function reset() {
  hideGoMenu();
  showScore();
  player.isDead = false;
  
  flag = 0;
  position = 0;
  score = 0;

  base = new Base();
  player = new Player();
  Spring = new spring();
  platform_broken_substitute = new Platform_broken_substitute();

  platforms = [];
  for (var i = 0; i < platformCount; i++) {
    platforms.push(new Platform());
  }
}

//Hides the menu
function hideMenu() {
  //var menu = document.getElementById("mainMenu");
  document.querySelector('.popup-container').style.visibility = 'hidden'; 
  //menu.style.zIndex = -1;    
}

//Shows the game over menu
function showGoMenu() {
  var menu = document.getElementById("gameOverMenu");
  menu.style.zIndex = 1;
  menu.style.visibility = "visible";

  var scoreText = document.getElementById("go_score");
  scoreText.innerHTML = "You scored " + score + " points!";
}

//Hides the game over menu
function hideGoMenu() {
  var menu = document.getElementById("gameOverMenu");
  menu.style.zIndex = -1;
  menu.style.visibility = "hidden";
}

//Show ScoreBoard
function showScore() {
  var menu = document.getElementById("scoreBoard");
  menu.style.zIndex = 1;
}

//Hide ScoreBoard
function hideScore() {
  var menu = document.getElementById("scoreBoard");
  menu.style.zIndex = -1;
}

function playerJump() {
  player.y += player.vy;
  player.vy += gravity;

  if (player.vy > 0 && 
    (player.x + 15 < 260) && 
    (player.x + player.width - 15 > 155) && 
    (player.y + player.height > 475) && 
    (player.y + player.height < 500))
    player.jump();

  if (dir == "left") {
    player.dir = "left";
    if (player.vy < -7 && player.vy > -15) player.dir = "left_land";
  } else if (dir == "right") {
    player.dir = "right";
    if (player.vy < -7 && player.vy > -15) player.dir = "right_land";
  }

  //Adding keyboard controls
  document.onkeydown = function(e) {
    var key = e.keyCode;

    if (key == 37) {
      dir = "left";
      player.isMovingLeft = true;
    } else if (key == 39) {
      dir = "right";
      player.isMovingRight = true;
    }

    /*
    if(key == 32) {
      if(firstRun === true) {
        init();
        firstRun = false;
      }
      else 
        reset();
    }
    */
  };

  document.onkeyup = function(e) {
    var key = e.keyCode;

    if (key == 37) {
      dir = "left";
      player.isMovingLeft = false;
    } else if (key == 39) {
      dir = "right";
      player.isMovingRight = false;
    }
  };

  /*
  document.addEventListener('touchstart', function(event) {
    if (event.target.tagName !== 'BUTTON') { // Проверка, чтобы не отменять события на кнопках
      event.preventDefault(); // Отмена стандартного поведения
    }
  }, { passive: false }); // Отключение пассивного слушателя для событий на уровне документа
  */  

  document.getElementById('leftButton').addEventListener('touchstart', function() {
    dir = "left";
    player.dir = "left";  // Указываем направление анимации
    player.isMovingLeft = true;
  }, { passive: false });
  document.getElementById('leftButton').addEventListener('touchend', function() {
      dir = "left";
      player.isMovingLeft = false;
      if (player.vy < -7 && player.vy > -15) player.dir = "left_land";  // Завершение анимации прыжка
      else player.dir = "left";  // Возвращение к стандартной анимации
  }, { passive: false });

  document.getElementById('rightButton').addEventListener('touchstart', function() {
      dir = "right";
      player.dir = "right";  // Указываем направление анимации
      player.isMovingRight = true;
  }, { passive: false });
  document.getElementById('rightButton').addEventListener('touchend', function() {
      dir = "right";
      player.isMovingRight = false;
      if (player.vy < -7 && player.vy > -15) player.dir = "right_land";  // Завершение анимации прыжка
      else player.dir = "right";  // Возвращение к стандартной анимации
  }, { passive: false });

  //Accelerations produces when the user hold the keys
  if (player.isMovingLeft === true) {
    player.x += player.vx;
    player.vx -= 0.15;
  } else {
    player.x += player.vx;
    if (player.vx < 0) player.vx += 0.1;
  }

  if (player.isMovingRight === true) {
    player.x += player.vx;
    player.vx += 0.15;
  } else {
    player.x += player.vx;
    if (player.vx > 0) player.vx -= 0.1;
  }

  //Jump the player when it hits the base
  if ((player.y + player.height) > base.y && base.y < height) player.jump();

  //Make the player move through walls
  if (player.x > width) player.x = 0 - player.width;
  else if (player.x < 0 - player.width) player.x = width;

  player.draw();
}

function update() {
  ctx.clearRect(0, 0, width, height);
  playerJump();
}   

menuLoop = function() {
  update();
  requestAnimFrame(menuLoop);
};

menuLoop();