# excel-quote (optional)

Standalone Python copy of the Excel quote engine. The **web desk does not call this**.

Use it to sanity-check totals against the workbook, or as a reference if you add a separate calc API later.

```bash
cd excel-quote
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python validate_cases.py
```

Canonical workbook for the React app:

`../public/excel/WAC_Air_Quotation_Simulator.xlsx`

Team quote **history** for the desk is handled by `server/deskServer.mjs` (`data/shared-history.json`), not by this folder.
