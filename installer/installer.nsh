
!macro customInstall
  ; Agrega "Open with LalIA" al menú contextual de Windows para archivos, carpetas y fondo de carpeta.
  WriteRegStr HKCU "Software\Classes\*\shell\Open with LalIA" "" "Open with LalIA"
  WriteRegStr HKCU "Software\Classes\*\shell\Open with LalIA" "Icon" "$INSTDIR\LalIA.exe"
  WriteRegStr HKCU "Software\Classes\*\shell\Open with LalIA\command" "" '"$INSTDIR\LalIA.exe" "%1"'

  WriteRegStr HKCU "Software\Classes\Directory\shell\Open with LalIA" "" "Open with LalIA"
  WriteRegStr HKCU "Software\Classes\Directory\shell\Open with LalIA" "Icon" "$INSTDIR\LalIA.exe"
  WriteRegStr HKCU "Software\Classes\Directory\shell\Open with LalIA\command" "" '"$INSTDIR\LalIA.exe" "%1"'

  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\Open with LalIA" "" "Open with LalIA"
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\Open with LalIA" "Icon" "$INSTDIR\LalIA.exe"
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\Open with LalIA\command" "" '"$INSTDIR\LalIA.exe" "%V"'
!macroend

!macro customUnInstall
  DeleteRegKey HKCU "Software\Classes\*\shell\Open with LalIA"
  DeleteRegKey HKCU "Software\Classes\Directory\shell\Open with LalIA"
  DeleteRegKey HKCU "Software\Classes\Directory\Background\shell\Open with LalIA"
!macroend
