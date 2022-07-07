var bot = window.bot = (function() {
    return {
        isBotRunning: false,
        isBotEnabled: true,
        lookForFood: false,
        collisionPoints: [],
        collisionAngles: [],
        scores: [],
        foodTimeout: undefined,
        sectorBoxSide: 0,
        defaultAccel: 0,
        sectorBox: {},
        currentFood: {},
        MID_X: 0,
        MID_Y: 0,
        MAP_R: 0,
 
        quickRespawn: function() {
            window.dead_mtm = 0;
            window.login_fr = 0;
 
            bot.isBotRunning = false;
            window.forcing = true;
            window.connect();
            window.forcing = false;
        },
 
        // Avoid headPoint
        avoidHeadPoint: function(collisionPoint) {},
 
        // Avoid collison point by ang
        // ang radians <= Math.PI (180deg)
        avoidCollisionPoint: function(collisionPoint, ang) {
        },
 
        // Sorting by  property 'distance'
        sortDistance: function(a, b) {
            return a.distance - b.distance;
        },
 
        // get collision angle index, expects angle +/i 0 to Math.PI
        getAngleIndex: function(angle) {
            const ARCSIZE = Math.PI / 4;
            var index;
 
            if (angle < 0) {
                angle += 2 * Math.PI;
            }
 
            index = Math.round(angle * (1 / ARCSIZE));
 
            if (index === (2 * Math.PI) / ARCSIZE) {
                return 0;
            }
            return index;
        },
 
        // Add to collisionAngles if distance is closer
        addCollisionAngle: function(sp) {
            var ang = canvas.fastAtan2(
                Math.round(sp.yy - window.snake.yy),
                Math.round(sp.xx - window.snake.xx));
            var aIndex = bot.getAngleIndex(ang);
 
            var actualDistance = Math.round(
                sp.distance - (Math.pow(window.getSnakeWidth(window.snakes[sp.snake].sc), 2) / 2));
 
            if (bot.collisionAngles[aIndex] === undefined) {
                bot.collisionAngles[aIndex] = {
                    x: Math.round(sp.xx),
                    y: Math.round(sp.yy),
                    ang: ang,
                    snake: sp.snake,
                    distance: actualDistance
                };
            } else if (bot.collisionAngles[aIndex].distance > sp.distance) {
                bot.collisionAngles[aIndex].x = Math.round(sp.xx);
                bot.collisionAngles[aIndex].y = Math.round(sp.yy);
                bot.collisionAngles[aIndex].ang = ang;
                bot.collisionAngles[aIndex].snake = sp.snake;
                bot.collisionAngles[aIndex].distance = actualDistance;
            }
        },
 
        // Get closest collision point per snake.
        getCollisionPoints: function() {
            var scPoint;
 
            bot.collisionPoints = [];
            bot.collisionAngles = [];
 
 
            for (var snake = 0, ls = window.snakes.length; snake < ls; snake++) {
                scPoint = undefined;
 
                if (window.snakes[snake].id !== window.snake.id &&
                    window.snakes[snake].alive_amt === 1) {
                    if (window.visualDebugging) {
                        canvas.drawCircle(canvas.circle(
                            window.snakes[snake].xx,
                            window.snakes[snake].yy,
                            window.getSnakeWidth(window.snakes[snake].sc) / 2),
                            'red', false);
                    }
                    scPoint = {
                        xx: window.snakes[snake].xx,
                        yy: window.snakes[snake].yy,
                        snake: snake
                    };
                    canvas.getDistance2FromSnake(scPoint);
                    bot.addCollisionAngle(scPoint);
 
                    for (var pts = 0, lp = window.snakes[snake].pts.length; pts < lp; pts++) {
                        if (!window.snakes[snake].pts[pts].dying &&
                            canvas.pointInRect(
                                {x: window.snakes[snake].pts[pts].xx,
                                    y: window.snakes[snake].pts[pts].yy}, bot.sectorBox)
                            ) {
                            var collisionPoint = {
                                xx: window.snakes[snake].pts[pts].xx,
                                yy: window.snakes[snake].pts[pts].yy,
                                snake: snake
                            };
 
                            if (window.visualDebugging && true === false) {
                                canvas.drawCircle(canvas.circle(
                                    collisionPoint.xx,
                                    collisionPoint.yy,
                                    window.getSnakeWidth(window.snakes[snake].sc) / 2),
                                    '#00FF00', false);
                            }
 
                            canvas.getDistance2FromSnake(collisionPoint);
                            bot.addCollisionAngle(collisionPoint);
 
                            if (scPoint === undefined ||
                                scPoint.distance > collisionPoint.distance) {
                                scPoint = collisionPoint;
                            }
                        }
                    }
                }
                if (scPoint !== undefined) {
                    bot.collisionPoints.push(scPoint);
                    if (window.visualDebugging) {
                        canvas.drawCircle(canvas.circle(
                            scPoint.xx,
                            scPoint.yy,
                            window.getSnakeWidth(window.snakes[scPoint.snake].sc) / 2
                        ), 'red', false);
                    }
                }
            }
 
            if (canvas.getDistance2(bot.MID_X, bot.MID_Y, window.snake.xx, window.snake.yy) >
                Math.pow(bot.MAP_R - 1000, 2)) {
                var midAng = canvas.fastAtan2(
                    window.snake.yy - bot.MID_X, window.snake.xx - bot.MID_Y);
                scPoint = {
                    xx: bot.MID_X + bot.MAP_R * Math.cos(midAng),
                    yy: bot.MID_Y + bot.MAP_R * Math.sin(midAng),
                    snake: -1
                };
                bot.collisionPoints.push(scPoint);
                if (window.visualDebugging) {
                    canvas.drawCircle(canvas.circle(
                        scPoint.xx,
                        scPoint.yy,
                        window.getSnakeWidth(1) * 5
                    ), 'yellow', false);
                }
            }
 
 
            bot.collisionPoints.sort(bot.sortDistance);
            if (window.visualDebugging) {
                for (var i = 0; i < bot.collisionAngles.length; i++) {
                    if (bot.collisionAngles[i] !== undefined) {
                        canvas.drawLine(
                        {x: window.snake.xx, y: window.snake.yy},
                        {x: bot.collisionAngles[i].x, y: bot.collisionAngles[i].y},
                        '#99ffcc', 2);
                    }
                }
            }
        },
 
        // Checks to see if you are going to collide with anything in the collision detection radius
        checkCollision: function(r) {
            if (!window.collisionDetection) return false;
 
            r = Number(r);
            var xx = Number(window.snake.xx.toFixed(3));
            var yy = Number(window.snake.yy.toFixed(3));
 
            window.snake.cos = Math.cos(window.snake.ang).toFixed(3);
            window.snake.sin = Math.sin(window.snake.ang).toFixed(3);
 
            const speedMult = window.snake.sp / 5.78;
            const widthMult = window.getSnakeWidth();
 
            var headCircle = canvas.circle(
                xx, yy,
                speedMult * r / 2 * widthMult / 2
            );
 
            var fullHeadCircle = canvas.circle(
                xx, yy,
                r * widthMult / 2
            );
 
            var sidecircle_r = canvas.circle(
                window.snake.lnp.xx -
                    ((window.snake.lnp.yy + window.snake.sin * window.getSnakeWidth()) -
                    window.snake.lnp.yy),
                window.snake.lnp.yy +
                    ((window.snake.lnp.xx + window.snake.cos * window.getSnakeWidth()) -
                    window.snake.lnp.xx),
                window.getSnakeWidth() * speedMult
            );
 
            var sidecircle_l = canvas.circle(
                window.snake.lnp.xx +
                    ((window.snake.lnp.yy + window.snake.sin * window.getSnakeWidth()) -
                    window.snake.lnp.yy),
                 window.snake.lnp.yy -
                    ((window.snake.lnp.xx + window.snake.cos * window.getSnakeWidth()) -
                    window.snake.lnp.xx),
                window.getSnakeWidth() * speedMult
            );
 
            window.snake.sidecircle_r = sidecircle_r;
            window.snake.sidecircle_l = sidecircle_l;
 
            if (window.visualDebugging) {
                canvas.drawCircle(fullHeadCircle, 'red');
                canvas.drawCircle(headCircle, 'blue', false);
                // canvas.drawCircle(sidecircle_r, 'orange', true, 0.3);
                // canvas.drawCircle(sidecircle_l, 'orange', true, 0.3);
            }
 
            bot.getCollisionPoints();
            if (bot.collisionPoints.length === 0) return false;
 
            for (var i = 0; i < bot.collisionPoints.length; i++) {
                // -1 snake is special case for non snake object.
                var colR = bot.collisionPoints[i].snake === -1 ? window.getSnakeWidth(1) * 5 :
                    window.getSnakeWidth(window.snakes[bot.collisionPoints[i].snake].sc) / 2;
 
                var collisionCircle = canvas.circle(
                    bot.collisionPoints[i].xx,
                    bot.collisionPoints[i].yy,
                    colR
                );
 
                if (canvas.circleIntersect(headCircle, collisionCircle)) {
                    window.setAcceleration(bot.defaultAccel);
                    bot.avoidCollisionPoint(bot.collisionPoints[i]);
                    return true;
                }
 
                if (bot.collisionPoints[i].snake !== -1) {
                    var eHeadCircle = canvas.circle(
                        window.snakes[bot.collisionPoints[i].snake].xx,
                        window.snakes[bot.collisionPoints[i].snake].yy,
                        colR
                    );
                }
            }
            window.setAcceleration(bot.defaultAccel);
            return false;
        },
 
        sortScore: function(a, b) {
            return b.score - a.score;
        },
 
        // 2.546 ~ 1 / (Math.PI / 8) - round angle difference up to nearest 22.5 degrees.
        // Round food up to nearest 5, square for distance^2
        scoreFood: function(f) {
            f.score = Math.pow(Math.ceil(f.sz / 5) * 5, 2) /
                f.distance / (Math.ceil(f.da * 2.546) / 2.546);
        },
 
        computeFoodGoal: function() {
            var foodClusters = [];
            var foodGetIndex = [];
            var fi = 0;
            var sw = window.getSnakeWidth();
 
            for (var i = 0; i < window.foods.length && window.foods[i] !== null; i++) {
                var a;
                var da;
                var distance;
                var sang = window.snake.ehang;
                var f = window.foods[i];
 
                if (!f.eaten &&
                    !(
                    canvas.circleIntersect(
                        canvas.circle(f.xx, f.yy, 2),
                        window.snake.sidecircle_l) ||
                    canvas.circleIntersect(
                        canvas.circle(f.xx, f.yy, 2),
                        window.snake.sidecircle_r))) {
 
                    var cx = Math.round(Math.round(f.xx / sw) * sw);
                    var cy = Math.round(Math.round(f.yy / sw) * sw);
                    var csz = Math.round(f.sz);
 
                    if (foodGetIndex[cx + '|' + cy] === undefined) {
                        foodGetIndex[cx + '|' + cy] = fi;
                        a = canvas.fastAtan2(cy - window.snake.yy, cx - window.snake.xx);
                        da = Math.min(
                            (2 * Math.PI) - Math.abs(a - sang), Math.abs(a - sang));
                        distance = Math.round(
                            canvas.getDistance2(cx, cy, window.snake.xx, window.snake.yy));
                        foodClusters[fi] = {
                            x: cx, y: cy, a: a, da: da, sz: csz, distance: distance, score: 0.0 };
                        fi++;
                    } else {
                        foodClusters[foodGetIndex[cx + '|' + cy]].sz += csz;
                    }
                }
            }
 
            foodClusters.forEach(bot.scoreFood);
            foodClusters.sort(bot.sortScore);
 
            for (i = 0; i < foodClusters.length; i++) {
                var aIndex = bot.getAngleIndex(foodClusters[i].a);
                if (bot.collisionAngles[aIndex] === undefined ||
                    (bot.collisionAngles[aIndex].distance - Math.pow(window.getSnakeWidth(), 2) >
                    foodClusters[i].distance && foodClusters[i].sz > 10)
                    ) {
                    bot.currentFood = foodClusters[i];
                    return;
                }
            }
            bot.currentFood = {x: bot.MID_X, y: bot.MID_Y};
        },
 
        foodAccel: function() {
            var aIndex = 0;
 
            if (bot.currentFood && bot.currentFood.sz > 60) {
                aIndex = bot.getAngleIndex(bot.currentFood.a);
 
                if (
                    bot.collisionAngles[aIndex] && bot.collisionAngles[aIndex].distance >
                    bot.currentFood.distance * 2) {
                    return 1;
                }
 
                if (bot.collisionAngles[aIndex] === undefined) {
                    return 1;
                }
            }
 
            return bot.defaultAccel;
        },
 
        // Loop version of collision check
        collisionLoop: function() {
            if (bot.checkCollision(window.collisionRadiusMultiplier)) {
                bot.lookForFood = false;
                if (bot.foodTimeout) {
                    window.clearTimeout(bot.foodTimeout);
                    bot.foodTimeout = window.setTimeout(bot.foodTimer, 1000 / TARGET_FPS * 4);
                }
            } else {
                bot.lookForFood = true;
                if (bot.foodTimeout === undefined) {
                    bot.foodTimeout = window.setTimeout(bot.foodTimer, 1000 / TARGET_FPS * 4);
                }
                window.setAcceleration(bot.foodAccel());
            }
        },
 
        // Timer version of food check
        foodTimer: function() {
            if (window.playing && bot.lookForFood &&
                window.snake !== null && window.snake.alive_amt === 1) {
                bot.computeFoodGoal();
                window.goalCoordinates = bot.currentFood;
            }
            bot.foodTimeout = undefined;
        }
    };
})();
 
