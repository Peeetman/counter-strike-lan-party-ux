// fetching templates for player cards
function fetchTemplate(url, targetId) {
    fetch(url)
        .then(response => response.text())
        .then(html => {
            // Inject the fetched HTML content into the specified target element
            document.getElementById(targetId).innerHTML += html;
        })
        .catch(error => console.error('Error fetching template:', error));
}

// Load templates into respective elements
$(document).ready(function() {
    for (let i = 0; i < 5; i++) {
        fetchTemplate('./templates/single-player-card-content.html', 'ct-wrapper');
        fetchTemplate('./templates/single-player-card-content.html', 't-wrapper');
    }
})

//date and time
// Function to format and update the current time
function updateCurrentTime() {
    const now = new Date();
    
    // Format hours and minutes
    const timeOptions = { hour: '2-digit', minute: '2-digit' };
    const timeFormatter = new Intl.DateTimeFormat('de-DE', timeOptions);
    const timeString = timeFormatter.format(now);
    
    // Format day, month, and year
    const dateOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
    const dateFormatter = new Intl.DateTimeFormat('de-DE', dateOptions);
    const dateString = dateFormatter.format(now);
    
    // Combine both parts
    const dateTimeString = `${timeString}, ${dateString}`;
    
    // Update the span content
    document.getElementById('currentTime').textContent = dateTimeString;
}

// Update the time immediately
updateCurrentTime();

// Optionally, set an interval to update the time every minute
setInterval(updateCurrentTime, 60000);

// public/script.js
const socket = io();

socket.on('bombPlanted', () => {
    console.log('The bomb has been planted!');
});

socket.on('bombDefused', () => {
    console.log('The bomb has been defused!');
});

socket.on('bombExploded', () => {
    console.log('The bomb has exploded!');
});

socket.on('roundBegin', () => {
    console.log('A new round has begun.');
});

socket.on('roundFreeze', () => {
    console.log('A Freeze has begun.');
});

socket.on('roundEnd', () => {
    console.log('The round has ended.');
});

socket.on('winTeam_CT', () => {
    console.log('Counter-Terrorists have won the round!');
});

socket.on('winTeam_T', () => {
    console.log('Terrorists have won the round!');
});

socket.on('playerDeath', ({ steamid, name }) => {
    console.log(`Player with ID [${steamid}] and Name [${name}] has died.`);
});

socket.on('playerMVP', ({ steamid, name }) => {
    console.log(`MVP: ID [${steamid}] Name [${name}] Whoop Whoop.`);
});

socket.on('matchInfoUpdate', ({ newMatchState }) => {
    console.log(`MatchInfoUpdate: ${JSON.stringify(newMatchState)}`);
});