//player and game id plus a server player id to ensure that multiple games can happen at the same time and the players are still correctly served the right cards
let player_id = undefined;
let server_player_id = undefined;
let game_id = undefined;

//the user can enter their name and it gets posted to the server when creating a game or joining an existing game
var name = undefined;
function enterName() {
    name = document.getElementById("name").value;
    console.log(name);
    document.getElementById("nameSection").innerHTML = "";
    document.getElementById("nameSection").innerHTML = "Hi " + name;
};

// add name to the player object on the server
function postName() {
    fetch("/postName/" + player_id + "/" + game_id + "/" + name)
        .then(res => res.text())
        .then(res => {
            console.log(res)
        })
};

//create a game id and display info to the first player
function createGameID() {
    fetch('/createGame')
        .then(response => response.json())
        .then(data => {
            console.log(data);
            //display game ID and player ID
            game_id = data.id;
            const playerID = document.createElement("h2");
            player_id = data.player_ID;
            server_player_id = game_id + "-" + playerID;
            playerID.innerHTML = "Player Number: " + data.player_ID;
            document.getElementById("header_info").appendChild(playerID);
            //replace start game and refresh list buttons with an exit button
            let buttonSection = document.getElementById('startbuttons');
            buttonSection.innerHTML = '';
            let exitGameButton = document.createElement('button');
            exitGameButton.setAttribute('id', 'exitGame');
            exitGameButton.addEventListener('click', leaveGame);
            exitGameButton.innerHTML = "Leave game";
            buttonSection.appendChild(exitGameButton);
            if (name.length > 0) { //only call postName if a name has been entered
                postName();
            }
            awaitPlayerLeaving()
        });

    //after creating a game, the following function listens for someone else to join it, it someone has joined, the player gets their hand of cards and the basic game set up is created, i.e. gin button, drawing pile, upcard
    const intervalID = setInterval(() => {
        fetch('/checkStarted/' + game_id + "/" + player_id)
            .then((res) => res.json())
            .then((data) => {
                console.log(data);
                if (data.started){
                    console.log(data.hand);
                    console.log(data.turn);
                    getHand(data.hand);
                    let upcard = document.getElementById('upcard');
                    upcard.innerHTML = data.upCard[0]['code'];
                    upcard.setAttribute('dataset_colour', data.upCard[0]['colour']);
                    document.getElementById("cardPile").innerHTML = "&#x1F0A0;";
                    ginButton();
                    awaitTurn();
                    winnerListening();
                    clearInterval(intervalID);
                }
            });
    }, 2000);
};

//the function loads all currently open game ids which can be joined by clicking the button of the game id
function loadCurrentGames(){
    fetch('/loadGames')
        .then(response => response.json())
        .then(data => {
            var p = document.createElement('p')
            p.innerHTML = 'Click on a game ID button to join the game'
            document.getElementById("currentGamesList").appendChild(p)

            for (const game of data) {
                let gameButton = document.createElement("button")
                gameButton.setAttribute("id", game)
                gameButton.onclick = () => selectedGame(gameButton.id)
                gameButton.textContent = game
                document.getElementById("currentGamesList").appendChild(gameButton)

            }

        }).catch(console.error);
}

// create gin button and knocking button (knocking was not fully implemented, therefore it's commented out)
function ginButton() {
    var ginSection = document.getElementById('declareGin');
    var button = document.createElement('button');
    button.setAttribute('id', 'ginButton');
    button.addEventListener('click', function() {submitMelds()}, {once : true});
    button.innerHTML = "Gin!";
    ginSection.appendChild(button);

    // var buttonKnock = document.createElement('button');
    // buttonKnock.setAttribute('id', 'knockButton');
    // buttonKnock.addEventListener('click', function() {submitMelds()}, {once : true});
    // buttonKnock.innerHTML = "Knock!";
    // ginSection.appendChild(buttonKnock);

};

