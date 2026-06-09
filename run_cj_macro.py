import win32com.client as win32
import os

src = r"C:\Users\dkchoi\Downloads\경동 , cj 택배 송장 메트로\0401 ADD 5시45분.XLSX"
dst = r"C:\Users\dkchoi\Downloads\경동 , cj 택배 송장 메트로\메틀러토레도_CJ택배_매크로.xlsm"

VBA_CODE = r'''
Option Explicit

Sub 전체실행()
    Application.ScreenUpdating = False
    Application.Calculation = xlCalculationManual
    Call Sheet1_to_Sheet3
    Call Sheet3_to_CJ택배양식
    Application.ScreenUpdating = True
    Application.Calculation = xlCalculationAutomatic
    'MsgBox "완료! Sheet3 및 CJ택배양식 시트 업데이트.", vbInformation, "CJ 택배 매크로"
End Sub

Sub Sheet1_to_Sheet3()
    Dim ws1 As Worksheet, ws3 As Worksheet
    Dim lastRow As Long, i As Long, destRow As Long, col As Integer
    Set ws1 = ThisWorkbook.Worksheets(1)
    On Error Resume Next
    Set ws3 = ThisWorkbook.Sheets("Sheet3")
    On Error GoTo 0
    If ws3 Is Nothing Then
        Set ws3 = ThisWorkbook.Sheets.Add(After:=ThisWorkbook.Sheets(ThisWorkbook.Sheets.Count))
        ws3.Name = "Sheet3"
    Else
        ws3.Cells.Clear
        ws3.Cells.Interior.ColorIndex = xlNone
    End If
    For col = 1 To 14
        ws3.Cells(1, col).Value = ws1.Cells(1, col).Value
    Next col
    ws3.Cells(1, 15).Value = "CJ주소(통합)"
    ws3.Cells(1, 16).Value = ws1.Cells(1, 15).Value
    ws3.Cells(1, 17).Value = ws1.Cells(1, 16).Value
    For col = 17 To 25
        ws3.Cells(1, col + 1).Value = ws1.Cells(1, col).Value
    Next col
    ws3.Rows(1).Font.Bold = True
    ws3.Rows(1).Interior.Color = RGB(189, 215, 238)
    Dim seenDict As Object
    Set seenDict = CreateObject("Scripting.Dictionary")
    lastRow = ws1.Cells(ws1.Rows.Count, 1).End(xlUp).Row
    destRow = 2
    For i = 2 To lastRow
        Dim route As String
        route = Trim(CStr(ws1.Cells(i, 3).Value))
        If route <> "ZKR170" And route <> "ZKR193" And route <> "ZKR194" Then GoTo NextRow
        Dim delNum As String
        delNum = Trim(CStr(ws1.Cells(i, 1).Value))
        If seenDict.Exists(delNum) Then GoTo NextRow
        seenDict.Add delNum, True
        For col = 1 To 14
            ws3.Cells(destRow, col).Value = ws1.Cells(i, col).Value
        Next col
        Dim imComp As String
        imComp = Trim(CStr(ws1.Cells(i, 17).Value))
        If imComp <> "" Then
            ws3.Cells(destRow, 5).Value = ws1.Cells(i, 17).Value
            ws3.Cells(destRow, 6).Value = ws1.Cells(i, 18).Value
            ws3.Cells(destRow, 7).Value = ws1.Cells(i, 19).Value
            ws3.Cells(destRow, 8).Value = ws1.Cells(i, 20).Value
            ws3.Cells(destRow, 9).Value = ws1.Cells(i, 21).Value
            ws3.Cells(destRow, 10).Value = ws1.Cells(i, 22).Value
            ws3.Cells(destRow, 11).Value = ws1.Cells(i, 23).Value
            ws3.Cells(destRow, 12).Value = ws1.Cells(i, 24).Value
        End If
        Dim combinedAddr As String
        combinedAddr = ""
        Dim bTxt As String
        bTxt = Trim(CStr(ws1.Cells(i, 2).Value))
        Dim bAddr As String
        bAddr = ExtractKoreanAddress(bTxt)
        If bAddr <> "" Then
            combinedAddr = bAddr
        Else
            Dim parts(6) As String
            parts(0) = Trim(CStr(ws3.Cells(destRow, 9).Value))
            parts(1) = Trim(CStr(ws3.Cells(destRow, 10).Value))
            parts(2) = Trim(CStr(ws3.Cells(destRow, 11).Value))
            parts(3) = Trim(CStr(ws3.Cells(destRow, 12).Value))
            parts(4) = Trim(CStr(ws3.Cells(destRow, 5).Value))
            parts(5) = Trim(CStr(ws3.Cells(destRow, 7).Value))
            parts(6) = Trim(CStr(ws3.Cells(destRow, 14).Value))
            Dim p As Integer
            For p = 0 To 6
                If parts(p) <> "" Then
                    If combinedAddr = "" Then
                        combinedAddr = parts(p)
                    Else
                        combinedAddr = combinedAddr & " " & parts(p)
                    End If
                End If
            Next p
        End If
        ws3.Cells(destRow, 15).Value = combinedAddr
        Dim cName As String, cPhone As String
        cName = Trim(CStr(ws1.Cells(i, 15).Value))
        cPhone = Trim(CStr(ws1.Cells(i, 16).Value))
        If cName = "" Or cPhone = "" Then
            Dim yTxt As String
            yTxt = Trim(CStr(ws1.Cells(i, 25).Value))
            If yTxt <> "" Then
                Dim pName As String, pPhone As String
                Call ParseNamePhone(yTxt, pName, pPhone)
                If cName = "" Then cName = pName
                If cPhone = "" Then cPhone = pPhone
            End If
        End If
        ws3.Cells(destRow, 16).Value = cName
        ws3.Cells(destRow, 17).Value = cPhone
        If Trim(CStr(ws3.Cells(destRow, 16).Value)) = "" Then
            ws3.Cells(destRow, 16).Interior.Color = RGB(255, 255, 0)
            ws3.Cells(destRow, 16).Value = "확인필요"
        End If
        If Trim(CStr(ws3.Cells(destRow, 17).Value)) = "" Then
            ws3.Cells(destRow, 17).Interior.Color = RGB(255, 255, 0)
            ws3.Cells(destRow, 17).Value = "확인필요"
        End If
        For col = 17 To 25
            ws3.Cells(destRow, col + 1).Value = ws1.Cells(i, col).Value
        Next col
        destRow = destRow + 1
NextRow:
    Next i
    ws3.Columns.AutoFit
End Sub

Function ExtractKoreanAddress(txt As String) As String
    If Len(Trim(txt)) = 0 Then ExtractKoreanAddress = "": Exit Function
    Dim regions As Variant
    regions = Array("서울특별시","부산광역시","대구광역시","인천광역시","광주광역시","대전광역시","울산광역시","세종특별자치시","경기도","강원도","충청북도","충청남도","전라북도","전라남도","경상북도","경상남도","제주특별자치도","서울","경기","인천","부산","대구","광주","대전","울산")
    Dim hasRegion As Boolean, hasRoad As Boolean
    hasRegion = False: hasRoad = False
    Dim r As Integer
    For r = 0 To UBound(regions)
        If InStr(txt, regions(r)) > 0 Then hasRegion = True: Exit For
    Next r
    If InStr(txt, "번길") > 0 Or InStr(txt, "로 ") > 0 Or InStr(txt, "길 ") > 0 Then hasRoad = True
    If hasRegion And hasRoad Then ExtractKoreanAddress = txt Else ExtractKoreanAddress = ""
End Function

Sub ParseNamePhone(yVal As String, outName As String, outPhone As String)
    Dim words() As String
    words = Split(yVal, " ")
    Dim phoneIdx As Integer
    phoneIdx = -1
    Dim i As Integer
    For i = 0 To UBound(words)
        Dim w As String
        w = Trim(words(i))
        If Len(w) >= 4 Then
            If Left(w,3)="010" Or Left(w,3)="011" Or Left(w,3)="016" Or Left(w,3)="017" Or Left(w,3)="019" Or Left(w,2)="02" Or Left(w,3)="031" Or Left(w,3)="032" Or Left(w,3)="033" Or Left(w,3)="041" Or Left(w,3)="042" Or Left(w,3)="043" Or Left(w,3)="051" Or Left(w,3)="052" Or Left(w,3)="053" Or Left(w,3)="054" Or Left(w,3)="055" Or Left(w,3)="061" Or Left(w,3)="062" Or Left(w,3)="063" Or Left(w,3)="064" Or Left(w,3)="070" Then
                phoneIdx = i: Exit For
            End If
        End If
    Next i
    If phoneIdx = -1 Then
        outName = Trim(yVal): outPhone = ""
    ElseIf phoneIdx = 0 Then
        outPhone = Trim(words(0)): outName = ""
        For i = 1 To UBound(words): outName = Trim(outName & " " & words(i)): Next i
    Else
        outName = ""
        For i = 0 To phoneIdx - 1: outName = Trim(outName & " " & words(i)): Next i
        outPhone = ""
        For i = phoneIdx To UBound(words): outPhone = outPhone & words(i): Next i
    End If
End Sub

Sub Sheet3_to_CJ택배양식()
    Dim ws3 As Worksheet, wsCJ As Worksheet
    Dim lastRow As Long, i As Long, destRow As Long, col As Integer
    On Error Resume Next
    Set ws3 = ThisWorkbook.Sheets("Sheet3")
    On Error GoTo 0
    If ws3 Is Nothing Then MsgBox "Sheet3 없음. 전체실행 먼저 실행하세요.", vbExclamation: Exit Sub
    On Error Resume Next
    Set wsCJ = ThisWorkbook.Sheets("CJ택배양식")
    On Error GoTo 0
    If wsCJ Is Nothing Then
        Set wsCJ = ThisWorkbook.Sheets.Add(After:=ws3)
        wsCJ.Name = "CJ택배양식"
    Else
        wsCJ.Cells.Clear
        wsCJ.Cells.Interior.ColorIndex = xlNone
    End If
    Dim hdrs As Variant
    hdrs = Array("수령인","수령인 연락처","수령인 주소","DN NO.","수량","발송인","발송인 연락처","발송인 주소","택배기사 요청사항","운송장번호")
    For col = 1 To 10: wsCJ.Cells(1, col).Value = hdrs(col - 1): Next col
    wsCJ.Rows(1).Font.Bold = True
    wsCJ.Rows(1).Interior.Color = RGB(189, 215, 238)
    lastRow = ws3.Cells(ws3.Rows.Count, 1).End(xlUp).Row
    destRow = 2
    For i = 2 To lastRow
        Dim rName As String, rPhone As String
        rName = Trim(CStr(ws3.Cells(i, 16).Value))
        rPhone = Trim(CStr(ws3.Cells(i, 17).Value))
        wsCJ.Cells(destRow, 1).Value = rName
        wsCJ.Cells(destRow, 2).Value = rPhone
        wsCJ.Cells(destRow, 3).Value = ws3.Cells(i, 15).Value
        wsCJ.Cells(destRow, 4).Value = ws3.Cells(i, 1).Value
        wsCJ.Cells(destRow, 5).Value = 1
        wsCJ.Cells(destRow, 6).Value = "메틀러토레도코리아 물류센터"
        wsCJ.Cells(destRow, 7).Value = "070-4677-1824"
        wsCJ.Cells(destRow, 8).Value = "경기 김포시 고촌읍 아라육로57번길 108 CJ대한통운 강서1팀 ACT2창고"
        If rName = "" Or rName = "확인필요" Then wsCJ.Cells(destRow, 1).Interior.Color = RGB(255, 255, 0)
        If rPhone = "" Or rPhone = "확인필요" Then wsCJ.Cells(destRow, 2).Interior.Color = RGB(255, 255, 0)
        destRow = destRow + 1
    Next i
    wsCJ.Columns("A").ColumnWidth = 15
    wsCJ.Columns("B").ColumnWidth = 16
    wsCJ.Columns("C").ColumnWidth = 65
    wsCJ.Columns("D").ColumnWidth = 12
    wsCJ.Columns("E").ColumnWidth = 6
    wsCJ.Columns("F").ColumnWidth = 24
    wsCJ.Columns("G").ColumnWidth = 16
    wsCJ.Columns("H").ColumnWidth = 52
    wsCJ.Columns("I:J").ColumnWidth = 18
    wsCJ.Rows.AutoFit
End Sub
'''

