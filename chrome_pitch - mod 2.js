//CH = CHANGEUP
//CU = CURVEBALL
//FC = CUTTER
//FF = 4-SEAM FASTBALL
//FT = 2-SEAM FASTBALL
//KC = KNUCKLE CURVE
//SI = SINKER
//SL = SLIDER


function LoadPitch() {
	Temp = new Date;

	xhttp.open("HEAD", gameFolder + "/plays.xml", false);
	xhttp.send(null);
	thisTime = xhttp.getResponseHeader("Last-Modified");
	document.getElementById("PitchTime").innerHTML = Temp.toString().substring(17,25);

	clearTimeout(PitchTimer);
	PitchTimer = setTimeout("LoadPitch()", 2000);

	if (thisTime == LastPitchTime) {
//		console.log("Pitch (" + LastPitch + "): ", Temp.toString().substring(17,25),  thisTime.substring(17,25));
		return;
	}

	LastPitchTime = thisTime;

	theSound = "";
	source = xdLoad(gameFolder + "/plays.xml");

	//if the game is over, exit
	if (selectNodes(source, "game[@status_ind='O' or @status_ind='F']").snapshotLength > 0) { Mark('A');
//		console.log("GAME OVER");
		clearTimeout(PitchTimer);	// don't get any more pitches
		GetPlay(LastPlay);	//get the end of game play
		//*****CHECK FOR A WIN HERE
		return; 
	}

	//if there is a game action other than a pitch, get the call
	if (selectNodes(source, "game/action[@des > '']").snapshotLength > 0) { Mark('B');
		console.log("Action");
		Action = selectNodes(source, "game/action").snapshotItem(0); 
		showPlay(Action);

//		ABPlay = selectNodes(source, "game/action/@des").snapshotItem(0).nodeValue;
//		console.log("Action: ", ABPlay);
		if (LastAction != ABPlay) { Mark('C');
			GetPlay(LastPlay);	//get the next play
			return;
		}
	}

	//occurs when: wild pitch, a ball in play
	if (selectNodes(source, "game/atbat[@des > '']").snapshotLength > 0) { Mark('D-' +  selectNodes(source, "game/atbat/@des").nodeValue);
		console.log("AtBat");
		AtBat = selectNodes(source, "game/atbat").snapshotItem(0); 
		showPlay(AtBat);

//		ABPlay = selectNodes(source, "game/atbat/@des").snapshotItem(0).nodeValue;
//		console.log("atbat: ", ABPlay);
//		if (LastAction != ABPlay) { Mark('E-' + LastAction);
//			GetPlay(LastPlay);	//get the next play
//			return;
//		}
	}

	//check for a change of batter	
	batterNode = selectNodes(source, "game/players/batter").snapshotItem(0);

	//if there is a different batter
	if (batterNode.getAttribute("boxname") != document.getElementById("BatterName").innerHTML) { Mark('F'); 
//		console.log(batterNode.getAttribute("boxname"));
		GetPlay(LastPlay);	//catch any uncalled plays
		LastPitch = 0; //reset the pitch count
		source = xdLoad(gameFolder + "/plays.xml"); //reload the plays because GetPlay replaces source

		//set the sides
		if(selectNodes(source, ("//game/@inning_state")).snapshotItem(0).nodeValue == 'Top') { Mark('J1'); //if it's the top of the inning
			TeamInfo = document.getElementById("away"); //the current team is the Away team
		} else { Mark('J2'); //otherwise
			TeamInfo = document.getElementById("home"); //the current team is the Home team
		}
		ShowBatter(batterNode); //reset the batter box

		//calculate the number of runners on base
		Runners = 0;
		if (selectNodes(source, "game/field/offense/man[@bnum='1']").snapshotLength > 0) { 
			Runners += 1;
		}
		if (selectNodes(source, "game/field/offense/man[@bnum='2']").snapshotLength > 0) { 
			Runners += 2;
		}
		if (selectNodes(source, "game/field/offense/man[@bnum='3']").snapshotLength > 0) { 
			Runners += 4;
		}
		//call the number of runners on base
		getSound("Runners/" + Runners + " O" + TeamInfo.Outs + " I" + TeamInfo.Inning + " " + TeamInfo.id);
	}

	//get all pitches to this batter
	Pitches = selectNodes(source, "game/atbat/p | game/atbat/po");
	if (Pitches.snapshotLength > LastPitch) { Mark('K'); //if there are more pitches than last time
		//get the number of balls and strikes
		if (selectNodes(source, "game/@b").snapshotLength > 0) { Mark('L1');
			Balls = selectNodes(source, ("game/@b")).snapshotItem(0).nodeValue;
		} else { Mark('L2');
			Balls = "0";
		}
		if (selectNodes(source, "game/@s").snapshotLength > 0) { Mark('M1');
			Strikes = selectNodes(source, ("game/@s")).snapshotItem(0).nodeValue;
		} else { Mark ('M2');
			Strikes = "0";
		}
	
		//update the batter's box
		document.getElementById("B").innerHTML = Balls;
		document.getElementById("S").innerHTML = Strikes;
	
		//update the pitcher's pitch count
		PitchCounter = selectNodes(source, "game/players/pitcher").snapshotItem(0);
		PitchTable = "";
		if (PitchCounter) { Mark('N');
			PitchSide = selectNodes(source, "game/@top_inning").snapshotItem(0).nodeValue;
			if (PitchSide == "T") { Mark('O1');
				PitchTable = document.getElementById("homePitching");
			} else {  Mark('O2');
				PitchTable = document.getElementById("awayPitching");
			}
			PitchRow = PitchTable.rows[PitchTable.rows.length-1];
			//PitchRow.cells[0].innerHTML = PitchCounter.getAttribute("boxname");
			PitchRow.cells[1].innerHTML = PitchCounter.getAttribute("p_throws") + 'HP';
			PitchRow.cells[2].innerHTML = PitchCounter.getAttribute("era");
			PitchRow.cells[3].innerHTML = PitchCounter.getAttribute("balls");
			PitchRow.cells[4].innerHTML = PitchCounter.getAttribute("strikes");
			PitchRow.cells[5].innerHTML = PitchCounter.getAttribute("pitches");
		}
	
		//build the pitch-count call
		theSound = "Count/" + Balls + "-" + Strikes;
	
		//call only the most recent pitch
		Pitch = Pitches.snapshotItem(Pitches.snapshotLength-1);
	
		//Pitch speed and type
		document.getElementById("PitchSpeed").innerHTML = "";
		if (Pitch.getAttribute("start_speed")) {
			document.getElementById("PitchSpeed").innerHTML = Pitch.getAttribute("start_speed");
		}

		pitchtype = ""
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
			}
		} else {
			pitchtype = "!"
		}
	
		document.getElementById("PitchSpeed").innerHTML += pitchtype;
		if (Pitch.getAttribute("type")) {
			document.getElementById("PitchSpeed").innerHTML += " (" + Pitch.getAttribute("type") + ")";
		}
	
