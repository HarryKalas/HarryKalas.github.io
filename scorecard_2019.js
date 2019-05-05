// TESTED FROM 27 APR 2018 TO 26 MAY 2018, NO ERRORS 
//	OUTS SOMETIMES GET OUT OF SYNC DURING LIVE GAMES; I DON'T KNOW WHY
//	EXCEPT THE 14 MAY GAME ASTROS V. ANGELS THAT HAS A DOUBLE-PLAY IN THE 9TH THAT DOESN'T TELL THE SECOND OUT
//	I HAVE CODED AROUND IT AT 491 BUT HAVE COMMENTED IT OUT SO I CAN SEE HOW MUCH IT HAPPENS AND MAKE SURE CODING AROUND WORKS
// NOTES:
//	FIND A WAY TO USE THE EVENT2 -- I THINK IT'S USUALLY ERRORS THAT ADVANCE RUNNERS
//		IT'S ALSO RUNNER OUT WHEN SOMEBODY GETS OUT BUT IT DOESN'T MAKE A FC
//
//	FIND A WAY TO USE THE CALLS IN THE INNING/FOLDER! THEY ARE GOOD!
//	WHEN BATTERS ARE BEING CALLED, USE document.getElementById("away#").scrollIntoView() TO DISPLAY
//
//	BUG IN THE PITCHING CHANGE CALL IN gid_2018_05_03_bosmlb_texmlb_1: SAYS A PITCHER REPLACES HIMSELF! I AM NOT HANDLING THIS WELL
//	PASSED BALL IS GETTING CALLED TWICE
//	SOMETIMES THE NUMBER OF RUNNERS IS CALLED TOO MANY TIMES

//GLOBAL VARIABLES
myTeam=143; //defaults to the Phillies
xhttp=new XMLHttpRequest();
gameFolder="http://gd2.mlb.com/components/game/mlb";

// GAME FILES: 0 = FILENAME; 1 = LASTMODIFIED; 2 = XML DATA
LastCall = new Date(1/1/2000);			// holds the time that an xdLoad of a file was last performed?
MasterScoreboardXML = ['/master_scoreboard.xml', LastCall, ''];
PlayersXML = ['/players.xml', LastCall, ''];
	var plyrSource; 			//keep this global; will be filled in LoadPlayers and never again
BoxscoreXML = ['/boxscore.xml', LastCall, ''];
GameEventsXML = ['/game_events.xml', LastCall, ''];
PlaysXML = ['/plays.xml', LastCall, ''];

var TeamType = ['away','home']; 
AtBat = new Object;		// tag for team at-bat, global because I'm tired of passing it
LastPlay = 0;
var LastAction = ["","","","","","","","","",""];
LastPitch = 0;
LeadOff = "";

var Runs = 0; 		// runs in the inning
var Hits = 0; 		// hits in the inning
var Errors = 0; 	// errors in the inning
var LOB = 1; 		// start with 1 for the person at bat; add one for each person at bat and subtract one for each out or run scored
var I123 = 1;		// assume true
GameOver = false; 	//whether the game is over

// player ID in batting order, 2 dimensional, first index is team; second index is batting order; 0 is pitcher, 10 is incoming player
PlayerID = new Array;
	PlayerID[0] = [0,0,0,0,0,0,0,0,0,0,0]	// away; 1-9 plus pitcher (10) and incoming (0)
	PlayerID[1] = [0,0,0,0,0,0,0,0,0,0,0]	// home; 1-9 plus pitcher and incoming
PlayerNum = new Array;
	PlayerNum[0] = [0,0,0,0,0,0,0,0,0,0,0]	// away; 1-9 plus pitcher and incoming
	PlayerNum[1] = [0,0,0,0,0,0,0,0,0,0,0]	// home; 1-9 plus pitcher and incoming
PlayerName = new Array;
	PlayerName[0] = ["","","","","","","","","","",""] // away; 1-9 plus pitcher and incoming
	PlayerName[1] = ["","","","","","","","","","",""] // home; 1-9 plus pitcher and incoming

AudioFolder = "http://harrykalas.github.io/Audio/" //where the files reside -- *** CALCULATE THIS ***
AudioQueue = new Array; 		// holds the list of calls and commercials to play

function AfterLoad() {
	//build the date URL, which gives the folder of the gameday
	LastCall = new Date;
	Today = new Date;
	if(Today.getHours() < 12) { Today.setDate(Today.getDate()-1); } 	// 15 APR 2019

	if(location.search.indexOf("theYear=")>0) {			// 15 APR 2019
		ptr = location.search.indexOf("theYear=");			// 15 APR 2019
		theYear = location.search.substring(ptr+8, ptr+12);		// 15 APR 2019
	} else {
		theYear = Today.getFullYear();				// 15 APR 2019
	}

	if(location.search.indexOf("theMonth=")>0) {			// 15 APR 2019
		ptr = location.search.indexOf("theMonth=");		// 15 APR 2019
		theMonth = location.search.substring(ptr+9, ptr+11);		// 15 APR 2019
	} else {
		theMonth = Today.getMonth() + 1;			// 15 APR 2019
		if(theMonth < 10) {theMonth = "0" + theMonth}		// 15 APR 2019
	}

	if(location.search.indexOf("theDate=")>0) {			// 15 APR 2019
		ptr = location.search.indexOf("theDate=");			// 15 APR 2019
		theDate = location.search.substring(ptr+8, ptr+10);		// 15 APR 2019
	} else {
		theDate = Today.getDate(); 				// 15 APR 2019
		if(theDate < 10) {theDate = "0" + theDate}		// 15 APR 2019
	}

	if(location.search.indexOf("myTeam=")>0) {			// 15 APR 2019
		ptr = location.search.indexOf("myTeam=");		// 15 APR 2019
		myTeam = location.search.substring(ptr+7, ptr+10);		// 15 APR 2019
	} else {
		//it uses the default
	}

	DateURL = "/year_" + theYear + "/month_" + theMonth + "/day_" + theDate;	// 15 APR 2019
	gameFolder += DateURL;					// 15 APR 2019

	document.getElementById("myTeam").value = myTeam;		// 15 APR 2019
	document.getElementById("theMonth").value = theMonth;		// 15 APR 2019
	document.getElementById("theDate").value = theDate;		// 15 APR 2019
	document.getElementById("theYear").value = theYear;		// 15 APR 2019

	game = LoadGame(); //loaded if myTeam has a game on DateURL; empty if not	// 15 APR 2019 ... GO TO LOADGAME

	// IF THERE IS NO GAME, WE'RE DONE
	if (!game) {
		return false;
	}
	
	// IF THERE IS A GAME, LOAD THE PLAYERS

	LoadPlayers();
//********** CHECKED INTO LOADPLAYS
	// LOAD THE PLAYS
	LastPlay = LoadPlays(0);
	AudioQueue.length = 0;
	document.getElementById("Audio").src = "silence.mp3"; // so that the audio tag will be "ended" and ready for calls
	clearMessage();
	BoxScore();

	if (!GameOver) {
		// SET UP TIMERS
		playMonitor = setInterval("LastCall = new Date; LastPlay = LoadPlays(LastPlay)", 60000); //check for missing plays every minute
		pitchMonitor = setInterval("LastCall = new Date; LoadPitches()", 2000); //check for pitches every 2 seconds
	}
}

function LoadGame() {
	//determines whether there is a game for myTeam on DateURL and builds the folder URL text for the game

	//get list of games on the date
	source = xdLoad(MasterScoreboardXML);				// 15 APR 2019

	//get games for myTeam
	games = selectNodes(source, "//games/game[@home_team_id = '" + myTeam + "' or @away_team_id = '" + myTeam + "']");		// 15 APR 2019 
	switch (games.snapshotLength) {
	case 0 : // if there are no games for myTeam, alert
		alert("No game today");				// 18 APR 2019
		break;
	case 1 : // if there is exactly one game for myTeam, use it
		game = games.snapshotItem(0);				// 18 APR 2019
		break;
	default : // if there is more than one game for myTeam, pick one
		for (Idx = 0; Idx < games.snapshotLength; Idx++) {
			gameDetail = games.snapshotItem(Idx).getAttribute("home_team_name");		// 18 APR 2019
			gameDetail += " v. " + games.snapshotItem(Idx).getAttribute("away_team_name");	// 18 APR 2019
			gameDetail += " at " + games.snapshotItem(Idx).getAttribute("time");		// 18 APR 2019
			gameDetail += " " + games.snapshotItem(Idx).getAttribute("ampm");		// 18 APR 2019
			Ans = confirm("Show this game? (click Cancel to pick another)\n" + gameDetail);	// 18 APR 2019
			if (Ans) { break; }
		}

		if (Idx == games.snapshotLength) { // if nothing was picked ...
			alert("Those are the only games for your team today.");			// 18 APR 2019
			break;								// 18 APR 2019
		} else { // if something was picked, use it
			game = games.snapshotItem(Idx);					// 18 APR 2019
		}
	}

	if (typeof game !== 'undefined') { // if there is a game...
		GameDay = game.getAttribute("gameday");			// 18 APR 2019
	} else { // if there is not a game, hide the scoreboard
		GameDay = "";						// 18 APR 2019
		document.getElementById("GameDisplay").style.display = "none";
	}
	
	OtherGames(GameDay);						// 18 APR 2019 ... GO TO OTHER GAMES

	//fix the master scoreboard folder for future calls
	MasterScoreboardXML[0] = '/../master_scoreboard.xml';


 	// IF THERE IS NOT A GAME TO DISPLAY AT THIS POINT, WE'RE DONE
	if (typeof game == 'undefined') { return false; };

	// IF THERE IS A GAME ...
	// ... GET THE GAME FOLDER
	gameFolder += "/gid_" + GameDay;

	// ... DISPLAY THE LOGOS
	awayLogo = '<img width="62" align="top" src="https://securea.mlb.com/mlb/images/team_logos/124x150/'
	awayLogo += game.getAttribute("away_file_code");
	awayLogo += '@2x.png" /><br/>(' + game.getAttribute("away_win") + "-" + game.getAttribute("away_loss") + ")";
	document.getElementById("AwayLogo").innerHTML = awayLogo;

	homeLogo = '<img width="62" align="top" src="https://securea.mlb.com/mlb/images/team_logos/124x150/'
	homeLogo += game.getAttribute("home_file_code");
	homeLogo += '@2x.png" /><br/>(' + game.getAttribute("home_win") + "-" + game.getAttribute("home_loss") + ")";
	document.getElementById("HomeLogo").innerHTML = homeLogo;

	// ... STORE THE TEAM IDS
	document.getElementById("away").name = game.getAttribute("away_team_id");
	document.getElementById("home").name = game.getAttribute("home_team_id");

	// ... DISPLAY THE BROADCAST INFORMATION FOR MY TEAM
	var Node;
	if (game.getAttribute("home_team_id") == myTeam) {
		Node = selectNodes(source, "broadcast/home", game).snapshotItem(0);
	} else {
		Node = selectNodes(source, "broadcast/away", game).snapshotItem(0);
	}

	if (Node) {	
		document.getElementById("Broadcast").innerHTML = "<B>Broadcast: </B> " + selectNodes(source, "tv", Node).snapshotItem(0).innerHTML + "; " + selectNodes(source, "radio", Node).snapshotItem(0).innerHTML;
	}

	// ... DISPLAY THE GAME START TIME
	GameTime = game.getAttribute("time") + " " + game.getAttribute("ampm");
	document.getElementById("GameTime").innerHTML = "<B>Start Time: </B> " + GameTime;

	// ... DISPLAY THE GAME STATUS
	gameStatus = selectNodes(source, "status", game).snapshotItem(0).getAttribute("status");
	document.getElementById("GameStatus").innerHTML = "<B>Status: </B> " + gameStatus;

	// ... DISPLAY ANY ALERT THAT IS CURRENTLY IN PROGRESS
	if (selectNodes(source, "alerts", game).snapshotItem(0)) {
		document.getElementById("GameAlert").innerHTML = selectNodes(source, "alerts", game).snapshotItem(0).getAttribute("text");
	}

	// SPECIAL OPTIONS DEPENDING ON STATUS
	// ... could be Final, In Progress, Warmup, Pre-Game (35 min? 2:20?), Preview (5:20?), 
	switch (gameStatus) {
	case "Preview" :
	case "Pre-Game" :
		// reload 10 minutes before game
		GameTime = new Date(game.getAttribute("time_date") + " " + game.getAttribute("ampm"))
		Now = new Date();
		TimeOffset = GameTime.getTime() - Now.getTime()- 600000; 
		setTimeout("location.reload()", TimeOffset);
		document.getElementById("GameDisplay").innerHTML = "<font size='14px'>Game has not yet started</font><br/>";
		document.getElementById("GameDisplay").innerHTML += "<font size='14px'>Game Time: " + game.getAttribute("time") + " " + game.getAttribute("ampm") + "</font><br/><br/>";
		return false;	// nothing to show; it will run when it reloads
		break;
	case "Postponed" :
	case "Suspended" :
		document.getElementById("GameDisplay").innerHTML = "<font size='14px'>Game has been POSTPONED</font><br/><br/>";
		return false; // nothing to show
		break;
	case "Warmup" :
	case "In Progress" :
	case "Completed Early: Rain" :
	case "Delayed Start" :
	case "Delayed Start: Rain" :
	case "Delayed" :
	case "Final" :
	case "Final: Tied" :
	case "Game Over" :
		break;
	case "Manager Challenge" :
	case "Umpire Review" :
		setTimeout("location.reload()", 15000);
		break;
	default :
		// there may be other options
		console.log("other game status: ", gameStatus);
		oy;
	}

	return game;
}

