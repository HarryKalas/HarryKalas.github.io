'Makes sure that the name formats of Inning files are consistent
'should be: [inning][away|home] [B|E] [score] [team 1] [team 2]
   CurrentFolder = ".\"
Teams = Array("Philadelphia Phillies","Washington Nationals", "Atlanta Braves","New York Mets","Cincinnati Reds", "New York Yankees")

   set fso = CreateObject("Scripting.FileSystemObject")
   Set fldr = fso.GetFolder(CurrentFolder)

   for each Fl in fldr.files
      if right(Fl.name, 4) = ".mp3" then
	Pieces = split(Fl.name, " ")
	
'first piece has to be the inning number and side
	if left(Pieces(0), 1) > "9" then
		msgbox("Bad file name (inning): " + Fl.name)
		exit for
	end if

	select case mid(Pieces(0), 2, 1)
	case "a", "h"
		NextChar = 2
	case "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"
		NextChar = 3
	case else
		msgbox("Bad file name (inning half1: " + Fl.name)
		exit for
	end select

	select case mid(Pieces(0), NextChar, 4)
	case "away", "home"
		NextChar = NextChar + 5
	case else
		msgbox("Bad file name (inning half2: " + Fl.name)
		exit for
	end select

'next piece has  to be beginning or end of inning
	select case Pieces(1)
	case "B", "E"
		NextChar = NextChar + 2
	case else
		msgbox("Bad file name (B|E): " + Fl.name)
		exit for
	end select

'last piece has to be a counter and the file type
	Counter = replace(Pieces(Ubound(Pieces)), ".mp3", "")
	if left(Counter, 1) <> "(" then
		msgbox("Bad file name (counter1): " + Fl.name)
		exit for
	end if

	if right(Counter, 1) <> ")" then
		msgbox("Bad file name (counter2): " + Fl.name)
		exit for
	end if

	if not isnumeric(mid(Counter, 2, len(Counter) - 2)) then
		msgbox("Bad file name (counter3): " + Fl.name)
		exit for
	end if

	if Ubound(Pieces) >= 3 then

		Scores = split(Pieces(2), "-")
		if ubound(Scores) <> 1 then

			msgbox("Bad file name (score1): " + Fl.name)
			exit for
		elseif not isnumeric(Scores(0)) then
			msgbox("Bad file name (score2): " + Fl.name)
			exit for
		elseif not isnumeric(Scores(1)) then
			msgbox Pieces(1)
			msgbox("Bad file name (score3): " + Fl.name)
			exit for
		end if
	end if
	
	if Ubound(Pieces) > 3 then	'1 team
		Pieces(0) = ""
		Pieces(1) = ""
		Pieces(2) = ""
		Pieces(ubound(Pieces)) =  ""
		Tm = trim(join(Pieces))
		for Ptr = 0 to Ubound(Teams)	'team 1
			if Tm = Teams(Ptr) then
				exit for
			elseif Left(Tm, Len(Teams(Ptr))) = Teams(Ptr) then
				Tm = trim(mid(Tm, len(Teams(Ptr))+1))
			elseif Right(Tm, Len(Teams(Ptr))) = Teams(Ptr) then
				Tm = Trim(left(Tm, Len(Tm) - Len(Teams(Ptr))))
			end if
		next
		if Ptr > Ubound(Teams) then
			msgbox("Bad file name (teams): " + Fl.name + "\n" + Tm)
		end if
	end if
      end if
   next
msgbox "Done"
