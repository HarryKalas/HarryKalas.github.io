//CODE FOR DEBUGGING LOG: document.getElementById("DEBUG").value += "TEXT HERE\n";

//KNOWN ISSUES: 
//Can't handle non-standard text, like:
//	If the plays are split by "and" instead of period
//	If there is a period where there is not supposed to be one (in the middle of a play)
//Don't have a sound for a hit with a pick-off (there was one 3/10)

//Constants
Left = 0;	//array index for Pos property
Top = 1;	//array index for Pos property
AwayIdx = 0;	//array index for away or home team
HomeIdx = 1;	//array index for away or home team
TeamType = new Array;
TeamType[0] = "away";
TeamType[1] = "home";

//Global Variables
TeamInfo = new Object;	//this will hold the A tag for team at-bat, global because I'm tired of passing it
var homeTeam = ""		//loaded in LoadPlayers
var awayTeam = ""		//loaded in LoadPlayers
var Runs = 0; 		//runs in the inning
var Hits = 0; 		//hits in the inning
var Errors = 0; 		//errors in the inning
var LOB = 1; 		// start with 1 for the person at bat; add one for each person at bat and subtract one for each out or run scored
var I123 = true;		// whether it's a 1-2-3 inning; assume it is until someone gets on base
var LeadOff = " Lead";		// whether the next batter is leadoff
GameOver = false; //whether the game is over
var PitchTimer;
var PlayTimer;
var AudioTimer;
LastAction = "";

//Arrays
//all are 2-dimensional, with first index being 0 (away) or 1 (home)
PlayerOrd = new Array;		//player number in batting order (second index is batting order)
	PlayerOrd[0] = new Array;	//multi-dimensional
	PlayerOrd[1] = new Array;	//multi-dimensional
PlayerFull = new Array;		//full name as it appears in the play-by-play (second index is player number)
				//but this will only be people actually playing in the game
				//	and the index will be the batting order
	PlayerFull[0] = new Array;	//multi-dimensional
	PlayerFull[1] = new Array;	//multi-dimensional

AudioQueue = new Array; 		// holds the list of audio files to play at the end of the play

//XSLT stylesheet for scoreboard
style=new ActiveXObject("MSXML2.FreeThreadedDOMDocument");
style.async=false; 
style.validateOnParse="true"; 
style.load("BoxScore.xslt"); 

//NEW XML cross-domain load
function xdLoad(FileName) {
	if (window.XMLHttpRequest) { xhttp=new XMLHttpRequest(); }
	 else { xhttp=new ActiveXObject("Microsoft.XMLHTTP"); }
	xhttp.open("GET",FileName,false);
	xhttp.send();
	if (xhttp.responseXML) {
		result = new XMLSerializer().serializeToString(xhttp.responseXML.documentElement);
		return result;
	}
}

//XML object for the current game; can hold master scoreboard, event log, or box score
source=new ActiveXObject("Microsoft.XMLDOM");
source.async=false;
source.validateOnParse="true";

//XML object for the current game's players
plyrSource=new ActiveXObject("Microsoft.XMLDOM");
plyrSource.async=false;
plyrSource.validateOnParse="true";

//XML object for the game's pitching history
ptchSource=new ActiveXObject("Microsoft.XMLDOM");
ptchSource.async=false;
ptchSource.validateOnParse="true";

gameFolder="http://gd2.mlb.com/components/game/mlb";

function AfterLoad() {
	//build the date URL, which gives the folder of the gameday
	Today = new Date; 
	if (theDate == "") {
		if(Today.getHours() < 12) { Today.setDate(Today.getDate()-1); } 

		theMonth = Today.getMonth() + 1;
		if(theMonth < 10) {theMonth = "0" + theMonth}
		theDate = Today.getDate(); 
		if(theDate < 10) {theDate = "0" + theDate}
		theYear = Today.getFullYear();
	}
	DateURL = "/year_" + theYear + "/month_" + theMonth + "/day_" + theDate;
	GameDate = new Date(theYear-0, theMonth - 1, theDate-0);

	game = LoadGame(DateURL); //true if there is a game on the date; false if there is not

	if (game) {
		LoadPlayers();

		source=new ActiveXObject("Microsoft.XMLDOM");
		source.async=false;
		source.validateOnParse="true";
		source.loadXML(xdLoad(gameFolder + "/../master_scoreboard.xml"));
		LastPitch = 0;

		UpdateIt();
		AudioQueue.length = 0;
//for (tmp = 1; tmp < 10; tmp++) { AudioQueue.shift(); }
		playSound();
		source.loadXML(xdLoad(gameFolder + "/plays.xml"));
		if (source) {
			batterNode = source.selectSingleNode("game/players/batter")
			ShowBatter(batterNode);
		} 
	}
}

function UpdateIt() {
	if (LastPlay == -1) {  //game over; stop updating
		return;
	}
	LastPlay = LoadPlays(LastPlay);
	if (LastPlay == -1) { return; }

	clearTimeout(PitchTimer);
	PitchTimer = setTimeout("LoadPitch()", 1000);
}

function LoadGame(DateURL) {
	//determines whether there is a game for the selected day and builds the folder URL text for Phillies' game that day
	gameFolder="http://gd2.mlb.com/components/game/mlb";
	gameFolder += DateURL;
	source.loadXML(xdLoad(gameFolder + "/master_scoreboard.xml"));
	games = source.selectNodes("//games/game[@home_team_name = '" + myTeam + "' or @away_team_name = '" + myTeam + "']");
	switch (games.length) {
	case 0 : 
		alert("No game today");
		return false;
	case 1 :
		game = games[0];
		break
	default :
		for (Idx = 0; Idx < games.length; Idx++) {
			gameDetail = games[Idx].selectSingleNode("@home_team_name").text;
			gameDetail += " v. " + games[Idx].selectSingleNode("@away_team_name").text;
			gameDetail += " at " + games[Idx].selectSingleNode("@time").text;
			gameDetail += " " + games[Idx].selectSingleNode("@time_zone").text;
			Ans = confirm("Show this game? (click Cancel to pick another)\n" + gameDetail);
			if (Ans) { break; }
		}
		if (Idx == games.length) {
			alert("Those are the only games today.");
			return false;
		} else {
			game = games[Idx];
		}
	}
	gameFolder += "/gid_" + game.selectSingleNode("@gameday").text;

	var Node;
	if (game.selectSingleNode("@home_team_name").text == myTeam) {
		Node = game.selectSingleNode("broadcast/home");
	} else {
		Node = game.selectSingleNode("broadcast/away");
	}

	if (Node) {
		document.getElementById("Broadcast").innerHTML = "<B>Broadcast: </B> " + Node.selectSingleNode("tv").text + "; " + Node.selectSingleNode("radio").text;
	}

	gameStatus = game.selectSingleNode("status/@status").text;
	//Final, In Progress, Warmup, Pre-Game (35 min? 2:20?), Preview (5:20?), 
	switch (gameStatus) {
	case "Preview" :
	case "Pre-Game" :
		//calculate the game start time
		GameTime = game.selectSingleNode("@time").text + " " + game.selectSingleNode("@time_zone").text;
		document.write("<font size='14px'>Game has not yet started<br/>Game Time: " + GameTime + "</font>");   
		document.write("<br/><B>Broadcast: </B> ");
		document.write(Node.selectSingleNode("tv").text + "; " + Node.selectSingleNode("radio").text);

		TimeOffset = GameTime.split(":")[0]*3600000;
		TimeOffset += GameTime.split(":")[1].split(" ")[0] * 60000;
		if (game.selectSingleNode("@ampm").text == "PM") { TimeOffset += 43200000 }
		GameDate = new Date(GameDate.getTime() + TimeOffset);
		//retry 15 minutes before game time
		setTimeout("window.history.back()", GameDate - Today - 900000);
		return;
		break;
	default :
		// there may be other options
	}

	return game;
}


