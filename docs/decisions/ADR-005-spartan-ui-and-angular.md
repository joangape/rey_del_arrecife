# ADR-005: Stack de Frontend con Angular 22 y Spartan UI

## Estado
Aceptado

## Contexto
Se requiere una biblioteca gráfica moderna, accesible y altamente personalizable. El usuario especificó el uso de Spartan UI (`spartan.ng`). Es necesario fijar la versión de Angular, la estrategia de estilos y la gestión de estado.

## Decisión
- **Framework**: Angular 22 (última versión compatible, Standalone Components, Signal inputs/queries, reactividad basada en Signals).
- **Estilos**: Tailwind CSS v3 con configuración extendida para Spartan UI.
- **Componentes**: Spartan UI (`@spartan-ng/brain` para accesibilidad y comportamiento headless + componentes helm basados en Tailwind).
- **Iconografía**: Lucide Angular (`lucide-angular`).

## Consecuencias
- **Positivas**: Interfaz moderna, accesible, rápida, con código fuente de componentes adaptable a conveniencia (filosofía shadcn/ui para Angular).
- **Negativas**: Mayor volumen de dependencias iniciales que deben configurarse adecuadamente en el tooling de Angular.
