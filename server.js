//import required packages
var express = require('express');
var bodyParser = require('body-parser');
var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const { uuid } = require('uuidv4');


// unicode suits and values for the card deck array
var unicodeSuits = ['1F0A','1F0B','1F0C','1F0D'];
var unicodeValues = [1,2,3,4,5,6,7,8,9,'A','B','D','E'];


//creating array of objects with all cards and respective values
//first creating an empty array that will be filled with the card objects
var cardDeck = [];
for (i = 0; i < unicodeSuits.length; i++) {

    var colour;
    if (unicodeSuits[i] == "1F0B") {
        colour = "red";
    } else if (unicodeSuits[i] == "1F0C"){
        colour = "red";
    } else {
        colour = "black"
    }

    for (j=0; j< unicodeValues.length; j++) {

        var value;
        if (unicodeValues[j] == 1) {
            value = 1;
        } else if (isNaN(unicodeValues[j])) {
            value = 10;
        } else {
            value = unicodeValues[j];
        }

        var cardObject = {'code': "&#x" + unicodeSuits[i] + unicodeValues[j] + ";", 'value': value, 'colour': colour }
        cardDeck.push(cardObject)
    }
};

//shuffling the array
function createShuffledArray() {
    shuffledCardDeck = [...cardDeck];
    for (var i = shuffledCardDeck.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = shuffledCardDeck[i];
        shuffledCardDeck[i] = shuffledCardDeck[j];
        shuffledCardDeck[j] = temp;
    } return shuffledCardDeck
};

app.get("/drawingPile", function(req, res, next) {
    res.status(200).json(cardPile);
});


// object to hold all current games
const games = {} //array of all game objects currently exisitg
const players = {} //array of all players in all games (player can be accessed by id = gameID-playerID)


//create a new game, person who created it becomes player 1
app.get("/createGame", (req, res) =>{
    gameID = uuid();
    player_index = gameID + "-1"
    createNewPlayer(player_index)
    var shuffledCardDeck = createShuffledArray()
    games[gameID] = {
        game_ID: gameID,
        player_count: 1,
        player_IDs: [player_index],
        deck: shuffledCardDeck,
        started: false,
        turn: undefined,
        upCard: undefined,
        winnerDefined: false,
        winner: undefined,
        loser: undefined,
        discardpile: []
    }
    res.json({id:gameID, player_ID:1})
});

// load a list of all games that havent already started
app.get("/loadGames", (req, res) =>{
    // filter the games that have not started and then only return a list of all the IDs
    res.json(Object.values(games).filter((game) => !game.started).map((game) => game.game_ID))
});

// join a game, add the player to players, and add the player to the game
app.get("/joinGame/:game_id", (req, res) => {
    const chosenGame = req.params.game_id
    let joining = games[chosenGame]
    joining.player_count++;
    let player_number = joining.player_count;
    let player_index = chosenGame + "-" + player_number;
    createNewPlayer(player_index);
    joining.player_IDs.push(player_index)
    assignCardsAndSetFirstPlayer(chosenGame)
    joining.started = true
    res.json({hand: players[player_index].hand, turn: joining.turn, id: player_number, upCard: joining.upCard})
});

// returns cards to the first player once a second player has joined the game
app.get("/checkStarted/:game_id/:player_id", (req, res) => {
    const game = req.params.game_id
    const player = req.params.player_id
    const player_index = game + "-" + player
    if (games[game].started) {
        res.json({started: true, hand: players[player_index].hand, turn: games[game].turn, upCard: games[game].upCard})
    } else {
        res.json({started: false, hand: undefined, turn: undefined})
    }
});

// split the full shuffled card deck into two arrays of ten cards for the two players and a drawing pile array;  the first upcard is spliced from the drawing pile
function assignCardsAndSetFirstPlayer(game_ID){
    let game_players  = games[game_ID].player_IDs
    players[game_players[0]].hand = games[game_ID].deck.slice(10, 20);
    players[game_players[1]].hand = games[game_ID].deck.slice(0, 10);
    games[game_ID].deck = games[game_ID].deck.slice(20);
    games[gameID].upCard = games[game_ID].deck.splice(0,1);
    // randomly choose whose turn it is first
    games[game_ID].turn = game_players[Math.floor(Math.random() * game_players.length)];
};