// this function allows a player to join a game, it fetches the hand from the server, creates the basic game set up, i.e. gin button, upcard, cardpile and calls the following listeners for turns and the winner to allow the game to start
function selectedGame(game_pointer){
    game_id = game_pointer;
    console.log("trying to join the game: " + game_id);
    fetch('/joinGame/' + game_id)
        .then(response => response.json())
        .then(data => {
            console.log(data);
            //displaying infor to player that they are Player 2
            player_id = data.id;
            server_player_id = game_id + "-" + player_id;
            const playerID = document.createElement("h2");
            playerID.innerHTML = "Player Number: " + player_id;
            document.getElementById("header_info").appendChild(playerID);
            //replace start game and refresh list buttons with an exit button
            let buttonSection = document.getElementById('startbuttons');
            buttonSection.innerHTML = '';
            let exitGameButton = document.createElement('button');
            exitGameButton.setAttribute('id', 'exitGame');
            exitGameButton.addEventListener('click', leaveGame);
            exitGameButton.innerHTML = "Leave game";
            buttonSection.appendChild(exitGameButton);
            // remove games list
            document.getElementById("currentGamesList").innerHTML = "";
            //display player 2's hand
            console.log(data.hand);
            console.log(data.turn);
            getHand(data.hand);
            let upcard = document.getElementById('upcard');
            upcard.innerHTML = data.upCard[0]['code'];
            upcard.setAttribute('dataset_colour', data.upCard[0]['colour']);
            document.getElementById("cardPile").innerHTML = "&#x1F0A0;";
            ginButton();
            if (name.length > 0) { //only call postName if a name has been entered
                postName();
            }
            awaitPlayerLeaving();
            awaitTurn();
            winnerListening();
        }).catch(console.error);
};

// if a player is inactive for 60 sec, the leaveGame function is called and the game is ended and the other player will be made the winner
// Code adapted from: https://stackoverflow.com/questions/24338450/how-to-detect-user-inactivity-with-javascript
function onInactive(sec, func) {

    var wait = setTimeout(func, sec);

    document.onmousemove = document.mousedown = document.mouseup = document.onkeydown = document.onkeyup = document.focus = function () {
        clearTimeout(wait);
        wait = setTimeout(func, sec);

    };
};

onInactive(60000, function () {
    leaveGame();
});


// leave a started game and reload starting page
function leaveGame() {
    fetch("/gameLeft/" + player_id + "/" + game_id)
        .then(res => res.text())
        .then(text => {
            window.alert(text);
            window.location.reload();
        });
};

//listen for the oponent to leave the game, inform other player about their win
async function awaitPlayerLeaving() {
    let response = await fetch('/leaveListener/' + player_id + "/" + game_id);
    if (response.status == 502) {
        console.log("connection timeout")
        await awaitPlayerLeaving();
    } else if (response.status != 200) {
        console.log("error with connecting, going to try to connect in 10 second")
        // Reconnect in ten seconds
        await new Promise(resolve => setTimeout(resolve, 10000));
        await awaitPlayerLeaving();
    } else {
        let data = await response.json();
        if (data.remaining == player_id){
            window.alert("The other player left the game, you won!");
            window.location.reload();
        } else {
            await awaitPlayerLeaving();
        }
    }
};


//render the players hand (called in various functions to correctly display the hand of cards after being fetched from the server)
function getHand(cards) {
    var PlayerHand = document.getElementById('playerHand');
    for (let i = 0; i < cards.length; i++) {
        var card = document.createElement('div');
        card.setAttribute('class', 'card');
        card.setAttribute('id', [i]);
        card.setAttribute('dataset_code', `${cards[i]['code']}`);
        card.setAttribute('dataset_colour', `${cards[i]['colour']}`);

        card.innerHTML = cards[i]['code'];

        PlayerHand.appendChild(card);
    }
};

// draw a new card from the drawing pile which is fetched from the server
function fetchNewCard() {
    fetch("/drawNew/" + player_id + "/" + game_id)
        .then(res => res.json())
        .then(cards => {
            document.getElementById('playerHand').innerHTML = "";
            getHand(cards.hand);
            //disabling onclick on the pile
            document.getElementById("upcard").removeEventListener('click', drawUpcard);
            document.getElementById("cardPile").removeEventListener('click', fetchNewCard);
            console.log("Card drawing event listeners removed");
            document.getElementById("cardPile").addEventListener('click', notYourTurnNotification);
            //disabling onclick on the upcard
            document.getElementById("upcard").addEventListener('click', notYourTurnNotification);;
            giveAwayCard();
        })
};

// draw a new card from the drawing pile which is fetched from the server
function drawUpcard() {
    fetch("/drawUpcard/" + player_id + "/" + game_id)
        .then(res => res.json())
        .then(cards => {

            //temporary consolelog
            console.log(cards.discardpile)

            //players hand gets reseted
            document.getElementById('playerHand').innerHTML = "";
            //players hand gets updated
            getHand(cards.hand);
            //disabling onclickk on the upcard
            document.getElementById("upcard").removeEventListener('click', drawUpcard);
            document.getElementById("cardPile").removeEventListener('click', fetchNewCard);
            document.getElementById("upcard").addEventListener('click', notYourTurnNotification);;
            //setting the upcard to nothing - it waits until a player puts there one of the cards of his/her hands
            document.getElementById('upcard').innerHTML = '&#x1F0A0;';
            //disabling onclick on the pile
            document.getElementById("cardPile").addEventListener('click', notYourTurnNotification);;
            giveAwayCard();
        })
};


