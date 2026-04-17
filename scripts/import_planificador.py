#!/usr/bin/env python3
"""
Importa datos desde data/planificador_semanal.xlsx al formato JSON
del Planificador web, listo para usar con el botón "Importar" de la app.

USO
───
  python scripts/import_planificador.py
  python scripts/import_planificador.py --semana 2026-04-14     # lunes de la semana deseada
  python scripts/import_planificador.py --salida mi_backup.json
  python scripts/import_planificador.py --crear-plantilla       # genera Excel de ejemplo

FORMATO DEL EXCEL
─────────────────
El archivo puede tener una o ambas hojas:

  Hoja "Tareas"  (obligatoria para importar tareas)
  ┌────────────┬───────┬──────────────────┬─────────────┬───────────┬────────────┐
  │ Fecha      │ Hora  │ Titulo           │ Descripcion │ Prioridad │ Estado     │
  ├────────────┼───────┼──────────────────┼─────────────┼───────────┼────────────┤
  │ 2026-04-14 │ 09:00 │ Reunión de equipo│ Revisar Q2  │ alta      │ pendiente  │
  │ Lunes      │ 11:00 │ Informe mensual  │             │ media     │ pendiente  │
  │ 2026-04-15 │       │ Llamar al cliente│             │ baja      │ completada │
  └────────────┴───────┴──────────────────┴─────────────┴───────────┴────────────┘

  • Fecha: YYYY-MM-DD, DD/MM/YYYY, o nombre del día (Lunes … Domingo).
    Si usás nombre de día, el script calcula la fecha según --semana.
  • Hora:  HH:MM  (opcional)
  • Prioridad: alta / media / baja           (default: media)
  • Estado:    pendiente / en_progreso / completada / cancelada  (default: pendiente)

  Hoja "Habitos"  (opcional)
  ┌──────────────┬───────────┬────────┐
  │ Nombre       │ Frecuencia│ Color  │
  ├──────────────┼───────────┼────────┤
  │ Ejercicio    │ diaria    │ green  │
  │ Lectura      │ diaria    │ blue   │
  │ Revisión sem.│ semanal   │ purple │
  └──────────────┴───────────┴────────┘

  • Frecuencia: diaria / semanal  (default: diaria)
  • Color: blue / green / purple / pink / orange / red / yellow / indigo  (default: blue)
"""

import argparse
import json
import sys
import uuid
from datetime import date, datetime, timedelta
from pathlib import Path

# ── constants ────────────────────────────────────────────────────────────────

DIAS_ES = {
    "lunes": 0, "martes": 1, "miercoles": 2, "miércoles": 2,
    "jueves": 3, "viernes": 4, "sabado": 5, "sábado": 5, "domingo": 6,
}

VALID_PRIORITIES = {"alta", "media", "baja"}
VALID_STATUSES   = {"pendiente", "en_progreso", "completada", "cancelada"}
VALID_FREQ       = {"diaria", "semanal"}
VALID_COLORS     = {"blue", "green", "purple", "pink", "orange", "red", "yellow", "indigo"}

SCHEMA_PREFIX = "planner:v1"


# ── helpers ───────────────────────────────────────────────────────────────────

def new_id() -> str:
    return str(uuid.uuid4())


def now_iso() -> str:
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000Z")


def week_monday(reference: date) -> date:
    """Returns the Monday of the week containing *reference*."""
    return reference - timedelta(days=reference.weekday())


def parse_date_cell(value, week_start: date) -> date | None:
    """
    Accepts:
      • datetime / date objects (from openpyxl)
      • strings: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY
      • day names in Spanish: Lunes … Domingo
    Returns a date or None if unparseable.
    """
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value

    s = str(value).strip().lower()
    if s in DIAS_ES:
        return week_start + timedelta(days=DIAS_ES[s])

    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    return None