function xdLoad(theFile) {
if (theFile[1] == LastCall) { 
//	console.log('do not load '+theFile[0]); 
	return theFile[2]; 
} else { 
//	console.log('loading '+theFile[0], theFile[1], LastCall, theFile[1] == LastCall); 
}

// CHANGE 15 APR 2019: MLB NO LONGER ALLOWS RETRIEVING THE HEADER, SO SKIP THAT PART
//theFile is an array with 0 = filename, 1 = LastModified, 2 = xmldata
//first checks whether the file has been changed [1] since the last pull
//	if not, it returns the data [2] from the last pull
//	if it has, if updates the last date [1] and does a new pull [2]

/*
// var time = new Date(); 
	// this avoids the problem that masterscoreboard.xml won't let me pull a header
	if (theFile[1] != null) {
		xhttp.open("HEAD", gameFolder + theFile[0], false);
		try {
			xhttp.send();
			if (xhttp.getResponseHeader("Last-Modified") == theFile[1]) {
				// file has not changed; return previous version
				return theFile[2];
			} else {
				theFile[1] = xhttp.getResponseHeader("Last-Modified");
			}
		}
		catch(e) {
			//IF IT FAILED TO LOAD THE HEADER, GIVE UP AND TRY LATER
			console.log("xdLoad header error on File" + theFile[0]);
			return;
		}
	}
*/
	// this refreshes the data
	xhttp.open("GET", gameFolder + theFile[0], false);		// 15 APR 2019
	try {
		xhttp.send();				// 15 APR 2019
		resp = xhttp.responseXML;			// 15 APR 2019
		theFile[2] = resp;				// 15 APR 2019
		theFile[1] = LastCall;			//  5 MAY 2019
		return theFile[2];				// 15 APR 2019
	}
	catch(e) {
		console.log("xdLoad data error on File" + theFile[0]);		// 15 APR 2019
		console.log(e);				// 15 APR 2019
		return null;				// 15 APR 2019
	}
}