//minimising code repetition, adds a new object to the player array of objects
function createNewPlayer(index){
    players[index] = {
        hand: undefined,
        turn: undefined,
        name: undefined
    }
}

// add a players name to the player object
app.get('/postName/:player/:game/:name', (req, res) => {
    let current_player = req.params.player;
    let current_game = req.params.game;
    let player_name = req.params.name;
    player_index = current_game + "-" + current_player;
    players[player_index].name = player_name;
    res.status(200).send("Name of player ID " + current_player + " is " + player_name);

});

// a player has left the game, if no other player has joined so far, the game is closed
let remaining_player;
app.get('/gameLeft/:player/:game', (req,res) => {
    let player_left = req.params.player;
    let current_game = req.params.game;
    let game_players  = games[current_game].player_IDs;

    if (games[current_game].started == false) {
        games[current_game].started = true;
        res.status(200).send("The game was closed");
    } else {
        if (player_left == 1) {
            remaining_player = 2;
        } else {
            remaining_player = 1;
        }
        res.status(200).send("You left, the other player wins");
    }
});

//listen for oponent to leave the game
app.get('/leaveListener/:player/:game', (req, res) => {
    res.json({remaining: remaining_player})
})


// function to draw a new card from the pile, update the player object by accessing the object with index =
app.get("/drawNew/:player/:game", (req, res) => {
    let current_player = req.params.player;
    let current_game = req.params.game;
    player_index = current_game + "-" + current_player;
    let newCard = games[current_game].deck.splice(0,1);
    players[player_index].hand.push(newCard[0]);
    games[current_game].discardpile.push(games[current_game].upCard[0]);
    res.json({hand: players[player_index].hand, turn: games[current_game].turn, id: current_player, testing: newCard});
});

//function to draw the upcard
app.get("/drawUpcard/:player/:game", (req, res) => {
    let current_player = req.params.player;
    let current_game = req.params.game;
    player_index = current_game + "-" + current_player;
    //let newCard = games[current_game].upCard.splice(0,1);
    let newCard = games[current_game].upCard;
    players[player_index].hand.push(newCard[0]);
    games[current_game].discardpile.push(games[current_game].upCard[0]);
    games[current_game].upCard['code'] = '&#x1F0A0';
    res.json({hand: players[player_index].hand, turn: games[current_game].turn, id: current_player, discardpile: games[current_game].discardpile});
});

//function to remove the card given away by player from their hand
app.get("/givingAwayCard/:player/:game/:cardIndex", (req, res) => {
    let current_player = req.params.player;
    let current_game = req.params.game;
    player_index = current_game + "-" + current_player;
    let index = req.params.cardIndex;
    games[current_game].upCard = players[player_index].hand.splice(index,1);
    res.json({hand: players[player_index].hand, upCard: games[current_game].upCard})
});


//listen for turn and inform players
app.get("/turn_listener/:player_id/:game_id", (req, res) => {
    var game = req.params.game_id
    const player = req.params.player_id
    var player_index = game + "-" + player
    if (games[game].turn == player_index) {
        res.json({yourTurn: true, upCard: games[game].upCard})
    } else {
        res.json({yourTurn: false})
    }
});

// change turns
app.get("/change_turn/:other_player_id/:game_id", (req, res) => {
    const game = req.params.game_id
    const player = req.params.other_player_id
    const player_index = game + "-" + player
    games[game].turn = player_index;

    res.status(200).send("Successfully received new turn");
});

// check submitted melds
var ranks1 = "123456789ABDE"; var ranks2 = "23456789ABDE1"

