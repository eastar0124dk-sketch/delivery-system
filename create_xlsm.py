import win32com.client as win32
import os
import sys

src = r"C:\Users\dkchoi\Downloads\경동 , cj 택배 송장 메트로\0401 ADD 5시45분.XLSX"
dst = r"C:\Users\dkchoi\Downloads\경동 , cj 택배 송장 메트로\메틀러토레도_CJ택배_매크로.xlsm"

VBA_CODE = r"""Option Explicit

Sub 전체실행()
    Application.ScreenUpdating = False
    Application.Calculation = xlCalculationManual

    Call Sheet1_to_Sheet3
    Call Sheet3_to_CJ택배양식

    Application.ScreenUpdating = True
    Application.Calculation = xlCalculationAutomatic

    MsgBox "완료! Sheet3 및 CJ택배양식 시트가 업데이트되었습니다.", vbInformation, "메틀러토레도 CJ 택배 매크로"
End Sub

Sub Sheet1_to_Sheet3()
    Dim ws1 As Worksheet, ws3 As Worksheet
    Dim lastRow As Long, i As Long, destRow As Long
    Dim col As Integer

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

    ' 헤더 작성 (A~N 복사, O에 통합주소 삽입, P=담당자, Q=연락처, R~Z=IM원본)
    For col = 1 To 14
        ws3.Cells(1, col).Value = ws1.Cells(1, col).Value
    Next col
    ws3.Cells(1, 15).Value = "CJ주소(통합)"
    ws3.Cells(1, 16).Value = ws1.Cells(1, 15).Value  ' Z9 Contactor
    ws3.Cells(1, 17).Value = ws1.Cells(1, 16).Value  ' Z9 Phone
    For col = 17 To 25
        ws3.Cells(1, col + 1).Value = ws1.Cells(1, col).Value
    Next col
    ws3.Rows(1).Font.Bold = True
    ws3.Rows(1).Interior.Color = RGB(189, 215, 238)

    ' 중복 체크
    Dim seenDict As Object
    Set seenDict = CreateObject("Scripting.Dictionary")

    lastRow = ws1.Cells(ws1.Rows.Count, 1).End(xlUp).Row
    destRow = 2

    For i = 2 To lastRow
        Dim route As String
        route = Trim(CStr(ws1.Cells(i, 3).Value))

        ' ZKR170, ZKR193, ZKR194만
        If route <> "ZKR170" And route <> "ZKR193" And route <> "ZKR194" Then GoTo NextRow

        ' 중복제거 (배송번호 기준)
        Dim delNum As String
        delNum = Trim(CStr(ws1.Cells(i, 1).Value))
        If seenDict.Exists(delNum) Then GoTo NextRow
        seenDict.Add delNum, True

        ' A~N 복사
        For col = 1 To 14
            ws3.Cells(destRow, col).Value = ws1.Cells(i, col).Value
        Next col

        ' IM 데이터 여부 확인 (Sheet1 Q=17열)
        Dim imComp As String
        imComp = Trim(CStr(ws1.Cells(i, 17).Value))

        If imComp <> "" Then
            ' IM 주소 우선 적용
            ws3.Cells(destRow, 5).Value = ws1.Cells(i, 17).Value   ' E = IM 업체명
            ws3.Cells(destRow, 6).Value = ws1.Cells(i, 18).Value   ' F = IM Name2
            ws3.Cells(destRow, 7).Value = ws1.Cells(i, 19).Value   ' G = IM Name3
            ws3.Cells(destRow, 8).Value = ws1.Cells(i, 20).Value   ' H = IM 우편번호
            ws3.Cells(destRow, 9).Value = ws1.Cells(i, 21).Value   ' I = IM 도/시
            ws3.Cells(destRow, 10).Value = ws1.Cells(i, 22).Value  ' J = IM 시/군
            ws3.Cells(destRow, 11).Value = ws1.Cells(i, 23).Value  ' K = IM 도로명
            ws3.Cells(destRow, 12).Value = ws1.Cells(i, 24).Value  ' L = IM 상세주소
            ' M열(13)은 무시
        End If

        ' ========== 통합주소 생성 (Sheet3 O = col 15) ==========
        Dim combinedAddr As String
        combinedAddr = ""

        ' 1순위: B열 코멘트에 주소 패턴 있으면
        Dim bTxt As String
        bTxt = Trim(CStr(ws1.Cells(i, 2).Value))
        Dim bAddr As String
        bAddr = ExtractKoreanAddress(bTxt)

        If bAddr <> "" Then
            combinedAddr = bAddr
        Else
            ' 2순위: IM 있으면 IM주소, 없으면 기본주소 (I+J+K+L+E+G+N, M제외)
            Dim parts(6) As String
            parts(0) = Trim(CStr(ws3.Cells(destRow, 9).Value))    ' I
            parts(1) = Trim(CStr(ws3.Cells(destRow, 10).Value))   ' J
            parts(2) = Trim(CStr(ws3.Cells(destRow, 11).Value))   ' K
            parts(3) = Trim(CStr(ws3.Cells(destRow, 12).Value))   ' L
            parts(4) = Trim(CStr(ws3.Cells(destRow, 5).Value))    ' E 업체명
            parts(5) = Trim(CStr(ws3.Cells(destRow, 7).Value))    ' G 지점
            parts(6) = Trim(CStr(ws3.Cells(destRow, 14).Value))   ' N 부서

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

        ' ========== 담당자/연락처 (P=16, Q=17) ==========
        Dim cName As String, cPhone As String
        cName = Trim(CStr(ws1.Cells(i, 15).Value))   ' Sheet1 O
        cPhone = Trim(CStr(ws1.Cells(i, 16).Value))  ' Sheet1 P

        ' 비어있으면 Y열(25)에서 파싱
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

        ' 여전히 비어있으면 노란색 표시
        If Trim(CStr(ws3.Cells(destRow, 16).Value)) = "" Then
            ws3.Cells(destRow, 16).Interior.Color = RGB(255, 255, 0)
            ws3.Cells(destRow, 16).Value = "확인필요"
        End If
        If Trim(CStr(ws3.Cells(destRow, 17).Value)) = "" Then
            ws3.Cells(destRow, 17).Interior.Color = RGB(255, 255, 0)
            ws3.Cells(destRow, 17).Value = "확인필요"
        End If

        ' IM 원본 보존: Sheet1 Q~Y(17~25) → Sheet3 R~Z(18~26)
        For col = 17 To 25
            ws3.Cells(destRow, col + 1).Value = ws1.Cells(i, col).Value
        Next col

        destRow = destRow + 1
NextRow:
    Next i

    ws3.Columns.AutoFit
End Sub

Function ExtractKoreanAddress(txt As String) As String
    If Len(Trim(txt)) = 0 Then
        ExtractKoreanAddress = ""
        Exit Function
    End If

    Dim regions As Variant
    regions = Array("서울특별시", "부산광역시", "대구광역시", "인천광역시", "광주광역시", _
                    "대전광역시", "울산광역시", "세종특별자치시", "경기도", "강원도", _
                    "충청북도", "충청남도", "전라북도", "전라남도", "경상북도", "경상남도", _
                    "제주특별자치도", "서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산")

    Dim hasRegion As Boolean, hasRoad As Boolean
    hasRegion = False
    hasRoad = False

    Dim r As Integer
    For r = 0 To UBound(regions)
        If InStr(txt, regions(r)) > 0 Then
            hasRegion = True
            Exit For
        End If
    Next r

    If InStr(txt, "번길") > 0 Or (InStr(txt, "로 ") > 0) Or (InStr(txt, "길 ") > 0) Then
        hasRoad = True
    End If

    If hasRegion And hasRoad Then
        ExtractKoreanAddress = txt
    Else
        ExtractKoreanAddress = ""
    End If
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
            If (Left(w, 3) = "010" Or Left(w, 3) = "011" Or Left(w, 3) = "016" Or _
                Left(w, 3) = "017" Or Left(w, 3) = "018" Or Left(w, 3) = "019" Or _
                Left(w, 2) = "02" Or Left(w, 3) = "031" Or Left(w, 3) = "032" Or _
                Left(w, 3) = "033" Or Left(w, 3) = "041" Or Left(w, 3) = "042" Or _
                Left(w, 3) = "043" Or Left(w, 3) = "051" Or Left(w, 3) = "052" Or _
                Left(w, 3) = "053" Or Left(w, 3) = "054" Or Left(w, 3) = "055" Or _
                Left(w, 3) = "061" Or Left(w, 3) = "062" Or Left(w, 3) = "063" Or _
                Left(w, 3) = "064" Or Left(w, 3) = "070") Then
                phoneIdx = i
                Exit For
            End If
        End If
    Next i

    If phoneIdx <= 0 Then
        outName = Trim(yVal)
        outPhone = ""
        If phoneIdx = 0 Then
            outPhone = Trim(words(0))
            outName = ""
            For i = 1 To UBound(words)
                outName = Trim(outName & " " & words(i))
            Next i
        End If
    Else
        outName = ""
        For i = 0 To phoneIdx - 1
            outName = Trim(outName & " " & words(i))
        Next i
        outPhone = ""
        For i = phoneIdx To UBound(words)
            outPhone = outPhone & words(i)
        Next i
    End If
End Sub

Sub Sheet3_to_CJ택배양식()
    Dim ws3 As Worksheet, wsCJ As Worksheet
    Dim lastRow As Long, i As Long, destRow As Long, col As Integer

    On Error Resume Next
    Set ws3 = ThisWorkbook.Sheets("Sheet3")
    On Error GoTo 0

    If ws3 Is Nothing Then
        MsgBox "Sheet3가 없습니다. 먼저 [전체실행] 버튼을 눌러주세요.", vbExclamation
        Exit Sub
    End If

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

    ' 헤더
    Dim hdrs As Variant
    hdrs = Array("수령인", "수령인 연락처", "수령인 주소", "DN NO.", "수량", _
                 "발송인", "발송인 연락처", "발송인 주소", "택배기사 요청사항", "운송장번호")
    For col = 1 To 10
        wsCJ.Cells(1, col).Value = hdrs(col - 1)
    Next col
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
        wsCJ.Cells(destRow, 3).Value = ws3.Cells(i, 15).Value   ' 수령인 주소
        wsCJ.Cells(destRow, 4).Value = ws3.Cells(i, 1).Value    ' DN NO.
        wsCJ.Cells(destRow, 5).Value = 1                         ' 수량
        wsCJ.Cells(destRow, 6).Value = "메틀러토레도코리아 물류센터"
        wsCJ.Cells(destRow, 7).Value = "070-4677-1824"
        wsCJ.Cells(destRow, 8).Value = "경기 김포시 고촌읍 아라육로57번길 108 CJ대한통운 강서1팀 ACT2창고"
        ' I, J열 비워둠

        ' 확인필요 항목 노란색 표시
        If rName = "" Or rName = "확인필요" Then
            wsCJ.Cells(destRow, 1).Interior.Color = RGB(255, 255, 0)
        End If
        If rPhone = "" Or rPhone = "확인필요" Then
            wsCJ.Cells(destRow, 2).Interior.Color = RGB(255, 255, 0)
        End If

        destRow = destRow + 1
    Next i

    ' 열 너비
    wsCJ.Columns("A").ColumnWidth = 15
    wsCJ.Columns("B").ColumnWidth = 16
    wsCJ.Columns("C").ColumnWidth = 65
    wsCJ.Columns("D").ColumnWidth = 12
    wsCJ.Columns("E").ColumnWidth = 6
    wsCJ.Columns("F").ColumnWidth = 24
    wsCJ.Columns("G").ColumnWidth = 16
    wsCJ.Columns("H").ColumnWidth = 52
    wsCJ.Columns("I:J").ColumnWidth = 18

    ' 행 높이 자동
    wsCJ.Rows.AutoFit
End Sub
"""