var userInterface = window.userInterface = (function() {
    // Save the original slither.io functions so we can modify them, or reenable them later.
    var original_keydown = document.onkeydown;
    var original_onmouseDown = window.onmousedown;
    var original_oef = window.oef;
    var original_redraw = window.redraw;
    var original_onmousemove = window.onmousemove;
 
    window.oef = function() {};
    window.redraw = function() {};
 
    return {
        overlays: {},
 
        initOverlays: function() {
            var botOverlay = document.createElement('div');
            botOverlay.style.position = 'fixed';
            botOverlay.style.right = '5px';
            botOverlay.style.bottom = '112px';
            botOverlay.style.width = '150px';
            botOverlay.style.height = '85px';
            // botOverlay.style.background = 'rgba(0, 0, 0, 0.5)';
            botOverlay.style.color = '#C0C0C0';
            botOverlay.style.fontFamily = 'Consolas, Verdana';
            botOverlay.style.zIndex = 999;
            botOverlay.style.fontSize = '14px';
            botOverlay.style.padding = '5px';
            botOverlay.style.borderRadius = '5px';
            botOverlay.className = 'nsi';
            document.body.appendChild(botOverlay);
 
            var serverOverlay = document.createElement('div');
            serverOverlay.style.position = 'fixed';
            serverOverlay.style.right = '5px';
            serverOverlay.style.bottom = '5px';
            serverOverlay.style.width = '160px';
            serverOverlay.style.height = '14px';
            serverOverlay.style.color = '#C0C0C0';
            serverOverlay.style.fontFamily = 'Consolas, Verdana';
            serverOverlay.style.zIndex = 999;
            serverOverlay.style.fontSize = '14px';
            serverOverlay.className = 'nsi';
            document.body.appendChild(serverOverlay);
            var prefOverlay = document.createElement('div');
            prefOverlay.style.position = 'fixed';
            prefOverlay.style.left = '10px';
            prefOverlay.style.top = '75px';
            prefOverlay.style.width = '260px';
            prefOverlay.style.height = '210px';
            // prefOverlay.style.background = 'rgba(0, 0, 0, 0.5)';
            prefOverlay.style.color = '#C0C0C0';
            prefOverlay.style.fontFamily = 'Consolas, Verdana';
            prefOverlay.style.zIndex = 999;
            prefOverlay.style.fontSize = '14px';
            prefOverlay.style.padding = '5px';
            prefOverlay.style.borderRadius = '5px';
            prefOverlay.className = 'nsi';
            document.body.appendChild(prefOverlay);
 
            var statsOverlay = document.createElement('div');
            statsOverlay.style.position = 'fixed';
            statsOverlay.style.left = '10px';
            statsOverlay.style.top = '295px';
            statsOverlay.style.width = '140px';
            statsOverlay.style.height = '210px';
            // statsOverlay.style.background = 'rgba(0, 0, 0, 0.5)';
            statsOverlay.style.color = '#C0C0C0';
            statsOverlay.style.fontFamily = 'Consolas, Verdana';
            statsOverlay.style.zIndex = 998;
            statsOverlay.style.fontSize = '14px';
            statsOverlay.style.padding = '5px';
            statsOverlay.style.borderRadius = '5px';
            statsOverlay.className = 'nsi';
            document.body.appendChild(statsOverlay);
 
            userInterface.overlays.botOverlay = botOverlay;
            userInterface.overlays.serverOverlay = serverOverlay;
            userInterface.overlays.prefOverlay = prefOverlay;
            userInterface.overlays.statsOverlay = statsOverlay;
        },
 
        toggleOverlays: function() {
            Object.keys(userInterface.overlays).forEach(function(okey) {
                var oVis = userInterface.overlays[okey].style.visibility !== 'hidden' ?
                    'hidden' : 'visible';
                userInterface.overlays[okey].style.visibility = oVis;
                window.visualDebugging = oVis === 'visible';
            });
        },
 
        // Save variable to local storage
        savePreference: function(item, value) {
            window.localStorage.setItem(item, value);
            userInterface.onPrefChange();
        },
 
        // Load a variable from local storage
        loadPreference: function(preference, defaultVar) {
            var savedItem = window.localStorage.getItem(preference);
            if (savedItem !== null) {
                if (savedItem === 'true') {
                    window[preference] = true;
                } else if (savedItem === 'false') {
                    window[preference] = false;
                } else {
                    window[preference] = savedItem;
                }
                window.log('Setting found for ' + preference + ': ' + window[preference]);
            } else {
                window[preference] = defaultVar;
                window.log('No setting found for ' + preference +
                    '. Used default: ' + window[preference]);
            }
            userInterface.onPrefChange();
            return window[preference];
        },

 
        // Hide top score
        hideTop: function() {
            var nsidivs = document.querySelectorAll('div.nsi');
            for (var i = 0; i < nsidivs.length; i++) {
                if (nsidivs[i].style.top === '4px' && nsidivs[i].style.width === '300px') {
                    nsidivs[i].style.visibility = 'hidden';
                    bot.isTopHidden = true;
                    window.topscore = nsidivs[i];
                }
            }
        },
 
        // Store FPS data
        framesPerSecond: {
            fps: 0,
            fpsTimer: function() {
                if (window.playing && window.fps && window.lrd_mtm) {
                    if (Date.now() - window.lrd_mtm > 970) {
                        userInterface.framesPerSecond.fps = window.fps;
                    }
                }
            }
        },
 
        onkeydown: function(e) {
            // Original slither.io onkeydown function + whatever is under it
            original_keydown(e);
            if (window.playing) {
                // Letter `T` to toggle bot
                if (e.keyCode === 84) {
                    bot.isBotEnabled = !bot.isBotEnabled;
                }
                // Letter 'U' to toggle debugging (console)
                if (e.keyCode === 85) {
                    window.logDebugging = !window.logDebugging;
                    console.log('Log debugging set to: ' + window.logDebugging);
                    userInterface.savePreference('logDebugging', window.logDebugging);
                }
                // Letter 'Y' to toggle debugging (visual)
                if (e.keyCode === 89) {
                    window.visualDebugging = !window.visualDebugging;
                    console.log('Visual debugging set to: ' + window.visualDebugging);
                    userInterface.savePreference('visualDebugging', window.visualDebugging);
                }
                // Letter 'H' to toggle hidden mode
                if (e.keyCode === 72) {
                    userInterface.toggleOverlays();
                }
                // Letter 'O' to change rendermode (visual)
                if (e.keyCode === 79) {
                    userInterface.toggleMobileRendering(!window.mobileRender);
                }
                // Letter 'C' to toggle Collision detection / enemy avoidance
                if (e.keyCode === 67) {
                    window.collisionDetection = !window.collisionDetection;
                    console.log('collisionDetection set to: ' + window.collisionDetection);
                    userInterface.savePreference('collisionDetection', window.collisionDetection);
                }
                // Letter 'A' to increase collision detection radius
                if (e.keyCode === 65) {
                    window.collisionRadiusMultiplier++;
                    console.log(
                        'collisionRadiusMultiplier set to: ' + window.collisionRadiusMultiplier);
                    userInterface.savePreference(
                        'collisionRadiusMultiplier', window.collisionRadiusMultiplier);
                }
                // Letter 'S' to decrease collision detection radius
                if (e.keyCode === 83) {
                    if (window.collisionRadiusMultiplier > 1) {
                        window.collisionRadiusMultiplier--;
                        console.log(
                            'collisionRadiusMultiplier set to: ' +
                            window.collisionRadiusMultiplier);
                        userInterface.savePreference(
                            'collisionRadiusMultiplier', window.collisionRadiusMultiplier);
                    }
                }
                // Letter 'Z' to reset zoom
                if (e.keyCode === 90) {
                    canvas.resetZoom();
                }
                // Letter 'Q' to quit to main menu
                if (e.keyCode === 81) {
                    userInterface.quit();
                }
                // 'ESC' to quickly respawn
                if (e.keyCode === 27) {
                    bot.quickRespawn();
                }
                userInterface.onPrefChange();
            }
        },
 
        // Manual mobile rendering
        toggleMobileRendering: function(mobileRendering) {
            window.mobileRender = mobileRendering;
            window.log('Mobile rendering set to: ' + window.mobileRender);
            userInterface.savePreference('mobileRender', window.mobileRender);
            // Set render mode
            if (window.mobileRender) {
                canvas.setBackground(
                    'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs');
                window.render_mode = 1;
                window.want_quality = 0;
                window.high_quality = false;
            } else {
                canvas.setBackground();
                window.render_mode = 2;
                window.want_quality = 1;
                window.high_quality = true;
            }
        },
 
        onPrefChange: function() {
            // Set static display options here.
            var oContent = [];
            var ht = userInterface.handleTextColor;
 
            oContent.push('[T] Enable / disable bot: ' + ht(bot.isBotEnabled));
            oContent.push('[C] collision detection on/off: ' + ht(window.collisionDetection));
            oContent.push('[O] Mobile version on/off: ' + ht(window.mobileRender));
            oContent.push('[A/S] Radius multiplier (S-less, A-Greater): ' + window.collisionRadiusMultiplier);
            oContent.push('[Y] Visual debugging on / off: ' + ht(window.visualDebugging));
            oContent.push('[U] debug log: ' + ht(window.logDebugging));
            oContent.push('[Wheel(mouse)] Zoom (zoom in on top, zoom out down');
            oContent.push('[Z] Reset Zoom.');
            oContent.push('[ESC] Respawn');
            oContent.push('[Q] Exit to menu.');
 
            userInterface.overlays.prefOverlay.innerHTML = oContent.join('<br/>');
        },
 
        onFrameUpdate: function() {
            // Botstatus overlay
            var oContent = [];
 
            if (window.playing && window.snake !== null) {
                oContent.push('fps: ' + userInterface.framesPerSecond.fps);
 
                // Display the X and Y of the snake
                oContent.push('x: ' +
                    (Math.round(window.snake.xx) || 0) + ' y: ' +
                    (Math.round(window.snake.yy) || 0));
 
                if (window.goalCoordinates) {
                    oContent.push('target');
                    oContent.push('x: ' + window.goalCoordinates.x + ' y: ' +
                        window.goalCoordinates.y);
                    if (window.goalCoordinates.sz) {
                        oContent.push('sz: ' + window.goalCoordinates.sz);
                    }
                }
 
                if (window.bso !== undefined && userInterface.overlays.serverOverlay.innerHTML !==
                    window.bso.ip + ':' + window.bso.po) {
                    userInterface.overlays.serverOverlay.innerHTML =
                        window.bso.ip + ':' + window.bso.po;
                }
            }
 
            userInterface.overlays.botOverlay.innerHTML = oContent.join('<br/>');
 
 
            if (window.playing && window.visualDebugging) {
                // Only draw the goal when a bot has a goal.
                if (window.goalCoordinates && bot.isBotEnabled) {
                    var headCoord = {x: window.snake.xx, y: window.snake.yy};
                    canvas.drawLine(
                        headCoord,
                        window.goalCoordinates,
                        'green');
                    canvas.drawCircle(window.goalCoordinates, 'red', true);
                }
            }
        },
 
        oefTimer: function() {
            var start = Date.now();
            canvas.maintainZoom();
            original_oef();
            original_redraw();
 
            if (window.playing && bot.isBotEnabled && window.snake !== null) {
                window.onmousemove = function() { };
                bot.isBotRunning = true;
                bot.collisionLoop();
            } else if (bot.isBotEnabled && bot.isBotRunning) {
                bot.isBotRunning = false;
                if (window.lastscore && window.lastscore.childNodes[1]) {
                    bot.scores.push(parseInt(window.lastscore.childNodes[1].innerHTML));
                    bot.scores.sort(function(a, b) { return b - a; });
                    userInterface.updateStats();
                }
 
            }
 
            if (!bot.isBotEnabled || bot.isBotRunning) {
                window.onmousemove = original_onmousemove;
            }
 
            userInterface.onFrameUpdate();
            setTimeout(userInterface.oefTimer, (1000 / TARGET_FPS) - (Date.now() - start));
        },
 
        // Quit to menu
        quit: function() {
            if (window.playing && window.resetGame) {
                window.want_close_socket = true;
                window.dead_mtm = 0;
                window.resetGame();
            }
        },
 
        // Update the relation between the screen and the canvas.
        onresize: function() {
            window.resize();
            // Canvas different size from the screen (often bigger).
            canvas.canvasRatio = {
                x: window.mc.width / window.ww,
                y: window.mc.height / window.hh
            };
        },
 
        handleTextColor: function(enabled) {
            return '<span style=\"color:' +
                (enabled ? 'green;\">enabled' : 'red;\">disabled') + '</span>';
        }
    };
})();
 