app.post("/post-melds/:player_id/:game_id", (req,res) => {
    const game = req.params.game_id
    const player = req.params.player_id
    const player_index = game + "-" + player

    let melds1 = req.body.meld1;
    let melds2 = req.body.meld2;
    let melds3 = req.body.meld3;
    let remainingPlayerHand = req.body.remainingPlayerHand;

    //every meld has to to contain 3 card at least
    //if meld 3 empty - meld 1 and meld 2 have to add up to 10 AND

    var otherPlayer;
    if (player == 1) {
        otherPlayer = 2;
    } else {
        otherPlayer = 1;
    }
    //get arrays of 6th character (suit) of the card unicode for every meld
    let melds1Suits = [];
    for (const card of melds1) {
        melds1Suits.push(card.charAt(6))
    }
    let melds2Suits = [];
    for (const card of melds2) {
        melds2Suits.push(card.charAt(6))
    }
    let melds3Suits = [];
    for (const card of melds3) {
        melds3Suits.push(card.charAt(6))
    }
    // get arrays for 7th character (rank) of the card unicode for every meld
    let melds1RanksArray = [];
    for (const card of melds1) {
        melds1RanksArray.push(card.charAt(7))
    }
    let melds1Ranks = melds1RanksArray.join("");

    let melds2RanksArray = [];
    for (const card of melds2) {
        melds2RanksArray.push(card.charAt(7))
    }
    let melds2Ranks = melds2RanksArray.join("");

    let melds3RanksArray = [];
    for (const card of melds3) {
        melds1RanksArray.push(card.charAt(7))
    }
    let melds3Ranks = melds3RanksArray.join("");

    //check if 7th character is equal to each other
    //code adapted from: https://stackoverflow.com/questions/14832603/check-if-all-values-of-array-are-equal,
    function checkingsuits(arrayToCheck) {
        var firstElement = arrayToCheck[0];
        return arrayToCheck.every(function(element) {
            return element === firstElement;
        });
    }

    //Conditions for checking if the lengths of the melds are correct
    var melds1length = melds1.length;
    var melds2length = melds2.length;
    var melds3length = melds3.length;



    //conditions for checking if melds are correct:
    //meld1 is correct if:
    var cond1a = checkingsuits(melds1RanksArray)
    var cond1b = checkingsuits(melds1Suits) && (ranks1.includes(melds1Ranks) || ranks2.includes(melds1Ranks))
    //melds2 is correct if:
    var cond2a = checkingsuits(melds2RanksArray)
    var cond2b = checkingsuits(melds2Suits) && (ranks1.includes(melds2Ranks) || ranks2.includes(melds2Ranks))
    //melds3 is correct if:
    var cond3a = checkingsuits(melds3RanksArray)
    var cond3b = checkingsuits(melds3Suits) && (ranks1.includes(melds3Ranks) || ranks2.includes(melds3Ranks))



    //check whether the player has cheated by comparing tthe submitted melds with the players final hand stored on the server
    // the condition is checked as part of the following if/else statement
    let concatMelds = melds1.concat(melds2, melds3);
    let handArray = [];
    for (const card of players[player_index].hand) {
        handArray.push(card['code'])
    }
    concatMelds = concatMelds.sort();
    handArray = handArray.sort();

//Conditions for the gin situation
    if (remainingPlayerHand.length == 0) {
        //first checking if the melds submited by player contain only the cards in player's hand that is stored on the server
        if (!concatMelds == handArray) {
            games[game].winnerDefined = true;
            games[game].winner = `${otherPlayer}`
            games[game].loser = `${player}`;
            res.status(200).send('The other player wins because of attempted cheating!')
            //Case 1  - no meld is empty:
        } else if (!(melds1length == 0) && !(melds2length == 0) && !(melds3length == 0)) {
            //checking the first requirement - at least 3 cards in every meld. If there aren't - the player looses
            if (!(melds1length > 2 && melds2length > 2 && melds3length > 2)) {
                games[game].winnerDefined = true;
                games[game].winner = `${otherPlayer}`;
                games[game].loser = `${player}`;
                res.status(200).send('The other player wins the game!')
                //checking the second requirement - if the melds are correct - if they are, the player wins, if they aren't, the player looses
            } else if ((cond1a || cond1b) && (cond2a || cond2b) && (cond3a || cond3b)) {
                games[game].winnerDefined = true;
                games[game].winner = `${player}`
                games[game].loser = `${otherPlayer}`;
                res.status(200).send('This player wins the game!')
            } else {
                games[game].winnerDefined = true;
                //if the above conditions fail, announce the other player the winner!
                games[game].winner = `${otherPlayer}`
                games[game].loser = `${player}`;
                res.status(200).send('The other player wins the game!')
            }
            //Case 2  - melds 1 and 2 contain cards but meld 3 is empty:
        } else if ((!(melds1length == 0) && !(melds2length == 0) && (melds3length == 0))) {
            //checking the first requirement - at least 3 cards in meld 1 and 2 - if there aren't - the player looses:
            if (!(melds1length > 2 && melds2length > 2)) {
                games[game].winnerDefined = true;
                games[game].winner = `${otherPlayer}`;
                games[game].loser = `${player}`;
                res.status(200).send('The other player wins the game!')
                //checking the second requirement - if the melds are correct - if they are, the player wins, if they aren't, the player looses
            } else if ((cond1a || cond1b) && (cond2a || cond2b)) {
                games[game].winnerDefined = true;
                games[game].winner = `${player}`
                games[game].loser = `${otherPlayer}`;
                res.status(200).send('This player wins the game!')
            } else {
                games[game].winnerDefined = true;
                //if the above conditions fail, announce the other player the winner!
                games[game].winner = `${otherPlayer}`
                games[game].loser = `${player}`;
                res.status(200).send('The other player wins the game!')
            }
            //Case 3  - melds 1 contains cards but meld 2 and 3 are empty. This is an unlikely, but possible case:
        } else if ((!(melds1length == 0) && (melds2length == 0) && (melds3length == 0))) {
            //no need to check the first requirement - the number of cards in the meld - because if all the cards are in meld 1, then there are definitely at least 3 cards in that meld
            // that is why, only the second requirement is checked - if the melds are correct - if they are, the player wins, if they aren't, the player looses
        } else if (cond1a || cond1b) {
            games[game].winnerDefined = true;
            games[game].winner = `${player}`
            games[game].loser = `${otherPlayer}`;
            res.status(200).send('This player wins the game!')
        } else {
            games[game].winnerDefined = true;
            //if the above conditions fail, announce the other player the winner!
            games[game].winner = `${otherPlayer}`
            games[game].loser = `${player}`;
            res.status(200).send('The other player wins the game!')
        }
    }
})