function LoadPlayers() {
	plyrSource.loadXML(xdLoad(gameFolder + "/players.xml"));
	if (plyrSource.parseError.errorCode != 0) {
	  alert("Error loading players");
	  return false;
	} 

	//set up the teams
	TeamInfo = document.getElementById("away");
	awayTeam = plyrSource.selectSingleNode("//game/team[@type='away']/@name").text;
	TeamInfo.innerHTML = awayTeam;
	TeamInfo.Runs = 0;
	TeamInfo.Outs = 0;
	TeamInfo.Inning = 1;
	TeamInfo.Column = 4;
	TeamInfo.AB = 1;
	TeamInfo.Index = 0;

	TeamInfo = document.getElementById("home");
	homeTeam = plyrSource.selectSingleNode("//game/team[@type='home']/@name").text;
	TeamInfo.innerHTML = homeTeam;
	TeamInfo.Runs = 0;
	TeamInfo.Outs = 0;
	TeamInfo.Inning = 1;
	TeamInfo.Column = 4;
	TeamInfo.AB = 1;
	TeamInfo.Index = 1;

	//retrieve players for each team
	for (TeamIdx = 0; TeamIdx <= 1; TeamIdx++) {
		Team = plyrSource.selectSingleNode("//game/team[@type='" + TeamType[TeamIdx] + "']");
		for (Ctr = 1; Ctr <= 9; Ctr++) {
			Row = document.getElementById(TeamType[TeamIdx] + Ctr);
			Player = Team.selectSingleNode("player[@bat_order='" + Ctr + "']");
			Row.cells[1].innerHTML = Player.selectSingleNode("@num").text;
			Row.cells[2].innerHTML = Player.selectSingleNode("@boxname").text;
			Row.cells[3].innerHTML = Player.selectSingleNode("@game_position").text;
			PlayerOrd[TeamIdx][Ctr] = Player.selectSingleNode("@num").text;
			PlayerFull[TeamIdx][Ctr] = BuildName(Player);
		}
		Player = Team.selectSingleNode("player[@game_position='P']/@boxname");
		PitchTable = document.getElementById(TeamType[TeamIdx] + 'Pitching');
		PitchRow = PitchTable.rows[PitchTable.rows.length-1];
		PitchRow.cells[0].innerHTML = Player.text;
		PitchRow.className = "BoxScore";

		//get pitcher's stats in case you are loading during or after the game
		PitchTable = document.getElementById(TeamType[TeamIdx] + "Pitching");
		r = PitchTable.rows.length-1;
		PitchRow = PitchTable.rows[r];
		ptchSource.loadXML(xdLoad(gameFolder + "/boxscore.xml"));
		ptchNodes = ptchSource.selectNodes("boxscore/pitching[@team_flag='" + TeamType[TeamIdx] + "']/pitcher");
		pBalls = ptchNodes[r-1].selectSingleNode("@np").text - ptchNodes[r-1].selectSingleNode("@s").text;
		PitchTable.rows[r].cells[2].innerHTML = ptchNodes[r-1].selectSingleNode("@era").text;
		PitchTable.rows[r].cells[3].innerHTML = pBalls;
		PitchTable.rows[r].cells[4].innerHTML = ptchNodes[r-1].selectSingleNode("@s").text;
		PitchTable.rows[r].cells[5].innerHTML = ptchNodes[r-1].selectSingleNode("@np").text;
	}
	return true;
}

function LoadPlays(StartPlay) {
// 8/23/2015 -- rewrote a lot of this because it didn't make sense!
// StartPlay should be the node index of the next node
//	show plays for that node and higher

Temp = new Date;
document.getElementById("PlayTime").innerHTML = Temp;

 	if (StartPlay < 0) { return; } // this shouldn't happen
	source.loadXML(xdLoad(gameFolder + "/game_events.xml"));
	gamePlays = source.selectNodes("//game/inning/*/*");

	for (pIdx = StartPlay; pIdx < gamePlays.length; pIdx++) {
		ErrorHolder = "";
		LastAction = gamePlays[pIdx].selectSingleNode("@des").text;
		showPlay(gamePlays[pIdx]);
	}

	//update scoreboard
	source.loadXML(xdLoad(gameFolder + "/boxscore.xml"));
	if (source.parseError.errorCode != 0) {
	  alert("Error loading score");
	  return -1;
	} 
	document.getElementById("BoxScore").innerHTML = source.transformNode(style);

	gameStatus = source.selectSingleNode("//boxscore/@status_ind").text;

	awayScore = document.getElementById("away").Runs;
	awayTeam = document.getElementById("away").innerHTML;

	homeScore = document.getElementById("home").Runs;
	homeTeam = document.getElementById("home").innerHTML;

	if (gameStatus == 'F' || gameStatus == 'O') {
		awayScore = document.getElementById("away").Runs;
		awayTeam = document.getElementById("away").innerHTML;
		homeScore = document.getElementById("home").Runs;
		homeTeam = document.getElementById("home").innerHTML;

		if(awayScore > homeScore) {
			theScore = awayScore + "-" + homeScore ;
			getSound("GameOver " + awayTeam + " " + theScore + " " + homeTeam);
			if (awayTeam == "Philadelphia Phillies") { getSound("HighHopes"); }
		} else {
			theScore = awayScore + "-" + homeScore ;
			getSound("GameOver " + homeTeam + " " + theScore + " " + awayTeam);
			if (homeTeam == "Philadelphia Phillies") { getSound("HighHopes"); }
		}
		return -1;
	}

	return gamePlays.length;
}


