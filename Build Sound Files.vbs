   CurrentFolder = ".\"
   set fso = CreateObject("Scripting.FileSystemObject")

   savefile = CurrentFolder + "Sound_Files.js"
   ForWriting= 2
   set ts = fso.OpenTextFile(savefile, ForWriting, true)
   ts.WriteLine("SoundFiles = new Array;")

   CurrentFolder = CurrentFolder + "Audio"

Set fldr = fso.GetFolder(CurrentFolder)
Set theFiles = CreateObject("System.Collections.ArrayList")


for each fl in fldr.files
	'validate file name
	Pieces = split(FL.name, " ")

	if right(Pieces(Ubound(Pieces)), 4) = ".mp3" and right(Pieces(Ubound(Pieces)), 5) <> ").mp3" then
		msgbox fl.name
		fl.name = replace(fl.name, ".mp3", " (0).mp3")
	end if

	'add lines
	theFiles.Add fl.name
next

for each subfldr in fldr.subfolders

   for each Fl in subfldr.files
	'validate file name
	Pieces = split(FL.name, " ")

	if right(Pieces(Ubound(Pieces)), 4) = ".mp3" and right(Pieces(Ubound(Pieces)), 5) <> ").mp3" then
		msgbox fl.name
		fl.name = replace(fl.name, ".mp3", " (0).mp3")
	end if
      theFiles.Add subfldr.name + "/" +fl.name
   next

next

theFiles.Sort()

LastName = ""
FileCount = 0

For Each fl in theFiles
   if right(FL, 4) = ".mp3" then
	Pieces = split(FL, " ")
	idx = Pieces(ubound(pieces))
	Counter = replace(Pieces(Ubound(Pieces)), ".mp3", "")
	if left(Counter, 1) <> "(" then 
		msgbox(FL)
		exit for
	end if
	if right(Counter, 1) <> ")" then 
		msgbox(FL)
		exit for
	end if
	Counter = mid(Counter, 2, len(Counter) - 2)
	Pieces(Ubound(Pieces)) = ""
	FL2 = trim(join(Pieces))
	if FL2 = LastName then
		FileCount = FileCount + 1
		if not isnumeric(Counter) then 
			msgbox FL
			exit for
		end if
		if cint(Counter) > cint(FileCount) then 
			msgbox FL + " " + Counter + " (should be " + format(FileCount) + ")"
			exit for
		end if
	else
		'print it; print previous file count
		if LastName > "" then
		 	ts.WriteLine("SoundFiles[SoundFiles.length] = new Array('" + LastName + "', " + cstr(FileCount + 1) + ");")
		end if
		FileCount = 0
		LastName = FL2
	end if
   end if
Next

'catch the last file name
ts.WriteLine("SoundFiles[SoundFiles.length] = new Array('" + FL2 + "', " + cstr(FileCount + 1) + ");")