//CH = CHANGEUP
//CU = CURVEBALL
//FC = CUTTER
//FF = 4-SEAM FASTBALL
//FT = 2-SEAM FASTBALL
//KC = KNUCKLE CURVE
//SI = SINKER
//SL = SLIDER
	
		if (Pitch.getAttribute("type")) { Mark('P1');
			play = Pitch.getAttribute("type");
		} else { Mark('P2');
			play = ""; //WHEN IS THERE NO PITCH TYPE?
		}
		if (Pitch.getAttribute("des")) { Mark('Q1');
			detail = Pitch.getAttribute("des");
		} else { Mark('Q2');
			detail = "";
		}
	
		switch (play) {
		case "" : Mark('a1');
			if (detail == "Pickoff Attempt 1B") { Mark('R1');
				theSound = "POA 1B";
			} else if (detail == "Pickoff Attempt 2B") { Mark('R2');
				theSound = "POA 2B";
			} else if (detail == "Pickoff Attempt 3B") {  Mark('R3');
				theSound = "POA 3B";
			} else {  Mark('R4');
				window.open(gameFolder + "/plays.xml");
				alert("Not a pitch: " + Pitch.xml);
				theSound = "";
			}
			break;
		case "B" : Mark('a2');
			if (Balls == "4") {  Mark('S1');
				//walked; let the Action routine handle it
				theSound = "";
				GetPlay(LastPlay);	//get the next play
				break;
			} else {  Mark('S2');
				if (detail == "Ball In Dirt") { Mark('T1');
					theSound += " Ball Low Dirt " + Pitch.getAttribute("pitch_type");
				} else if (detail == "Pitchout") { Mark('T2');
					theSound += " Ball Pitchout " + Pitch.getAttribute("pitch_type");
				} else if (detail == "Ball") {  Mark('T3');
					//X = Pitch.selectSingleNode("@x").text
					//Y = Pitch.selectSingleNode("@y").text
					X = Pitch.getAttribute("px")
					Y = Pitch.getAttribute("pz")
					LR = selectNodes(source, "//game/players/batter").snapshotItem(0).getAttribute("stand");
					theSound += " Ball" + BallPos(X, Y, LR) + " " + Pitch.getAttribute("pitch_type");

					//no sound for the individual balls of an intentional walk
					theSound = "";
				} else if (detail == "Hit By Pitch") {  Mark('T5');
					//walked; let the Action routine handle it
					theSound = "";
					GetPlay(LastPlay);	//get the next play
					break;
				} else { Mark('T6');
					window.open(gameFolder + "/plays.xml");
					alert("Unknown Ball: " + detail);
				}
			}
			break;
		case "S" : Mark('a3');
			if (Strikes == "3") {  Mark('U1');
				//struck out; let the Action routine handle it
				theSound = "";
				GetPlay(LastPlay);	//get the next play
				break;
			} else { Mark('U2');
				switch (detail) {
				case "Called Strike" :  Mark('b1');
					theSound += " Called " + Pitch.getAttribute("pitch_type");
					break;
				case "Foul" : 
				case "Foul Bunt" :
				case "Foul (Runner Going)" : Mark('b2');
					theSound += " Foul " + Pitch.getAttribute("pitch_type");
					pitchCount = selectNodes(source, "game/atbat/p");
					if (pitchCount.snapshotLength > (Balls + Strikes)) {
						theSound += " Foul X " + Pitch.getAttribute("pitch_type");
					}
					break;
				case "Foul Tip" : Mark('b3');
					theSound += " Foul Tip " + Pitch.getAttribute("pitch_type");
					break;
				case "Missed Bunt" : Mark('b4');
					theSound += " Bunt " + Pitch.getAttribute("pitch_type");
					break;
				case "Swinging Strike" :
				case "Swinging Strike (Blocked)" : Mark('b5');
					theSound += " Swinging " + Pitch.getAttribute("pitch_type");
					break;
				default :Mark('b6');
					window.open(gameFolder + "/plays.xml");
					alert("Unknown Strike: " + detail);
				}
			}
			break;
		case "X" : Mark('a4');
			//ball in play; let the action routine handle it
			theSound = "";
//			document.getElementById("InPlay").innerHTML = "Ball in play...";
			document.getElementById("InPlay").innerHTML = detail;
//			console.log("in play", detail);
			if (selectNodes(source, "game/action/@des").snapshotLength > 0) {
//				console.log("in play detail", selectNodes(source, "game/action/@des").snapshotItem(0).nodeValue);
			}
			theSound = "InPlay";
			break;
		default :
			window.open(gameFolder + "/plays.xml");
			alert("Unknown pitch type: " + play + " " + detail);
		}
		if (theSound > "") { Mark('V');
			getSound(theSound);
		}
		LastPitch = Pitches.snapshotLength;
		clearTimeout(PitchTimer);
		PitchTimer = setTimeout("LoadPitch()", 5000);	//allow 5 seconds between pitches
	}
}