function showPlay(playText) {

	if (playText.parentNode.nodeName == "top") {
		TeamInfo = document.getElementById("away");
	} else {
		TeamInfo = document.getElementById("home");
	}

	//idenitify the batter's box
	Box = document.getElementById(TeamInfo.id + TeamInfo.AB).cells[TeamInfo.Column]; //get the batter's cell

	if (!Box) {
		//if there is no cell for the batter, assume extra innings
		AddColumn();
		Box = document.getElementById(TeamInfo.id + TeamInfo.AB).cells[TeamInfo.Column];
	}

	if (Box.background != '0b.gif') {
		//if the batter's cell has already been used, bat around
		TeamInfo.Column = TeamInfo.Column + 1;
		AddColumn();
		Box = document.getElementById(TeamInfo.id + TeamInfo.AB).cells[TeamInfo.Column];
		getSound("BA");
	}

	theTeam = "";
	if (TeamInfo.innerHTML.indexOf(myTeam) >= 0) { theTeam = " MYTEAM" } 	// more excitement if a hit is by my team

	//process the overall event basic part
	playEvent = playText.selectSingleNode("@event").text;
	switch(playEvent) {			// set the background picture based on the event
	case "Groundout" :
	case "Lineout" :
	case "Flyout" :
	case "Pop Out" :
	case "Strikeout" :
	case "Grounded Into DP" :
	case "Sac Bunt" :
	case "Strikeout - DP" :
	case "Sac Fly" :
	case "Bunt Groundout" :
	case "Bunt Pop Out" :
		Box.background = "1out.gif";
		if (TeamInfo.innerHTML.indexOf(myTeam) >= 0) { theTeam = "" } 	// more excitement if the out is for the other team
			else { theTeam = " MYTEAM" }
		break;
	case "Field Error" :
		// ***** I think this needs to be handled later
		break;
	case "Single" :
	case "Walk" :
	case "Balk" :
	case "Hit By Pitch" :
	case "Intent Walk" :
	case "Fielders Choice" :
	case "Fielders Choice Out" :
		I123 = false;		// not a 1-2-3 inning any more
		Box.background = "1b.gif";	// batter to 1st
		break;
	case "Forceout" :
		I123 = false;		// not a 1-2-3 inning any more
		Box.background = "1b.gif";	// batter to 1st
		if (TeamInfo.innerHTML.indexOf(myTeam) >= 0) { theTeam = "" } 	// more excitement if the out is for the other team
			else { theTeam = " MYTEAM" }
		break;
	case "Double" :
		I123 = false;		// not a 1-2-3 inning any more
		Box.background = "2b.gif";	// batter to 2nd
		break;
	case "Triple" :
		I123 = false;		// not a 1-2-3 inning any more
		Box.background = "3b.gif";	// batter to 3rd
		break;
	case "Home Run" :
		I123 = false;		// not a 1-2-3 inning any more
		Box.background = "hr.gif";	// home run
		break;
	case "Passed Ball" :
	case "Wild Pitch" :
	case "Stolen Base 2B" :
	case "Stolen Base 3B" :
	case "Picked off stealing 2B" :
	case "Picked off stealing 3B" :
	case "Caught Stealing 2B" :
	case "Caught Stealing 3B" :
	case "Pickoff 1B" :
	case "Pickoff 2B" :
	case "Pickoff 3B" :
	case "Pickoff Error 1B" :
	case "Pickoff Error 2B" :
	case "Pickoff Error 3B" :
	case "Defensive Indiff" :
	case "Runner Out" : 
	case "Double Play" :
	case "Fan interference" :
	case "Manager Review" :
		// will be handled later
		break;
	case "Game Advisory" : 
	case "Offensive Sub" : 
	case "Defensive Sub" : 
	case "Defensive Switch" : 
	case "Pitcher Switch" : 
	case "Pitching Substitution" : 
	case "Player Injured" :
		//nothing to handle
		break;
	default :
		alert(playEvent + "\n" + playText.xml);
	}


	playDes = playText.selectSingleNode("@des").text;
	playDes = playDes.replace(" and ", ". ");
	if (playDes.split(". ").length > 1) {
		playDes = playDes.replace(/[A-Z]\./g, ""); //I think this is supposed to get rid of periods in names, but may be getting too much
		playDes = playDes.replace(/\.( *,* *[a-z])/g, "$1"); //also apparently getting rid of spurious periods
	}

	Plays=playDes.split(". ");  //break up multiple actions in the same play
	if (Plays.length == 1 && playDes.indexOf("strikes out") >= 0) {
		Plays=playDes.split(" and "); //I don't think this is necessary any more -- "and" is addressed above
	}

	//PROCESS THE INITIAL PLAY
	thePlay = ""; // "thePlay" will be the text inside the batter's box
	if (Plays[0].indexOf("called out on strikes") >=0) {
		thePlay = "K..";
		theOut(Box, thePlay);
	} else if (Plays[0].indexOf("strikes out") >=0 ) {
		if ((playDes.indexOf("Passed ball") >= 0) && (playDes.indexOf("to 1st") >= 0)) { 
			Box.background = "1b.gif";
			thePlay = "K, PB";
			getSound(thePlay);
		} else if ((playDes.indexOf("Wild pitch") >= 0) && (playDes.indexOf("to 1st") >= 0)) { 
			Box.background = "1b.gif";
			thePlay = "K, WP";
			getSound(thePlay);
		} else if (playDes.indexOf("foul") >=0) {
			thePlay = "K";
			theOut(Box, "K Foul Tip");
		} else {
			thePlay = "K";
			theOut(Box, thePlay);
		}
	} else if (Plays[0].indexOf("grounds out") >=0) {
		thePlay = Fielding(Plays[0]);
		theOut(Box, thePlay);
	} else if (Plays[0].indexOf("lines out") >=0) {
		thePlay = "L" + playerNumber(Plays[0]);
		theOut(Box, thePlay);
	} else if (Plays[0].indexOf("flies out") >=0 ) {
		thePlay = "F" + playerNumber(Plays[0]);
		theOut(Box, thePlay);
	} else if (Plays[0].indexOf("pops out") >= 0) {
		thePlay = "P" + playerNumber(Plays[0]);
		theOut(Box, thePlay);
	} else if (Plays[0].indexOf("out on a sacrifice bunt") >=0) {
		thePlay = "SAC B " + Fielding(Plays[0]);
		theOut(Box, thePlay);
	} else if (Plays[0].indexOf("out on a sacrifice fly") >=0) {
		thePlay = "SF " + playerNumber(Plays[0]);
		theOut(Box, thePlay);
	} else if (Plays[0].indexOf("unassisted double play") >=0) {
		thePlay = "DP " + Fielding(Plays[0]);
		//handle the second out here
		for (Ptr = 1; Ptr < Plays.length; Ptr++) {
			if (Plays[Ptr].indexOf(" out ") > -1) {
				SecondaryPlay(Plays[Ptr], "DP ");
				Plays[Ptr] = "";
			}
		}
		if (playDes.indexOf(" to 1st") >=0) {	//batter makes it to first and the outs are at 2nd and 3rd
			Box.background = "1b.gif";
		} else {
			Box.background = "1out.gif";
			theOut(Box, thePlay);
		}
	} else if (Plays[0].indexOf("grounds into a double play") >=0) {
		thePlay = "GIDP " + Fielding(Plays[0]);
		//handle the second out here
		for (Ptr = 1; Ptr < Plays.length; Ptr++) {
			if (Plays[Ptr].indexOf(" out ") > -1) {
				SecondaryPlay(Plays[Ptr], "DP ");
				Plays[Ptr] = "";
			}
		}
		theOut(Box, thePlay);
	} else if (Plays[0].indexOf("double play") >=0) {
alert(["DP", playDes]);
		if (playDes.indexOf("to 1st") >=0) {
			alert("Weird DP: " + playDes);
			Box.background = "1b.gif";
		} else {
			Box.background = "1out.gif";
			theOut(Box);
		}
		thePlay = "DP " + Fielding(Plays[0]);
		getSound(thePlay);
	} else if (Plays[0].indexOf("grounds into a force out") >=0) {
//alert(["GFC", playDes]);
		thePlay = "FC " + Fielding(Plays[0]);
		getSound(thePlay);
	} else if (Plays[0].indexOf("lines into a force out") >=0) {
//alert(["LFC", playDes]);
		thePlay = "FC " + Fielding(Plays[0]);
		getSound(thePlay);
	} else if (Plays[0].indexOf("flies into a force out") >=0) {
//alert(["FFC", playDes]);
		thePlay = "FC " + Fielding(Plays[0]);
		getSound(thePlay);
	} else if (Plays[0].indexOf("reaches on a fielder's choice") >=0) {
//alert(["FC", playDes]);
		Sequence = Plays[0].split(" to ");
		thePlay = "FC " + playerNumber(Sequence[0]);
		if (Sequence.length == 1) {
			thePlay += "U";
		}
		for (Idx = 1; Idx < Sequence.length; Idx++) {
			thePlay += "-" + playerNumber(Sequence[Idx]);
		}
		getSound(thePlay);
	} else if (Plays[0].indexOf("ground bunts into a force out") >=0) {
//alert(["BFC", playDes]);
		Sequence = Plays[0].split(" to ");
		thePlay = "FC " + playerNumber(Sequence[0]);
		if (Sequence.length == 1) {
			thePlay += "U";
		}
		for (Idx = 1; Idx < Sequence.length; Idx++) {
			thePlay += "-" + playerNumber(Sequence[Idx]);
		}
		getSound(thePlay);
	} else if (Plays[0].indexOf("singles") >= 0) {
		Hits += 1; //**
		thePlay = "1B";
		getSound(thePlay + " " + HitDetail(Plays[0]));
	} else if (Plays[0].indexOf("hits a sacrifice bunt") >= 0) {
		Hits += 1; //** he gets to first if it says "hits"
		thePlay = "Sac B";
		Box.background = "1b.gif";	// batter to 1st
		getSound("SAC_B");
	} else if (Plays[0].indexOf("hits a sacrifice fly") >= 0) {
		Hits += 1; //**
		thePlay = "SF";
		getSound(thePlay);
	} else if (Plays[0].indexOf("intentionally walks") >= 0) {
		thePlay = "IBB";
		getSound(thePlay);
	} else if (Plays[0].indexOf("walks") >= 0) {
		thePlay = "BB";
		getSound(thePlay);
	} else if (Plays[0].indexOf("hit by pitch") >= 0) {
		thePlay = "HBP";
	} else if (Plays[0].indexOf("reaches on catcher interference") >= 0) {
		Errors += 1;
		thePlay = "E2 I";
		getSound(thePlay);
	} else if (Plays[0].indexOf("error") >= 0) {
		Errors += 1; //**
		if (Plays[0].indexOf("pickoff attempt") >= 0) {
			Parts = Plays[0].split(", ");
			if (Parts.length > 1) {
				// 8/17/2013, there was an error in the bottom of 2nd that didn't have a second part
				SecondaryPlay(Parts[2], "E ");
			}
			thePlay = "&nbsp;";
		} else if (Plays[0].indexOf(" reaches ") == -1) {
			//do nothing if nobody reaches? not sure if that's right
		} else {
			Box.background = "1b.gif";
			thePlay = "E" + playerNumber(Plays[0]);
			getSound(thePlay);
		}
	} else if (Plays[0].indexOf("doubles") >= 0) {
		Hits += 1; //**
		thePlay = "2B";
		getSound(thePlay + " " + HitDetail(Plays[0]));
	} else if (Plays[0].indexOf("ground-rule double") >= 0) {
		Hits += 1; //**
		thePlay = "GRD";
		Box.background = "2b.gif";
		getSound(thePlay);
	} else if (Plays[0].indexOf("triples") >= 0) {
		Hits += 1; //**
		thePlay = "3B";
		getSound(thePlay + " " + HitDetail(Plays[0]));
	} else if (Plays[0].indexOf("homers") >=0) {
		thePlay = "&nbsp;";
		getSound("HR " + HitDetail(Plays[0]));
		if (TeamInfo.innerHTML == 'Philadelphia Phillies')  { getSound("Bell"); }
		TeamInfo.Runs += 1;
		Runs += 1;
		Hits += 1;
		LOB -= 1;
	} else if (Plays[0].indexOf("inside-the-park home run") >=0) {
		thePlay = "&nbsp;";
		//getSound(??? I'll never get a Harry call for this one!);
		TeamInfo.Runs += 1;
		Runs += 1;
		Hits += 1;
		LOB -= 1;
	} else if (Plays[0].indexOf("hits a grand slam") >=0) {
		thePlay = "&nbsp;";
		getSound("HR " + HitDetail(Plays[0]));
		TeamInfo.Runs += 1;
		Runs += 1;
		Hits += 1; //**
		LOB -= 1; //**
	} else if (Plays[0].indexOf("wild pitch") >=0 ) {
		Parts = Plays[0].split("wild pitch");
		SecondaryPlay(Parts[1], "WP "); //
		getSound("WP");
		thePlay = "&nbsp;";
	} else if (Plays[0].indexOf("Wild pitch") >=0 ) {
		//I don't think there's anything to do here
	} else if (Plays[0].indexOf("passed ball") >=0 ) {
		Parts = Plays[0].split("passed ball");
		SecondaryPlay(Parts[1], "PB ");
		thePlay = "&nbsp;";
	} else if (Plays[0].indexOf("balk") >=0 ) {
		Parts = Plays[0].split(", ");
		SecondaryPlay(Parts[1], "BK ");
		thePlay = "&nbsp;";
	} else if (Plays[0].indexOf("steals") >= 0) {
		Parts = Plays[0].split(", ");
		SecondaryPlay(Parts[1], "SB ");
		thePlay = "&nbsp;";
	} else if (Plays[0].indexOf	("defensive indifference") >= 0) {
		Parts = Plays[0].split(", ");
		SecondaryPlay(Parts[1], "DI ");
		thePlay = "&nbsp;";
	} else if (Plays[0].indexOf(" caught stealing ") >= 0) {
//alert("Caught 1")
		if (playText.nodeName == 'action') {	//only do the caught stealing on the action, not on the at-bat which is duplicative
			Parts = Plays[0].split(", ");
			getSound("CS");
			SecondaryPlay(Parts[1], "CS ");
			thePlay = "&nbsp;";
		}
	} else if (Plays[0].indexOf("picked off") >= 0) {
alert("picked off");
		Parts = Plays[0].split(", ");
		SecondaryPlay(Parts[1], "PO ");
		thePlay = "&nbsp;";
	} else if (Plays[0].indexOf(" picks off ") >= 0) {
		if (playText.nodeName == 'action') {	//only do the pickoff on the action, not on the at-bat which is duplicative
			Parts = Plays[0].split(", ");
			SecondaryPlay(Parts[1], "PO ");
			thePlay = "&nbsp;";
		}
	} else if (Plays[0].indexOf(" out at ") >= 0) {
		TeamInfo.AB = TeamInfo.AB - 1;
		if (TeamInfo.AB == 0) { TeamInfo.AB = 9; }
		SecondaryPlay(Plays[0], "");
		thePlay = "&nbsp;";
	} else if (Plays[0].indexOf("Offensive Substitution: ") >= 0) {
		Substitution(Plays[0]);
	} else if (Plays[0].indexOf("Defensive Substitution: ") >= 0) {
		Substitution(Plays[0]);
	} else if (Plays[0].indexOf("Defensive switch ") >= 0) {
		Substitution(Plays[0]);
	} else if (Plays[0].indexOf("Pitcher Change") >= 0 || Plays[0].indexOf("Pitching Change") >= 0 ) {
		if (TeamInfo.id == "away") {
			FieldingTeam = document.getElementById("home").innerHTML;
		} else {
			FieldingTeam = document.getElementById("away").innerHTML;
		}
		getSound("PC " + FieldingTeam);
		Substitution(Plays[0]);
	} else if (Plays[0].indexOf(" turns around ") >= 0) {
alert(Plays[0]);
	} else if (Plays[0].indexOf("remains in the game") >= 0) {
		//fix the postion of the person who remains in the game
		Substitution(Plays[0]);
	} else if (Plays[0].indexOf("left the game") >= 0) {
		document.getElementById("MessageDiv").innerHTML = Plays[0] + '<br/>';
		document.getElementById("MessageDiv").visibility = "visible";
		MessageTimer = setTimeout("clearMessage('" + Plays[0] + "<br>')", 5000);
	} else if (Plays[0].indexOf("ejected") >= 0) {
alert(Plays[0]);
	} else if (Plays[0].indexOf("Dropped foul pop") >=0 ) {
		//do nothing
alert(Plays[0]);
	} else if (Plays[0].indexOf("challenged") >= 0) {
		//instant replay that may change the call -- does not change anything
		//example: Rangers challenged (tag play), call on the field was overturned: Pickoff attempt at 2nd. 
alert(Plays[0]);
	} else if (Plays[0].indexOf('Coaching visit' >= 0)) {
		getSound("Coach");
	} else {
		Continue = confirm("Undocumented PRIMARY play: " + Plays[0] + "\n\nContinue?");
		if (!Continue) { END; }	//"END" is not valid javascript, but it throws an error that stops the code
	}
	Box.innerHTML = thePlay + Box.innerHTML;
	Box.className = "PlayBox";

	//ADDITIONAL PLAYS
	for (Ptr = 1; Ptr < Plays.length; Ptr++) {
		if (Plays[Ptr] > "") {
			SecondaryPlay(Plays[Ptr], "");
		}
	}

	RunsScored = playDes.split("scores").length - 1;
	if (RunsScored == 0) {
		if (playDes.indexOf("homers") >= 0) { getSound("Runs/R1 HR"); }
	} else if (RunsScored == 1) {
		if (playDes.indexOf("homers") >= 0) { getSound("Runs/R2 HR"); 
		} else if (playDes.indexOf("walks") >= 0) { getSound("Runs/R1 BB"); 
		} else if (playDes.indexOf("doubles") >= 0) { getSound("Runs/R1 2B"); 
		} else if (playDes.indexOf("triples") >= 0) { getSound("Runs/R1 3B"); 
		} else { getSound("Runs/R1"); }
	} else if (RunsScored == 2) {
		if (playDes.indexOf("homers") >= 0) { getSound("Runs/R3 HR"); 
		} else if (playDes.indexOf("doubles") >= 0) { getSound("Runs/R2 2B"); 
		} else if (playDes.indexOf("triples") >= 0) { getSound("Runs/R2 3B"); 
		} else { getSound("Runs/R2"); }
	} else if (RunsScored == 3) {
		if (playDes.indexOf("homers") >= 0) { getSound("Runs/R4"); 
		} else if (playDes.indexOf("doubles") >= 0) { getSound("Runs/R3 2B"); 
		} else if (playDes.indexOf("triples") >= 0) { getSound("Runs/R3 3B"); 
		} else { getSound("Runs/R3"); }
	}

	
	nextBatter(Plays[0]);
}