function selectNodes(Doc, XPath, context) {
//replaces the selectNodes feature that doesn't seem to be there
	if(context) {
		return Doc.evaluate(XPath, context, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
	} else if (Doc) {
		return Doc.evaluate(XPath, Doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);	// 18 APR 2019
	}
}

function OtherGames(GameDay) {
	// show a list of all the other games
	source = xdLoad(MasterScoreboardXML);

	otherGames = selectNodes(source, "//games/game[@gameday != '" + GameDay + "']");

	OGText = "";
	for (gIdx = 0; gIdx < otherGames.snapshotLength; gIdx++) {
		OGText += '<a href="index.html?myTeam=';
		OGText += otherGames.snapshotItem(gIdx).getAttribute("away_team_id");
		OGText += "&theMonth=" + theMonth + "&theDate=" + theDate + "&theYear=" + theYear + '">';
		City = otherGames.snapshotItem(gIdx).getAttribute("away_team_city");
		Team = otherGames.snapshotItem(gIdx).getAttribute("away_team_name");
		OGText += City + " ";
		if (City.indexOf(Team) >= 0) {
			OGText += "</a> at ";
		} else {
			OGText += Team + "</a> at ";
		}
		OGText += '<a href="index.html?myTeam=';
		OGText += otherGames.snapshotItem(gIdx).getAttribute("home_team_id");
		OGText += "&theMonth=" + theMonth + "&theDate=" + theDate + "&theYear=" + theYear + '">';
		City = otherGames.snapshotItem(gIdx).getAttribute("home_team_city");
		Team = otherGames.snapshotItem(gIdx).getAttribute("home_team_name");
		OGText += City + " ";
		if (City.indexOf(Team) >= 0) {
			OGText += "</a> at ";
		} else {
			OGText += Team + "</a> at ";
		}
		OGText += otherGames.snapshotItem(gIdx).getAttribute("time") + " ";
		OGText += otherGames.snapshotItem(gIdx).getAttribute("time_zone") 
		OGText += " (" + selectNodes(source, "status", otherGames.snapshotItem(gIdx)).snapshotItem(0).getAttribute("status")
		score = selectNodes(source, "linescore/r", otherGames.snapshotItem(gIdx)).snapshotItem(0);
		if (score) {
			OGText += " " + score.getAttribute("away") + "-" + score.getAttribute("home")
		}
		OGText += ")<br/>";
	}
	document.getElementById("OtherGames").innerHTML = OGText;
}

function LoadPlayers() {
	// GET PLAYER DATA
	//	THIS ALSO SETS UP THE TEAMS GENERALLY
	// *** NEED TO HANDLE WHEN THE PLAYERS.XML IS NOT AVAILABLE *** but it shouldn't be, because it shouldn't get this far
	plyrSource = xdLoad(PlayersXML);	//this is now the only time it gets loaded
	boxSource = xdLoad(BoxscoreXML);

	awayTeam = selectNodes(plyrSource, "//game/team[@type='away']").snapshotItem(0).getAttribute("name");
	document.getElementById("away").innerHTML = awayTeam;
	homeTeam = selectNodes(plyrSource, "//game/team[@type='home']").snapshotItem(0).getAttribute("name");
	document.getElementById("home").innerHTML = homeTeam;

	// FOR EACH TEAM ...
	for (TeamIdx = 0; TeamIdx <= 1; TeamIdx++) {
		// SET UP THE TEAM
		Team = selectNodes(plyrSource, "//game/team[@type='" + TeamType[TeamIdx] + "']").snapshotItem(0);
		BoxTeam = selectNodes(boxSource, "//boxscore/batting[@team_flag='" + TeamType[TeamIdx] + "']").snapshotItem(0);

		AtBat = document.getElementById(TeamType[TeamIdx]);	//THE PAGE NODE FOR THE TEAM
		AtBat.Runs = 0;
		AtBat.Outs = 0;
		AtBat.Inning = 1;
		AtBat.Column = 4;
		AtBat.AB = 1;
		AtBat.Index = TeamIdx;

		// RETRIEVE PLAYERS
		for (Ctr = 1; Ctr <= 9; Ctr++) {
			//mar 2019: changed to handle when more than one person has the same batting order
			//	find the starting player in BoxScore and work from there

			BoxPlayer = selectNodes(boxSource, "batter[@bo='" + Ctr + "00']", BoxTeam).snapshotItem(0);
			if (BoxPlayer.snapshotLength = 0) { //I probably need to check for subsequent numbers
				console.log("No Player for Batting Order ", Ctr);
				oy;
			}
			PlayerID[TeamIdx][Ctr] = BoxPlayer.getAttribute("id");

			Player = selectNodes(plyrSource, "player[@id='" + BoxPlayer.getAttribute("id") + "']", Team).snapshotItem(0);

			Row = document.getElementById(TeamType[TeamIdx] + Ctr);
			Row.cells[1].innerHTML = Player.getAttribute("num");
			Row.cells[2].innerHTML = Player.getAttribute("boxname");
			Row.cells[3].innerHTML = Player.getAttribute("game_position");
			PlayerNum[TeamIdx][Ctr] = Player.getAttribute("num");
			PlayerName[TeamIdx][Ctr] = BuildName(BoxPlayer.getAttribute("name_display_first_last"));

		}

		// RETRIEVE STARTING PITCHER
		PitcherID = selectNodes(boxSource, "//boxscore/pitching[@team_flag='" + TeamType[TeamIdx] + "']/pitcher").snapshotItem(0).getAttribute("id");
		LoadPitcher(PitcherID);
	}

	//set at-bat team at beginning of game to AWAY
	AtBat = document.getElementById("away");

	return true;
}

function BuildName(DisplayName) {
	// BUILD A REGEX FOR THE PLAYER'S NAME *** there could be problems with this!
	result = "";
	suffix = "";
	if (DisplayName.slice(-3) == 'Jr.') {
		suffix = "( Jr\\.){0,1}";
		DisplayName = DisplayName.slice(0, -4);
	}

	if (DisplayName.slice(1,2) == "." && DisplayName.slice(4,5) == ".") { // two initials with space
		result = "(" + DisplayName.slice(0,1) + "\\.)?\\s?(" + DisplayName.slice(3,4) + "\\.)?";
		result += "\\s" + DisplayName.slice(6);
	} else if (DisplayName.slice(1,2) == "." && DisplayName.slice(3,4) == ".") { // two initials no space
		result = "(" + DisplayName.slice(0,1) + "\\.)?\\s?(" + DisplayName.slice(2,3) + "\\.)?";
		result += "\\s" + DisplayName.slice(5);
	} else if (/^[A-Z][A-Z]/.test(DisplayName)) {
		result = DisplayName.slice(0,1) + "?\\.?\\s?" + DisplayName.slice(1,2) + "?\\.?\\s?" + DisplayName.slice(3);
	} else if (DisplayName.indexOf(".") >=0) { //anything with an abbreviation
		Parts = DisplayName.split(" ");		// break up the name on spaces
		result = DisplayName.substring(0,1);	// get the first character
		result += ".{0," + (DisplayName.length - Parts[Parts.length - 1].length + 5) + "}";	// then any characters up to the full length of the name
		result += " " + Parts[Parts.length - 1];
	} else {
		result = DisplayName;	// turn it into a global, case-insensitive RegExp
	}
	return new RegExp(result + suffix, "g");
}

function LoadPitcher(PitcherID) {
	//THIS ONLY WORKS IF PITCHER ID IS THE RIGHT ONE!

	//get pitcher
	ptchSource = xdLoad(BoxscoreXML);

	var ptchNode;
	ptchNode = selectNodes(ptchSource, "boxscore/pitching/pitcher[@id='" + PitcherID + "']").snapshotItem(0);
	Team = selectNodes(ptchSource, "..", ptchNode).snapshotItem(0).getAttribute("team_flag");

	PitchTable = document.getElementById(Team + "Pitching");

	//add a row for the new pitcher
	PitchRow = PitchTable.insertRow();
	PitchRow.className = "BoxScore";
	for (c = 0; c <= 13; c++) { 
		PitchRow.insertCell(c);
	}
	PitchRow.cells[0].style="text-align: left; min-width: 150px;";
	PitchRow.id = ptchNode.getAttribute("id");


	//fill in the pitcher's name and boxscore from this game so far
	PitchRow.cells[0].innerHTML = ptchNode.getAttribute("name_display_first_last");
	PitchRow.cells[2].innerHTML = ptchNode.getAttribute("era");
	PitchRow.cells[3].innerHTML = ptchNode.getAttribute("np") - ptchNode.getAttribute("s");
	PitchRow.cells[4].innerHTML = ptchNode.getAttribute("s");
	PitchRow.cells[5].innerHTML = ptchNode.getAttribute("np");

	PitchRow.cells[6].innerHTML = ptchNode.getAttribute("bf");
	PitchRow.cells[7].innerHTML = ptchNode.getAttribute("h");
	PitchRow.cells[8].innerHTML = ptchNode.getAttribute("bb");
	PitchRow.cells[9].innerHTML = ptchNode.getAttribute("so");
	PitchRow.cells[10].innerHTML = ptchNode.getAttribute("r");
	PitchRow.cells[11].innerHTML = ptchNode.getAttribute("er");
	PitchRow.cells[12].innerHTML = ptchNode.getAttribute("hr");

	ptchHand = xdLoad(["/pitchers/" + ptchNode.getAttribute("id") + ".xml", null, '']);
	PitchRow.cells[1].innerHTML = selectNodes(ptchHand, "Player/@throws").snapshotItem(0).value + "HP";

	//put pitcher into the 10th slot
	if (Team == "away") { TeamIdx = 0 } else { TeamIdx = 1 }
	PlayerID[TeamIdx][10] = ptchNode.getAttribute("id")
	PlayerName[TeamIdx][10] = BuildName(ptchNode.getAttribute("name_display_first_last"));

	if (AtBat.Outs > 0) {
		PitchRow.cells[0].innerHTML += " (" + AtBat.Inning + "." + AtBat.Outs + ")";
	} else if (AtBat.Inning > 1) {
		PitchRow.cells[0].innerHTML += " (" + AtBat.Inning + ")";
	}

	if (ptchNode.getAttribute("note")) {
		PitchRow.cells[13].innerHTML = ptchNode.getAttribute("note");
	}
}

function LoadPlays(StartPlay) {
// StartPlay is the node index of the next node
//	show plays for that node and higher
	// check the game_events.xml file
	source = xdLoad(GameEventsXML);

/***** IT'S NOT GIVING ME THE HEADERS ANY MORE SO THIS WON'T WORK
	// if the last-modified hasn't changed, return
	if (document.getElementById("PlayTime").innerHTML == GameEventsXML[1]) {
		return StartPlay;
	}

	// if last-modified has changed, update the time and continue
	document.getElementById("PlayTime").innerHTML = GameEventsXML[1];
*****/

	gamePlays = selectNodes(source, "//game/inning/*/*");

	for (pIdx = StartPlay; pIdx < gamePlays.snapshotLength; pIdx++) {
		playDes = gamePlays.snapshotItem(pIdx).getAttribute("des");

		if (playDes == "") {	//*** NODE IS THERE BUT PLAY IS NOT
			if (pIdx <= 0) { return 0 } else { return pIdx - 1 }
		}
console.log("LoadPlays", playDes);
		if (playDes.indexOf(" error ") >= 0) {
			Errors++;
		}
		if (playDes.indexOf("challenge") >= 0) { 
			Challenge = "Inning " + AtBat.Inning;
			Challenge += ", Batter: " + document.getElementById(AtBat.id + AtBat.AB).cells[2].innerHTML;
			Challenge += ", " + playDes;
			document.getElementById("Challenges").innerHTML += Challenge + "<br/>";
			playDes = playDes.split(": ")[playDes.split(": ").length - 1];	//APR 2019: tweaked to handle a play in the 4/12 Rays-Cardinals game where the challenge part was doubled
		} else if (playDes.indexOf("reviewed") >= 0) {
			Challenge = "Inning " + AtBat.Inning;
			Challenge += ", Batter: " + document.getElementById(AtBat.id + AtBat.AB).cells[2].innerHTML;
			Challenge += ", " + playDes;
			document.getElementById("Challenges").innerHTML += Challenge + "<br/>";
			playDes = playDes.split(": ")[1];
		} else if (playDes.indexOf("replaces") >= 0) { //get the name of the incoming player
			id = gamePlays.snapshotItem(pIdx).getAttribute("player");
			if (id > "") {
				boxSource = xdLoad(BoxscoreXML);
				if (gamePlays.snapshotItem(pIdx).getAttribute("event") == "Umpire Substitution") {
					//this is just an umpire change; I don't show this
				} else if (selectNodes(boxSource, "//boxscore/batting/batter[@id='" + id + "']").snapshotLength == 0) {
					//probably a spring training malfunction
					console.log("Unknown Player: ", id, "I" + AtBat.Inning + " " + AtBat.id + " B" + AtBat.AB);
				} else {
					playDes = playDes.replace(/\s\s+/g, ' ');	//get rid of extra spaces				playDes = playDes.replace(PlayerName[tmIdx][plIdx], PlayerID[tmIdx][plIdx]);
					NewName = BuildName(selectNodes(boxSource, "//boxscore/batting/batter[@id='" + id + "']").snapshotItem(0).getAttribute("name_display_first_last"));
					playDes = playDes.replace(NewName, id);
				}
			}
		}
	
		playDes = FixNames(playDes);
	
		switch (gamePlays.snapshotItem(pIdx).nodeName) {
		case "atbat" :
			switch(gamePlays.snapshotItem(pIdx).getAttribute("event")) {
			//this catches things that should really be an Action, not an AtBat, seems to be a spring training problem
			case 'Caught Stealing 2B':
			case 'Caught Stealing 3B' :
			case 'Caught Stealing Home' :
			case "Caught Stealing 2B" :
			case 'Pickoff 1B' :
			case 'Pickoff 2B' :
			case 'Pickoff Caught Stealing 2B' :
			case 'Pickoff 3B' :
			case 'Pitching Substitution' :
			case "Runner Out" :
				showAction(playDes, gamePlays.snapshotItem(pIdx));
			default:
				showAtBat(playDes, gamePlays.snapshotItem(pIdx));
				break;
			}
			break;
		case "action" :
			showAction(playDes, gamePlays.snapshotItem(pIdx));
			break;
		default :
			console.log("Unknown Node", gamePlays.snapshotItem(pIdx).nodeName);
			oy;
		}
	}


	//update the boxscore
	BoxScore();
	GameOver = IsGameOver();

	document.getElementById("PlayTime").innerHTML = GameEventsXML[1];

	if (GameOver) {
		return -1;
	} else {
		return gamePlays.snapshotLength;
	}
}

function showAtBat(playDes, AtBatPlay) {
	document.getElementById("InPlay").innerHTML = ""; //clear Ball In Play notation;

	//make sure the play hasn't already been called
	for (idx = 0; idx < 10; idx++) {
		if (LastAction[idx] == playDes) { return; }
	}

	//put the latest play in the already-called
	if (playDes > "") {
		LastAction.unshift(playDes);
		LastAction.pop();
	} else {
		console.log("No Description!");
		console.log(AtBatPlay);
	}
	batter = AtBatPlay.getAttribute("batter");
	if (batter == null) { batter = AtBatPlay.getAttribute("player") }

	if (PlayerID[AtBat.Index][AtBat.AB] != batter) {
		//batter out of sync
		console.log("batter out of sync: ", PlayerID[AtBat.Index][AtBat.AB], batter);
		oy;
	}

	// get the batter's box
	Box = document.getElementById(AtBat.id + AtBat.AB).cells[AtBat.Column];
	if (!Box) {
		if (AtBat.Inning == 10 && AtBat.Index == 0) {
			getSound("Inning/extra innings");
		}
		AddColumn();
		Box = document.getElementById(AtBat.id + AtBat.AB).cells[AtBat.Column];
	}
	if (Box.style.backgroundImage != 'url("0b.gif")') {
		//if the batter's cell has already been used, bat around
		AtBat.Column = AtBat.Column + 1;
		AddColumn();
		Box = document.getElementById(AtBat.id + AtBat.AB).cells[AtBat.Column];
		getSound("BA");
	}

	// break up the play into primary and secondary
	playDes = playDes.replace(" and ", ". ");
//	playDes = playDes.replace(/, (\d{6})/g, '. $1');

	Plays = playDes.trim().split(". ");
	PrimaryPlay(Plays[0], AtBatPlay);
	for (sIdx = 1; sIdx < Plays.length; sIdx++) {
		if (Plays[sIdx].trim() > "") {
			Result = SecondaryPlay(Plays[sIdx]);
			if (Result == "FAIL") { 
				MLBGlitch(AtBat.Inning, Plays[sIdx], AtBatPlay.getAttribute("event_num"));
			}
		}
	}

	// call the number of runs
	// this is technically not the RBI but is the number of runs scored on the play
	RBI = AtBatPlay.getAttribute(AtBat.id + "_team_runs") - AtBat.Runs;
	if (RBI > 0) {
		document.getElementById("away").Runs = AtBatPlay.getAttribute("away_team_runs");
		document.getElementById("home").Runs = AtBatPlay.getAttribute("home_team_runs");
		Runs = Runs + RBI;
		LOB = LOB - RBI;
		RBICall = "Runs/R" + (RBI);
		if (playDes.indexOf("double") >= 0) { getSound(RBICall + " 2B"); 
		} else if (playDes.indexOf("triple") >= 0) { getSound(RBICall + " 3B"); 
		} else if (playDes.indexOf("homer") >= 0) { getSound(RBICall + " HR"); 
		} else if (playDes.indexOf("grand slam") >= 0) { getSound(RBICall + " GS"); 
		} else if (playDes.indexOf("walks") >= 0) { getSound(RBICall + " BB"); 
		} else { getSound(RBICall); }
		CallScore();
	}

	// move to the next batter
	AtBat.AB++;					// next batter
	if (AtBat.AB == 10) { AtBat.AB = 1 }		// loop around
	document.getElementById("B").innerHTML = "0";	// reset balls
	document.getElementById("S").innerHTML = "0";	// reset strikes
	
// *** USE THIS TO TELL WHEN OUTS ARE OUT OF SYNC
	if (AtBatPlay.getAttribute("o") != AtBat.Outs) { 
console.log("Outs are incorrect: ", "At Bat: " + AtBat.id, "Inning: " + AtBat.Inning, "Batter" + AtBat.AB, "XML: " + AtBatPlay.getAttribute("o"), "AB: " + AtBat.Outs);
console.log(AtBatPlay.getAttribute("des"));
//			AtBat.Outs = AtBatPlay.getAttribute("o");
//		setTimeout("location.reload()", 1000); //reload because it's probably due to some replay review
	}

	if (AtBat.Outs < 3) {
		LOB++;			// one more potentially left on base
		// if last batter was not out at first, it's not 123
		if (Box.style.backgroundImage != 'url("1out.gif")') { I123 = 0; }
	} else {
		EndOfInning();
	}
}

function showAction(playDes, ActionPlay) {
	//make sure the play hasn't already been called
	for (idx = 0; idx < 10; idx++) {
		if (LastAction[idx] == playDes) { return; }
	}

	//put the latest play in the already-called
	if (playDes > "") {
		LastAction.unshift(playDes);
		LastAction.pop();
	} else {
		console.log("No Description!");
	}

	//cut off the batter name, if necessary
	if (playDes.substring(0,4) == "With") {
		playDes = playDes.slice(21);	
	}

	event = ActionPlay.getAttribute("event");
	switch (event) { // only get incoming player in events that add a player
	case 'Defensive Sub' :
	case 'Defensive Switch' :
	case 'Offensive Sub' :
	case 'Offensive Switch' :
		playDes = IncomingPlayer(ActionPlay.getAttribute("player"), playDes);
		break;
	case 'Pitching Substitution' :
		// take care of this here, to make sure the player name is handled before the split
		playDes = IncomingPlayer(ActionPlay.getAttribute("player"), playDes);
		LoadPitcher(ActionPlay.getAttribute("player")); //reload the pitchers' table
		FieldingIdx = (AtBat.Index + 1) % 2;
		playDes = playDes.replace(PlayerName[FieldingIdx][10], PlayerID[FieldingIdx][10])
		break;
	}

	// break up the play into primary and secondary
	playDes = playDes.replace(" picked off and caught stealing ", " picked off & caught stealing ");
	playDes = playDes.replace(" and ", ". ");
	playDes = playDes.replace(/, (\d{6})/g, '. $1');
	Plays = playDes.trim().split(". ");
	for (sIdx = 0; sIdx < Plays.length; sIdx++) {
	if (Plays[sIdx].trim() > "") { // only process plays that aren't blank
		switch (event) {
		case 'Balk' :
			SecondaryPlay(Plays[sIdx], "BK ")
			getSound("BK");
			break;
		case 'Caught Stealing 2B' :
			SecondaryPlay(Plays[sIdx], "CS");
			getSound("CS 2B");
			break;
		case 'Caught Stealing 3B' :
			SecondaryPlay(Plays[sIdx], "CS");
			getSound("CS 3B");
			break;
		case 'Caught Stealing Home' :
			SecondaryPlay(Plays[sIdx], "CS");
			getSound("CS Home");
			break;
		case 'Defensive Indiff' :
			SecondaryPlay(Plays[sIdx], "DI ")
			getSound("DI");
			break;
		case 'Defensive Sub' :
			showMessage(ActionPlay.getAttribute("des"));
			FieldingTeam = (AtBat.Index + 1) % 2;
			BattingOrder = Batting(Plays[sIdx]);
			gamePos = Position(Plays[sIdx]);
			Incoming = ActionPlay.getAttribute("player");
			InsertBatter(FieldingTeam, BattingOrder, Incoming, gamePos);
			break;
		case 'Defensive Switch' :
			showMessage(ActionPlay.getAttribute("des"));
			FieldingTeam = (AtBat.Index + 1) % 2;
			Incoming = ActionPlay.getAttribute("player");

			gamePos = Position(Plays[sIdx]);

			for (Idx = 1; Idx <=9; Idx++) {
				if (PlayerID[FieldingTeam][Idx] == Incoming) {
					BattingOrder = Idx;
				}
			}

			InsertBatter(FieldingTeam, BattingOrder, Incoming, gamePos);
			break;
		case 'Ejection' :
			showMessage(ActionPlay.getAttribute("des"));
			break;
		case 'Error' :
			SecondaryPlay(Plays[sIdx], "");
			getSound("E" + Fielding(Plays[sIdx]));
			break;
		case 'Game Advisory' :
			showMessage(ActionPlay.getAttribute("des"));
			if (Plays[sIdx].indexOf("batted out of order")) {
				//this screws up batting order -- find the right At Bat
				//check each batter to see if they the one batting
				for (Idx = 1; Idx <=9; Idx++) {  
					if (playDes.indexOf(PlayerID[AtBat.Index][Idx]) >= 0) {
						AtBat.AB = Idx;
						break;
					}
				}
			}
			break;
		case 'Manager Review' :
		case 'Umpire Review' :
			// *** MAKE SURE THIS WORKS *** TRY TO GET A COLOR ***
			SecondaryPlay(Plays[sIdx],"");
			break;
		case 'Offensive Sub' :
		case 'Offensive Substitution' :
			showMessage(ActionPlay.getAttribute("des"));
			Incoming = ActionPlay.getAttribute("player");
			if (Plays[sIdx].indexOf("Pinch hitter") >= 0 || Plays[sIdx].indexOf("Pinch-hitter") > 0) {
				//replaces the person currently at bat
				InsertBatter(AtBat.Index, AtBat.AB, Incoming, "PH");
				getSound("PH");
			} else if (Plays[sIdx].indexOf("Pinch runner") >= 0 || Plays[sIdx].indexOf("Pinch-runner") > 0) {
				for (Idx = 1; Idx <=9; Idx++) {  //check each batter to see if they are the one replaced
					if (Plays[sIdx].indexOf(PlayerID[AtBat.Index][Idx]) >= 0) {
						InsertBatter(AtBat.Index, Idx, Incoming, "PR");
					}
					getSound("PR");
				}
			} else {
				console.log("Unknown Offensive Sub", Plays[sIdx]);oy;
			}
			break;
		case 'Passed Ball' :
			SecondaryPlay(Plays[sIdx], "PB ");
			getSound("PB");
			break;
		case 'Picked off stealing 2B' :
		case 'Pickoff Caught Stealing 2B' :
		case 'Picked off stealing 3B' :
		case 'Picked off stealing home' :
			SecondaryPlay(Plays[sIdx], "POCS ")
			break;
		case 'Pickoff 1B' :
		case 'Pickoff 2B' :
		case 'Pickoff 3B' :
			SecondaryPlay(Plays[sIdx].slice(Plays[sIdx].indexOf(",") + 1), "PO ")
			getSound("PO");
			break;
		case 'Pickoff Attempt 1B' :
		case 'Pickoff Attempt 2B' :
		case 'Pickoff Attempt 3B' :
			SecondaryPlay(Plays[sIdx].slice(Plays[sIdx].indexOf(",") + 1), "POA ")
			break;
		case 'Pickoff Error 1B' :
		case 'Pickoff Error 2B' :
		case 'Pickoff Error 3B' :
			SecondaryPlay(Plays[sIdx].slice(Plays[sIdx].indexOf(",") + 1), "POE ")
			break;
		case 'Pitch Challenge' :
			//found this on 3/30/2019 CLE V. TWINS -- not sure what, if anything, to do with it
			console.log("PITCH CHALLENGE");
			break;
		case 'Pitcher Switch' :
			// this handles what hand the switch pitcher is using; not sure I can work this
			break;
		case 'Pitching Substitution' :
			// some is handled above, before the split
			showMessage(ActionPlay.getAttribute("des"));
			FieldingTeam = document.getElementById(TeamType[(AtBat.Index + 1) % 2]);
			getSound("PC " + FieldingTeam.innerHTML);

			if (Plays[sIdx].indexOf("batting") >= 0) { // set the batting position
				BattingOrder = Batting(Plays[sIdx]);

				// set the name and id for the batting position
				InsertBatter(FieldingTeam.Index, BattingOrder, PlayerID[FieldingTeam.Index][10], "P");		
			}
			break;
		case 'Player Injured' :
		case 'Injury' :
			showMessage(ActionPlay.getAttribute("des"));
			break;
		case 'Runner Advance' :
			SecondaryPlay(Plays[sIdx], "E"); // I ASSUME THIS IS AN ERROR
			getSound("E");
			break;
		case 'Runner Out' :
//THIS REALLY CAN'T BE HANDLED WITHOUT DUPLICATING EVERYTHING AND IT DOSN'T COME UP OFTEN ENOUGH TO DO THAT
//	I'LL JUST HAVE TO IGNORE IT AND LET IT PLAY OUT
			if (Plays[sIdx].indexOf("caught stealing") >= 0) {
				Prefix = "CS";
			} else if (Plays[sIdx].indexOf("picks off") >= 0) {	//gid_2018_04_01_slnmlb_nynmlb_1
				Prefix = "PO";
			} else { 
				Prefix = "";
			}
			SecondaryPlay(Plays[sIdx], Prefix)
				break;
		case 'Stolen Base 2B' :
		case 'Stolen Base 3B' :
		case 'Stolen Base Home' :
			SecondaryPlay(Plays[sIdx], "SB ");
			getSound("SB");
			break; 
		case 'Umpire Substitution' :
			showMessage(ActionPlay.getAttribute("des"));
			break;
		case 'Wild Pitch' :
			SecondaryPlay(Plays[sIdx], "WP ");
			getSound("WP");
			break;
		case 'Batter Turn' :
			// switch hitter changes batting position; nothing to do here
			break;
		case 'Official Scorer Ruling Pending' :
			console.log("UNHANDLED:" , ActionPlay);
			oy;
			break;
		default :
			console.log("UNHANDLED:" , event,Plays[sIdx]);
			oy;
		}
	}}

// *** USE THIS TO TELL WHEN OUTS ARE OUT OF SYNC
	if (ActionPlay.getAttribute("o") != AtBat.Outs) { 
console.log("Outs are incorrect: ", "At Bat: " + AtBat.id, "XML: "+ ActionPlay.getAttribute("o"), "AB: " + AtBat.Outs);
console.log(ActionPlay.getAttribute("des"));
//			AtBat.Outs = ActionPlay.getAttribute("o");
			oy; 
	}

	if (AtBat.Outs == 3) {
		EndOfInning();
		return;
	}

	//calculate the number of runners on base and refresh the display
	pitchSource = PlaysXML[2];
	if (pitchSource == "") { return; }
	Runners = 0;
	if (selectNodes(pitchSource, "game/field/offense/man[@bnum='1']").snapshotLength > 0) { 
		Runners += 1;
	}
	if (selectNodes(pitchSource, "game/field/offense/man[@bnum='2']").snapshotLength > 0) { 
		Runners += 2;
	}
	if (selectNodes(pitchSource, "game/field/offense/man[@bnum='3']").snapshotLength > 0) { 
		Runners += 4;
	}
	document.getElementById("Runners").src = Runners + ".gif";
	return;
}

function showMessage(Msg) {
	document.getElementById("MessageDiv").innerHTML = Msg + '<br/>';

	// if the message is already showing, turn off the timer to turn it off
	//	otherwise, show the message
	if (document.getElementById("MessageDiv").style.visibility == "visible") {
		clearTimeout(MessageTimer);
	} else {
		document.getElementById("MessageDiv").style.visibility = "visible";
	}

	// set a timer to turn it off
	MessageTimer = setTimeout("clearMessage()", 10000);
}

function clearMessage() {
	document.getElementById("MessageDiv").style.visibility = "hidden";
}

function FixNames(playDes) {
	playDes = playDes.replace(/\s\s+/g, ' ');	//get rid of extra spaces

	//replace all player names with IDs
	for (tmIdx = 0; tmIdx <= 1; tmIdx++) {
		for (plIdx = 1; plIdx <= 10; plIdx++) {
			if (PlayerID[tmIdx][plIdx] > 0) {	//mar 2019: added because some players don't have names and IDs until later
				playDes = playDes.replace(PlayerName[tmIdx][plIdx], PlayerID[tmIdx][plIdx]);
			}
		}
	}

	//handle two names back-to-back, which I think is caused by a Jr. at the end of a sentence
	Arr = playDes.match(/(\d\d\d\d\d\d) (\d\d\d\d\d\d)/);
	if (Arr) {
		playDes = playDes.replace(Arr[0], Arr[1] + ". " + Arr[2]);
	}
	return playDes;
}

function PrimaryPlay(playDes, AtBatPlay) {

	thePlay = "";	// reset the play

	switch (AtBatPlay.getAttribute("event")) {
	case "Batter Interference" : 
		Box.style.backgroundImage = 'url("1out.gif")';
		thePlay = "BI";
		theOut(Box, thePlay);
		getSound(thePlay);
		break;
	case "Catcher Interference" : 
		Box.style.backgroundImage = 'url("1b.gif")';
		thePlay = "CI";
		getSound(thePlay);
		break;
	case "Double" : 
		if (playDes.indexOf("doubles") >= 0) {
			Box.style.backgroundImage = 'url("2b.gif")';
			Hits++;
			thePlay = "2B";
			getSound(thePlay + " " + HitDetail(playDes));
		} else if (playDes.indexOf("ground-rule double") >= 0) {
			Box.style.backgroundImage = 'url("2b.gif")';
			Hits++;
			thePlay = "GRD";
			getSound(thePlay + " " + HitDetail(playDes));
		} else { oy; }
		break;
	case "Double Play" : 
		// there are a variety of double plays that might be called differently
		if (playDes.indexOf("grounds into") >=0) {
			thePlay = "GIDP " + Fielding(playDes);
		} else if (playDes.indexOf("lines") >=0 || playDes.indexOf("flies") >=0 || playDes.indexOf("pops") >=0 ) {
			thePlay = "DP " + Fielding(playDes);
		} else if (playDes.indexOf("choice") >=0 ) {	// gid_2018_04_04_lanmlb_arimlb_1
			thePlay = "DP " + Fielding(playDes);
		} else { 
			oy; 
		}
		if (AtBatPlay.getAttribute("des").indexOf("to 1st") >=0) {
			//batter goes to first but there are two other outs
			Box.style.backgroundImage = 'url("1b.gif")';	// out at 1st
		} else {
			Box.style.backgroundImage = 'url("1out.gif")';	// out at 1st
			theOut(Box, thePlay);
		}
		break;
	case "Fan interference" :
	case "Fan Interference" :
		if (playDes.indexOf("ground-rule double") >= 0) { 
			Box.style.backgroundImage = 'url("2b.gif")';	
			thePlay = "GRD FI";
			getSound(thePlay);
		} else if (playDes.indexOf("doubles") >= 0) { 
			Box.style.backgroundImage = 'url("2b.gif")';	
			thePlay = "2B FI";
			getSound(thePlay);
		} else if (playDes.indexOf("flies out") >= 0) { 
			Box.style.backgroundImage = 'url("1out.gif")';
			thePlay = "F FI";
			theOut(Box, thePlay);
		} else { oy; }
		break;
	case "Field Error" : 
		if (playDes.indexOf(" error ") >=0) {
			Box.style.backgroundImage = 'url("1b.gif")';
			thePlay = "E" + playerNumber(playDes);
			getSound(thePlay);
		} else { oy; }
		break;
	case "Fielders Choice" : 
	case "Fielders Choice Out" : 
		if (playDes.indexOf("fielder's choice") >=0) {
			Box.style.backgroundImage = 'url("1b.gif")';
			thePlay = "FC " + Fielding(playDes);
			getSound(thePlay);
		} else { oy; }
		break;
	case "Flyout" : 
		if (playDes.indexOf("flies out") >=0 ) {
			Box.style.backgroundImage = 'url("1out.gif")';	// out at 1st
			thePlay = "F" + playerNumber(playDes);
			theOut(Box, thePlay);
		} else { oy; }
		break;

	case "Forceout" : 
		if (playDes.indexOf("grounds into a force out") >=0 || playDes.indexOf("pops into a force out") || playDes.indexOf("lines into a force out") >=0) {
			Box.style.backgroundImage = 'url("1b.gif")';
			thePlay = "FC " + Fielding(playDes);
			getSound(thePlay);
		} else if (playDes.indexOf("bunts into a force out") >=0) {
			Box.style.backgroundImage = 'url("1b.gif")';
			thePlay = "FC B " + Fielding(playDes);
			getSound("FC_B " + Fielding(playDes));
		} else { oy; }
		break;
	case "Grounded Into DP" : 
		if (AtBatPlay.getAttribute("des").indexOf("to 1st") >=0) {
			//batter goes to first but there are two other outs
			Box.style.backgroundImage = 'url("1b.gif")';
			thePlay = "GIDP " + Fielding(playDes);
		} else if (playDes.indexOf("grounds") >=0) {
			Box.style.backgroundImage = 'url("1out.gif")';	// out at 1st
			thePlay = "GIDP " + Fielding(playDes);
			theOut(Box, thePlay);
		} else if (playDes.indexOf("ground bunts") >=0) {
			Box.style.backgroundImage = 'url("1out.gif")';	// out at 1st
			thePlay = "GIDP " + Fielding(playDes);
			theOut(Box, thePlay);
		} else { 
			console.log(AtBatPlay);
			oy; 
		}
		break;
	case "Groundout" : 
	case "Bunt Groundout" :
		if (playDes.indexOf("grounds out") >=0) {
			Box.style.backgroundImage = 'url("1out.gif")';	// out at 1st
			thePlay = Fielding(playDes);
			theOut(Box, thePlay);
		} else { oy; }
		break;
	case "Hit By Pitch" : 
		if (playDes.indexOf("hit by pitch") >= 0) {
			Box.style.backgroundImage = 'url("1b.gif")';
			thePlay = "HBP";
			getSound(thePlay);
		} else { oy; }
		break;
	case "Home Run" : 
		if (playDes.indexOf("homers") >= 0) {
			Box.style.backgroundImage = 'url("hr.gif")';	// batter to 3rd
			getSound("HR " + HitDetail(playDes));
		} else if (playDes.indexOf("inside-the-park home run") >= 0) {
			Box.style.backgroundImage = 'url("hr.gif")';	// batter to 3rd
			getSound("HR " + HitDetail(playDes));
		} else if (playDes.indexOf("grand slam") >= 0) {
			Box.style.backgroundImage = 'url("gs.gif")';	// batter to 3rd
			getSound("HR GS " + HitDetail(playDes));
		} else { oy; }
		Hits++;
		thePlay = "&nbsp;";
		break;
	case "Intent Walk" : 
		if (playDes.indexOf("intentionally walks") >= 0) {
			Box.style.backgroundImage = 'url("1b.gif")';
			thePlay = "IBB";
			getSound(thePlay);
		} else { oy; }
		break;
	case "Lineout" : 
	case "Bunt Lineout" : 
		if (playDes.indexOf("lines out") >=0 ) {
			Box.style.backgroundImage = 'url("1out.gif")';	// out at 1st
			thePlay = "L" + playerNumber(playDes);
			theOut(Box, thePlay);
		} else { oy; }
		break;
	case "Pop Out" : 
	case "Bunt Pop Out" : 
		if (playDes.indexOf("pops out") >= 0) {
			Box.style.backgroundImage = 'url("1out.gif")';	// out at 1st
			thePlay = "P" + playerNumber(playDes);
			if (playDes.indexOf("foul territory") >= 0) {
				F = " Foul";
			} else {
				F = "";
			}
			theOut(Box, thePlay + F);
		} else { oy; }
		break;
	case "Runner Out" :	//gid_2018_04_01_slnmlb_nynmlb_1
//THIS REALLY CAN'T BE HANDLED WITHOUT DUPLICATING EVERYTHING AND IT DOSN'T COME UP OFTEN ENOUGH TO DO THAT
//	I'LL JUST HAVE TO IGNORE IT AND LET IT PLAY OUT
//	ACTUALLY, SOME OF IT IS WAITING FOR A PENDING SCORER RULING
		if (playDes.indexOf("caught stealing") >= 0) {
			Prefix = "CS";
		} else if (playDes.indexOf("picks off") >= 0) {	//gid_2018_04_01_slnmlb_nynmlb_1
			Prefix = "PO";
		} else { 
			Prefix = "";
		}
		SecondaryPlay(playDes, Prefix)
		break;
	case "Sac Bunt" :
		if (playDes.indexOf("out on a sacrifice bunt") >=0) {
			Box.style.backgroundImage = 'url("1out.gif")';
			thePlay = "Sac B " + Fielding(playDes);
			theOut(Box, "SAC_B " + Fielding(playDes));
		} else if (playDes.indexOf("hits a sacrifice bunt") >=0) {
			Box.style.backgroundImage = 'url("1b.gif")';
			thePlay = "Sac B ";
			getSound("1B SAC_B");
		} else { oy; }
		break;
	case "Sacrifice Bunt DP" :
		if (playDes.indexOf("sacrifice double play") >=0) {
			Box.style.backgroundImage = 'url("1out.gif")';	// out at 1st
			thePlay = "Sac DP " + Fielding(playDes);
			theOut(Box, "Sac_DP");
		} else { oy; }
		break;
	case "Sac Fly" : 
	case "Sac Fly DP" : 
		if (playDes.indexOf("hits a sacrifice fly") >=0) {
			Box.style.backgroundImage = 'url("1b.gif")';
			thePlay = "SF " + playerNumber(playDes);
		} else {
			Box.style.backgroundImage = 'url("1out.gif")';
			theOut(Box, thePlay);
			if (AtBatPlay.getAttribute("event") == "Sac Fly DP") {
				thePlay = "SF DP " + playerNumber(playDes);
			} else if (playDes.indexOf("out on a sacrifice fly") >=0) {
				thePlay = "SF " + playerNumber(playDes);
			} else { oy; }
		}
		break;
	case "Single" : 
		if (playDes.indexOf("singles") >= 0) {
			Box.style.backgroundImage = 'url("1b.gif")';
			Hits++;
			thePlay = "1B";
			getSound(thePlay + " " + HitDetail(playDes));
			break;
		} else { console.log(playDes); oy; }
	case "Strikeout" : 
	case "Strikeout - DP" :
	case "Strikeout Double Play" :
		fullPlay = FixNames(AtBatPlay.getAttribute("des"));
		if (fullPlay.indexOf(PlayerID[AtBat.Index][AtBat.AB] + " advances") >= 0 || fullPlay.indexOf(" to 1st") >= 0) { // gid_2018_05_11_bosmlb_tormlb_1; gid_2018_04_01_pitmlb_detmlb_2
console.log("K ADVANCES", AtBat.Inning, AtBat.AB);
			Box.style.backgroundImage = 'url("1b.gif")';
			if (fullPlay.indexOf("Passed ball") >= 0) { 
				thePlay = "K, PB";
				getSound(thePlay);
			} else if (fullPlay.indexOf("Wild pitch") >= 0) { 
				thePlay = "K, WP";
				getSound(thePlay);
			} else if (fullPlay.indexOf("error") >= 0) { 
				thePlay = "K, E";
				getSound(thePlay);
			} else {
				oy;
			}
		} else if (playDes.indexOf("called out on strikes") >=0) {
			Box.style.backgroundImage = 'url("1out.gif")';
			thePlay = "K..";
			theOut(Box, thePlay);
		} else if (playDes.indexOf("foul") >=0) {
			Box.style.backgroundImage = 'url("1out.gif")';	// out at 1st
			thePlay = "K";
			theOut(Box, "K Foul Tip");
		} else {
			Box.style.backgroundImage = 'url("1out.gif")';	// out at 1st
			thePlay = "K";
			theOut(Box, thePlay);
		}
		if (AtBatPlay.getAttribute("event") == "Strikeout - DP") {
			thePlay += " DP"
		}
		break;
	case "Triple" : 
		if (playDes.indexOf("triples") >= 0) {
			Box.style.backgroundImage = 'url("3b.gif")';	// batter to 3rd
			Hits++;
			thePlay = "3B";
			getSound(thePlay + " " + HitDetail(playDes));
		} else { console.log(playDes); oy; }
		break;
	case "Triple Play" : 
		// there are a variety of triple plays that might be called differently
		if (playDes.indexOf("grounds into") >=0) {
			Box.style.backgroundImage = 'url("1out.gif")';	// out at 1st
			thePlay = "GITP " + Fielding(playDes);
			theOut(Box, thePlay);
		} else {
			Box.style.backgroundImage = 'url("1out.gif")';	// out at 1st
			thePlay = "TP " + Fielding(playDes);
			theOut(Box, thePlay);
		}
		break;
	case "Walk" : 
		if (playDes.indexOf("walks") >= 0) {
			Box.style.backgroundImage = 'url("1b.gif")';	// batter to 1st
			thePlay = "BB";
			getSound(thePlay);
		} else { oy; }
		break;
//	case "" : 
//		} else { oy; }
//		break;
	case 'Official Scorer Ruling Pending' :
		console.log("UNHANDLED:" , AtBatPlay);
		showMessage(AtBatPlay.getAttribute("des"));
		break;
	case 'Game Advisory' :
	case 'Injury' :
	case 'Offensive Substitution' :
		//this is handled in Action
		break;
	default :
		console.log("Unknown primary play", AtBatPlay.getAttribute("event"));
		oy;
	}

	// put the text in the box
	Box.innerHTML = thePlay + Box.innerHTML;
	Box.className = "PlayBox";

}

function SecondaryPlay(Play, Prefix) {
	if (Prefix == undefined) { Prefix = ''; }

	SecondBox = findBox(Play);
	if (!SecondBox) { 
		if (Play.indexOf(" error ") >= 0) {
			getSound("E" + playerNumber(playDes));
		} else if (Play.indexOf("Wild pitch") >= 0) {
			//wild pitch part of the call doesn't need a box
		} else if (Play.indexOf("Passed ball") >= 0) {
			//passed ball part of the call doesn't need a box
		} else {
			console.log("No Second Box", TeamType[AtBat.Index], "Inning " + AtBat.Inning, "Batter " + AtBat.AB, Play); 
			// last chance ***
		}
		return; 
	}
	newDiv = document.createElement('div');
	newDiv.innerHTML = Prefix + PlayerNum[AtBat.Index][AtBat.AB];
	SecondBox.appendChild(newDiv);

	if (Play == "") {
		console.log("No Play"); //this is just a placeholder
	} else if (Play.indexOf("to 1st") >= 0) {
		if (SecondBox.parentNode.cells[0].innerHTML == AtBat.AB) {
			//delete the player notation because it is duplicative of the play
			SecondBox.removeChild(newDiv);
			// make sure the background is right
			SecondBox.style.backgroundImage == 'url("1b.gif")';  // batter to 1st
		} else {
			console.log("Unexpected 'to 1st'", Play);
			oy;
		}
	} else if (Play.indexOf("to 2nd") >= 0) {
		SecondBox.style.backgroundImage = 'url("2b.gif")';;
		newDiv.className = "B2"
	} else if (Play.indexOf("to 3rd") >= 0) {
		SecondBox.style.backgroundImage = 'url("3b.gif")';;
		newDiv.className = "B3"
	} else if (Play.indexOf("doubled off 1st") >= 0) {
		SecondBox.style.backgroundImage = 'url("2out.gif")';;
		newDiv.innerHTML = "DP " + newDiv.innerHTML;
		newDiv.className = "B2"
		theOut(SecondBox, "");
	} else if (Play.indexOf("picked off 1st") >= 0) {
		SecondBox.style.backgroundImage = 'url("2out.gif")';;
		newDiv.innerHTML = "PO " + newDiv.innerHTML;
		newDiv.className = "B2"
		theOut(SecondBox, "PO 1B");
	} else if (Prefix == "PO " || Play.indexOf("picks off") >= 0) {
		if (newDiv.innerHTML.indexOf("PO") == -1) {
			newDiv.innerHTML = "PO " + newDiv.innerHTML;
		}
		if (Play.indexOf("at 1st") >= 0 || Play.indexOf("first base") >= 0 ) {
			SecondBox.style.backgroundImage = 'url("2out.gif")';
			newDiv.className = "B2"
			theOut(SecondBox, "PO 1B");
		} else if (Play.indexOf("at 2nd") >= 0) {
			SecondBox.style.backgroundImage = 'url("3out.gif")';
			newDiv.className = "B3"
			theOut(SecondBox, "PO 2B");
		} else if (Play.indexOf("at 3rd") >= 0) {
			SecondBox.style.backgroundImage = 'url("hout.gif")';
			newDiv.className = "Home"
			theOut(SecondBox, "PO 3B");
		} else {
			console.log(Play);
			oy;
		}
	} else if (Prefix == "CS " || Play.indexOf("caught stealing") >= 0) {
		if (Play.indexOf("caught stealing 2nd") >= 0) {
			SecondBox.style.backgroundImage = 'url("2out.gif")';;
			newDiv.className = "B2"
			theOut(SecondBox, "CS 2B");
		} else if (Play.indexOf("caught stealing 3rd") >= 0) {
			SecondBox.style.backgroundImage = 'url("3out.gif")';;
			newDiv.className = "B3"
			theOut(SecondBox, "CS 3B");
		}
	} else if (Play.indexOf("caught stealing home") >= 0) {
		SecondBox.style.backgroundImage = 'url("hout.gif")';;
		newDiv.className = "Home"
		theOut(SecondBox, "");

	} else if (Play.indexOf("out at 1st") >= 0) {
		// if the batter, it's between home and 1st
		if (Play.indexOf(PlayerID[AtBat.Index][AtBat.AB]) >= 0) { //if it's the  batter
			SecondBox.style.backgroundImage = 'url("1out.gif")';
			SecondBox.removeChild(newDiv);
			theOut(SecondBox, "");
		} else {	//otherwise it's really between 1st and 2nd
			SecondBox.style.backgroundImage = 'url("2out.gif")';
			newDiv.className = "B2"
			theOut(SecondBox, "");
		}
	} else if (Play.indexOf("out at 2nd") >= 0) {
		SecondBox.style.backgroundImage = 'url("2out.gif")';;
		newDiv.className = "B2"
		theOut(SecondBox, "");
	} else if (Play.indexOf("doubled off 2nd") >= 0) {
		SecondBox.style.backgroundImage = 'url("3out.gif")';;
		newDiv.innerHTML = "DP " + newDiv.innerHTML;
		newDiv.className = "B3"
		theOut(SecondBox, "");
	} else if (Play.indexOf("out at 3rd") >= 0) {
		SecondBox.style.backgroundImage = 'url("3out.gif")';;
		newDiv.className = "B3"
		theOut(SecondBox, "");
	} else if (Play.indexOf("doubled off 3rd") >= 0) {
		SecondBox.style.backgroundImage = 'url("hout.gif")';;
		newDiv.innerHTML = "DP " + newDiv.innerHTML;
		newDiv.className = "Home"
		theOut(SecondBox, "");
	} else if (Play.indexOf("out at home") >= 0) {
		SecondBox.style.backgroundImage = 'url("hout.gif")';;
		newDiv.className = "Home"
		theOut(SecondBox, "");		
	} else if (Play.indexOf("scores") >= 0) {
		SecondBox.style.backgroundImage = 'url("home.gif")';;
		newDiv.className = "Home";
	} else if (Prefix == "SB " || Play.indexOf("steals") >=0 ) {	// stolen base
		if (newDiv.innerHTML.indexOf("SB") == -1) {
			newDiv.innerHTML = "SB " + newDiv.innerHTML;
		}
		if (Play.indexOf("2nd base") >= 0) {
			SecondBox.style.backgroundImage = 'url("2b.gif")';;
			newDiv.className = "B2"
		} else if (Play.indexOf("3rd base") >= 0) {
			SecondBox.style.backgroundImage = 'url("3b.gif")';;
			newDiv.className = "B3"
		} else if (Play.indexOf("home") >= 0) {
			SecondBox.style.backgroundImage = 'url("home.gif")';;
			newDiv.className = "Home";
		}
	} else if (Play.indexOf("batter interference") >= 0) {
		//hide it, because this is duplicative of the play
		newDiv.parentNode.removeChild(newDiv);
		if (SecondBox.innerHTML.indexOf("BI") == -1) {
			SecondBox.innerHTML = SecondBox.innerHTML.replace("&nbsp;", " BI");
		}
		getSound("BI");
	} else if (Play.indexOf("Fielding error") >= 0) {
		//hide it, because if this isn't caught anywhere else then this didn't do anything
		newDiv.parentNode.removeChild(newDiv);
	} else {
		for (plyr = 1; plyr <=10; plyr++){ 	//gid_2018_05_19_balmlb_bosmlb_1
			if (Play == PlayerID[AtBat.Index][AtBat.AB]) { break; } 
		}
		if (plyr < 10) {
			//just a name
			console.log("MLB sucks");
			return "FAIL";
		} else {
			console.log("Unknown Secondary: " + Play);
			oy;
		}
	}
}

function getSound(SoundToGet) {
console.log(SoundToGet);
//if (SoundToGet == "PR") { console.log("pinch runner problem"); OY; }
//console.log(SoundToGet);
   fldrTeam = "";
   if (AtBat.name == myTeam) { 
      // more excitement if a hit is by my team
      fldrTeam = "US/" ;
   } else {
      fldrTeam = "THEM/";
   }

   SoundArray = (SoundToGet).split(" ");
   while (SoundArray.length > 0) {
      SoundFile = SoundArray.join(" ");
      idx = SoundFiles.indexOf(SoundFile)
      if (idx >= 0) {	// if there is a sound file with that name
         if (fldrTeam == "THEM/") {  //if they are at bat
            if (SoundCounts[idx][1] > 0) {  //and there is a THEM file, then use it
               FileNum = Math.floor(Math.random() * SoundCounts[idx][1]);
               AudioQueue.push("THEM/" + SoundFiles[idx] + " (" + FileNum + ")");
               if (document.getElementById("Audio").ended) { playSound(); }
               console.log("FOUND1");
               return;
            } else {  // if there is not a THEM file, just use the standard one
               FileNum = Math.floor(Math.random() * SoundCounts[idx][0]);
               AudioQueue.push(SoundFiles[idx] + " (" + FileNum + ")");
               if (document.getElementById("Audio").ended) { playSound(); }
               console.log("FOUND2");
               return;
            }
         } else { // otherwise we are at bat
            if (SoundCounts[idx][2] > 0) {  //and there is an US file, then use it
               FileNum = Math.floor(Math.random() * SoundCounts[idx][2]);
               AudioQueue.push("US/" + SoundFiles[idx] + " (" + FileNum + ")");
               if (document.getElementById("Audio").ended) { playSound(); }
               console.log("FOUND3");
               return;
            } else {  // if there is not an US file, just use the standard one
               FileNum = Math.floor(Math.random() * SoundCounts[idx][0]);
               AudioQueue.push(SoundFiles[idx] + " (" + FileNum + ")");
               if (document.getElementById("Audio").ended) { playSound(); }
               console.log("FOUND4");
               return;
            }
         }
      }
      SoundArray.length--;
   }
   console.log("NOTFOUND");
}

function playerNumber(Text) {
	result = "";

	if (Text.indexOf("left field") >= 0) {
		result = "7";
	} else if (Text.indexOf("center field") >= 0) {
		result = "8";
	} else if (Text.indexOf("right field") >= 0) {
		result = "9";
	} else if (Text.indexOf("first base") >= 0) {
		result = "3";
	} else if (Text.indexOf("second base") >= 0) {
		result = "4";
	} else if (Text.indexOf("third base") >= 0) {
		result = "5";
	} else if (Text.indexOf("shortstop") >= 0) {
		result = "6";
	} else if (Text.indexOf("pitcher") >= 0) {
		result = "1";
	} else if (Text.indexOf("catcher") >= 0) {
		result = "2";
	}
	return result;
}

function theOut(Box, thePlay) {
	if (Box.innerHTML.indexOf("Out") >= 0) { // out has already been handled
		return;
	}

	AtBat.Outs++;				// add an out
	LOB--;					// if someone is out, then there is one less left on base

 	document.getElementById("B").innerHTML = "0";	// reset balls
	document.getElementById("S").innerHTML = "0";	// reset strikes
	document.getElementById("O").innerHTML = AtBat.Outs;	// update outs

	outDiv = document.createElement('div');		// create a new DIV for the out
	Box.appendChild(outDiv);			// put it on the current batter's box
	outDiv.className = "Out";			// set the DIV's characteristics

	switch (AtBat.Outs) {
	case 1 :
		outDiv.innerHTML = "&#x2460;";		// put a circled 1 in the out div
		// get the out call for the inning
		getSound(thePlay + " O1 I" + AtBat.Inning);
		break;
	case 2 :
		outDiv.innerHTML = "&#x2461;";		// put a circled 2 in the out div
		getSound(thePlay + " O2 I" + AtBat.Inning);
		break;
	case 3 :
		outDiv.innerHTML = "&#x2462;";				// put a circled 3 in the out div
		getSound(thePlay + " O3 I" + AtBat.Inning);
		break;
	default :
		window.open(gameFolder + "/game_events.xml");
		alert("Don't know the outs " + AtBat.Outs);		// error
		return;
	}

	// if the previous call didn't get the out number, call the out number for the inning
	if(AudioQueue.length==0 || AudioQueue[AudioQueue.length-1].indexOf('O' + AtBat.Outs) == -1) {
		getSound("Out" + AtBat.Outs + " " + AtBat.innerHTML + " I" + AtBat.Inning);
	}
}

function Fielding(playText) {
	Sequence = playText.split(" to ");
	result = playerNumber(Sequence[0]);
	if (result == "") {
		result = playerNumber(Sequence[1]) + "U";
		return result;
	}
	if (Sequence.length == 1) {
		result += "U";
	} else {
		for (Idx = 1; Idx < Sequence.length; Idx++) {
			result += "-" + playerNumber(Sequence[Idx]);
		}
	}
	return result;
}

function findBox(playText) {
	for (Idx = 1; Idx <=9; Idx++) {  //check each batter to see if they are the runner
		if (playText.indexOf(PlayerID[AtBat.Index][Idx]) >= 0) {
			foundBox = document.getElementById(AtBat.id + Idx).cells[AtBat.Column];
			if (foundBox.style.backgroundImage == 'url("0b.gif")') { //if the current column has not been played...
				foundBox = document.getElementById(AtBat.id + Idx).cells[AtBat.Column - 1]; //get the previous column
			}
			return foundBox;
		}
	}

	// if there is still no second box, get more desperate? 
	//	Go through Fielding players?
	for (Idx = 1; Idx <= 9; Idx++) {
		BoxName = document.getElementById(AtBat.id + Idx).cells[2].innerHTML;
		BoxName = new RegExp(BoxName, "g");
		if (playText.match(BoxName) != null) {
			return document.getElementById(AtBat.id + Idx).cells[AtBat.Column];
		}
	}
}

function EndOfInning() {
	//at the end of the inning, ideally, Harry calls RHE, score and teams

	RHE = "RHE/";		// clear RHE
	if (I123 == 1) {	// if it's a 1-2-3 inning
		RHE += "I123" + " " + AtBat.innerHTML + " I" + AtBat.Inning;
	} else {		// otherwise call the runs, hits and errors
		RHE += "" + Runs + Hits + Errors + LOB + " " + AtBat.innerHTML + " I" + AtBat.Inning;
	}

	getSound(RHE);

	CallScore();	

	// CHECK FOR 7TH INNING STRETCH
	if (AtBat.Inning + AtBat.id == '7away') {
		getSound("Stretch");
	}

	// CHECK FOR END OF GAME
	GameOver = IsGameOver();

	// PLAY A COMMERCIAL
	spnsr = Math.floor(Math.random() * Commercials.length);
	AudioQueue.push('../Commercials/' + Commercials[spnsr]);


	// SET CURRENT TEAM FOR NEXT INNING
	AtBat.Inning++;
	AtBat.Column++;

	// CHANGE TEAM AT BAT
	AtBat = document.getElementById(TeamType[(AtBat.Index + 1) % 2]);

	// HANDLE BEGINNING OF NEXT INNING
	AtBat.Outs = 0;		// no outs yet for the team at bat
	LOB = 1;		// reset left on base
	I123 = 1;		// reset 1-2-3 status
	LeadOff = " Lead";	// next batter is the leadoff batter
	Runs = 0;		// reset runs in the inning
	Hits = 0;		// reset hits in the inning
	Errors = 0;		// reset errors in the inning

	// UPDATE OTHER GAMES
	OtherGames(GameDay);
}

function playSound() {
	if (AudioQueue.length > 0) {
		//play the first sound in the queue
		//HTML5 player will automatically call the next one when this one is ended; knowing the length is no longer necessary
		thisSound = AudioQueue.shift();
		document.getElementById("Audio").setAttribute('src', AudioFolder + thisSound + ".mp3");
	}
}

function HitDetail(playText) {
	Result = "";
	if (playText.indexOf("homers") >= 0) {
		Result = "";
	} else if (playText.indexOf("grand slam") >= 0) {
		Result = "";
	} else if (playText.indexOf("fly ball") >= 0) {
		Result = "F";
	} else if (playText.indexOf("ground ball") >= 0) {
		Result = "G";
	} else if (playText.indexOf("line drive") >= 0) {
		Result = "L";
	} else if (playText.indexOf("pop up") >= 0) {
		Result = "P";
	} else if (playText.indexOf("bunt pop") >= 0) {
		Result = "BP";
	} else {
		//this shouldn't matter
console.log(playText);
oy;
	}
	Result += playerNumber(playText);
	return Result;
}

function InsertBatter(TeamIdx, Ord, ID, gamePos) {
	//find the cell to insert the batter into the table
	newRow = document.getElementById(TeamType[TeamIdx] + Ord).nextElementSibling; // 2nd row
	if (newRow.cells[0].innerHTML != "&nbsp;") {
		newRow = newRow.nextElementSibling; // 3rd row
		if (newRow.cells[0].innerHTML != "&nbsp;") {
			nextRow = 0; // the row will be inserted above nextRow
			if (Ord == 9) {  //if it's the last in batting order, get the row number of the footer
				nextRow = document.getElementById(TeamType[TeamIdx] + "Footer").rowIndex;
			} else {  //otherwise, get the row number of the next batting order position
				nextRow = document.getElementById(TeamType[TeamIdx] + (Ord + 1)).rowIndex;
			}
			newRow = newRow.parentNode.insertRow(nextRow); //insert a row before nextRow identified
			document.getElementById(TeamType[TeamIdx] + Ord).cells[0].rowSpan++ //increase the batting order cell's rowspan
			
			for (cellIdx = 0; cellIdx < 3; cellIdx++) { // *** MAKE SURE "3" IS RIGHT
				 //build the cells for the new row
				theCell = newRow.insertCell(cellIdx);
				theCell.innerHTML = "&nbsp;"
				theCell.className = "Number Bottom";
			}
			newRow.cells[1].className = "Player Bottom";
		}
	}

	if (AtBat.Outs > 0 && gamePos == "P") {
		InningText = AtBat.Inning + "." + AtBat.Outs;
	} else {
		InningText = AtBat.Inning;
	}

	// fill in the new player information
	boxSource = xdLoad(BoxscoreXML);

	Player = selectNodes(plyrSource, "//game/team/player[@id='" + ID + "']").snapshotItem(0);
	newRow.cells[0].innerHTML = Player.getAttribute("num");
	PlayerNum[TeamIdx][Ord] = Player.getAttribute("num");
	newRow.cells[1].innerHTML = Player.getAttribute("boxname") + " (" + InningText + ")";
	newRow.cells[2].innerHTML = gamePos;
	PlayerID[TeamIdx][Ord] = ID;
	PlayerName[TeamIdx][Ord] = selectNodes(boxSource, "//boxscore/batting/batter[@id='"+PlayerID[TeamIdx][Ord]+"']").snapshotItem(0).getAttribute("name_display_first_last");
	PlayerName[TeamIdx][Ord] = BuildName(PlayerName[TeamIdx][Ord])
}

function BoxScore() {
	source = xdLoad(PlaysXML);

	gameStatus = selectNodes(source, "status", game).snapshotItem(0).getAttribute("status");
	document.getElementById("GameStatus").innerHTML = "<B>Status: </B> " + gameStatus;
	if (gameStatus == "Final" || gameStatus == "Suspended" || gameStatus.indexOf("Completed") > -1) {
		if (typeof playMonitor !== 'undefined') {
			clearInterval(playMonitor);
		}
		if (typeof pitchMonitor !== 'undefined') {
			clearInterval(pitchMonitor);
		}
		if (gameStatus == "Suspended") {
			GameOver = true;
		}
		console.log(gameStatus);
	}

	PID = selectNodes(source, "game/players/pitcher").snapshotItem(0).getAttribute("pid");

	source = xdLoad(BoxscoreXML);

	//update the current pitcher information
	ptchNode = selectNodes(source, "boxscore/pitching/pitcher[@id='" + PID + "']").snapshotItem(0);
	PitchRow = document.getElementById(PID);
	PitchRow.cells[6].innerHTML = ptchNode.getAttribute("bf");
	PitchRow.cells[7].innerHTML = ptchNode.getAttribute("h");
	PitchRow.cells[8].innerHTML = ptchNode.getAttribute("bb");
	PitchRow.cells[9].innerHTML = ptchNode.getAttribute("so");
	PitchRow.cells[10].innerHTML = ptchNode.getAttribute("r");
	PitchRow.cells[11].innerHTML = ptchNode.getAttribute("er");
	PitchRow.cells[12].innerHTML = ptchNode.getAttribute("hr");

	topLevel = selectNodes(source, "//boxscore");
	lineScore = selectNodes(source, "//boxscore/linescore");
	inningScores = selectNodes(source, "//boxscore/linescore/inning_line_score");

	full  = '<table>';
	mini  = '<table style="width: 100%; margin: 10px 0px;">';

	//header
	full += '<tr><td class="BoxScoreHead">&#xa0;</td>'
	mini += '<tr><td class="BoxScoreHead" style="width: 90%;">&#xa0;</td>'
	for (Idx = 0; Idx < inningScores.snapshotLength; Idx++) {
		full += '<th class="BoxScoreHead"> &#xa0;' + inningScores.snapshotItem(Idx).getAttribute("inning") + '&#xa0; </th>';
	}
	full += '<th class="BoxScoreHead">&#xa0;</th>';
	full += '<th class="BoxScoreHead">&#xa0;&#xa0;R&#xa0;&#xa0;</th>';
	full += '<th class="BoxScoreHead">&#xa0;&#xa0;H&#xa0;&#xa0;</th>';
	full += '<th class="BoxScoreHead">&#xa0;&#xa0;E&#xa0;&#xa0;</th>';
	full += '</tr>';

	mini += '<th class="BoxScoreHead">&#xa0;&#xa0;R&#xa0;&#xa0;</th>';
	mini += '<th class="BoxScoreHead">&#xa0;&#xa0;H&#xa0;&#xa0;</th>';
	mini += '<th class="BoxScoreHead">&#xa0;&#xa0;E&#xa0;&#xa0;</th>';
	mini += '</tr>';

	//away
	full += '<tr><td class="BoxScore" style="text-align: left;"><b><nobr>';
	mini += '<tr><td class="BoxScore" style="text-align: left;"><b><nobr>';
	full += topLevel.snapshotItem(0).getAttribute("away_sname");
	mini += topLevel.snapshotItem(0).getAttribute("away_sname");
	full += '&#xa0;</nobr></b></td>'
	mini += '&#xa0;</nobr></b></td>'
	for (Idx = 0; Idx < inningScores.snapshotLength; Idx++) {
		full += '<td class="BoxScore"> ' + inningScores.snapshotItem(Idx).getAttribute("away") + ' </td>';
	}
	full += '<th class="BoxScore">&#xa0;</th>';
	full += '<th class="BoxScore" style="background-color: #F0F0F0;"> ';
	full += lineScore.snapshotItem(0).getAttribute("away_team_runs");
	full += ' </th><th class="BoxScore" style="background-color: #F0F0F0;"> ';
	full += lineScore.snapshotItem(0).getAttribute("away_team_hits");
	full += ' </th><th class="BoxScore" style="background-color: #F0F0F0;"> ';
	full += lineScore.snapshotItem(0).getAttribute("away_team_errors") + ' </th>';

	mini += '<th class="BoxScore" style="background-color: #F0F0F0;"> ';
	mini += lineScore.snapshotItem(0).getAttribute("away_team_runs");
	mini += ' </th><th class="BoxScore" style="background-color: #F0F0F0;"> ';
	mini += lineScore.snapshotItem(0).getAttribute("away_team_hits");
	mini += ' </th><th class="BoxScore" style="background-color: #F0F0F0;"> ';
	mini += lineScore.snapshotItem(0).getAttribute("away_team_errors") + ' </th>';

	//home
	full += '<tr><td class="BoxScore" style="text-align: left;"><b><nobr>';
	full += topLevel.snapshotItem(0).getAttribute("home_sname");
	full += '&#xa0;</nobr></b></td>'
	mini += '<tr><td class="BoxScore" style="text-align: left;"><b><nobr>';
	mini += topLevel.snapshotItem(0).getAttribute("home_sname");
	mini += '&#xa0;</nobr></b></td>'
	for (Idx = 0; Idx < inningScores.snapshotLength; Idx++) {
		if (inningScores.snapshotItem(Idx).getAttribute("home") > "") {
			full += '<td class="BoxScore"> ' + inningScores.snapshotItem(Idx).getAttribute("home") + ' </td>';
		} else {
			full += '<td class="BoxScore"> &#xa0; </td>';
		} 
	}
	full += '<th class="BoxScore">&#xa0;</th>';
	full += '<th class="BoxScore" style="background-color: #F0F0F0;"> ';
	full += lineScore.snapshotItem(0).getAttribute("home_team_runs");
	full += ' </th><th class="BoxScore" style="background-color: #F0F0F0;"> ';
	full += lineScore.snapshotItem(0).getAttribute("home_team_hits");
	full += ' </th><th class="BoxScore" style="background-color: #F0F0F0;"> ';
	full += lineScore.snapshotItem(0).getAttribute("home_team_errors") + ' </th>';
	full += '</tr></table>'

	mini += '<th class="BoxScore" style="background-color: #F0F0F0;"> ';
	mini += lineScore.snapshotItem(0).getAttribute("home_team_runs");
	mini += ' </th><th class="BoxScore" style="background-color: #F0F0F0;"> ';
	mini += lineScore.snapshotItem(0).getAttribute("home_team_hits");
	mini += ' </th><th class="BoxScore" style="background-color: #F0F0F0;"> ';
	mini += lineScore.snapshotItem(0).getAttribute("home_team_errors") + ' </th>';
	mini += '</tr></table>'
	
	document.getElementById("BoxScore").innerHTML = full;
	document.getElementById("MiniBox").innerHTML = mini;

	return result;
}

function Batting(Text) {
	if (Text.indexOf("batting 1st") >= 0) { BattingOrder = 1; }
	else if (Text.indexOf("batting 2nd") >= 0) { BattingOrder = 2; }
	else if (Text.indexOf("batting 3rd") >= 0) { BattingOrder = 3; }
	else if (Text.indexOf("batting 4th") >= 0) { BattingOrder = 4; }
	else if (Text.indexOf("batting 5th") >= 0) { BattingOrder = 5; }
	else if (Text.indexOf("batting 6th") >= 0) { BattingOrder = 6; }
	else if (Text.indexOf("batting 7th") >= 0) { BattingOrder = 7; }
	else if (Text.indexOf("batting 8th") >= 0) { BattingOrder = 8; }
	else if (Text.indexOf("batting 9th") >= 0) { BattingOrder = 9; }
	else { console.log(Text); oy; }
	return BattingOrder;
}

function Position(Text) {
	if (Text.indexOf("left field") >= 0) { gamePos = "LF"; }
	else if (Text.indexOf("right field") >= 0) { gamePos = "RF"; }
	else if (Text.indexOf("center field") >= 0) { gamePos = "CF"; }
	else if (Text.indexOf("first base") >= 0) { gamePos = "1B"; }
	else if (Text.indexOf("second base") >= 0) { gamePos = "2B"; }
	else if (Text.indexOf("third base") >= 0) { gamePos = "3B"; }
	else if (Text.indexOf("catcher") >= 0) { gamePos = "C"; }
	else if (Text.indexOf("shortstop") >= 0) { gamePos = "SS"; }
	else if (Text.indexOf("pitcher") >= 0) { gamePos = "P"; }
	else if (Text.indexOf("designated hitter") >= 0) { gamePos = "DH"; }
	else { oy; }
	return gamePos;
}

function AddColumn() {
	document.getElementById(AtBat.id + "Table").width = parseFloat(document.getElementById(AtBat.id +"Table").width) + 60;

	newCell = document.getElementById(AtBat.id + "Header").insertCell(AtBat.Column);
	newCell.outerHTML = "<th>" + AtBat.Inning + "</th>";
	for (Idx = 1; Idx <= 9; Idx++) {
		Row = document.getElementById(AtBat.id + Idx);
		newCell = Row.insertCell(AtBat.Column);
		newCell.rowSpan = 3;
		newCell.style.position = "relative";
		newCell.style.backgroundImage = 'url("0b.gif")';
		newCell.width=60;
		newCell.height=60;
		newCell.innerHTML = "&nbsp;";
	}
	newCell = document.getElementById(AtBat.id + "Footer").insertCell(AtBat.Column);
	newCell.outerHTML = "<th>" + AtBat.Inning + "</th>";
	newCell = document.getElementById(AtBat.id + "SpaceIt").insertCell(AtBat.Column);
	newCell.innerHTML = '<img src="spacer.gif" width="60" height="1"><br/>';
}

function IncomingPlayer(id, playDes) {

	//check to see if the current player is already in the player list
	for (tmIdx = 0; tmIdx <= 1; tmIdx++) {
		for (plIdx = 1; plIdx <= 10; plIdx++) {
			if (PlayerID[tmIdx][plIdx] == id) {
				return playDes;
			}
		}
	}
	//if we get this far, the player is not in the list
	if (id.length < 6) {
		//too short to be a player name -- ignore it
		console.log("Incoming player not provided: ", id, playDes);
		return playDes;
	}

	boxSource = xdLoad(BoxscoreXML);
	if (selectNodes(boxSource, "//boxscore/batting/batter[@id='" + id + "']").snapshotLength == 0) {
		//probably a spring training malfunction
		console.log("Unknown Player: ", id);
	} else {
		thePlayer = selectNodes(boxSource, "//boxscore/batting/batter[@id='" + id + "']").snapshotItem(0).getAttribute("name_display_first_last");
	}

	return playDes.replace(BuildName(thePlayer), id);
}

function IsGameOver() {

	if (GameOver) { return true; }	// it's already been determined to be over

	// game is not over until at least the 9th, unless there is a rainout which will be handled elsewhere
	if (AtBat.Inning < 9) { return false; }

	//if away is at bat in 9th or later and there are less than 3 outs, we're not over yet
	if (AtBat.Index == 0 && AtBat.Outs < 3) {
		return false;
	}

	//if home is at bat in the 9th or later, check the score
	awayScore = document.getElementById("away").Runs;
	awayTeam = document.getElementById("away").innerHTML;
	homeScore = document.getElementById("home").Runs;
	homeTeam = document.getElementById("home").innerHTML;

	// if home has more runs than away in the bottom of the 9th or later inning, then game is over
	if (+homeScore > +awayScore) {
		theScore = homeScore + "-" + awayScore ;
		getSound("GameOver " + homeTeam + " " + theScore + " " + awayTeam);
		if (homeTeam == "Philadelphia Phillies") { getSound("HighHopes"); }
console.log("Game Over", homeTeam + " win (1)");

		return true;
	}

	// if home team is at bat and has 3 outs...
	if (AtBat.id == "home" && AtBat.Outs == 3) {
		// if away team has more runs than home team at this point, game is over
		if (+awayScore > +homeScore) {
			theScore = awayScore + "-" + homeScore ;
			getSound("GameOver " + awayTeam + " " + theScore + " " + homeTeam);
			if (awayTeam == "Philadelphia Phillies") { getSound("HighHopes"); }
console.log("Game Over", awayTeam + " win (2)");
			return true;
		} else {
			//home team couldn't have more runs at this point -- if they did, it would be before 3 outs
			return false;
		}
	}
	
	// otherwise game is not over
	return false;
}

function CallScore() {
	awayScore = document.getElementById("away").Runs;
	homeScore = document.getElementById("home").Runs;
	if (homeScore > awayScore) {		// home leads
		Score  = homeScore + "-" + awayScore + " ";
		Score += document.getElementById("home").innerHTML  + " " + document.getElementById("away").innerHTML
	} else if (homeScore == awayScore) {	//tie game
		Score  = awayScore + "-" + homeScore + " ";
		Score += document.getElementById("away").innerHTML  + " " + document.getElementById("home").innerHTML;
	} else {				// away leads
		Score  = awayScore + "-" + homeScore + " ";
		Score += document.getElementById("away").innerHTML  + " " + document.getElementById("home").innerHTML;
	}
	getSound("Score/" + Score);
}

function MLBGlitch(Inning, Player, Event) {
	// THIS SHOULD HANDLE WHEN MLB LEAVES AN INCOMPLETE PLAY

	GlitchBox = findBox(Player);
	source = xdLoad(["/inning/inning_" + Inning + ".xml", "", ""]);
	play = selectNodes(source, "//inning/*/*/runner[@event_num = '" + Event + "'][@id = '" + Player + "']").snapshotItem(0);
	if (play.getAttribute("score") == "T") {
		GlitchBox.style.backgroundImage = 'url("home.gif")';;
		newDiv.className = "Home";
	} else if (play.getAttribute("end") == "3B") {
		GlitchBox.style.backgroundImage = 'url("3b.gif")';;
		newDiv.className = "B3"
	} else if (play.getAttribute("end") == "2B") {
		GlitchBox.style.backgroundImage = 'url("2b.gif")';;
		newDiv.className = "B2"
	} else {
		OY;
	}
}

function LoadPitches() {
	// check the plays.xml file
	pitchSource = xdLoad(PlaysXML);

	if (selectNodes(pitchSource, "game/atbat").snapshotItem(0)) {
		if (selectNodes(pitchSource, "game/atbat").snapshotItem(0).getAttribute("des")) {
			playDes = selectNodes(pitchSource, "game/atbat").snapshotItem(0).getAttribute("des");
			playDes = FixNames(playDes);
			//if play hasn't been called, look for a call
			for (idx = 0; idx < 10; idx++) {
				if (LastAction[idx] == playDes) { break; }
			}
			if (idx >= 10) {
				LastPlay = LoadPlays(LastPlay); // catch any outstanding plays
			}
		}
	}
	
	if (selectNodes(pitchSource, "game/action").snapshotItem(0)) {
		if (selectNodes(pitchSource, "game/action").snapshotItem(0).getAttribute("des")) {
			playDes = selectNodes(pitchSource, "game/action").snapshotItem(0).getAttribute("des");
			playDes = FixNames(playDes);

			//if play hasn't been called, look for a call
			for (idx = 0; idx < 10; idx++) {
				if (LastAction[idx] == playDes) { break; }
			}
			if (idx >= 10) {
console.log("Check for action...", playDes);
				LastPlay = LoadPlays(LastPlay); // catch any outstanding plays
			}
		}
	}

	// if the last-modified hasn't changed, return
	if (document.getElementById("PitchTime").innerHTML == PlaysXML[1]) {
		return;
	}
	document.getElementById("PitchTime").innerHTML = PlaysXML[1];

	//reset pitch information
//	document.getElementById("PitchSpeed").innerHTML = "";

	//show the pitcher information
	pitcherNodes = selectNodes(pitchSource, "game/players/pitcher");
	if (pitcherNodes.snapshotLength > 0) {
		Temp = document.getElementById("Pitcher");
		Temp.innerHTML = pitcherNodes.snapshotItem(0).getAttribute("boxname");
		Temp.innerHTML += " B: " + pitcherNodes.snapshotItem(0).getAttribute("balls");
		Temp.innerHTML += " S: " + pitcherNodes.snapshotItem(0).getAttribute("strikes");
		Temp.innerHTML += " T: " + pitcherNodes.snapshotItem(0).getAttribute("pitches");
		Temp = document.getElementById(pitcherNodes.snapshotItem(0).getAttribute("pid"));
		if (Temp) {
			Temp.cells[2].innerHTML = pitcherNodes.snapshotItem(0).getAttribute("era");
			Temp.cells[3].innerHTML = pitcherNodes.snapshotItem(0).getAttribute("balls");
			Temp.cells[4].innerHTML = pitcherNodes.snapshotItem(0).getAttribute("strikes");
			Temp.cells[5].innerHTML = pitcherNodes.snapshotItem(0).getAttribute("pitches");
		}
	}

	//if there is a different batter, show new batter
	batterNodes = selectNodes(pitchSource, "game/players/batter");
	if (batterNodes.snapshotLength > 0) {
		batterNode = batterNodes.snapshotItem(0);
		if ((batterNode.getAttribute("boxname") != document.getElementById("BatterName").innerHTML) && (batterNode.getAttribute("boxname") > '')) {
			LastPlay = LoadPlays(LastPlay); // catch any outstanding plays

			// clear the pitch count
			LastPitch = 0;
			document.getElementById("B").innerHTML = 0;
			document.getElementById("S").innerHTML = 0;

			//calculate the number of runners on base
			Runners = 0;
			if (selectNodes(pitchSource, "game/field/offense/man[@bnum='1']").snapshotLength > 0) { 
				Runners += 1;
			}
			if (selectNodes(pitchSource, "game/field/offense/man[@bnum='2']").snapshotLength > 0) { 
				Runners += 2;
			}
			if (selectNodes(pitchSource, "game/field/offense/man[@bnum='3']").snapshotLength > 0) { 
				Runners += 4;
			}
			document.getElementById("Runners").src = Runners + ".gif";
			if (Runners > 0) {
				getSound("Runners/" + Runners + " O" + AtBat.Outs + " I" + AtBat.Inning + " " + AtBat.id);
			}
			ShowBatter(batterNode); // reset the batter box
			document.getElementById("BatterDiv").style.visibility = "visible";
		}
	}

	//get all of the pitches and pickoff attempts
	Pitches = selectNodes(pitchSource, "game/atbat/p | game/atbat/po");

	//if there are not more pitches and pickoffs than last time, nothing left to do, return
	if (Pitches.snapshotLength <= LastPitch) { 
		return; 
	} else {
		LastPitch = Pitches.snapshotLength;
	}
	
	//get the number of balls and strikes
	if (selectNodes(pitchSource, "game/@b").snapshotLength > 0) { 
		Balls = selectNodes(pitchSource, ("game")).snapshotItem(0).getAttribute("b");
	} else {
		Balls = "0";
	}
	if (selectNodes(pitchSource, "game/@s").snapshotLength > 0) {
		Strikes = selectNodes(pitchSource, ("game")).snapshotItem(0).getAttribute("s");
	} else {
		Strikes = "0";
	}

	//update the batter's box
	document.getElementById("B").innerHTML = Balls;
	document.getElementById("S").innerHTML = Strikes;		

	//update the pitcher's pitch count
	PitchCounter = selectNodes(pitchSource, "game/players/pitcher").snapshotItem(0);
	if (PitchCounter) {
		if (AtBat.id == "away") { 
			PitchTable = document.getElementById("homePitching");
		} else {
			PitchTable = document.getElementById("awayPitching");
		}
		PitchRow = PitchTable.rows[PitchTable.rows.length-1];
		PitchRow.cells[1].innerHTML = PitchCounter.getAttribute("p_throws") + 'HP';
		PitchRow.cells[2].innerHTML = PitchCounter.getAttribute("era");
		PitchRow.cells[3].innerHTML = PitchCounter.getAttribute("balls");
		PitchRow.cells[4].innerHTML = PitchCounter.getAttribute("strikes");
		PitchRow.cells[5].innerHTML = PitchCounter.getAttribute("pitches");
		if (PitchCounter.getAttribute("note")) {
			PitchRow.cells[13].innerHTML = PitchCounter.getAttribute("note");
		}
	}

	//build the pitch-count call
	theSound = "Count/" + Balls + "-" + Strikes;
	
	//call only the most recent pitch
	Pitch = Pitches.snapshotItem(Pitches.snapshotLength-1);
	if (!Pitch) { return; }

	//Pitch speed and type
	if (Pitch.getAttribute("start_speed")) {
		document.getElementById("PitchSpeed").innerHTML = Pitch.getAttribute("start_speed");
	}
	if (Pitch.getAttribute("pitch_type")) {
		switch(Pitch.getAttribute("pitch_type")) {
		case "CH" :
			pitchtype = " Changeup";
			break;
		case "CU" :
			pitchtype = " Curveball";
			break;
		case "FC" :
			pitchtype = " Cutter";
			break;
		case "FF" :
			pitchtype = " 4-seam fastball";
			break;
		case "FT" :
			pitchtype = " 2-seam fastball";
			break;
		case "KC" :
			pitchtype = " Knuckle Curve";
			break;
		case "KN" :
			pitchtype = " Knuckleball";
			break;
		case "SI" :
			pitchtype = " Sinker";
			break;
		case "SL" :
			pitchtype = " Slider";
			break;
		default :
			pitchtype = " " + Pitch.getAttribute("pitch_type");
		}
	} else {
		pitchtype = Pitch.getAttribute("des");
	}
	
	document.getElementById("PitchSpeed").innerHTML += pitchtype;
	if (Pitch.getAttribute("type")) {
		document.getElementById("PitchSpeed").innerHTML += " (" + Pitch.getAttribute("type") + ")";
	}

	switch (Pitch.getAttribute("des")) {
	case "Automatic Ball" :
		// ignore this -- it's part of the intentional walk
		break;
	case "Ball" :
		//console.log("B");
		if (Balls == 4) {
			theSound = "";	//let the play handle it
		} else {
			X = Pitch.getAttribute("x")
			Y = Pitch.getAttribute("y")
			LR = selectNodes(pitchSource, "//game/players/batter").snapshotItem(0).getAttribute("stand");
			theSound += " Ball " + BallPos(X, Y, LR) + Pitch.getAttribute("pitch_type");
		}
		break;
	case "Ball In Dirt" :
		if (Balls == 4) {
			theSound = "";	//let the play handle it
		} else {
			theSound += " Ball Low Dirt " + Pitch.getAttribute("pitch_type");
		}
		break;
	case "Called Strike" :
		if (Strikes == 3) {
			theSound = ""; //let the play handle it
		} else {
			theSound += " Called " + Pitch.getAttribute("pitch_type");
		}
		break;
	case "Foul" :
	case "Foul (Runner Going)" :
		theSound += " Foul ";
		if (selectNodes(pitchSource, "game/atbat/p").snapshotLength > (parseInt(Balls) + parseInt(Strikes))) {
			theSound += "X ";
		}
		theSound += Pitch.getAttribute("pitch_type");
		break;
	case "Foul Bunt" :
		theSound += " Foul Bunt ";
		if (Strikes == 3) {
			theSound = ""; //let the play handle it
		}
		break;
	case "Foul Tip" :
		if (Strikes == 3) {
			theSound = ""; //let the play handle it
		} else {
			theSound += " Foul Tip " + Pitch.getAttribute("pitch_type");
		}
		break;
	case "Hit By Pitch" :
		//console.log("H"); // I think the play handles this
		break;
	case "Swinging Strike" :
	case "Swinging Strike (Blocked)" :
		if (Strikes == 3) {
			theSound = ""; //let the play handle it
		} else {
			theSound += " Swinging " + Pitch.getAttribute("pitch_type");
		}
		break;
	case "In play, out(s)" :
	case "In play, no out" :
	case "In play, run(s)" :
	case "In play, runs(s)" : //possibly a Spring Training mistake
		theSound = ""; //don't call the count -- there may be a call for in play
		document.getElementById("InPlay").innerHTML = Pitch.getAttribute("des");
		break; 
	case "Pickoff Attempt 1B" :
		theSound = "POA 1B";
		break; 
	case "Pickoff Attempt 2B" :
		theSound = "POA 2B";
		break; 
	case "Pickoff Attempt 3B" :
		theSound = "POA 3B";
		break; 
	default :
		console.log(Pitch.getAttribute("des"));
		oy;
	}
	//console.log(theSound);
	getSound(theSound);
}

function ShowBatter(batterNode) {
	if (LeadOff > "") {
		L = document.getElementById(AtBat.id + "1").cells[AtBat.Column].offsetLeft;
		document.getElementById("BatterDiv").style.left = (L+66) + "px";
		document.getElementById(AtBat.id + AtBat.AB).scrollIntoView();
	}
	if (AtBat.AB == 1) {
		document.getElementById(AtBat.id + "1").scrollIntoView();	//scroll to the top of the team
	}
	batterPic = batterNode.getAttribute("pid");
	if (batterPic == "") { 
		batterPic = selectNodes(PlaysXML[2], "//game/field/offense/man").snapshotItem(0).getAttribute("pid");
	}
	batterName = batterNode.getAttribute("boxname");
	batterAvg = batterNode.getAttribute("avg");
	batterAB = batterNode.getAttribute("ab");
	if (batterAB > 0) {
		batterRec = batterNode.getAttribute("h") + ' for ' + batterAB;
	} else {
		batterRec = "";
	}

	document.getElementById("BatterPic").src = "http://mlb.mlb.com/images/players/mugshot/ph_" + batterPic + ".jpg";
	document.getElementById("BatterName").innerHTML = batterName;
	document.getElementById("BatterAvg").innerHTML = batterAvg;
	document.getElementById("B").innerHTML = "0";
	document.getElementById("S").innerHTML = "0";
	document.getElementById("O").innerHTML = AtBat.Outs;
	document.getElementById("PitchSpeed").innerHTML = "";
	document.getElementById("InPlay").innerHTML = batterRec;
	getSound("Batters/" + batterPic + LeadOff);
	LeadOff = "";
	getSound("Average/" + batterAvg);

/********** DEAL WITH THIS ***********
	Box = document.getElementById(AtBat.id + AtBat.AB).cells[AtBat.Column];
	batterPos = getPos(Box);
	if (batterPos[0] > 0) {	//deal with when there is not a batter -- probably end of game
		//position the picture box first
		document.getElementById("BatterDiv").style.left = batterPos[0] + 64 + "px";
		document.getElementById("BatterDiv").style.top = batterPos[1] + 1 + "px";
		document.getElementById("BatterDiv").style.visibility = "visible";

		//then scroll to the player
		window.scrollTo(1, batterPos[1] - 150);
	} else if (AtBat.Column == document.getElementById(AtBat.id + AtBat.AB).cells.length) {
		//This is actually the end of the game -- the batter column is past the end of the table
	} else { 
		alert("No BatterPos"); // not sure how this could happen
		die;
	}
**********/
}

function BallPos(X, Y, LR) {
//console.log("BallPos:", X, Y, LR);
	Result = "";
	if (Y >= 192) {
		Result += "Low ";
	} else if (Y <= 120) {
		Result += "High Very ";
	} else if (Y <= 152) {
		Result += "High ";
	}

	if (LR == "R") {
		if (X <= 86) {
			Result += "Outside ";
		} else if (X >= 146) {
			Result += "Inside ";
		}
	} else if (LR == "L") {
		if (X <= 86) {
			Result += "Inside ";
		} else if (X >= 146) {
			Result += "Outside ";
		}
	} else {
		oy;
	}
	return Result;
}

// PITCH THOUGHTS:
// 1) PUT PlaysXML[1] (LAST MODIFIED) IN DOCUMENT.GETELEMENTBYID("PITCHTIME")
//		DON'T DO ANYTHING UNLESS PlaysXML[1] > DOCUMENT.GETELEMENTBYID("PITCHTIME") BEFORE PROCESSING
// 2) 
//