function BallPos(X, Y, LR) {
	Result = "";

	if (Y < 1) {
		Result = " Low Dirt"
		return Result;
	} else if (Y < 2) {
		Result = " Low"
	} else if (Y > 4) {
		Result = " High Very"
		return Result;
	} else if (Y > 3) {
		Result = " High"
	}

	if (LR == "R") {
		if (X > 1) {
			Result += " Outside"
		} else if (X < -1) {
			Result += " Inside"
		}
	} else {
		if (X > 1) {
			Result += " Inside"
		} else if (X < -1) {
			Result += " Outside"
		}
	}
	return Result;
}

function Mark(Text) {
	//for debugging purposes, prints in the Debug DIV whatever text is provided
//	document.getElementById("Debug").innerHTML += ' ' + Text + ' ';
//	console.log(Text);
}

function ShowBatter(batterNode) {
	batterPic = batterNode.getAttribute("pid");
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
	document.getElementById("O").innerHTML = TeamInfo.Outs;
	document.getElementById("PitchSpeed").innerHTML = "";
	document.getElementById("InPlay").innerHTML = batterRec;
	getSound("Batters/2016" + batterName + LeadOff);
	LeadOff = "";
	getSound("Average/" + batterAvg);

	if(selectNodes(source, ("//game/@inning_state")).snapshotItem(0).nodeValue == 'Top') { 
		TeamInfo = document.getElementById("away"); //the current team is the Away team
	} else { 
		TeamInfo = document.getElementById("home"); //the current team is the Home team
	}

	Box = document.getElementById(TeamInfo.id + TeamInfo.AB).cells[TeamInfo.Column];
	batterPos = getPos(Box);
	if (batterPos[0] > 0) {	//deal with when there is not a batter -- probably end of game
		//position the picture box first
		document.getElementById("BatterDiv").style.left = batterPos[0] + 64 + "px";
		document.getElementById("BatterDiv").style.top = batterPos[1] + 1 + "px";
		document.getElementById("BatterDiv").style.visibility = "visible";

		//then scroll to the player
		window.scrollTo(1, batterPos[1] - 150);
	} else if (TeamInfo.Column == document.getElementById(TeamInfo.id + TeamInfo.AB).cells.length) {
		//This is actually the end of the game -- the batter column is past the end of the table
	} else { 
		alert("No BatterPos"); // not sure how this could happen
		die;
	}
}

function GetPlay(After) {
	//used to make sure you get a play at certain points
	if (LastPlay == -1) {  // game over; stop updating
		return;
	}
	
	if (LastPlay > After) {  // plays have already been updated; stop looking
		return;
	}

	// if plays haven't been updated yet, see if there is anything new 
	//	and keep checking until there is
	source = xdLoad(gameFolder + "/game_events.xml");
	gamePlays = selectNodes(source, "//game/inning/*/*");
	if (gamePlays.snapshotLength > LastPlay) { // if there is a new call, get it
		UpdateIt();
	} else {	//otherwise keep trying
		setTimeout("GetPlay(" + After + ")", 5000);
	}
}