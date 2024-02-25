
// public/script.js
const socket = io();

// Visuelle Events
socket.on('eventText', (eventText) => {
    console.log(`eventText: ${eventText}`);
    document.querySelector("#event-text").textContent = eventText;
})

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
    mvpWrapperOut();
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

socket.on('playerDeathWithGrenade', ({ steamid, name }) => {
    console.log(`Player with ID [${steamid}] and Name [${name}] died with a grenade in the hand.`);
});


let mvpAudio = new Audio('./media/player-content/force/caramelldansen-hd.mp3');
socket.on('playerMVP', ({ steamid, name }) => {
    console.log(`MVP: ID [${steamid}] Name [${name}] Whoop Whoop.`);
    document.getElementById("mvp-name").textContent = name;

    // Audio Load
    mvpAudio.src = clientPlayerState[steamid].mvpSounds;
    mvpAudio.volume = 0.2;
    mvpAudio.load();
    
    mvpWrapperIn();
});

// Data Events
socket.on('matchInfoUpdate', ({ newMatchState }) => {
    console.log(`MatchInfoUpdate: ${JSON.stringify(newMatchState)}`);
    document.querySelector("#match-status-wrapper .border-bottom-0 span").textContent = `Round: ${newMatchState.round}`;
    document.getElementById("score_t").textContent = newMatchState.team_t_score;
    document.getElementById("score_ct").textContent = newMatchState.team_ct_score;
    document.querySelector(".mapname").textContent = newMatchState.name;
    document.querySelector(".mode").textContent = newMatchState.mode;
});

let clientPlayerState = {}
// Function to handle the playerStateUpdate event
socket.on('playerStateUpdate', currentPlayerState => {
    console.log(currentPlayerState);
    clientPlayerState = currentPlayerState;
    // console.log(clientPlayerState)

    // Create or Update Player Cards
    Object.keys(currentPlayerState).forEach(steamid => {
        const playerData = currentPlayerState[steamid];
        const teamTargetId = playerData.team === 'CT' ? 'ct-wrapper' : 't-wrapper';
        createOrUpdatePlayerCard(playerData, steamid, teamTargetId);
    });

    // Remove ones not matching
    const steamids = Object.keys(currentPlayerState);
    removeUnmatchedPlayerCards(steamids);
    
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

    // Check for team change
    let teamChanged = false;
    if (existingCard) {
        const currentTeam = existingCard.getAttribute('data-team');
        if (currentTeam !== playerData.team) {
            teamChanged = true;
            existingCard.setAttribute('data-team', playerData.team); // Update the card's team attribute
        }
        populatePlayerCard(existingCard, steamid, playerData);
        updateAliveStatus(existingCard, playerData.alive);
    } else {
        // Access the template directly from the document
        const template = document.getElementById('player-card-template');
        if (!template) {
            console.error('Player card template not found');
            return;
        }

        // Clone the template content
        const clone = document.importNode(template.content, true);
        const playerCard = clone.querySelector('.card');
        if (!playerCard) {
            console.error('No .card found within the template');
            return;
        }
        playerCard.id = existingCardId;
        playerCard.setAttribute('data-team', playerData.team); // Set the card's team attribute

        populatePlayerCard(playerCard, steamid, playerData);
        updateAliveStatus(playerCard, playerData.alive);

        document.getElementById(teamTargetId).appendChild(clone);
    }

    if (teamChanged) {
        reRenderAllPlayerCards();
    }
}

function reRenderAllPlayerCards() {
    // Clear all existing player cards except the template
    document.querySelectorAll('[id^=player-card-]:not(template#player-card-template)').forEach(card => card.remove());

    // Iterate over clientPlayerState to recreate all player cards
    Object.keys(clientPlayerState).forEach(steamid => {
        const playerData = clientPlayerState[steamid];
        const teamTargetId = playerData.team === 'CT' ? 'ct-wrapper' : 't-wrapper';
        createOrUpdatePlayerCard(playerData, steamid, teamTargetId);
    });
}

// Helper function to update the alive status of a player card
function updateAliveStatus(playerCard, isAlive) {
    if (!isAlive) {
        playerCard.classList.add('not-alive');
    } else {
        playerCard.classList.remove('not-alive');
    }
}

// Function to populate the player card with data
function populatePlayerCard(playerCard, steamid, player) {
    playerCard.querySelector('.player-name').textContent = player.name;
    playerCard.querySelector('.kills').textContent = player.match_stats.kills;
    playerCard.querySelector('.deaths').textContent = player.match_stats.deaths;
    playerCard.querySelector('.assists').textContent = player.match_stats.assists;
    playerCard.querySelector('.mvps').textContent = player.match_stats.mvps;
    playerCard.querySelector('.kd').textContent = (player.match_stats.deaths !== 0 ? Math.round(player.match_stats.kills / player.match_stats.deaths * 100) / 100 : player.match_stats.kills);
    // player img
    const imgElement = playerCard.querySelector('.player-image');
    imgElement.src = player.playerImage
}

function removeUnmatchedPlayerCards(steamids) {
    allPlayerCards = document.querySelectorAll('[id^=player-card-]:not(template#player-card-template)');
    allPlayerCards.forEach(card => {
        const cardSteamId = card.id.replace('player-card-', '');
        if (!steamids.includes(cardSteamId)) {
            card.remove();
        }
    });
}

function injectDummyPlayerCards() {
    const template = document.getElementById('player-card-template');
    for (let i = 0; i < 5; i++) {
        const clone_ct = document.importNode(template.content, true);
        document.getElementById('ct-wrapper').appendChild(clone_ct);
        const clone_t = document.importNode(template.content, true);
        document.getElementById('t-wrapper').appendChild(clone_t);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // injectDummyPlayerCards();
});


// Animation Helpers
function mvpWrapperIn(){    
    // To expand outwards
    document.getElementById('mvp-animation-wrapper').classList.remove('contract-inwards-animation');
    document.getElementById('mvp-animation-wrapper').classList.add('expand-outwards-animation');

    mvpAudio.play();
    setTimeout(() => {
        mvpAudio.pause();
        mvpAudio.currentTime = 0;
    }, "10000");
}

function mvpWrapperOut(){    
    // To expand outwards
    document.getElementById('mvp-animation-wrapper').classList.remove('expand-outwards-animation');
    document.getElementById('mvp-animation-wrapper').classList.add('contract-inwards-animation');

    //MVP Audio
    mvpAudio.pause();
    mvpAudio.currentTime = 0;
}

