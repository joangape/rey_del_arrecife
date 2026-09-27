# ADR-001: Estructura de Monorepositorio Modular

## Estado
Aceptado

## Contexto
El proyecto requiere albergar código frontend (Angular), backend (PocketBase), scripts de despliegue para Synology NAS y un conjunto de living documents. Era necesario elegir entre una estructura monolítica con el frontend en la raíz, un workspace gestionado con herramientas pesadas (como Nx), o un monorepo modular ligero.

## Decisión
Adoptar una estructura de monorepo modular limpio y desacoplado:
- `/frontend`: Aplicación web Angular 22.
- `/backend`: Dockerfile, hooks, migraciones y scripts de PocketBase.
- `/deploy`: Configuraciones de producción para Synology Container Manager (Docker Compose + Nginx).
- `/docs`: Documentación viva (Living Documents) y ADRs.
- Raíz: `Makefile`, `package.json` para orquestación y `.agents/skills` para el asistente IA.

## Consecuencias
- **Positivas**: Separación clara de responsabilidades, portabilidad máxima, facilidad para empaquetar tanto para desarrollo local como para el NAS Synology.
- **Negativas**: Requiere coordinar dependencias entre frontend y backend si se comparten tipos TypeScript (resuelto mediante scripts de sincronización o SDK de PocketBase).
