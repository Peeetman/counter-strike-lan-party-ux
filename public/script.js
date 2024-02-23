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