excel = win32.Dispatch("Excel.Application")
excel.Visible = False
excel.DisplayAlerts = False

try:
    # Remove existing output file if any
    if os.path.exists(dst):
        os.remove(dst)

    # Open source
    wb = excel.Workbooks.Open(src)

    # Save as xlsm
    wb.SaveAs(dst, 52)  # 52 = xlOpenXMLWorkbookMacroEnabled

    # Add VBA module
    try:
        vba_module = wb.VBProject.VBComponents.Add(1)
        vba_module.Name = "CJ_Macro"
        vba_module.CodeModule.AddFromString(VBA_CODE)
        print("VBA module added successfully")
    except Exception as e:
        print(f"VBA error: {e}")

    # Add a button shape on Sheet1 to run the macro
    try:
        ws1 = wb.Worksheets(1)
        btn = ws1.Shapes.AddFormControl(1, 10, 5, 160, 30)  # xlButtonControl=1
        btn.TextFrame.Characters().Text = "▶ CJ 택배 변환 실행"
        btn.OnAction = "CJ_Macro.전체실행"
        print("Button added to Sheet1")
    except Exception as e:
        print(f"Button error: {e}")

    # Run the macro to pre-populate sheets
    try:
        excel.Run("CJ_Macro.전체실행")
        print("Macro ran successfully")
    except Exception as e:
        print(f"Macro run error: {e}")

    wb.Save()
    wb.Close(False)
    print(f"SUCCESS: {dst}")

finally:
    excel.DisplayAlerts = True
    excel.Quit()