function SecondaryPlay(Play, Prefix) {
	//DEAL WITH THINGS LIKE BALK, WP, ETC, THAT DON'T HAVE A PREFIX ON ADDITIONAL PLAYS
	//THEY HAVE A PREFIX IF IT'S THE FIRST PLAY, BUT ADDITIONAL PLAYS DON'T
	//MULTIPLE PLAYERS ADVANCING ON STEAL, WP, BALK

	SecondBox = findBox(Play);
	if (!SecondBox) { 
		if ((Plays[Ptr].indexOf(" error") >= 0)) {
			ErrorHolder = "E ";
		} else if ((Plays[Ptr].indexOf("Wild pitch") >= 0)) {
			ErrorHolder = "WP ";
		} else {
			ans = confirm("Second Box Not Found" + Play); 
			if (!ans) { die; }
			alert(TeamInfo.Index);
			for (Idx = 1; Idx <=9; Idx++) {  
				alert(PlayerFull[TeamInfo.Index][Idx]);
			}
		}
		return; 
	}
	if (ErrorHolder >"") { Prefix = ErrorHolder + Prefix; }
	newDiv = document.createElement('div');
	newDiv.innerHTML = Prefix + PlayerOrd[TeamInfo.Index][TeamInfo.AB];
	SecondBox.appendChild(newDiv);

	if (Play.indexOf("scores") >= 0) {
		SecondBox.background = "home.gif";
		newDiv.className = "Home";
		TeamInfo.Runs += 1;
		Runs += 1;
		LOB -= 1; //**
	} else if (Play.indexOf("out at 1st") >= 0) {
		SecondBox.background = "1out.gif";
		newDiv.className = "B1"
		theOut(SecondBox); //not sure about this
	} else if (Play.indexOf("doubled off 1st") >= 0) {
		SecondBox.background = "2out.gif";
		newDiv.className = "B2"
		theOut(SecondBox);
	} else if (Play.indexOf("picks off") >= 0 || Play.indexOf("picked off") >= 0) {
		Play2 = "";
		if (Play.indexOf("1st") >= 0)  {
			Play2= "PO 1B";
			SecondBox.background = "2out.gif";
			newDiv.className = "B2"
		} else if (Play.indexOf("2nd") >= 0)  {
			Play2 = "PO 2B";
			SecondBox.background = "3out.gif";
			newDiv.className = "B3"
		} else if (Play.indexOf("3rd") >= 0)  {
			Play2 = "PO 3B";
			SecondBox.background = "hout.gif";
			newDiv.className = "Home"
		}
		theOut(SecondBox, Play2);
	} else if (Play.indexOf(" 1st") >= 0) {
		//delete it, because this is duplicative of the play
		SecondBox.removeChild(newDiv);
	} else if (Play.indexOf("batter interference") >= 0) {
		//hide it, because this is duplicative of the play
		newDiv.innerHTML = "BI";
		newDiv.className = "B1";
		newDiv.style.top = "38";
		getSound("BI");
	} else if (Play.indexOf("out at 2nd") >= 0) {
		SecondBox.background = "2out.gif";
		newDiv.className = "B2"
		theOut(SecondBox);
	} else if (Play.indexOf("doubled off 2nd") >= 0) {
		SecondBox.background = "3out.gif";
		newDiv.className = "B3"
		theOut(SecondBox);
	} else if (Play.indexOf("caught stealing 2nd") >= 0) {
//alert("caught 2");
		SecondBox.background = "2out.gif";
		newDiv.className = "B2"
		theOut(SecondBox);
	} else if (Play.indexOf(" 2nd") >= 0) {
		SecondBox.background = "2b.gif";
		newDiv.className = "B2"
	} else if (Play.indexOf("out at 3rd") >= 0) {
		SecondBox.background = "3out.gif";
		newDiv.className = "B3"
		theOut(SecondBox);
	} else if (Play.indexOf("caught stealing 3rd") >= 0) {
//alert("caught 3");
		SecondBox.background = "3out.gif";
		newDiv.className = "B3"
		theOut(SecondBox);
	} else if (Play.indexOf(" 3rd") >= 0) {
		SecondBox.background = "3b.gif";
		newDiv.className = "B3"
	} else if (Play.indexOf("out at home") >= 0) {
		SecondBox.background = "hout.gif";
		newDiv.className = "Home"
		theOut(SecondBox, "HomeOut");
	} else if (Play.indexOf("caught stealing home") >= 0) {
alert("caught h");
		SecondBox.background = "hout.gif";
		newDiv.className = "Home"
		theOut(SecondBox);
	} else if (Play.indexOf("Wild pitch")) {
		//do nothing
	} else {
		alert("Undocumented SECONDARY Play: " + Play);
	}
	if (Play.indexOf("error") >= 0) {
		Errors += 1; //**
		newDiv.innerHTML = newDiv.innerHTML +" E-" + playerNumber(Play);
	}
	if (Play.indexOf("steals") >= 0) {
		getSound("SB");
	}
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

function nextBatter(Text) {
	if (Text.indexOf("Pitcher Change: ") >= 0 || Text.indexOf("Pitching Change: ") >= 0) { //no advance
	} else if (Text.indexOf("Coaching visit") >= 0) { //no advance
	} else if (Text.indexOf("Injury Delay") >= 0) { //no advance
	} else if (Text.indexOf("Offensive Substitution: ") >= 0) { //no advance
	} else if (Text.indexOf("Defensive Substitution: ") >= 0) { //no advance
	} else if (Text.indexOf("Defensive switch") >= 0) { //no advance
	} else if (Text.indexOf("On-field Delay") >= 0) { //no advance
	} else if (Text.indexOf(" caught stealing ") >= 0) { //no advance
	} else if (Text.indexOf(" picks off ") >= 0) { //no advance
	} else if (Text.indexOf(" pickoff attempt") >= 0) { //no advance
	} else if (Text.indexOf(" steals ") >= 0) { //no advance
	} else if (Text.indexOf("defensive indifference") >= 0) { //no advance
	} else if (Text.indexOf(" wild pitch ") >= 0) { //no advance
	} else if (Text.indexOf("passed ball") >= 0) { //no advance
	} else if (Text.indexOf("balk") >= 0) { //no advance
	} else if (Text.indexOf(" remains in the game ") >= 0) { //no advance
	} else if (Text.indexOf("left the game") >= 0) { //no advance
	} else if (Text.indexOf("turns around") >= 0) { //no advance
	} else if (Text.indexOf("ejected") >= 0) { //no advance
	} else if (Text.indexOf("foul pop error") >= 0) { //no advance
	} else {
		TeamInfo.AB = TeamInfo.AB + 1;
		if (TeamInfo.AB == 10) { TeamInfo.AB = 1; }
		LOB += 1; //**
	}
}

function Fielding(playText) {
	Sequence = playText.split(" to ");
	thePlay = playerNumber(Sequence[0]);
	if (thePlay == "") {
		thePlay = playerNumber(Sequence[1]) + "U";
		return thePlay;
	}
	if (Sequence.length == 1) {
		thePlay += "U";
	} else {
		for (Idx = 1; Idx < Sequence.length; Idx++) {
			thePlay += "-" + playerNumber(Sequence[Idx]);
		}
	}
	return thePlay;
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
	} else {
		//this shouldn't matter
		alert("Unknown hit type: " + playText);
	}
	Result += playerNumber(playText);
	return Result;
}

