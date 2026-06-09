import win32com.client as win32
import os
import time

dst = r"C:\Users\dkchoi\Downloads\경동 , cj 택배 송장 메트로\메틀러토레도_CJ택배_매크로.xlsm"

VBA_CODE = r"""Option Explicit

Sub 전체실행()
    Application.ScreenUpdating = False
    Application.Calculation = xlCalculationManual
    Call Sheet1_to_Sheet3
    Call Sheet3_to_CJ택배양식
    Application.ScreenUpdating = True
    Application.Calculation = xlCalculationAutomatic
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

        ' ===== B열 파싱: 주소 + 이름 + 연락처 동시 추출 =====
        Dim bTxt As String
        bTxt = Trim(CStr(ws1.Cells(i, 2).Value))
        Dim bAddr As String, bName As String, bPhone As String
        bAddr = "": bName = "": bPhone = ""
        Call ParseBColumn(bTxt, bAddr, bName, bPhone)

        ' 통합주소 결정
        Dim combinedAddr As String
        combinedAddr = ""
        If bAddr <> "" Then
            ' B열 주소 최우선
            combinedAddr = bAddr
        Else
            ' 기본주소: I+J+K+L+E+G+N (IM 적용 후, M 제외)
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

        ' 담당자/연락처 결정 (B열 최우선 → O/P열 → Y열)
        Dim cName As String, cPhone As String
        If bName <> "" Then
            cName = bName
        Else
            cName = Trim(CStr(ws1.Cells(i, 15).Value))
        End If
        If bPhone <> "" Then
            cPhone = bPhone
        Else
            cPhone = Trim(CStr(ws1.Cells(i, 16).Value))
        End If

        ' 여전히 빈칸이면 Y열에서 파싱
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

' B열 전체 텍스트에서 주소 / 이름 / 전화번호를 동시에 파싱
Sub ParseBColumn(bTxt As String, outAddr As String, outName As String, outPhone As String)
    outAddr = "": outName = "": outPhone = ""
    If Len(Trim(bTxt)) = 0 Then Exit Sub

    ' "/" 구분자로 분리
    Dim segments() As String
    segments = Split(bTxt, "/")

    Dim regions As Variant
    regions = Array("서울특별시","부산광역시","대구광역시","인천광역시","광주광역시","대전광역시","울산광역시","세종특별자치시","경기도","강원도","충청북도","충청남도","전라북도","전라남도","경상북도","경상남도","제주특별자치도","서울","경기","인천","부산","대구","광주","대전","울산","경북","경남","전북","전남","충북","충남","강원","제주")

    Dim s As Integer
    For s = 0 To UBound(segments)
        Dim seg As String
        seg = Trim(segments(s))
        If Len(seg) = 0 Then GoTo NextSeg

        ' 주소 패턴 감지
        If outAddr = "" Then
            Dim hasRegion As Boolean, hasRoad As Boolean
            hasRegion = False: hasRoad = False
            Dim r As Integer
            For r = 0 To UBound(regions)
                If InStr(seg, regions(r)) > 0 Then hasRegion = True: Exit For
            Next r
            If InStr(seg, "번길") > 0 Or InStr(seg, "로 ") > 0 Or InStr(seg, "길 ") > 0 Or _
               InStr(seg, "로") > 0 And InStr(seg, " ") > 0 Then hasRoad = True
            If hasRegion And hasRoad Then
                outAddr = seg
                GoTo NextSeg
            End If
        End If

        ' 이름+전화번호 패턴 감지 (010-XXXX-XXXX 포함 세그먼트)
        If outPhone = "" Then
            Dim phonePos As Integer
            phonePos = FindPhonePos(seg)
            If phonePos > 0 Then
                ' 전화번호 추출
                outPhone = ExtractPhone(seg, phonePos)
                ' 이름: 전화번호 앞 텍스트, "님" 제거
                Dim namePart As String
                namePart = Trim(Left(seg, phonePos - 1))
                namePart = Replace(namePart, "님", "")
                namePart = Trim(namePart)
                If namePart <> "" Then outName = namePart
                GoTo NextSeg
            End If
        End If

NextSeg:
    Next s
End Sub

' 문자열에서 전화번호 시작 위치 반환 (없으면 0)
Function FindPhonePos(txt As String) As Integer
    Dim prefixes As Variant
    prefixes = Array("010","011","016","017","019","02","031","032","033","041","042","043","051","052","053","054","055","061","062","063","064","070")
    Dim pr As Integer
    For pr = 0 To UBound(prefixes)
        Dim pref As String
        pref = prefixes(pr)
        Dim pos As Integer
        pos = InStr(txt, pref)
        If pos > 0 Then
            ' 앞이 공백이거나 문자열 시작이어야 함
            If pos = 1 Or Mid(txt, pos - 1, 1) = " " Then
                FindPhonePos = pos
                Exit Function
            End If
        End If
    Next pr
    FindPhonePos = 0
End Function

' phonePos 위치부터 전화번호 추출
Function ExtractPhone(txt As String, phonePos As Integer) As String
    Dim rest As String
    rest = Mid(txt, phonePos)
    ' 전화번호는 숫자, -, 공백으로 구성
    Dim phone As String
    phone = ""
    Dim c As Integer
    For c = 1 To Len(rest)
        Dim ch As String
        ch = Mid(rest, c, 1)
        If ch >= "0" And ch <= "9" Then
            phone = phone & ch
        ElseIf ch = "-" Or ch = " " Then
            ' 공백/하이픈은 전화번호 중간에만 허용
            If Len(phone) > 0 Then phone = phone & ch
        Else
            Exit For
        End If
    Next c
    ExtractPhone = Trim(phone)
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
    If ws3 Is Nothing Then Exit Sub
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
"""

