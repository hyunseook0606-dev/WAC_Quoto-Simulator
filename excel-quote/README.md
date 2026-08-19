# WAC Air Quotation Simulator (Excel)

Rebuild: `python build_workbook.py`  
Baseline: `WAC_Air_Quotation_Simulator (2).xlsx` (CM email UI) — script **copies then patches** (does not redraw the whole layout).

## Essence

Generic desk air quotation tool:
- **Master_DB** — nearly-fixed rates (yellow cells)
- **입력** — cargo + auto C.W. + 참고 / 예외 + Other slots
- **견적서** — 100% refs to 입력
- Special cases (KEEP COOL etc.) → use **예외 / Other**, do not rewrite the template

## Patches applied on rebuild

- Air table: `-45` column + sample `HKG-ICN` lane
- Local master: Handling / Doc / Trucking / Terminal / CFS / Pickup / Export / RE-PACK / XRAY / Gate (short notes, no mid-table overlay)
- Input: Terminal + Other 1–6, TOTAL with optional HKD×Ex.Rate
- Guide sheet with usage

## C.W. / units

- Piece `MAX(Gross, CBM×167)` then TOTAL = Σ
- Trucking = CBM · Terminal/CFS/XRAY = C.W.(kg)

## Company cloud (Ubuntu, no Excel app)

**Step 1** — base packages (done on server):

```bash
sudo apt update
sudo apt install -y git python3 python3-pip python3-venv
python3 --version   # 3.10+
git --version
```

**Step 2** — clone repo + venv + validate:

```bash
cd ~
git clone https://github.com/hyunseook0606-dev/WAC-Logistics.git
cd WAC-Logistics/excel-quote
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python validate_cases.py
```

**Step 3** — run quotation API:

```bash
source ~/WAC-Logistics/excel-quote/.venv/bin/activate
cd ~/WAC-Logistics/excel-quote
uvicorn quote_api:app --host 0.0.0.0 --port 8000
```

Endpoints:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | liveness + master file check |
| GET | `/master/routes` | list lanes from Master_DB |
| POST | `/quote` | desk quote JSON |

Example:

```bash
curl -s http://127.0.0.1:8000/health
curl -s -X POST http://127.0.0.1:8000/quote \
  -H 'Content-Type: application/json' \
  -d '{"route":"HKG-ICN","length":110,"width":110,"height":109,"qty":1,"gross":194.5,"fx":1,"exceptions":{"handling":321,"doc":15,"trucking":0,"pickup":2000,"export":213,"repack":300}}'
```

**Master update** — edit xlsx on PC, then copy to server:

```bash
scp -P 34343 WAC_Air_Quotation_Simulator.xlsx userinternship@devops.wactracking.com:~/WAC-Logistics/excel-quote/
```

Restart `uvicorn` after replacing the file (or ask ops for systemd/nginx on port 8000).

**Note:** `export_quote_pdf.py` needs Windows Excel COM — use API JSON on Linux; PDF later via HTML/LibreOffice if needed.
