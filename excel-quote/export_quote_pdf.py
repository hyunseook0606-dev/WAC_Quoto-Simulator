# -*- coding: utf-8 -*-
"""Export 견적서 to PDF via Excel COM."""
from pathlib import Path
import sys

sys.stdout.reconfigure(encoding="utf-8")

try:
    import win32com.client as win32
except ImportError:
    import subprocess

    subprocess.check_call([sys.executable, "-m", "pip", "install", "pywin32", "-q"])
    import win32com.client as win32

ROOT = Path(__file__).resolve().parent
XLSX = ROOT / "WAC_Air_Quotation_Simulator.xlsx"
PDF = ROOT / "WAC_HKG-ICN_KEEPCOOL_Quotation.pdf"
DL = Path.home() / "Downloads" / "WAC_HKG-ICN_KEEPCOOL_Quotation.pdf"

excel = win32.DispatchEx("Excel.Application")
excel.Visible = False
excel.DisplayAlerts = False
try:
    wb = excel.Workbooks.Open(str(XLSX.resolve()))
    # Find quote sheet
    ws = None
    for s in wb.Worksheets:
        if s.Name == "견적서":
            ws = s
            break
    if ws is None:
        ws = wb.Worksheets(3)
    # 0 = xlTypePDF
    ws.ExportAsFixedFormat(0, str(PDF.resolve()))
    wb.Close(False)
    print(f"Wrote {PDF}")
    DL.write_bytes(PDF.read_bytes())
    print(f"Copied {DL}")
finally:
    excel.Quit()
