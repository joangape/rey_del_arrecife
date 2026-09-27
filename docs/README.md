# 📖 Living Documents - Rey del Arrecife

Este directorio contiene la documentación viva (*living documents*) del proyecto **Rey del Arrecife**.
A diferencia de la documentación estática, estos documentos deben evolucionar con cada cambio en la arquitectura, el modelo de datos, la seguridad o las decisiones del sistema.

## 🧭 Índice de Documentos

1. [Plan de Implementación Integral (Roadmap)](file:///Users/josegarces/Coding_projects/rey_del_arrecife/docs/IMPLEMENTATION_PLAN.md)
   - Mapa de ruta vivo del proyecto: fases, tareas granulares y seguimiento de estado.
2. [Arquitectura del Sistema](file:///Users/josegarces/Coding_projects/rey_del_arrecife/docs/ARCHITECTURE.md)
   - Topología general, contenedores, flujo de peticiones, red y puertos.
3. [Modelo de Datos](file:///Users/josegarces/Coding_projects/rey_del_arrecife/docs/DATA_MODEL.md)
   - Esquemas de Pocketbase: `inventario`, `gastos_extra`, `users`. Tipos, relaciones y reglas.
4. [Matriz de Permisos (RBAC)](file:///Users/josegarces/Coding_projects/rey_del_arrecife/docs/PERMISSIONS_MATRIX.md)
   - Detalle de capacidades y restricciones para `admin` vs `partner`.
5. [Guía de Despliegue en Synology](file:///Users/josegarces/Coding_projects/rey_del_arrecife/docs/DEPLOYMENT_SYNOLOGY.md)
   - Configuración en Synology Container Manager (Proyecto Docker Compose), volúmenes persistentes y Reverse Proxy.
6. [Guía de Desarrollo Local](file:///Users/josegarces/Coding_projects/rey_del_arrecife/docs/DEVELOPMENT_GUIDE.md)
   - Flujo de trabajo híbrido (Pocketbase en Docker + Angular en host), comandos, seed inicial y pruebas.
7. [Registro de Decisiones Arquitectónicas (ADRs)](file:///Users/josegarces/Coding_projects/rey_del_arrecife/docs/decisions/)
   - Historial inmutable de las decisiones técnicas clave tomadas en el proyecto.

## 🔄 Reglas de Mantenimiento de Living Docs

- **Regla 1:** Cualquier cambio en una colección o campo de Pocketbase debe actualizarse inmediatamente en [DATA_MODEL.md](file:///Users/josegarces/Coding_projects/rey_del_arrecife/docs/DATA_MODEL.md).
- **Regla 2:** Cualquier cambio en las restricciones de acceso o roles debe quedar registrado en [PERMISSIONS_MATRIX.md](file:///Users/josegarces/Coding_projects/rey_del_arrecife/docs/PERMISSIONS_MATRIX.md).
- **Regla 3:** Toda nueva decisión estructural relevante requiere crear un nuevo registro en `docs/decisions/ADR-XXX.md`.
