# excel-quote (optional)

Python copy of the Excel quote engine. The **web desk does not call this**. It is for:

- sanity-checking totals against the xlsx
- a future API, if history ever leaves localStorage

```bash
cd excel-quote
python -m venv .venv
.venv/Scripts/activate   # Windows
pip install -r requirements.txt
python validate_cases.py
```

Workbook used by the UI is `../public/excel/WAC_Air_Quotation_Simulator.xlsx`.