function findBox(playText) {
	for (Idx = 1; Idx <=9; Idx++) {  //check each batter to see if they are the runner
		if (playText.indexOf(PlayerFull[TeamInfo.Index][Idx]) > -1) {
			foundBox = document.getElementById(TeamInfo.id + Idx).cells[TeamInfo.Column];
			if (foundBox.background == "0b.gif" && Idx != TeamInfo.AB) { //if the current column hasn't been played for the matched batter and it isn't the current batter...
				foundBox = document.getElementById(TeamInfo.id + Idx).cells[TeamInfo.Column - 1]; //go to the previous column: it means we've batted around
			}
			return foundBox;
		}
	}
}

function theOut(Box, thePlay) {
	LOB--;					// if someone is out, then there is one less left on base
	outDiv = document.createElement('div');		// create a new DIV for the out
	Box.appendChild(outDiv);			// put it on the current batter's box
	outDiv.className = "Out";			// set the DIV's characteristics

	document.getElementById("B").innerHTML = "0";	// reset balls
	document.getElementById("S").innerHTML = "0";	// reset strikes

	TeamCall = "";				// normally the team name will not be included in the out call
	switch (TeamInfo.Outs) {
	case 0:
		outDiv.innerHTML = "&#x81;";				// put a circled 1 in the out div
		TeamInfo.Outs = 1;					// set the team outs to 1
		document.getElementById("O").innerHTML = "1";		// display the number of outs as 1
		break;
	case 1:
		outDiv.innerHTML = "&#x82;";				// put a circled 2 in the out div
		TeamInfo.Outs = 2;					// set the team outs to 2
		document.getElementById("O").innerHTML = "2";		// display the number of outs as 2
		break;
	case 2:
		outDiv.innerHTML = "&#x83;";				// put a circled 3 in the out div
		TeamInfo.Outs = 3;					// set the team outs to 3
		document.getElementById("O").innerHTML = "3";		// display the number of outs as 3
		TeamCall = " " + TeamInfo.innerHTML;			// 3rd out call includes the team name
		break;
	default:
		alert("Don't know the outs " + TeamInfo.Outs);		// error
		return;
	}

	getSound(thePlay + " O" + TeamInfo.Outs+ theTeam);			// get the call for the play with outs if possible

	if(AudioQueue.length==0 || AudioQueue[AudioQueue.length-1].indexOf('O' + TeamInfo.Outs) == -1) { 	// if the outs haven't been called ...
		getSound("Out" + TeamInfo.Outs +TeamCall + " I" + TeamInfo.Inning);	// get the out call for the inning
document.all.Debug.innerHTML = "Queue: " + AudioQueue.length;
	}

	if (TeamInfo.Outs < 3) { return; }	// if the inning is not over, we're finished
	
	RHE = "";
	if (I123) {		// if it's a 1-2-3 inning, call that
		RHE = "RHE/I123" + " I" + TeamInfo.Inning + " " + TeamInfo.innerHTML;
	} else {		// otherwise call the runs, hits and errors
		RHE = "RHE/" + Runs + Hits + Errors + LOB + " I" + TeamInfo.Inning + " " + TeamInfo.innerHTML;
	}

	getSound(RHE);

	awayScore = document.getElementById("away").Runs;
	homeScore = document.getElementById("home").Runs;
	PhilsHome = (document.getElementById("home").innerHTML == "Philadelphia Phillies");

	GameOver = IsGameOver(TeamInfo.Inning, 3);

// ***** RETHINK THIS END-OF-INNING AUDIO

	Score = "";
	if (GameOver) { // announce winner
		if(awayScore > homeScore) {
			getSound("GameOver " + awayTeam + " " + awayScore + "-" + homeScore + " " + homeTeam);
		} else {
			getSound("GameOver " + homeTeam + " " + homeScore + "-" + awayScore + " " + awayTeam);
		}
	} else { // announce next inning
		if (homeScore > awayScore) {
			Score = homeScore + "-" + awayScore;
			ScoreTeam = Score  + " " + homeTeam + " " + awayTeam
			ScoreTeam2 = Score  + " Other Team " + awayTeam
		} else if (homeScore == awayScore) {
			Score = awayScore + "-" + homeScore;
			ScoreTeam =  Score + " " + awayTeam + " " + homeTeam;
			ScoreTeam2 = "";
		} else {
			Score = awayScore + "-" + homeScore;
			ScoreTeam =  Score + " " + awayTeam + " " + homeTeam;
			ScoreTeam2 =  Score + " Other Team " + homeTeam;
		}
		getSound("Inning/" + TeamInfo.Inning + TeamInfo.id + " E " + ScoreTeam);
		if(AudioQueue.length==0 || AudioQueue[AudioQueue.length-1].indexOf('-') == -1) { 
			getSound("Score/" + ScoreTeam) 
document.all.Debug.innerHTML = "Queue: " + AudioQueue.length;
		};
		if(AudioQueue.length==0 || AudioQueue[AudioQueue.length-1].indexOf('-') == -1) { 
			getSound("Score/" + ScoreTeam2) 
document.all.Debug.innerHTML = "Queue: " + AudioQueue.length;
		};
	}
	if (GameOver) {
		if(awayScore > homeScore) {
			if (awayTeam == "Philadelphia Phillies") { getSound("HighHopes"); }
		} else {
			if (homeTeam == "Philadelphia Phillies") { getSound("HighHopes"); }
		}
	}

	if (TeamInfo.Inning + TeamInfo.id == '7away') {
		getSound("Stretch");
	}
	spnsr = Math.floor(Math.random() * Commercials.length);
	AudioQueue.push('../Commercials/' + Commercials[spnsr]);
document.all.Debug.innerHTML = "Queue: " + AudioQueue.length;
	TeamInfo.Inning++;
	TeamInfo.Column++;
	TeamInfo.Outs = 0;

	Runs = 0;
	Hits = 0;
	Errors = 0;
	LOB = 0;
	I123 = true;		// assume 1-2-3 inning until someone gets on base
	LeadOff = " Lead";	// next batter is the leadoff batter
	
}