def parse_time_cell(value) -> str | None:
    """Returns 'HH:MM' or None."""
    if value is None:
        return None
    if isinstance(value, (datetime,)):
        return value.strftime("%H:%M")
    if isinstance(value, timedelta):
        total = int(value.total_seconds())
        h, m = divmod(total // 60, 60)
        return f"{h:02d}:{m:02d}"
    s = str(value).strip()
    # HH:MM or HH:MM:SS
    parts = s.split(":")
    if len(parts) >= 2:
        try:
            h, m = int(parts[0]), int(parts[1])
            return f"{h:02d}:{m:02d}"
        except ValueError:
            pass
    return None


def normalise(value, allowed: set, default: str) -> str:
    if value is None:
        return default
    s = str(value).strip().lower()
    return s if s in allowed else default


def col_map(header_row) -> dict[str, int]:
    """Maps lowercased column name → 0-based index."""
    mapping = {}
    for i, cell in enumerate(header_row):
        if cell.value is not None:
            mapping[str(cell.value).strip().lower()] = i
    return mapping


# ── Excel reader ──────────────────────────────────────────────────────────────

def read_tasks(ws, week_start: date) -> dict[str, list]:
    """
    Returns {date_str: [task_dict, …]} from the 'Tareas' sheet.
    First row is the header.
    """
    rows = list(ws.iter_rows(values_only=False))
    if not rows:
        return {}

    cols = col_map(rows[0])

    required = {"titulo"}
    missing = required - cols.keys()
    if missing:
        print(f"  ⚠  Hoja 'Tareas': faltan columnas: {', '.join(missing)}")
        return {}

    tasks_by_date: dict[str, list] = {}
    skipped = 0

    for row in rows[1:]:
        vals = [c.value for c in row]
        if not any(vals):
            continue  # blank row

        title = str(vals[cols["titulo"]]).strip() if "titulo" in cols and vals[cols["titulo"]] else ""
        if not title:
            skipped += 1
            continue

        raw_date = vals[cols["fecha"]] if "fecha" in cols else None
        d = parse_date_cell(raw_date, week_start)
        if d is None:
            d = week_start  # fallback: Monday

        date_str = d.strftime("%Y-%m-%d")

        task = {
            "id":          new_id(),
            "title":       title,
            "description": str(vals[cols["descripcion"]]).strip() if "descripcion" in cols and vals[cols["descripcion"]] else None,
            "priority":    normalise(vals[cols["prioridad"]] if "prioridad" in cols else None, VALID_PRIORITIES, "media"),
            "status":      normalise(vals[cols["estado"]] if "estado" in cols else None, VALID_STATUSES, "pendiente"),
            "dueDate":     date_str,
            "startTime":   parse_time_cell(vals[cols["hora"]] if "hora" in cols else None),
            "tags":        [],
            "createdAt":   now_iso(),
            "updatedAt":   now_iso(),
        }
        # Remove None description
        if task["description"] is None:
            del task["description"]
        if task["startTime"] is None:
            del task["startTime"]

        tasks_by_date.setdefault(date_str, []).append(task)

    if skipped:
        print(f"  ⚠  {skipped} filas ignoradas por falta de título.")

    return tasks_by_date


def read_habits(ws) -> list:
    """Returns a list of habit dicts from the 'Habitos' sheet."""
    rows = list(ws.iter_rows(values_only=False))
    if not rows:
        return []

    cols = col_map(rows[0])
    if "nombre" not in cols:
        print("  ⚠  Hoja 'Habitos': falta la columna 'Nombre'.")
        return []

    habits = []
    for row in rows[1:]:
        vals = [c.value for c in row]
        if not any(vals):
            continue
        name = str(vals[cols["nombre"]]).strip() if vals[cols["nombre"]] else ""
        if not name:
            continue
        habits.append({
            "id":        new_id(),
            "name":      name,
            "frequency": normalise(vals[cols["frecuencia"]] if "frecuencia" in cols else None, VALID_FREQ, "diaria"),
            "color":     normalise(vals[cols["color"]] if "color" in cols else None, VALID_COLORS, "blue"),
            "createdAt": now_iso(),
        })
    return habits


# ── JSON builder ──────────────────────────────────────────────────────────────

def build_json(tasks_by_date: dict, habits: list) -> dict:
    """Assembles the full localStorage-compatible export object."""
    data = {}

    for date_str, tasks in tasks_by_date.items():
        key = f"{SCHEMA_PREFIX}:daily:{date_str}"
        data[key] = {
            "date":         date_str,
            "tasks":        tasks,
            "habitEntries": [],
        }

    if habits:
        key = f"{SCHEMA_PREFIX}:habits"
        # Merge with existing key if it appears twice (shouldn't, but safe)
        data[key] = habits

    return data


# ── template generator ────────────────────────────────────────────────────────

def create_template(output_path: Path):
    try:
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment
    except ImportError:
        print("openpyxl no encontrado. Instalalo con:  pip install openpyxl")
        sys.exit(1)

    wb = openpyxl.Workbook()

    # ── Hoja Tareas ──────────────────────────────────────────────────────────
    ws_t = wb.active
    ws_t.title = "Tareas"

    header_fill = PatternFill("solid", fgColor="1F2937")
    header_font = Font(bold=True, color="FFFFFF")
    headers = ["Fecha", "Hora", "Titulo", "Descripcion", "Prioridad", "Estado"]
    col_widths = [14, 8, 30, 35, 12, 14]

    for i, h in enumerate(headers, 1):
        cell = ws_t.cell(row=1, column=i, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")
        ws_t.column_dimensions[cell.column_letter].width = col_widths[i - 1]

    monday = week_monday(date.today())
    sample_rows = [
        [monday.strftime("%Y-%m-%d"),           "08:00", "Revisar correos",         "",                    "baja",  "pendiente"],
        [monday.strftime("%Y-%m-%d"),           "09:30", "Reunión de equipo",       "Revisar avances Q2",  "alta",  "pendiente"],
        [(monday + timedelta(1)).strftime("%Y-%m-%d"), "10:00", "Preparar informe", "Informe mensual",     "media", "pendiente"],
        ["Miércoles",                           "11:00", "Llamar al cliente",       "",                    "alta",  "pendiente"],
        ["Jueves",                              "",      "Tarea sin horario",        "",                    "media", "pendiente"],
        ["Viernes",                             "09:00", "Revisión semanal",        "Planificar próxima",  "media", "pendiente"],
    ]
    for row_data in sample_rows:
        ws_t.append(row_data)

    # ── Hoja Hábitos ─────────────────────────────────────────────────────────
    ws_h = wb.create_sheet("Habitos")
    hab_headers = ["Nombre", "Frecuencia", "Color"]
    hab_widths  = [25, 12, 12]

    for i, h in enumerate(hab_headers, 1):
        cell = ws_h.cell(row=1, column=i, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")
        ws_h.column_dimensions[cell.column_letter].width = hab_widths[i - 1]

    for row_data in [
        ["Ejercicio", "diaria",  "green"],
        ["Lectura",   "diaria",  "blue"],
        ["Meditación","diaria",  "purple"],
        ["Revisión sem.", "semanal", "orange"],
    ]:
        ws_h.append(row_data)

    # ── Hoja Instrucciones ───────────────────────────────────────────────────
    ws_i = wb.create_sheet("Instrucciones")
    ws_i.column_dimensions["A"].width = 80
    instructions = [
        "INSTRUCCIONES DE USO",
        "",
        "1. Completa la hoja 'Tareas' con tus tareas de la semana.",
        "2. (Opcional) Completa la hoja 'Habitos' con tus hábitos.",
        "3. Ejecuta el script:  python scripts/import_planificador.py",
        "4. Se generará el archivo  data/output_planificador.json",
        "5. Abre el Planificador → barra lateral → Importar → selecciona ese archivo.",
        "6. Recarga la página. ¡Tus datos estarán cargados!",
        "",
        "COLUMNA 'Fecha' admite:",
        "  • Fecha exacta:    2026-04-14  o  14/04/2026",
        "  • Nombre del día:  Lunes, Martes, Miércoles, Jueves, Viernes, Sábado, Domingo",
        "",
        "COLUMNA 'Prioridad':  alta | media | baja",
        "COLUMNA 'Estado':     pendiente | en_progreso | completada | cancelada",
        "COLUMNA 'Color' (hábitos): blue | green | purple | pink | orange | red | yellow | indigo",
        "",
        "Para generar esta plantilla nuevamente:",
        "  python scripts/import_planificador.py --crear-plantilla",
    ]
    for i, line in enumerate(instructions, 1):
        cell = ws_i.cell(row=i, column=1, value=line)
        if i == 1:
            cell.font = Font(bold=True, size=13)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(output_path)
    print(f"✓ Plantilla creada: {output_path}")


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Importa planificador_semanal.xlsx → JSON para el Planificador web."
    )
    parser.add_argument(
        "--entrada",
        default="data/planificador_semanal.xlsx",
        help="Ruta al archivo Excel (default: data/planificador_semanal.xlsx)",
    )
    parser.add_argument(
        "--salida",
        default="data/output_planificador.json",
        help="Ruta del JSON de salida (default: data/output_planificador.json)",
    )
    parser.add_argument(
        "--semana",
        default=None,
        help="Cualquier fecha de la semana a importar, formato YYYY-MM-DD "
             "(default: semana actual). Aplica cuando Fecha es nombre de día.",
    )
    parser.add_argument(
        "--crear-plantilla",
        action="store_true",
        help="Genera data/planificador_semanal.xlsx de ejemplo y termina.",
    )
    args = parser.parse_args()

    entrada  = Path(args.entrada)
    salida   = Path(args.salida)

    # ── plantilla ────────────────────────────────────────────────────────────
    if args.crear_plantilla:
        create_template(entrada)
        return

    # ── semana de referencia ─────────────────────────────────────────────────
    if args.semana:
        try:
            ref_date = datetime.strptime(args.semana, "%Y-%m-%d").date()
        except ValueError:
            print(f"Error: formato de --semana inválido. Use YYYY-MM-DD.")
            sys.exit(1)
    else:
        ref_date = date.today()

    week_start = week_monday(ref_date)
    print(f"Semana: {week_start.strftime('%d/%m/%Y')} al "
          f"{(week_start + timedelta(6)).strftime('%d/%m/%Y')}")

    # ── leer Excel ───────────────────────────────────────────────────────────
    if not entrada.exists():
        print(f"\n  Archivo no encontrado: {entrada}")
        print("  Primero generá la plantilla con:")
        print("    python scripts/import_planificador.py --crear-plantilla")
        sys.exit(1)

    try:
        import openpyxl
    except ImportError:
        print("openpyxl no encontrado. Instalalo con:  pip install openpyxl")
        sys.exit(1)

    wb = openpyxl.load_workbook(entrada, data_only=True)
    sheet_names_lower = {s.lower(): s for s in wb.sheetnames}

    print(f"\nLeyendo: {entrada}")
    print(f"  Hojas encontradas: {', '.join(wb.sheetnames)}")

    # Tasks
    tasks_by_date: dict[str, list] = {}
    if "tareas" in sheet_names_lower:
        ws_t = wb[sheet_names_lower["tareas"]]
        tasks_by_date = read_tasks(ws_t, week_start)
        total_tasks = sum(len(v) for v in tasks_by_date.values())
        print(f"  Tareas leídas:  {total_tasks} en {len(tasks_by_date)} día(s)")
    else:
        print("  ⚠  Hoja 'Tareas' no encontrada — se saltea la importación de tareas.")

    # Habits
    habits: list = []
    if "habitos" in sheet_names_lower or "hábitos" in sheet_names_lower:
        key = "habitos" if "habitos" in sheet_names_lower else "hábitos"
        ws_h = wb[sheet_names_lower[key]]
        habits = read_habits(ws_h)
        print(f"  Hábitos leídos: {len(habits)}")
    else:
        print("  (Hoja 'Habitos' no encontrada — se omite)")

    if not tasks_by_date and not habits:
        print("\nNada para exportar. Verificá el formato del Excel.")
        sys.exit(1)

    # ── construir JSON ───────────────────────────────────────────────────────
    output_data = build_json(tasks_by_date, habits)

    salida.parent.mkdir(parents=True, exist_ok=True)
    with open(salida, "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    print(f"\n✓ Archivo generado: {salida}")
    print("\nPasos para importar al Planificador:")
    print("  1. Abrí la app en el navegador")
    print("  2. En la barra lateral → sección 'Datos' → botón 'Importar'")
    print(f"  3. Seleccioná el archivo:  {salida}")
    print("  4. Recargá la página (F5)")


if __name__ == "__main__":
    main()