function notYourTurnNotification() {
    console.log("Not this player's turn")
}

//function that will remove card from player's hand after they choose to discard it; also disables the gin button, as the player decided to pick up a new card
function giveAwayCard() {
    var removeGin = document.getElementById("ginButton");
    removeGin.removeEventListener('click', submitMelds);

    var playerHand = document.getElementById("playerHand").children;
    for (const card of playerHand) {
        card.addEventListener('click', addEventListeners);
    }
};

// the function determines the card to be discarded from the players hand and posts the index to the server, which splices off the respective card and returns a newly fetched array. After completing this, the turn ends and it's the other players turn
let cardClicked;
function addEventListeners() {
    cardClicked = this;
    let cardUnicode = cardClicked.getAttribute('dataset_code');
    var unicodeArray = [];
    var playerHand = document.getElementById("playerHand");
    for (const card of playerHand.children) {
        unicodeArray.push(card.getAttribute("dataset_code"))
    }
    let removeCardIndex = unicodeArray.indexOf(cardUnicode);
    fetch("/givingAwayCard/" + player_id + "/" + game_id + "/" + removeCardIndex)
        .then(res => res.json())
        .then(cards => {
            //display new upcard
            let upcard = document.getElementById("upcard");
            upcard.innerHTML = cards.upCard[0]['code'];
            upcard.setAttribute('dataset_colour', cards.upCard[0]['colour']);

            //players hand gets reset
            document.getElementById('playerHand').innerHTML = "";
            //players hand gets updated
            getHand(cards.hand);

            //temporary: console.loging to see discard pile
            //console.log(cards.discardPile);

            //hiding the alert about turn - it is another players turn now
            document.getElementById("turn-alert").innerHTML = "";
            removeOnclickFromCards();
            otherPlayerTurn();
            awaitTurn();
        })
};


// listens for turn changes and notifies players about turns
async function awaitTurn() {
    let response = await fetch('/turn_listener/' + player_id + "/" + game_id);
    if (response.status == 502) {
        console.log("connection timeout")
        await awaitTurn();
    } else if (response.status != 200) {
        console.log("error with connecting, going to try to connect in 2 seconds")
        // Reconnect in two seconds
        await new Promise(resolve => setTimeout(resolve, 2000));
        await awaitTurn();
    } else {
        let data = await response.json();
        if (data.yourTurn){
            document.getElementById('upcard').removeEventListener('click', notYourTurnNotification);
            document.getElementById('cardPile').removeEventListener('click', notYourTurnNotification);
            let upcard = document.getElementById('upcard');
            upcard.innerHTML = data.upCard[0]['code'];
            upcard.setAttribute('dataset_colour', data.upCard[0]['colour']);
            document.getElementById('upcard').addEventListener('click', drawUpcard);
            document.getElementById('cardPile').addEventListener('click', fetchNewCard);
            //displaying the alert about the turn changing;
            document.getElementById("turn-alert").innerHTML = "It is your turn now";

        } else {
            await awaitTurn();
        }
    }
}
//the turn is finished, so the event listeners are removed to prevent cheating
function removeOnclickFromCards() {
    var playerHand = document.getElementById("playerHand").children;
    for (const card of playerHand) {
        card.removeEventListener('click', addEventListeners);
    }
}

//function to change the turn to the player's opponent, will be called when the player finishes their turn
function otherPlayerTurn() {
    var nextPlayer;
    if (player_id == 1) {
        nextPlayer = 2;
    }
    if (player_id == 2) {
        nextPlayer = 1;
    }
    fetch("/change_turn/" + nextPlayer + "/" + game_id)
        .then( res => res.text)
        .then( txt => console.log(txt))
};


function submitMelds() {
    //clearInterval(myTimer);
    //remove old event listeners
    var playerHand = document.getElementById("playerHand").children;
    for (const card of playerHand) {
        card.removeEventListener('click', addEventListeners)
    }
    document.getElementById('cardPile').removeEventListener('click', fetchNewCard)
    document.getElementById('upcard').removeEventListener('click', drawUpcard)

    //create three meld sections to move cards to and a submit button
    var ginSection = document.getElementById('declareGin');

    var meld1Text = document.createElement("p");
    meld1Text.innerHTML = "Add cards to be submitted as meld 1";
    document.getElementById("declareGin").appendChild(meld1Text);
    var meld1 = document.createElement('section');
    meld1.setAttribute('id', 'meld1');
    ginSection.appendChild(meld1);
    meld1.addEventListener("click", addEventListenerForMelds);

    var meld2Text = document.createElement("p");
    meld2Text.innerHTML = "Add cards to be submitted as meld 2";
    document.getElementById("declareGin").appendChild(meld2Text);
    var meld2 = document.createElement('section');
    meld2.setAttribute('id', 'meld2');
    ginSection.appendChild(meld2);
    meld2.addEventListener("click", addEventListenerForMelds);

    var meld3Text = document.createElement("p");
    meld3Text.innerHTML = "Add cards to be submitted as meld 2";
    document.getElementById("declareGin").appendChild(meld3Text);
    var meld3 = document.createElement('section');
    meld3.setAttribute('id', 'meld3');
    ginSection.appendChild(meld3);
    meld3.addEventListener("click", addEventListenerForMelds);

    var button = document.createElement('button')
    button.innerHTML = "Submit melds";
    button.addEventListener('click', checkingMelds)
    ginSection.appendChild(button);
};