//Considering the case of knocking - not fully completed, so it is commented out
// }  else {
//     //Conditions for the knock situation
//     if (!(melds1length > 2 && melds2length > 2 && melds3length > 2)) {
//         games[game].winnerDefined = true;
//         games[game].winner = `${otherPlayer}`;
//         games[game].loser = `${player}`;
//         res.status(200).send('The other player wins the game!')
//         //this condition assumes that if any left is going to be empty, it will logically be the third meld
//     } else if ((melds3length == 0 && !(melds1length > 2 && melds2length > 2)) ) {
//         games[game].winnerDefined = true;
//         games[game].winner = `${otherPlayer}`
//         games[game].loser = `${player}`;
//         res.status(200).send('Wrong number of cards in melds case 2!')
//     } else if (melds3length == 0 && melds2length == 0 && !(melds1length > 2)) {
//         games[game].winnerDefined = true;
//         games[game].winner = `${otherPlayer}`
//         games[game].loser = `${player}`;
//         res.status(200).send('Wrong number of cards in melds case 3!')
//     }
//
//         }


//winner listener informs the players about result
app.get("/winner_listener/:game_id", (req, res) => {
    const game = req.params.game_id;
    if (games[game].winnerDefined == true) {
        const player1_id = game + "-" + 1
        const player2_id = game + "-" + 2
        const player1Hand = players[player1_id].hand; const player2Hand =  players[player2_id].hand;
        res.json({winnerDefined: true, winner: games[game].winner, loser: games[game].loser, player1: player1Hand, player2: player2Hand})
    } else {
        res.json({winnerDefined: false})
    }
});

//just required to work
app.use(express.static('content'));

app.listen(3000, () => {
    console.log('Listening for request: http://localhost:3000')
});