function getPos(obj) {
	var curleft = curtop = 0;

	if (obj) {} else { return [curleft,curtop]; }	

	if (obj.offsetParent) {
		do {
			curleft += obj.offsetLeft;
			curtop += obj.offsetTop;
		} while (obj = obj.offsetParent);

		return [curleft,curtop];
	}
}

function AddColumn() {
	document.getElementById(TeamInfo.id + "Table").width = parseFloat(document.getElementById(TeamInfo.id +"Table").width) + 60;

	newCell = document.getElementById(TeamInfo.id + "Header").insertCell(TeamInfo.Column);
	newCell.style.textAlign = "center";
	newCell.innerHTML = "<B>" + TeamInfo.Inning + "</B>";

	for (Idx = 1; Idx <= 9; Idx++) {
		Row = document.getElementById(TeamInfo.id + Idx);
		newCell = Row.insertCell(TeamInfo.Column);
		newCell.rowSpan = 3;
		newCell.style.position = "relative";
		newCell.background="0b.gif"
		newCell.width=60;
		newCell.height=60;
		newCell.innerHTML = "&nbsp;";
	}

	newCell = document.getElementById(TeamInfo.id + "Footer").insertCell(TeamInfo.Column);
	newCell.style.textAlign = "center";
	newCell.innerHTML = "<B>" + TeamInfo.Inning + "</B>";

	newCell = document.getElementById(TeamInfo.id + "SpaceIt").insertCell(TeamInfo.Column);
	newCell.innerHTML = '<IMG SRC="spacer.gif" width=60 height=1><BR>';

}

