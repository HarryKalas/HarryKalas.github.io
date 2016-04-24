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
document.getElementById("PitchTime").innerHTML = Temp;
	theSound = "";
	source.loadXML(xdLoad(gameFolder + "/plays.xml"));

	//if the game is over, exit
	if(source.selectNodes("game[@status_ind='O']").length > 0) { Mark('A');
		GetPlay(LastPlay);	//get the next play
		//*****CHECK FOR A WIN HERE
		return; 
	}

	//if there is a game action other than a pitch, get the call
	if (source.selectNodes("game/action[@des != '']").length > 0) { Mark('B');
		ABPlay = source.selectSingleNode("game/action/@des").text;
		if (LastAction != ABPlay) { Mark('C');
			GetPlay(LastPlay);	//get the next play
			return;
		}
	}

	//occurs when: wild pitch, a ball in play
	if (source.selectNodes("game/atbat[@des != '']").length > 0) { Mark('D-' +  source.selectSingleNode("game/atbat/@des").text);
		ABPlay = source.selectSingleNode("game/atbat/@des").text;
		if (LastAction != ABPlay) { Mark('E-' + LastAction);
			GetPlay(LastPlay);	//get the next play
			return;
		}
	}

	//check for a change of batter	
	batterNode = source.selectSingleNode("game/players/batter");
	//if there is a different batter
	if (batterNode.selectSingleNode("@boxname").text != document.getElementById("BatterName").innerHTML) { Mark('F'); 
		GetPlay(LastPlay);	//catch any uncalled plays
		LastPitch = 0; //reset the pitch count
		source.loadXML(xdLoad(gameFolder + "/plays.xml")); //reload the plays because GetPlay replaces source

		//set the sides
		if(source.selectSingleNode("//game/@inning_state").text == 'Top') { Mark('J1'); //if it's the top of the inning
			TeamInfo = document.getElementById("away"); //the current team is the Away team
		} else { Mark('J2'); //otherwise
			TeamInfo = document.getElementById("home"); //the current team is the Home team
		}
		ShowBatter(batterNode); //reset the batter box

		//calculate the number of runners on base
		Runners = 0;
		if (source.selectNodes("game/field/offense/man[@bnum='1']").length > 0) { 
			Runners += 1;
		}
		if (source.selectNodes("game/field/offense/man[@bnum='2']").length > 0) { 
			Runners += 2;
		}
		if (source.selectNodes("game/field/offense/man[@bnum='3']").length > 0) { 
			Runners += 4;
		}
		//call the number of runners on base
		getSound("Runners/" + Runners + " O" + TeamInfo.Outs + " I" + TeamInfo.Inning + " " + TeamInfo.id);
	}

	//get all pitches to this batter
	Pitches = source.selectNodes("game/atbat/p | game/atbat/po");
	if (Pitches.length > LastPitch) { Mark('K'); //if there are more pitches than last time
		//get the number of balls and strikes
		if (source.selectNodes("game/@b").length > 0) { Mark('L1');
			Balls = source.selectSingleNode("game/@b").text;
		} else { Mark('L2');
			Balls = "0";
		}
		if (source.selectNodes("game/@s").length > 0) { Mark('M1');
			Strikes = source.selectSingleNode("game/@s").text;
		} else { Mark ('M2');
			Strikes = "0";
		}
		//update the batter's box
		document.getElementById("B").innerHTML = Balls;
		document.getElementById("S").innerHTML = Strikes;

		//update the pitcher's pitch count
		PitchCounter = source.selectSingleNode("game/players/pitcher");
		PitchTable = "";
		if (PitchCounter) { Mark('N');
			PitchSide = source.selectSingleNode("game/@top_inning").text;
			if (PitchSide == "T") { Mark('O1');
				PitchTable = document.getElementById("homePitching");
			} else {  Mark('O2');
				PitchTable = document.getElementById("awayPitching");
			}
			PitchRow = PitchTable.rows[PitchTable.rows.length-1];
			PitchRow.cells[0].innerHTML = PitchCounter.selectSingleNode("@boxname").text;
			PitchRow.cells[1].innerHTML = PitchCounter.selectSingleNode("@p_throws").text + 'HP';
			PitchRow.cells[2].innerHTML = PitchCounter.selectSingleNode("@era").text;
			PitchRow.cells[3].innerHTML = PitchCounter.selectSingleNode("@balls").text;
			PitchRow.cells[4].innerHTML = PitchCounter.selectSingleNode("@strikes").text;
			PitchRow.cells[5].innerHTML = PitchCounter.selectSingleNode("@pitches").text;
		}

		//build the pitch-count call
		theSound = "Count/" + Balls + "-" + Strikes;

		//call only the most recent pitch
		Pitch = Pitches[Pitches.length-1];
		if (Pitch.selectSingleNode("@type")) { Mark('P1');
			play = Pitch.selectSingleNode("@type").text;
		} else { Mark('P2');
			play = ""; //WHEN IS THERE NO PITCH TYPE?
		}
		if (Pitch.selectSingleNode("@des")) { Mark('Q1');
			detail = Pitch.selectSingleNode("@des").text
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
//				alert("Not a pitch: " + Pitch.xml);
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
					theSound += " Ball Low Dirt " + Pitch.selectSingleNode("@pitch_type").text;
				} else if (detail == "Pitchout") { Mark('T2');
					theSound += " Ball Pitchout " + Pitch.selectSingleNode("@pitch_type").text;
				} else if (detail == "Ball") {  Mark('T3');
					//X = Pitch.selectSingleNode("@x").text
					//Y = Pitch.selectSingleNode("@y").text
					X = Pitch.selectSingleNode("@px").text
					Y = Pitch.selectSingleNode("@pz").text
					LR = Pitch.selectSingleNode("//game/players/batter/@stand").text
					theSound += " Ball" + BallPos(X, Y, LR) + " " + Pitch.selectSingleNode("@pitch_type").text;
				} else if (detail == "Intent Ball") { Mark('T4');
					//no sound for the individual balls of an intentional walk
					theSound = "";
				} else if (detail == "Hit By Pitch") {  Mark('T5');
					//walked; let the Action routine handle it
					theSound = "";
					GetPlay(LastPlay);	//get the next play
					break;
				} else { Mark('T6');
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
					theSound += " Called " + Pitch.selectSingleNode("@pitch_type").text;
					break;
				case "Foul" : 
				case "Foul Bunt" :
				case "Foul (Runner Going)" : Mark('b2');
					theSound += " Foul " + Pitch.selectSingleNode("@pitch_type").text;
					pitchCount = source.selectNodes("game/atbat/p");
					if (pitchCount.length > (Balls + Strikes)) {
						theSound += " X " + Pitch.selectSingleNode("@pitch_type").text;
					}
					break;
				case "Foul Tip" : Mark('b3');
					theSound += " Foul Tip " + Pitch.selectSingleNode("@pitch_type").text;
					break;
				case "Missed Bunt" : Mark('b4');
					theSound += " Bunt " + Pitch.selectSingleNode("@pitch_type").text;
					break;
				case "Swinging Strike" :
				case "Swinging Strike (Blocked)" : Mark('b5');
					theSound += " Swinging " + Pitch.selectSingleNode("@pitch_type").text;
					break;
				default :Mark('b6');
					alert("Unknown Strike: " + detail);
				}
			}
			break;
		case "X" : Mark('a4');
			//ball in play; let the action routine handle it
			theSound = "";
			break;
		default :
			alert("Unknown pitch type: " + play + " " + detail);
		}
		if (theSound > "") { Mark('V');
			getSound(theSound);
		}
		LastPitch = Pitches.length;
	}
	clearTimeout(PitchTimer);
	PitchTimer = setTimeout("LoadPitch()", 1000);
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
}