//this variable wil hold the meld area that is currently chosen
let targetMeld;

function addEventListenerForMelds() {
    targetMeld = this;
    var playerHand = document.getElementById("playerHand").children;
    for (const card of playerHand) {
        card.addEventListener('click', addEventListenerForCardToMeld)
    }
};

function addEventListenerForCardToMeld() {
    var currentCard = this;
    currentCard.style.fontSize = "80px";
    targetMeld.appendChild(this);
};

// on click of submit melds
function checkingMelds() {
    var meld1 = document.getElementById("meld1").children;
    var meld1Unicodes = [];
    for (const card of meld1) {
        meld1Unicodes.push(card.getAttribute('dataset_code'))
    }
    var meld2 = document.getElementById("meld2").children;
    var meld2Unicodes = [];
    for (const card of meld2) {
        meld2Unicodes.push(card.getAttribute('dataset_code'));
    }
    var meld3 = document.getElementById("meld1").children;
    var meld3Unicodes = [];
    for (const card of meld3) {
        meld3Unicodes.push(card.getAttribute('dataset_code'))
    }
    var playerHand = document.getElementById("playerHand").children;
    var playerHandUnicodes = [];
    if (playerHand.length == 0) {
        playerHandUnicodes = [];
    } else {
        for (const cards of playerHand) {
            playerHandUnicodes.push(card.getAttribute('dataset_code'))
        }
    }
    fetch("/post-melds/" + player_id + "/" + game_id, {
        //call post request -> post melds to server
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({meld1:  meld2Unicodes, meld2: meld2Unicodes, meld3: meld3Unicodes, remainingPlayerHand: playerHandUnicodes})
    })
        .then (res => res.text())
        .then (txt => console.log(txt))
}



//listening for information about winner
async function winnerListening() {
    let response = await fetch('/winner_listener/' + game_id);
    if (response.status == 502) {
        console.log("connection timeout")
        await winnerListening();
    } else if (response.status != 200) {
        console.log("error with connecting, going to try to connect in 1 second")
        // Reconnect in one second
        await new Promise(resolve => setTimeout(resolve, 3000));
        await winnerListening();
    } else {
        let data = await response.json();
        if (data.winnerDefined == true) {
            document.getElementById('upcardAndPile').innerHTML = '';
            document.getElementById('playerHand').innerHTML = '';
            var displayFinalHands = document.getElementById('playerHand');
            let finalHandPlayer1 = document.createElement('div');
            let finalHandPlayer2 = document.createElement('div');
            var textPlayer1 = document.createTextNode('This is the hand of Player 1')
            finalHandPlayer1.appendChild(textPlayer1);
            var textPlayer2 = document.createTextNode('This is the hand of Player 2')
            finalHandPlayer2.appendChild(textPlayer2);
            displayFinalHands.appendChild(finalHandPlayer1);
            displayFinalHands.appendChild(finalHandPlayer2);

            for (let i = 0; i < data.player1.length; i++) {
                var card = document.createElement('div');
                card.setAttribute('class', 'card');
                card.setAttribute('id', [i]);
                card.setAttribute('dataset_code', `${data.player2[i]['code']}`);
                card.setAttribute('dataset_colour', data.player2[i]['colour']);

                card.innerHTML = data.player1[i]['code'];

                finalHandPlayer1.appendChild(card);
            }

            for (let i = 0; i < data.player2.length; i++) {
                var card = document.createElement('div');
                card.setAttribute('class', 'card');
                card.setAttribute('id', [i]);
                card.setAttribute('dataset_code', `${data.player2[i]['code']}`);
                card.setAttribute('dataset_colour', data.player2[i]['colour']);

                card.innerHTML = data.player2[i]['code'];

                finalHandPlayer2.appendChild(card);
            }
            alert(`Player ${data.winner} is the winner! Player ${data.loser} looses the game. Please clsoe this window to see your opponent's hand`)
        } else {
            await winnerListening();
        }
    }
}