function Substitution(Text) {
	//pattern of the text:
	//Defensive substitution:
	//  NAME1 replaces POSITION1 NAME2, batting ORDER, playing POSITION2
	//Offensive substitution:
	//  Pinch hitter NAME1 replaces NAME2
	//Pitcher Change:
	//  NAME1 replaces NAME2, batting ORDER

	Players = Text.split("replaces");			//split on the word "replaces"

	//identify entering player
	switch (true) {
	case (Text.indexOf("Pitching Change: ") > -1) :			//if it's a pitching change
	case (Text.indexOf("Pitcher Change: ") > -1) :			//if it's a pitching change
		TeamIdx = (TeamInfo.Index + 1) % 2;			//use the team that is NOT at bat
		//add a row to the Pitching div
		newRow = document.getElementById(TeamType[TeamIdx] + "Pitching").insertRow(); //insert a row before the next batting order position or footer
		newRow.className = "BoxScore";
		firstcell = newRow.insertCell();
		newRow.insertCell();
		newRow.insertCell();
		newRow.insertCell();
		newRow.insertCell();
		newRow.insertCell();

		//get pitcher's stats in case you are loading during or after the game
		PitchTable = document.getElementById(TeamType[TeamIdx] + "Pitching");
		r = PitchTable.rows.length-1;
		PitchRow = PitchTable.rows[r];
		ptchSource.loadXML(xdLoad(gameFolder + "/boxscore.xml"));
		ptchNodes = ptchSource.selectNodes("boxscore/pitching[@team_flag='" + TeamType[TeamIdx] + "']/pitcher");
		pBalls = ptchNodes[r-1].selectSingleNode("@np").text - ptchNodes[r-1].selectSingleNode("@s").text;
		PitchTable.rows[r].cells[2].innerHTML = ptchNodes[r-1].selectSingleNode("@era").text;
		PitchTable.rows[r].cells[3].innerHTML = pBalls;
		PitchTable.rows[r].cells[4].innerHTML = ptchNodes[r-1].selectSingleNode("@s").text;
		PitchTable.rows[r].cells[5].innerHTML = ptchNodes[r-1].selectSingleNode("@np").text;

		Pitcher = Players[0].replace("Pitching Change:", "");
		Pitcher = Pitcher.replace("Pitcher Change:", "");
		InningText = TeamInfo.Inning + "." + TeamInfo.Outs;
		firstcell.innerHTML = Pitcher + " (" + InningText + ")";
		firstcell.style.textAlign = "left";
		break;
	case (Text.indexOf("Defensive Substitution: ") > -1) :		//if it's a defensive substitution
	case (Text.indexOf("Defensive switch") > -1) :			//it's a change of position
		TeamIdx = (TeamInfo.Index + 1) % 2;			//use the team that is NOT at bat
		break;
	case (Text.indexOf("Offensive Substitution: ") > -1) :		//if it's an offensive substitution
		TeamIdx = TeamInfo.Index;				//use the team that IS at bat
		break;
	case (Text.indexOf("remains ") > -1) :				//if a player remains in the game
		TeamIdx = (TeamInfo.Index + 1) % 2;			//use the team that is NOT at bat
		break;
	default: 
		alert("Substitution Type Not Handled: " + Text);
		alert(TeamInfo.id);
	}

	found = 0;
	Team = plyrSource.selectSingleNode("//game/team[@type='" + TeamType[TeamIdx] + "']");

	if (!Team.childNodes) { alert("No team "+ Text) ;}

	//find incoming player
	for (PlyrCtr=0; PlyrCtr < Team.childNodes.length; PlyrCtr++) {
		Last = Team.childNodes[PlyrCtr].selectSingleNode("@last").text.replace(/\./g, "");
		if (Players[0].indexOf(Last) > -1) {
			First = Team.childNodes[PlyrCtr].selectSingleNode("@first").text.replace(/[A-Z]\./g, "");
			if (First == "") {
				//this may cause problems if a player with initials for a first name
				//	has the same last name as another player on the same team
				//	but I don't see any way around that yet
				found = true;
				break;
			} else if (Players[0].indexOf(First) > -1) {
				found = true;
				break;
			}
		}
	}

        if (PlyrCtr == Team.childNodes.length) { alert("Player not found: " + Players[0]); }

	Ord = 0;
	//determine the batting position
	if (Players[0].indexOf("Pinch hitter") > 0 || Players[0].indexOf("Pinch-hitter") > 0) {
		Ord = TeamInfo.AB;
		getSound("PH");
	} else if (Players[0].indexOf("Pinch runner") > 0 || Players[0].indexOf("Pinch-runner") > 0) {
		//identify replaced runner
		for (Plyr2 = 1; Plyr2 <= 9; Plyr2++) {
			if (Players[1].indexOf(PlayerFull[TeamIdx][Plyr2]) > 0) {
				Ord = Plyr2;
				break;
			}
		}
	} else if (Players[0].indexOf("remains ") > -1) {
		// player was already in the game
		Players = Text.split(" remains ")
		Players[0] = Players[0].trim();
		Ord = 1;
		while ((PlayerFull[TeamIdx][Ord] != Players[0]) && (Ord < 10) ) { // identify player
			Ord++;
		}
	} else if (Players[0].indexOf("Defensive switch") > -1) {
		// player was already in the game
		Players = Text.split(" to ")
		Ord = 1;
		while ((Text.indexOf(PlayerFull[TeamIdx][Ord]) == -1) && (Ord < 10) ) { // identify player		
			Ord++;
		}
	} else if (Players[1].indexOf("9th") > 0) {	//most likely
		Ord = 9;
	} else if (Players[1].indexOf("1st") > 0) {
		Ord = 1;
	} else if (Players[1].indexOf("2nd") > 0) {
		Ord = 2;
	} else if (Players[1].indexOf("3rd") > 0) {
		Ord = 3;
	} else if (Players[1].indexOf("4th") > 0) {
		Ord = 4;
	} else if (Players[1].indexOf("5th") > 0) {
		Ord = 5;
	} else if (Players[1].indexOf("6th") > 0) {
		Ord = 6;
	} else if (Players[1].indexOf("7th") > 0) {
		Ord = 7;
	} else if (Players[1].indexOf("8th") > 0) {
		Ord = 8;
	} else if (Text.indexOf("Pitch") > -1) { 
		// American League pitching substitution
	} else { 
		alert("WTF?");
	}

	//determine the game position
	gamePos = "";
	if (Players[0].indexOf("Pitcher Change: ") > -1 || Players[0].indexOf("Pitching Change: ") > -1) {
		gamePos = "P";
	} else if (Players[0].indexOf("Pinch hitter") > -1 || Players[0].indexOf("Pinch-hitter") > -1) {
		gamePos = "PH";
	} else if (Players[0].indexOf("Pinch runner") > -1 || Players[0].indexOf("Pinch-runner") > -1) {
		gamePos = "PR";
	} else if (Players[1].indexOf("catcher") > -1) {
		gamePos = "C";
	} else if (Players[1].indexOf("first base") > -1) {
		gamePos = "1B";
	} else if (Players[1].indexOf("second base") > -1) {
		gamePos = "2B";
	} else if (Players[1].indexOf("third base") > -1) {
		gamePos = "3B";
	} else if (Players[1].indexOf("shortstop") > -1) {
		gamePos = "SS";
	} else if (Players[1].indexOf("left field") > -1) {
		gamePos = "LF";
	} else if (Players[1].indexOf("center field") > -1) {
		gamePos = "CF";
	} else if (Players[1].indexOf("right field") > -1) {
		gamePos = "RF";
	} else {
		alert("Unknown Position Substitution: " + Text);
	}
	
	if (Ord == 0) {
		//if not found, it has to be AL rules with DH?
//		alert("Order not found.  If this isn't AL rules, there is an ERROR!");
	} else {
		PlayerOrd[TeamIdx][Ord] = Team.childNodes[PlyrCtr].selectSingleNode("@num").text;
		PlayerFull[TeamIdx][Ord] = BuildName(Team.childNodes[PlyrCtr]);
		InsertPlayer(Ord, gamePos, TeamIdx, Team.childNodes[PlyrCtr]);
	}

}