function ShowBatter(batterNode) {
	batterPic = batterNode.selectSingleNode("@pid").text;
	batterName = batterNode.selectSingleNode("@boxname").text;
	batterAvg = batterNode.selectSingleNode("@avg").text;

	document.getElementById("BatterPic").src = "http://mlb.mlb.com/images/players/mugshot/ph_" + batterPic + ".jpg";
	document.getElementById("BatterName").innerHTML = batterName;
	document.getElementById("BatterAvg").innerHTML = batterNode.selectSingleNode("@avg").text;
	document.getElementById("B").innerHTML = "0";
	document.getElementById("S").innerHTML = "0";
	document.getElementById("O").innerHTML = TeamInfo.Outs;
	getSound("Batters/_" + batterName + LeadOff);
	LeadOff = "";
	getSound("Average/" + batterAvg);

	Box = document.getElementById(TeamInfo.id + TeamInfo.AB).cells[TeamInfo.Column];
	batterPos = getPos(Box);
	if (batterPos[0] > 0) {	//deal with when there is not a batter -- probably end of game
		window.scrollTo(1,batterPos[1] - 100); //scroll to the player
		document.getElementById("BatterDiv").style.left = batterPos[0] + 64 + "px";
		document.getElementById("BatterDiv").style.top = batterPos[1] + 1 + "px";
		BatterDiv.style.visibility = "visible";
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
	source.loadXML(xdLoad(gameFolder + "/game_events.xml"));
	gamePlays = source.selectNodes("//game/inning/*/*");
	if (gamePlays.length > LastPlay) { // if there is a new call, get it
		UpdateIt();
	} else {	//otherwise keep trying
		setTimeout("GetPlay(" + After + ")", 5000);
	}
}