print(f"Opening file: {dst}")
print(f"File exists: {os.path.exists(dst)}")

excel = win32.DispatchEx("Excel.Application")
excel.Visible = False
excel.DisplayAlerts = False

try:
    wb = excel.Workbooks.Open(dst)
    print(f"Workbook opened: {wb.Name}")

    # Find and replace CJ_Macro module
    vba_project = wb.VBProject
    print(f"VBProject accessible: {vba_project.Name}")

    found = False
    for comp in vba_project.VBComponents:
        print(f"Found module: {comp.Name} (type={comp.Type})")
        if comp.Name == "CJ_Macro":
            found = True
            code_module = comp.CodeModule
            line_count = code_module.CountOfLines
            print(f"CJ_Macro has {line_count} lines - deleting all...")
            if line_count > 0:
                code_module.DeleteLines(1, line_count)
            code_module.AddFromString(VBA_CODE)
            print(f"VBA updated successfully. New line count: {code_module.CountOfLines}")
            break

    if not found:
        print("CJ_Macro not found - adding new module")
        new_mod = vba_project.VBComponents.Add(1)  # 1 = vbext_ct_StdModule
        new_mod.Name = "CJ_Macro"
        new_mod.CodeModule.AddFromString(VBA_CODE)
        print(f"New module added with {new_mod.CodeModule.CountOfLines} lines")

    # Save before running macro
    wb.Save()
    print("Saved after VBA update")

    # Run the macro
    print("Running 전체실행 macro...")
    try:
        excel.Run("CJ_Macro.전체실행")
        print("Macro ran successfully")
    except Exception as e:
        print(f"Macro run error: {e}")
        # Try without module prefix
        try:
            excel.Run("전체실행")
            print("Macro ran successfully (without module prefix)")
        except Exception as e2:
            print(f"Second attempt error: {e2}")

    # Check results in CJ택배양식
    print("\n--- Checking CJ택배양식 for DN 71637491 ---")
    try:
        ws_cj = wb.Sheets("CJ택배양식")
        last_row = ws_cj.Cells(ws_cj.Rows.Count, 1).End(-4162).Row  # xlUp = -4162
        print(f"CJ택배양식 has {last_row - 1} data rows")
        found_row = None
        for row in range(2, last_row + 1):
            dn_val = str(ws_cj.Cells(row, 4).Value)
            if "71637491" in dn_val:
                found_row = row
                print(f"\nFound DN 71637491 at row {row}:")
                print(f"  수령인 (col A): {ws_cj.Cells(row, 1).Value}")
                print(f"  수령인 연락처 (col B): {ws_cj.Cells(row, 2).Value}")
                print(f"  수령인 주소 (col C): {ws_cj.Cells(row, 3).Value}")
                print(f"  DN NO. (col D): {ws_cj.Cells(row, 4).Value}")
                break
        if found_row is None:
            print("DN 71637491 not found in CJ택배양식")
            # Print first few rows to debug
            print("First 5 rows of DN column:")
            for row in range(2, min(7, last_row + 1)):
                print(f"  Row {row}: {ws_cj.Cells(row, 4).Value}")
    except Exception as e:
        print(f"Error checking CJ택배양식: {e}")

    wb.Save()
    wb.Close(False)
    print("\nSaved and closed successfully")

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()

finally:
    try:
        excel.DisplayAlerts = True
        excel.Quit()
        print("Excel quit")
    except:
        pass