function InsertPlayer(Ord, gamePos, TmID, PlyrXML) {
	//find the cell to insert the player
	//start with the row after the row for the current batting order position
	newRow = document.getElementById(TeamType[TmID] + Ord).nextElementSibling; //this works in IE10 but may not work in IE9 or earlier
//	newRow = document.getElementById(TeamType[TmID] + Ord); //get the batter's row
//	newRow = newRow.parentNode.rows[newRow.rowIndex + 1]; //get the next row

	cellStart = 0;
	if (newRow.cells[0].innerHTML == "&nbsp;") { //if the first cell is blank, it can be used
		thisCell = newRow.cells[0];
	} else {
		newRow = newRow.parentNode.rows[newRow.rowIndex + 1]; //if not blank, try the next row
		if (newRow.cells[0].innerHTML == "&nbsp;") {
			thisCell = newRow.cells[0];
		} else { //if the third row is not blank...
			nextRow = 0;
			if (Ord == 9) { //if it's the last in batting order, get the row number of the footer
				nextRow = document.getElementById(TeamType[TmID] + "Footer").rowIndex;
			} else { //otherwise, get the row number of the next batting order position
				nextOrd = Ord + 1; 
				nextRow = document.getElementById(TeamType[TmID] + nextOrd).rowIndex;
			}
			newRow = newRow.parentNode.insertRow(nextRow); //insert a row before the next batting order position or footer
			for (cellIdx = 0; cellIdx < newRow.parentNode.rows[0].cells.length; cellIdx++) {
				 //build the cells for the new row
				theCell = newRow.insertCell(cellIdx);
				theCell.innerHTML = "&nbsp;"
				theCell.className = "Number Bottom";
			}
			newRow.cells[2].className = "Player Bottom";
			cellStart = 1;
		}
	}


	newRow.cells[cellStart].innerHTML = PlayerOrd[TmID][Ord];
	if (gamePos == 'P' && TeamInfo.Outs > 0) {
		InningText = TeamInfo.Inning + "." + TeamInfo.Outs;
	} else {
		InningText = TeamInfo.Inning;
	}
	Descrip = PlyrXML.selectSingleNode("@boxname").text + " (" + InningText + ")";
	newRow.cells[cellStart+1].innerHTML = Descrip;
	newRow.cells[cellStart+2].innerHTML= gamePos;
	newRow.cells[cellStart+2].style.textAlign = "center";
}

function getSound(SoundToGet) {
   SoundArray = SoundToGet.split(" ");
   while (SoundArray.length > 0) {
      SoundFile = SoundArray.join(" ");
      for (SoundCtr = 0; SoundCtr < SoundFiles.length; SoundCtr++) {
         if (SoundFiles[SoundCtr][0] == SoundFile) {
            FileNum = Math.floor(Math.random() * SoundFiles[SoundCtr][1]);
            AudioQueue.push(SoundFiles[SoundCtr][0] + " (" + FileNum + ")");
document.all.Debug.innerHTML = "Queue: " + AudioQueue.length;
            return;
         }
      }
      SoundArray.length--;
   }
}

function playSound() {
   if (AudioQueue.length > 0) {
      //play the first sound in the queue
      //HTML5 player will automatically call the next one when this one is ended; knowing the length is no longer necessary
      thisSound = AudioQueue.shift();
      document.getElementById("Audio").setAttribute('src', "Audio/" + thisSound + ".mp3");
document.all.Debug.innerHTML = "Queue: " + AudioQueue.length;
   } else {
      //if nothing in the queue, wait a second and try again
     setTimeout("playSound()", 1000);
document.all.Debug.innerHTML = "Queue: " + AudioQueue.length;
   }
}

function BuildName(playerNode) {
	First = playerNode.selectSingleNode("@first").text;
	First = First.replace(/[A-Z]\./g, "");
	Last = playerNode.selectSingleNode("@last").text;
	Last = Last.replace(/Jr\./g, "Jr");
	Last = Last.replace(/Sr\./g, "Sr");
	return First + " " + Last;
}

function SaveIt(){
	Now = new Date;
	var re=/\w* (\w*) (\d*) .* (\d\d\d\d)/;
	FileName = Now.toString().replace(re, "$3$1$2"); 
	re=/file:\/\/\/(.*\/).*/;
	FilePath = document.location.href;
	FilePath = FilePath.replace(re, "$1");
	FilePath = FilePath.replace(/\//g, "\\");
	FilePath = FilePath.replace(/%20/g, " ");

alert(FilePath + FileName + ".html");

	var fso, ts;
	var filename = FilePath + FileName + ".html";
	var ForWriting= 2;
	fso = new ActiveXObject("Scripting.FileSystemObject");
	ts = fso.OpenTextFile(filename, ForWriting, true);
	ts.write("<HEAD><TITLE>Scorekeeping</TITLE>");
	ts.write("<link href='scoreboard.css' rel='stylesheet' type='text/css'/>");
	ts.write("<SCR" + "IPT>document.Outs = " + document.Outs + "; document.Inning = " + document.Inning + "; document.Column = " + document.Column + "</SCR" + "IPT>");
	ts.write("<BGSOUND ID='Audio' LOOP=1 VOLUME='-600' SRC='jsilence.wav'>")
	ts.write("</HEAD><BODY>");
	ts.Write(document.body.innerHTML);
	ts.Close();
	document.location = filename;
}


function IsGameOver(theInning, theOuts) {
	Result = false;

	awayScore = document.getElementById("away").Runs;
	homeScore = document.getElementById("home").Runs;

	if (theInning >= 9) {
		if (TeamInfo.id == "away") { //away team at bat
			if ((theOuts == 3) && (homeScore > awayScore)) {
				Result = true;
			}
		} else { // home team at bat

			if (homeScore > awayScore) {
				result = true;
			} else {
				if ((theOuts == 3) && (homeScore != awayScore)) {
					Result = true;
				}
			}
		}
	}
	return Result;
}

function clearMessage(Msg) {
	document.getElementById("MessageDiv").innerHTML = document.getElementById("MessageDiv").innerHTML.replace(Msg, '');
	if (document.getElementById("MessageDiv").innerHTML == '') {
		document.getElementById("MessageDiv").style.visibility = "hidden";
	} else {
		alert(document.getElementById("MessageDiv").innerHTML);
	}
}

