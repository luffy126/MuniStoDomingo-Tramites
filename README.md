# MuniStoDomingo-Tramites — Backend

Rama con la lógica de servidor del proyecto: API, conexión a la base de datos y
procesamiento de la información.

La documentación general del proyecto (problema, requerimientos funcionales y no
funcionales, integrantes) está en la rama `main`. El código de la interfaz está en
la rama `frontend`.

## Estado

Estructura inicial. El stack todavía no está definido por el equipo; `schema.sql`
es una primera propuesta derivada del modelo de datos que ya usa el frontend y
debe revisarse antes de implementar.

## Base de datos

`schema.sql` crea las tablas necesarias para el sistema:

| Tabla | Para qué |
| --- | --- |
| `usuario` | Vecinos y funcionarios municipales, con su rol |
| `tramite` | Catálogo de trámites disponibles |
| `requisito` | Requisitos de cada trámite |
| `solicitud` | Trámites iniciados por un vecino y su estado |
| `notificacion` | Avisos enviados al vecino |

```bash
# Ejemplo de carga (MySQL/MariaDB)
mysql -u usuario -p nombre_bd < schema.sql
```