// Main
(function() {
    document.onkeydown = userInterface.onkeydown;
    window.onmousedown = userInterface.onmousedown;
    window.addEventListener('mouseup', userInterface.onmouseup);
    window.onresize = userInterface.onresize;
 
     // Hide top score
    userInterface.hideTop();
 
    // Overlays
    userInterface.initOverlays();
 
    // Load preferences
    userInterface.loadPreference('logDebugging', true);
    userInterface.loadPreference('visualDebugging', true);
    userInterface.loadPreference('mobileRender', true);
    userInterface.loadPreference('collisionDetection', true);
    userInterface.loadPreference('collisionRadiusMultiplier', 10);

    // Listener for mouse wheel scroll - used for setZoom function
    document.body.addEventListener('mousewheel', canvas.setZoom);
    document.body.addEventListener('DOMMouseScroll', canvas.setZoom);
 
    // Set render mode
    if (window.mobileRender) {
        userInterface.toggleMobileRendering(false);
    } else {
        userInterface.toggleMobileRendering(true);
    }
 
    // Unblocks all skins without the need for FB sharing.
    window.localStorage.setItem('edttsg', '1');
 
    // Remove social
    window.social.remove();
 
    // Maintain fps
    setInterval(userInterface.framesPerSecond.fpsTimer, 80);
 
    // Start!
    userInterface.oefTimer();
})();
