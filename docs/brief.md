# Brief del MVP: gestión de turnos para barbería

Brief original, con las respuestas del dueño del proyecto. Borrador del 27 de octubre de 2026. Las decisiones finales están en [spec.md](spec.md), que prevalece si hay diferencias.

## 1. Negocio

- Nombre de la barbería: Chachi's Barber.
- Cantidad de barberos: 2.
- Sucursales: 1.
- Horario: de 10 a 22 hs.
- Cómo se reservan hoy los turnos: por WhatsApp, o las personas vienen directamente al local.
- Problema principal: la gestión de los clientes. Necesita tener control de la gente que viene y priorizar a los que tienen turno y dejaron seña.

## 2. Usuarios

- Cliente: reserva un turno, paga la seña y puede cancelar según las reglas.
- Administrador (dueño): ve la agenda, confirma señas, cancela turnos, configura servicios y horarios.
- Barbero: puede ver su propia agenda y bloquear los horarios en los que no estará, según el día.

## 3. Servicios

| Servicio | Duración | Precio | Seña |
|---|---|---|---|
| Corte | 40 min | $15.000 | 40% |
| Barba y perfilado de cejas | 40 min | $15.000 | 40% |

- Se puede reservar más de un servicio en el mismo turno.
- La seña debe ser el 40% del servicio.

## 4. Horarios

- Atención: de lunes a domingo, de 10 a 22 hs.
- Descanso: de 12 a 13 hs.
- Feriados y días cerrados: a elección del barbero.
- Cada barbero tiene su propio horario.
- Tiempo de preparación entre clientes: 5 minutos.

## 5. Reglas de los turnos

- Anticipación mínima para reservar: 2 horas.
- Reserva hasta 7 días hacia adelante.
- Turnos activos por cliente: máximo 2.
- Cancelación: hasta 24 horas antes.
- Reprogramación: según la consideración del barbero; si no, no la hay.

## 6. Seña del 40%

- Se usa mayormente Mercado Pago, pero también debe poder reservarse en efectivo.
- Tiempo para pagar después de reservar: 30 minutos; si no paga, el horario se libera solo.
- Si el cliente cancela a tiempo, la devolución queda a criterio.
- Si no se presenta, pierde la seña.
- Al pagar en el local, la seña se descuenta del precio final.
- Factura o comprobante fiscal: fuera del MVP.

## 7. Notificaciones

- Confirmación de reserva al cliente: por WhatsApp (ajustado en la spec).
- Recordatorio previo al turno: fuera del MVP.

**Nota del dueño:** cada barbero tiene su propio perfil. Al entrar a la aplicación, la persona elige con quién tener el servicio. Cada barbero carga su horario, tipos de corte, días de trabajo y demás datos según sus necesidades.

## 8. Arquitectura

1. Alojamiento: hosting en Contabo y dominio en Cloudflare.
2. Volumen esperado: hasta 200 turnos por día en el peor caso.
3. Cliente: se conecta con su cuenta de Gmail.
4. Administrador: usuario y contraseña; máximo 3 administradores.
5. Evitar reservas duplicadas: lo propone el agente.
6. Turnos pendientes de seña: investigar la mejor opción.
7. Pasarela de pago: investigar.
8. Datos personales: solo datos personales, no de tarjeta.
9. Idioma español, zona horaria de Argentina.
10. Diseño pensado primero para celular; referencias visuales, colores y logo se definen más adelante.

## 9. Decisiones técnicas

- Monolito con Next.js y TypeScript, base de datos MySQL con Prisma.
- La lógica de disponibilidad vive en `lib/` como funciones puras con pruebas, separadas de las rutas.
- Copias de seguridad diarias de MySQL.
- Consultar context7 para buenas prácticas y estructuras.

## 10. Fuera del MVP

Recordatorios por WhatsApp, varias sucursales, facturación, reseñas, programa de fidelidad y aplicación móvil. Se seguirá definiendo más adelante.

## 11. Cuándo el MVP está terminado

- Un cliente puede reservar un corte de 40 minutos, ver cuánto debe de seña y recibir la confirmación.
- El administrador puede ver la agenda del día, confirmar señas y cancelar turnos.
- Dos personas no pueden reservar el mismo horario, ni siquiera a la vez.
- Las pruebas de las reglas de disponibilidad y de seña pasan.
