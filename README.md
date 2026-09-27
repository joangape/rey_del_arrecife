# 🪸 Rey del Arrecife

Sistema integral de gestión de inventario, trazabilidad de piezas de joyería/coral, control de gastos extra y liquidaciones para **Rey del Arrecife sevillano SL**.

---

## 🏛️ Estructura del Proyecto

```
rey_del_arrecife/
├── .agents/               # Skills instalados para el agente IA (Spartan, PocketBase, Angular)
├── backend/               # Servidor PocketBase, hooks de seguridad y scripts de seed
│   ├── pb_hooks/          # Hook para validación de lista blanca de Google OAuth
│   ├── scripts/           # Importador y migrador de datos CSV
│   └── docker-compose.yml # Entorno local de PocketBase
├── frontend/              # Aplicación Angular 22 con Spartan UI & Tailwind CSS
├── deploy/                # Especificaciones para despliegue en Synology Container Manager
│   ├── docker-compose.yml # Proyecto multi-contenedor para DSM Synology
│   └── nginx.conf         # Proxy inverso y servidor SPA
├── docs/                  # 📖 Living Documents y Registro de Decisiones de Arquitectura (ADRs)
│   ├── ARCHITECTURE.md
│   ├── DATA_MODEL.md
│   ├── PERMISSIONS_MATRIX.md
│   ├── DEPLOYMENT_SYNOLOGY.md
│   ├── DEVELOPMENT_GUIDE.md
│   └── decisions/         # ADRs (ADR-001 a ADR-005)
├── Makefile               # Orquestador del harness de desarrollo
└── package.json           # Atajos de ejecución raíz
```

---

## 🚀 Inicio Rápido (Entorno Híbrido)

### 1. Iniciar PocketBase local
```bash
make backend-up
```
El panel de administración estará disponible en: [http://localhost:8090/_/](http://localhost:8090/_/)

### 2. Cargar datos históricos desde los CSVs
```bash
make seed
```
Este comando procesará los dos ficheros de la raíz:
- `Mis Corales - Rey del Arrecife sevillano SL - Inventario.csv`
- `Mis Corales - Rey del Arrecife sevillano SL - Gastos extra.csv`

### 3. Iniciar el Frontend Angular
```bash
make dev
```
La aplicación web arrancará en: [http://localhost:4200](http://localhost:4200)

---

## 📖 Documentación Viva

Consulta el directorio [`docs/`](file:///Users/josegarces/Coding_projects/rey_del_arrecife/docs/README.md) para más detalles:
- [Arquitectura del Sistema](file:///Users/josegarces/Coding_projects/rey_del_arrecife/docs/ARCHITECTURE.md)
- [Modelo de Datos](file:///Users/josegarces/Coding_projects/rey_del_arrecife/docs/DATA_MODEL.md)
- [Matriz de Permisos (Admin vs Partner)](file:///Users/josegarces/Coding_projects/rey_del_arrecife/docs/PERMISSIONS_MATRIX.md)
- [Guía de Despliegue en Synology NAS](file:///Users/josegarces/Coding_projects/rey_del_arrecife/docs/DEPLOYMENT_SYNOLOGY.md)
- [Guía de Desarrollo](file:///Users/josegarces/Coding_projects/rey_del_arrecife/docs/DEVELOPMENT_GUIDE.md)
- [Decisiones de Arquitectura (ADRs)](file:///Users/josegarces/Coding_projects/rey_del_arrecife/docs/decisions/)
