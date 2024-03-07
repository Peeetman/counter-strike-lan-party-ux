// public/script.js
const socket = io();
let clientPlayerState = {}
let clientParticipantsConfig = {}

// Visuelle Events
socket.on('eventText', (eventText) => {
    console.log(`eventText: ${eventText}`);
    // document.querySelector("#event-text").textContent = eventText;
})

let bombStatus = ''
socket.on('bombPlanted', () => {
    console.log('The bomb has been planted!');
    bombStatus = 'bomb-planted';
    showBomb({ bombStatus });
});

socket.on('bombDefused', () => {
    console.log('The bomb has been defused!');

    (counterTerrorEffectTimer ? clearTimeout(counterTerrorEffectTimer) : '');
    (terrorEffectTimer ? clearTimeout(terrorEffectTimer) : '');

    bombStatus = 'bomb-defused';
    showBomb({ bombStatus });

    setTimeout(() => {
        showEventText('COUNTER-TERRORISTS WIN!')
    }, 2000);
});

socket.on('bombExploded', () => {
    console.log('The bomb has exploded!');

    (counterTerrorEffectTimer ? clearTimeout(counterTerrorEffectTimer) : '');
    (terrorEffectTimer ? clearTimeout(terrorEffectTimer) : '');

    bombStatus = 'bomb-exploded';
    showBomb({ bombStatus });

    setTimeout(() => {
        showEventText('TERRORISTS WIN!')
    }, 2000);
});

let counterTerrorEffectTimer = '';
socket.on('winTeam_CT', async () => {
    console.log('Counter-Terrorists have won the round!');

    ctWinEffects();

    counterTerrorEffectTimer = setTimeout(() => {
        showEventText('COUNTER-TERRORISTS WIN!')
    }, (!bombStatus === '' || !bombStatus === 'bomb-planted' ? 2000 : 0))
});

let terrorEffectTimer = '';
socket.on('winTeam_T', async () => {
    console.log('Terrorists have won the round!');

    tWinEffects();

    terrorEffectTimer = setTimeout(() =>{
        showEventText('TERRORISTS WIN!')
    }, (!bombStatus === '' || !bombStatus === 'bomb-planted' ? 2000 : 0))
});

socket.on('roundBegin', () => {
    console.log('A new round has begun.');
    showEventText('GO GO GO!')
    setTimeout(() =>{
        resetEventText();
    }, 2000)
    bombStatus = '';
});

socket.on('roundFreeze', () => {
    resetAllEffects();
    console.log('A Freeze has begun.');
    mvpEffectStop();
    showEventText('FREEZETIME')
    setTimeout(() =>{
        resetEventText();
    }, 2000)
});

socket.on('roundEnd', () => {
    console.log('The round has ended.');
    bombStatus = '';
});

socket.on('playerDeath', ({ steamid, name }) => {
    console.log(`Player with ID [${steamid}] and Name [${name}] has died.`);
});

socket.on('playerDeathWithGrenade', ({ steamid, name }) => {
    console.log(`Player with ID [${steamid}] and Name [${name}] died with a grenade in the hand.`);
    showEventText(`${name} DWNIH!`);
    const playerCardId = `player-card-${steamid}`;
    let existingCard = document.getElementById(playerCardId);
    if (existingCard) {
        console.log(existingCard);
        existingCard.classList.add('died-with-nade');
    }

});


let mvpAudio = new Audio('./media/player-content/placeholder.mp3');
socket.on('playerMVP', ({ steamid, name }) => {
    console.log(`MVP: ID [${steamid}] Name [${name}] Whoop Whoop.`);
    mvpEffectStart({ steamid, name });
});

// Data Events
socket.on('sendParticipantsConfig', ({ participantsConfig }) => {
    console.log(participantsConfig);
    clientParticipantsConfig = participantsConfig;
});

socket.on('matchInfoUpdate', ({ newMatchState }) => {
    console.log(newMatchState);
    if(!newMatchState.mode) return;
    console.log(`MatchInfoUpdate: ${JSON.stringify(newMatchState)}`);
    document.querySelector(".round-number").textContent = newMatchState.round;
    document.querySelector(".match-phase").textContent = newMatchState.round_phase
    document.getElementById("score_t").textContent = newMatchState.team_t_score;
    document.getElementById("score_ct").textContent = newMatchState.team_ct_score;
    document.querySelector(".mapname").textContent = newMatchState.name;
    document.querySelector(".mode").textContent = newMatchState.mode;
    document.querySelector(".match-phase").textContent = newMatchState.match_phase;
});

