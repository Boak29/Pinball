var RELAY_SERVER = 'wss://tikpinball-relay.onrender.com';
var GAME_URL = 'https://boak29.github.io/Pinball/PinballGame.htm';

function startGame() {
    var username = document.getElementById('username').value.trim();
    var statusEl = document.getElementById('status');
    var btn = document.getElementById('startBtn');

    if (!username) {
        statusEl.textContent = 'Please enter your TikTok username';
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Loading...';
    statusEl.textContent = 'Connecting to game...';

    var gameUrl = GAME_URL
        + '?user=' + encodeURIComponent(username)
        + '&ws=' + encodeURIComponent(RELAY_SERVER);

    localStorage.setItem('tikpinball_username', username);

    window.location.href = 'game.html?url=' + encodeURIComponent(gameUrl);
}

// Auto-fill last used username
(function() {
    var saved = localStorage.getItem('tikpinball_username');
    if (saved) {
        document.getElementById('username').value = saved;
    }

    // Allow Enter key to submit
    document.getElementById('username').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') startGame();
    });
})();