excel = None
wb = None

try:
    excel = win32.Dispatch("Excel.Application")
    excel.Visible = False
    excel.DisplayAlerts = False

    print(f"Opening source: {src}")
    wb = excel.Workbooks.Open(src)

    # Remove existing dst if present
    if os.path.exists(dst):
        os.remove(dst)
        print(f"Removed existing: {dst}")

    print(f"Saving as xlsm: {dst}")
    wb.SaveAs(dst, 52)  # 52 = xlOpenXMLWorkbookMacroEnabled
    print("SaveAs done")

    # Add VBA module
    try:
        vba_module = wb.VBProject.VBComponents.Add(1)  # 1 = vbext_ct_StdModule
        vba_module.Name = "CJ_Macro"
        vba_module.CodeModule.AddFromString(VBA_CODE)
        print("VBA module added successfully")
    except Exception as e:
        print(f"VBA add error: {e}")
        print("Tip: Enable 'Trust access to the VBA project object model' in Excel Trust Center.")

    # Save after adding VBA
    wb.Save()
    print("Saved after VBA injection")

    # Run the macro to pre-populate sheets
    try:
        excel.Run("CJ_Macro.전체실행")
        print("Macro 전체실행 ran successfully")
    except Exception as e:
        print(f"Macro run error: {e}")

    # Add a button on Sheet1 to run the macro
    try:
        ws1 = wb.Worksheets(1)
        btn = ws1.Buttons().Add(10, 10, 160, 30)
        btn.Caption = "전체실행 (매크로 실행)"
        btn.OnAction = "CJ_Macro.전체실행"
        print("Button added to Sheet1")
    except Exception as e:
        print(f"Button add error: {e}")

    wb.Save()
    wb.Close(False)
    wb = None
    print(f"\nSuccess! Created: {dst}")

except Exception as e:
    print(f"Fatal error: {e}")
    import traceback
    traceback.print_exc()

finally:
    if wb is not None:
        try:
            wb.Close(False)
        except:
            pass
    if excel is not None:
        try:
            excel.Quit()
        except:
            pass