socket.on('roundPhaseChange', ({ newRoundPhase }) => {
    console.log(`roundPhaseChange: ${newRoundPhase}`);
    document.querySelector(".round-phase").textContent = newRoundPhase;
});

socket.on('roundPhaseCountdownUpdate', ({ newRoundPhaseCountdownString, urgend }) => {
    document.querySelector(".round-time").textContent = newRoundPhaseCountdownString;
    (urgend ? document.querySelector(".round-time").classList.add('text-danger') : document.querySelector(".round-time").classList.remove('text-danger'))
});

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
    console.log(playerData)
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
    playerCard.querySelector('.beers').textContent = player.beers;
    playerCard.querySelector('.dwgh').textContent = player.nadeDeaths;
    // player img
    const imgElement = playerCard.querySelector('.player-image');
    // unkown players placeholder
    (clientParticipantsConfig[steamid] && clientParticipantsConfig[steamid].avatar ? imgElement.src = clientParticipantsConfig[steamid].avatar : imgElement.src = './media/player-content/placeholder.png')
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
    const steamids = Object.keys(clientParticipantsConfig);
    // Shuffle array and pick first 10 (or fewer, if not enough participants)
    const selectedKeys = steamids.sort(() => 0.5 - Math.random()).slice(0, 10);

    // Split the selected participants into two teams
    const teamCT = selectedKeys.slice(0, Math.ceil(selectedKeys.length / 2));
    const teamT = selectedKeys.slice(Math.ceil(selectedKeys.length / 2));

    teamCT.forEach(steamid => {
        // Simulate player data structure for dummy data
        const playerData = {
            ...clientParticipantsConfig[steamid],
            match_stats: {
                kills: 2,
                mvps: 0,
                deaths: 1,
            },
            alive: true,
            team: 'CT'
        };
        createOrUpdatePlayerCard(playerData, steamid, 'ct-wrapper');
    });

    teamT.forEach(steamid => {
        // Simulate player data structure for dummy data
        const playerData = {
            ...clientParticipantsConfig[steamid],
            match_stats: {
                kills: 2,
                mvps: 0,
                deaths: 1,
            },
            alive: true,
            team: 'T'
        };
        createOrUpdatePlayerCard(playerData, steamid, 't-wrapper');
    });
}


// MVP Effects
function mvpEffectStart({ steamid, name }) {
    if(!clientParticipantsConfig[steamid] || (!clientParticipantsConfig[steamid].gif || !clientParticipantsConfig[steamid].mp3 )) return false;

    document.getElementById("mvp-name").textContent = name;
    const mp3 = clientParticipantsConfig[steamid].mp3;
    const gif = clientParticipantsConfig[steamid].gif;

    // Background Gif Load if set
    if (gif) document.getElementById('mvp-animation-wrapper').style.backgroundImage=`url(${gif}`;

    // Audio Play if set
    if (mp3) {        
        mvpAudio.src = mp3
        mvpAudio.volume = 0.3;
        if (typeof mvpAudio.loop == 'boolean') mvpAudio.loop = true;
        mvpAudio.load();
        //MVP Audio
        mvpAudio.play();
    }

    // expand outwards
    document.getElementById('mvp-animation-wrapper').classList.remove('contract-inwards-animation');
    document.getElementById('mvp-animation-wrapper').classList.add('expand-outwards-animation');


    // auto-stop after 10 seconds
    setTimeout(() => {
        mvpEffectStop()
    }, "9500"); 
}
function mvpEffectStop() {    
    // expand outwards
    document.getElementById('mvp-animation-wrapper').classList.remove('expand-outwards-animation');
    document.getElementById('mvp-animation-wrapper').classList.add('contract-inwards-animation');

    // after expand / contract animation
    setTimeout(() => {
        //MVP Audio Stop
        mvpAudio.pause();
        mvpAudio.currentTime = 0;
        //Background Image unset
        document.getElementById('mvp-animation-wrapper').style.backgroundImage= 'unset';
    }, '500'); 
}


