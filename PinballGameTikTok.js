(function() {
    'use strict';

    var WS_SERVER = 'wss://tiktok-pinball-relay.onrender.com';
    var TIKTOK_USER = '';

    var ws = null;
    var connected = false;
    var gameState = null;
    var notifications = [];
    var extraBalls = [];
    var tempObstacles = [];
    var scoreMultiplier = 1;
    var originalGravity = null;
    var connectionLabel = null;
    var isHooked = false;
    var cleanupTimer = null;

    // --- URL params ---
    try {
        var params = new URLSearchParams(window.location.search);
        if (params.get('ws')) WS_SERVER = params.get('ws');
        if (params.get('user')) TIKTOK_USER = params.get('user');
    } catch(e) {}

    // --- WebSocket ---
    function connectWs() {
        if (!WS_SERVER) return;
        try {
            ws = new WebSocket(WS_SERVER);
            ws.onopen = function() {
                connected = true;
                if (connectionLabel) {
                    connectionLabel.setText('Connected');
                    connectionLabel.visible = true;
                    setTimeout(function() { if (connectionLabel) connectionLabel.visible = false; }, 3000);
                }
                if (TIKTOK_USER && ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'join', username: TIKTOK_USER }));
                }
            };
            ws.onclose = function() {
                connected = false;
                ws = null;
                if (connectionLabel) { connectionLabel.setText('Reconnecting...'); connectionLabel.visible = true; }
                setTimeout(connectWs, 3000);
            };
            ws.onerror = function() { connected = false; };
            ws.onmessage = function(evt) {
                try { handleEvent(JSON.parse(evt.data)); } catch(e) {}
            };
        } catch(e) {
            setTimeout(connectWs, 3000);
        }
    }

    function handleEvent(data) {
        if (!gameState) return;
        switch (data.type) {
            case 'gift': handleGift(data); break;
            case 'connected':
                if (connectionLabel) {
                    connectionLabel.setText('LIVE: @' + data.username);
                    connectionLabel.visible = true;
                    setTimeout(function() { if (connectionLabel) connectionLabel.visible = false; }, 4000);
                }
                break;
            case 'error':
                if (connectionLabel) { connectionLabel.setText('Error: ' + data.message); connectionLabel.visible = true; }
                break;
        }
    }

    function handleGift(data) {
        var username = data.nickname || data.uniqueId || 'Viewer';
        var giftName = data.giftName || 'gift';
        var diamonds = data.diamondCount || 0;
        if (diamonds <= 1) {
            spawnExtraBall(username);
        } else if (diamonds <= 10) {
            activatePowerup(username);
        } else if (diamonds <= 50) {
            activateSabotage(username);
        } else {
            spawnObstacle(username);
        }
        showNotification(username, giftName);
    }

    // --- Extra Ball ---
    function spawnExtraBall(username) {
        if (!gameState) return;
        var s = gameState;
        var x = s.ballStart[0] * s.PTM;
        var y = s.ballStart[1] * s.PTM - 60;
        var body = new Phaser.Physics.Box2D.Body(game, null, x, y, 2);
        body.setCircle(0.64 * s.PTM);
        body.bullet = true;
        var sprite = game.add.sprite(0, 0, 'imageGameBall');
        sprite.tint = 0xFF69B4;
        var eb = { body: body, sprite: sprite, active: true };
        extraBalls.push(eb);
        if (s.gutterFixture1) {
            body.setFixtureContactCallback(s.gutterFixture1, function() { removeExtraBall(eb); });
        }
        if (s.gutterFixture2) {
            body.setFixtureContactCallback(s.gutterFixture2, function() { removeExtraBall(eb); });
        }
        setTimeout(function() { removeExtraBall(eb); }, 20000);
    }

    function removeExtraBall(eb) {
        if (!eb || !eb.active) return;
        eb.active = false;
        var idx = extraBalls.indexOf(eb);
        if (idx >= 0) extraBalls.splice(idx, 1);
        if (eb.sprite && eb.sprite.destroy) eb.sprite.destroy();
        if (eb.body && eb.body.destroy) eb.body.destroy();
    }

    // --- Power-ups ---
    function activatePowerup(username) {
        if (!gameState) return;
        var choices = ['speedBoost', 'widerFlippers', 'scoreMultiplier'];
        var choice = choices[Math.floor(Math.random() * choices.length)];
        var s = gameState;
        switch (choice) {
            case 'speedBoost':
                if (s.ballBody) s.ballBody.applyImpulse(0, -300);
                for (var i = 0; i < extraBalls.length; i++) {
                    if (extraBalls[i].active && extraBalls[i].body) extraBalls[i].body.applyImpulse(0, -300);
                }
                showNotification(username, 'Speed Boost!');
                break;
            case 'widerFlippers':
                if (s.leftFlipperSprite) s.leftFlipperSprite.scale.set(1.6, 1);
                if (s.rightFlipperSprite) s.rightFlipperSprite.scale.set(1.6, 1);
                setTimeout(function() {
                    if (s.leftFlipperSprite) s.leftFlipperSprite.scale.set(1, 1);
                    if (s.rightFlipperSprite) s.rightFlipperSprite.scale.set(1, 1);
                }, 10000);
                showNotification(username, 'Wider Flippers!');
                break;
            case 'scoreMultiplier':
                scoreMultiplier = 3;
                showNotification(username, '3x Score!');
                setTimeout(function() { scoreMultiplier = 1; }, 15000);
                break;
        }
    }

    // --- Sabotage ---
    function activateSabotage(username) {
        if (!gameState) return;
        var choices = ['shakeScreen', 'heavyGravity', 'weakFlippers'];
        var choice = choices[Math.floor(Math.random() * choices.length)];
        var s = gameState;
        switch (choice) {
            case 'shakeScreen':
                game.camera.shake(0.03, 600);
                break;
            case 'heavyGravity':
                if (originalGravity === null) originalGravity = game.physics.box2d.gravity.y;
                game.physics.box2d.gravity.y = (originalGravity || 5000) * 2;
                setTimeout(function() {
                    if (originalGravity !== null) game.physics.box2d.gravity.y = originalGravity;
                }, 8000);
                break;
            case 'weakFlippers':
                if (s.flipperJoints) {
                    s.flipperJoints[0].m_motorTorque = 15;
                    s.flipperJoints[1].m_motorTorque = 15;
                    setTimeout(function() {
                        if (s.flipperJoints[0]) s.flipperJoints[0].m_motorTorque = 100;
                        if (s.flipperJoints[1]) s.flipperJoints[1].m_motorTorque = 100;
                    }, 10000);
                }
                break;
        }
        showNotification(username, 'Sabotage!');
    }

    // --- Obstacle ---
    function spawnObstacle(username) {
        if (!gameState) return;
        var s = gameState;
        var randX = (Math.random() * 10 - 5) * s.PTM;
        var randY = (Math.random() * 8 - 6) * s.PTM;
        var body = new Phaser.Physics.Box2D.Body(game, null, randX, randY, 0);
        body.setCircle(0.45 * s.PTM);
        var gfx = game.add.graphics(0, 0);
        gfx.beginFill(0xFF4444, 0.8);
        gfx.drawCircle(0, 0, 9);
        gfx.endFill();
        var obs = { body: body, gfx: gfx };
        tempObstacles.push(obs);
        setTimeout(function() {
            var idx = tempObstacles.indexOf(obs);
            if (idx >= 0) {
                if (tempObstacles[idx].gfx) tempObstacles[idx].gfx.destroy();
                if (tempObstacles[idx].body) tempObstacles[idx].body.destroy();
                tempObstacles.splice(idx, 1);
            }
        }, 15000);
        showNotification(username, 'Obstacle!');
    }

    // --- Notification ---
    function showNotification(username, action) {
        if (!gameState) return;
        var msg = username + ': ' + action;
        var style = { font: 'bold 10px Arial', fill: '#FFFF00', stroke: '#000000', strokeThickness: 3, align: 'center' };
        var text = game.add.text(160, 290, msg, style);
        text.anchor.set(0.5, 0.5);
        text.fixedToCamera = true;
        var tween = game.add.tween(text).to({ y: 250, alpha: 0 }, 3000, Phaser.Easing.Quadratic.Out, true);
        tween.onComplete.add(function() { if (text.destroy) text.destroy(); });
        notifications.push(text);
        if (notifications.length > 5) {
            var old = notifications.shift();
            if (old.destroy) old.destroy();
        }
    }

    // --- Update loop ---
    function updateExtraBalls() {
        for (var i = extraBalls.length - 1; i >= 0; i--) {
            var eb = extraBalls[i];
            if (!eb.active) continue;
            if (eb.body && eb.sprite) {
                eb.sprite.position.x = eb.body.x * 0.10 - 6;
                eb.sprite.position.y = eb.body.y * 0.10 - 6;
            }
        }
    }

    // --- Cleanup ---
    function cleanupGame() {
        for (var i = extraBalls.length - 1; i >= 0; i--) {
            var eb = extraBalls[i];
            if (eb.sprite && eb.sprite.destroy) eb.sprite.destroy();
            if (eb.body && eb.body.destroy) eb.body.destroy();
        }
        extraBalls = [];
        for (var j = tempObstacles.length - 1; j >= 0; j--) {
            var o = tempObstacles[j];
            if (o.gfx && o.gfx.destroy) o.gfx.destroy();
            if (o.body && o.body.destroy) o.body.destroy();
        }
        tempObstacles = [];
        for (var k = notifications.length - 1; k >= 0; k--) {
            if (notifications[k].destroy) notifications[k].destroy();
        }
        notifications = [];
        scoreMultiplier = 1;
        if (connectionLabel) { connectionLabel.visible = false; }
    }

    // --- Hooks ---
    function setupHooks() {
        if (isHooked) return;
        isHooked = true;

        var origCreate = Pinball.Game.prototype.create;
        Pinball.Game.prototype.create = function() {
            origCreate.call(this);
            gameState = this;
            cleanupGame();
            initUI(this);
        };

        var origUpdate = Pinball.Game.prototype.update;
        Pinball.Game.prototype.update = function() {
            origUpdate.call(this);
            updateExtraBalls();
        };

        var origUpdateScore = Pinball.Game.prototype.updateScore;
        Pinball.Game.prototype.updateScore = function(score) {
            if (scoreMultiplier > 1 && score > 0) {
                var current = this.scoreValue || 0;
                if (score > current) {
                    var gained = score - current;
                    score = current + Math.round(gained * scoreMultiplier);
                    if (score > 9999) score = 9999;
                }
            }
            origUpdateScore.call(this, score);
        };
    }

    function initUI(state) {
        var style = { font: 'bold 11px Arial', fill: '#FFFFFF', stroke: '#000000', strokeThickness: 3, align: 'center' };
        connectionLabel = game.add.text(160, 12, '', style);
        connectionLabel.anchor.set(0.5, 0);
        connectionLabel.fixedToCamera = true;
        connectionLabel.visible = false;
        if (connected) {
            connectionLabel.setText(TIKTOK_USER ? 'LIVE: @' + TIKTOK_USER : 'Connected');
            connectionLabel.visible = true;
            setTimeout(function() { if (connectionLabel) connectionLabel.visible = false; }, 3000);
        } else {
            connectionLabel.setText('Connecting...');
            connectionLabel.visible = true;
        }
    }

    // --- Init ---
    function init() {
        setupHooks();
        if (WS_SERVER) connectWs();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
