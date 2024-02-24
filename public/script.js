
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
    document.querySelector("#match-status-wrapper .border-bottom-0 span").textContent = `Round: ${newMatchState.round}`;
    // Update team scores
    document.getElementById("score_t").textContent = newMatchState.team_t_score;
    document.getElementById("score_ct").textContent = newMatchState.team_ct_score;
    // Update map name and mode
    document.querySelector(".mapname").textContent = newMatchState.name;
    document.querySelector(".mode").textContent = newMatchState.mode.toUpperCase(); // Assuming you want the mode in uppercase
});


// Function to handle the playerStateUpdate event
socket.on('playerStateUpdate', currentPlayerState => {
    console.log(currentPlayerState);
    
    Object.keys(currentPlayerState).forEach(steamid => {
        const playerData = currentPlayerState[steamid];
        const teamTargetId = playerData.team === 'CT' ? 'ct-wrapper' : 't-wrapper';
        createOrUpdatePlayerCard(playerData, steamid, teamTargetId);
    });
    
});

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
// Update the time immediately and interval it every minute
updateCurrentTime();
setInterval(updateCurrentTime, 60000);

function createOrUpdatePlayerCard(playerData, steamid, teamTargetId) {
    const existingCardId = `player-card-${steamid}`;
    let existingCard = document.getElementById(existingCardId);

    // If the card already exists, update it
    if (existingCard) {
        populatePlayerCard(existingCard, playerData);
    } else {
        // Access the template directly from the document
        const template = document.getElementById('player-card-template');
        if (!template) {
            console.error('Player card template not found');
            return;
        }

        // Clone the template content
        const clone = document.importNode(template.content, true);

        // Assign an ID to the new card for future reference
        const playerCard = clone.querySelector('.card');
        if (!playerCard) {
            console.error('No .card found within the template');
            return;
        }
        playerCard.id = existingCardId;

        // Populate the card with the playerData's data
        populatePlayerCard(playerCard, playerData);

        // Append the new card to the target element
        document.getElementById(teamTargetId).appendChild(clone);
    }
}

// Function to populate the player card with data
function populatePlayerCard(playerCard, player) {
    playerCard.querySelector('.player-name').textContent = player.name;
    playerCard.querySelector('.kills').textContent = player.match_stats.kills;
    playerCard.querySelector('.deaths').textContent = player.match_stats.deaths;
    playerCard.querySelector('.assists').textContent = player.match_stats.assists;
    playerCard.querySelector('.mvps').textContent = player.match_stats.mvps;
    playerCard.querySelector('.kd').textContent = (player.match_stats.deaths !== 0 ? player.match_stats.kills / player.match_stats.deaths : player.match_stats.kills);
    // For example:
    // playerCard.querySelector('.player-image').src = './path/to/avatars/' + player.avatarFileName;
}

document.addEventListener('DOMContentLoaded', function() {
    // // Your code that interacts with the DOM here
    // const template = document.getElementById('player-card-template');
    // console.log(template); // This should show the template element in console
});
