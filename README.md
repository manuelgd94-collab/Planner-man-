# Planner-man-

Planificador personal con vista diaria, semanal, mensual, trimestral y anual. Soporta multiusuario con Firebase Auth, sincronización en la nube vía Firestore, hábitos, tareas no planificadas, panel de tareas atrasadas con re-agenda por arrastre y un dashboard de estadísticas.

## Características

- **Vistas**: diaria (timeblocks), semanal, mensual, anual e historial.
- **Tareas no planificadas**: registro de trabajo ad-hoc sin afectar el cumplimiento del plan.
- **Atrasadas**: panel inferior con drag-to-timeblock para re-agendar.
- **Hábitos**: seguimiento recurrente con configuración propia.
- **Estadísticas**: dashboard de cumplimiento, adherencia, planeado vs reagendado.
- **Multiusuario**: Firebase Auth con panel de administración.
- **Sincronización en la nube**: Firestore con carga inicial bulk desde `localStorage`.
- **Seguridad**: PIN cloud-side y reglas por usuario.
- **Responsive**: barra inferior y grids adaptativos en móvil.
- **Importación desde Excel**: script Python para cargar hojas semanales históricas.

## Stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS 3
- Firebase (Auth + Firestore)
- xlsx (lectura de Excel en cliente)
- Python 3 (script de importación)

## Estructura del repositorio

```
.
├── planner-app/          App web (React + Vite)
│   ├── src/
│   │   ├── pages/        DailyPage, WeeklyPage, MonthlyPage, AnnualPage,
│   │   │                 StatsPage, HistoryPage, AdminPage
│   │   ├── components/   daily, weekly, monthly, annual, blocks, auth,
│   │   │                 layout, settings, ui
│   │   ├── store/        PlannerContext, auth, cloudSync, firebaseAuth,
│   │   │                 firebaseConfig, historyLog, localStorage,
│   │   │                 recurringTasks
│   │   ├── types/        utils/
│   │   └── App.tsx, main.tsx
│   └── package.json
├── scripts/
│   └── import_planificador.py    Importa "Planificador horario semana N" → JSON
├── data/
│   └── planificador_semanal.xlsx Datos históricos de origen
└── README.md
```

## Puesta en marcha

```bash
cd planner-app
npm install
npm run dev          # servidor Vite en local
npm run build        # type-check + build de producción
npm run lint         # ESLint
npm run preview      # sirve el build
```

## Configuración de Firebase

Las credenciales del proyecto Firebase viven en `planner-app/src/store/firebaseConfig.ts`. La autenticación se gestiona en `firebaseAuth.ts` y la sincronización con Firestore en `cloudSync.ts`. La primera apertura sube en bloque los datos históricos de `localStorage` a Firestore.

## Importar planificador desde Excel

El script `scripts/import_planificador.py` convierte hojas con el formato `Planificador horario semana N` (ver `data/planificador_semanal.xlsx`) al JSON que entiende el botón "Importar" de la app.

```bash
python scripts/import_planificador.py
python scripts/import_planificador.py --entrada mi_archivo.xlsx
python scripts/import_planificador.py --salida backup.json
python scripts/import_planificador.py --semana 16
python scripts/import_planificador.py --debug
```