let eventTextActive = false;
function showBomb({ bombStatus }) {
    const wrapper = document.getElementById('event-text-wrapper');
    const roundTime = wrapper.querySelector('.round-time');
    const eventText = wrapper.querySelector('.event-text');
    const bomb = wrapper.querySelector('#bomb');

    let animationName = '';
    (eventTextActive ? animationName = 'fromLargeWidthShrink' : animationName = 'fromInitWidthShrink');
    applyEventTextAnimation({animationName, wrapper, eventTextActive}, () => {
        roundTime.classList.add('d-none');
        eventText.classList.add('d-none');
        bomb.classList.remove('d-none');
        bomb.classList.remove('bomb-planted');
        bomb.classList.remove('bomb-exploded');
        bomb.classList.remove('bomb-defused');
        bomb.classList.add(bombStatus);
        let animationName = 'expandToInitWidth';
        eventTextActive = eventTextActive;
        applyEventTextAnimation({animationName, wrapper, eventTextActive}, () => {
            eventTextActive = true;
        });
    });
}

function showEventText(newText) {
    const wrapper = document.getElementById('event-text-wrapper');
    const roundTime = wrapper.querySelector('.round-time');
    const eventText = wrapper.querySelector('.event-text');
    const bombTicking = wrapper.querySelector('#bomb');

    let animationName = '';
    (eventTextActive ? animationName = 'fromLargeWidthShrink' : animationName = 'fromInitWidthShrink');
    applyEventTextAnimation({animationName, wrapper, eventTextActive}, () => {
        roundTime.classList.add('d-none');
        bombTicking.classList.add('d-none');
        eventText.classList.remove('d-none');
        eventText.innerText = newText;
        let animationName = 'expandToLargeWidth';
        eventTextActive = eventTextActive;
        applyEventTextAnimation({animationName, wrapper, eventTextActive}, () => {
            eventTextActive = true;
        });
    });
}

function resetEventText() {
    const wrapper = document.getElementById('event-text-wrapper');
    const roundTime = wrapper.querySelector('.round-time');
    const eventText = wrapper.querySelector('.event-text');
    const bombTicking = wrapper.querySelector('#bomb');

    let animationName = 'fromInitWidthShrink';
    (eventTextActive ? animationName = 'fromLargeWidthShrink' : animationName = 'fromInitWidthShrink');
    applyEventTextAnimation({animationName, wrapper, eventTextActive}, () => {
        // Show round-time and hide event-text
        roundTime.classList.remove('d-none');
        bombTicking.classList.add('d-none');
        eventText.classList.add('d-none');
        animationName = 'expandToInitWidth';
        applyEventTextAnimation({animationName, wrapper, eventTextActive});
        eventTextActive = false;
    });
}

function applyEventTextAnimation({animationName, wrapper, eventTextActive}, onComplete) {
    wrapper.style.animation = `${animationName} 0.6s forwards ease-in-out`;
    function handleAnimationEnd() {
        wrapper.removeEventListener('animationend', handleAnimationEnd);
        if (onComplete) onComplete();
    }
    wrapper.addEventListener('animationend', handleAnimationEnd);
}

function tWinEffects() {
    console.log('tWinEffects started');
    const tBox = document.getElementById('team-t');
    tBox.classList.add('win-t');
}

function ctWinEffects() {
    console.log('ctWinEffects started');
    const ctBox = document.getElementById('team-ct');
    ctBox.classList.add('win-ct');
}

function resetAllEffects(){
    const ctBox = document.getElementById('team-ct');
    ctBox.classList.remove('win-ct');
    const tBox = document.getElementById('team-t');
    tBox.classList.remove('win-t');
    resetEventText();
    mvpEffectStop();
}

// let beerAudio = new Audio('./media/ballern-dropin.mp3');
let beerAudio = new Audio('./media/einprosit.mp3');
function updateBeerCount({steamid, beers, target, withEventText}) {
    const playerCard = document.getElementById(target);
    if (playerCard) {
        const beerCountElement = playerCard.querySelector('.beers');
        const beerCountWrapper = playerCard.querySelector('.beer-wrapper');

        beerCountWrapper.classList.add('beer-updated');
        beerCountElement.textContent = beers;

        if(beerAudio.paused) {
            beerAudio.volume = 0.3;
            if (typeof beerAudio.loop == 'boolean') beerAudio.loop = true;
            beerAudio.autoplay = true;
            beerAudio.load();
            beerAudio.play();

            setTimeout(() => {
                console.log("beersound stopped");
                beerCountWrapper.classList.remove('beer-updated');
                beerAudio.pause();
                beerAudio.currentTime = 0;
                if (withEventText) resetEventText();
            }, "5000"); 
        }
        
        if(withEventText) showEventText(`${clientParticipantsConfig[steamid].name} new beer!`);
    }
}


document.addEventListener('DOMContentLoaded', function() {
    // Stuff here
});