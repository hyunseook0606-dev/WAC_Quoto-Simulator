# -*- coding: utf-8 -*-
"""Fix 견적서 print layout + re-export PDF so content is not clipped."""
from __future__ import annotations

import sys
from pathlib import Path

from openpyxl import load_workbook
from openpyxl.worksheet.page import PageMargins

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent
XLSX = ROOT / "WAC_Air_Quotation_Simulator.xlsx"
PDF = ROOT / "WAC_HKG-ICN_KEEPCOOL_Quotation.pdf"


def configure_quote_print(ws):
    ws.print_area = "B2:G42"
    ws.page_setup.orientation = "portrait"
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.page_setup.fitToPage = True
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 1
    ws.page_setup.horizontalCentered = True
    ws.print_options.horizontalCentered = True
    ws.page_margins = PageMargins(
        left=0.4, right=0.4, top=0.5, bottom=0.5, header=0.2, footer=0.2
    )
    # Readable widths for PDF
    ws.column_dimensions["A"].width = 2
    ws.column_dimensions["B"].width = 16
    ws.column_dimensions["C"].width = 20
    ws.column_dimensions["D"].width = 12
    ws.column_dimensions["E"].width = 14
    ws.column_dimensions["F"].width = 14
    ws.column_dimensions["G"].width = 12
    # Remark / TOTAL breathing room
    ws.row_dimensions[23].height = 36
    ws.row_dimensions[39].height = 28
    ws.row_dimensions[40].height = 28
    if ws.row_dimensions[42].height is None or ws.row_dimensions[42].height < 18:
        ws.row_dimensions[42].height = 20


def export_pdf():
    try:
        import win32com.client as win32
    except ImportError:
        import subprocess

        subprocess.check_call([sys.executable, "-m", "pip", "install", "pywin32", "-q"])
        import win32com.client as win32

    excel = win32.DispatchEx("Excel.Application")
    excel.Visible = False
    excel.DisplayAlerts = False
    try:
        wb = excel.Workbooks.Open(str(XLSX.resolve()))
        ws = None
        for s in wb.Worksheets:
            if s.Name == "견적서":
                ws = s
                break
        if ws is None:
            raise SystemExit("견적서 sheet missing")

        ws.PageSetup.PrintArea = "$B$2:$G$42"
        ws.PageSetup.Orientation = 1  # xlPortrait
        ws.PageSetup.PaperSize = 9  # xlPaperA4
        ws.PageSetup.Zoom = False
        ws.PageSetup.FitToPagesWide = 1
        ws.PageSetup.FitToPagesTall = 1
        ws.PageSetup.LeftMargin = excel.InchesToPoints(0.4)
        ws.PageSetup.RightMargin = excel.InchesToPoints(0.4)
        ws.PageSetup.TopMargin = excel.InchesToPoints(0.5)
        ws.PageSetup.BottomMargin = excel.InchesToPoints(0.5)
        ws.PageSetup.HeaderMargin = excel.InchesToPoints(0.2)
        ws.PageSetup.FooterMargin = excel.InchesToPoints(0.2)
        ws.PageSetup.CenterHorizontally = True

        pdf_path = str(PDF.resolve())
        # 0=xlTypePDF, Quality=0 standard, IncludeDocProps, IgnorePrintAreas=False
        ws.ExportAsFixedFormat(
            Type=0,
            Filename=pdf_path,
            Quality=0,
            IncludeDocProperties=True,
            IgnorePrintAreas=False,
            OpenAfterPublish=False,
        )
        wb.Close(False)
        print(f"PDF OK: {PDF}")
        for dest in (
            Path.home() / "Downloads" / PDF.name,
            ROOT.parents[0] / "public" / "excel" / PDF.name,
        ):
            try:
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(PDF.read_bytes())
                print(f"Copied -> {dest}")
            except OSError as e:
                print(f"Skip {dest}: {e}")
    finally:
        excel.Quit()


def main():
    wb = load_workbook(XLSX)
    configure_quote_print(wb["견적서"])
    wb.save(XLSX)
    for dest in (
        ROOT.parents[0] / "public" / "excel" / XLSX.name,
        Path.home() / "Downloads" / XLSX.name,
    ):
        try:
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(XLSX.read_bytes())
            print(f"XLSX -> {dest}")
        except OSError as e:
            print(f"Skip {dest}: {e}")
    export_pdf()


if __name__ == "__main__":
    main()
