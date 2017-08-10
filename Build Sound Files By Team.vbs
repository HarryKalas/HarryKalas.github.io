   CurrentFolder = ".\"
   set fso = CreateObject("Scripting.FileSystemObject")

   savefile = CurrentFolder + "Sound_Files.js"
   ForWriting= 2
   set ts = fso.OpenTextFile(savefile, ForWriting, true)
   ts.WriteLine("SoundFiles = new Array;")
   ts.WriteLine("SoundCounts = new Array;")


sub FlsInFldr(fldr, path)
	for each fl in fldr.files

		'validate file name
		Pieces = split(FL.name, " ")

		if right(Pieces(Ubound(Pieces)), 4) = ".mp3" and right(Pieces(Ubound(Pieces)), 5) <> ").mp3" then
			msgbox fl.name
			fl.name = replace(fl.name, ".mp3", " (0).mp3")
		end if

		'add lines
		if left(path, 5) = "THEM/" then
			ThemFiles.Add mid(path, 6) + fl.name
		elseif left(path, 3) = "US/" then
			UsFiles.Add mid(path, 4) + fl.name
		else
			theFiles.Add path + fl.name
		end if
	next

	for each subfldr in fldr.subfolders
		call FlsInFldr(subfldr, path + subfldr.name + "/")
	next
end sub

CurrentFolder = CurrentFolder + "Audio"

Set theFiles = CreateObject("System.Collections.ArrayList")
Set UsFiles = CreateObject("System.Collections.ArrayList")
Set ThemFiles = CreateObject("System.Collections.ArrayList")

Set fldr = fso.GetFolder(CurrentFolder)
call FlsInFldr(fldr, "")

theFiles.Sort()
UsFiles.Sort()
ThemFiles.Sort()

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
		 	ts.WriteLine("SoundFiles.push('" + LastName + "');")
			'get the count of corresponding Them files
			ThemCount = -1
			i1 = ThemFiles.LastIndexOf(LastName + " (0).mp3")
			if i1 > -1 then
				for i2 = i1 to ThemFiles.Count - 1
					ThemName = split(ThemFiles(i2), " (")
					if ThemName(0) = LastName then
						ThemCount = ThemCount + 1
					else
						exit for
					end if
				next
			end if

			'get the count of corresponding Us files
			UsCount = -1
			i1 = UsFiles.LastIndexOf(LastName + " (0).mp3")
			if i1 > -1 then
				for i2 = i1 to UsFiles.Count - 1
					UsName = split(UsFiles(i2), " (")
					if UsName(0) = LastName then
						UsCount = UsCount + 1
					else
						exit for
					end if
				next
			end if

		 	ts.WriteLine("SoundCounts.push([" + cstr(FileCount + 1) + ", " +  cstr(ThemCount + 1) + ", " + cstr(UsCount + 1) +  "]);")
		end if
		FileCount = 0
		LastName = FL2
	end if
   end if
Next

'catch the last file name
ts.WriteLine("SoundFiles.push(['" + FL2 + "', " + cstr(FileCount + 1) + "]);")