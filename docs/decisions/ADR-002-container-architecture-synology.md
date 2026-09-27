# ADR-002: Arquitectura de Contenedores en Synology (Proyecto Docker Compose)

## Estado
Aceptado

## Contexto
El despliegue en el Synology NAS doméstico debe organizarse como un único "Proyecto" en Synology Container Manager. Se barajó servir la SPA directamente desde PocketBase (`pb_public`), o emplear dos contenedores desacoplados con puertos expuestos separados, o un patrón con Nginx sirviendo la SPA y actuando como Reverse Proxy.

## Decisión
Desplegar 2 contenedores coordinados en el `docker-compose.yml` del proyecto:
1. `pocketbase`: motor de base de datos y API interna.
2. `frontend` (Nginx): sirve los estáticos compilados de Angular y reenvía `/api/*` y `/_/*` hacia `pocketbase:8090`.

## Consecuencias
- **Positivas**: Todo se consume bajo un único puerto externo, eliminando por completo problemas de CORS y certificados SSL mixtos. PocketBase permanece protegido en la red privada interna del Docker.
- **Negativas**: Añade un contenedor Nginx adicional muy ligero (~20MB de RAM).
