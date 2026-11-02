# Spec: Chachi's Barber (MVP)

Aprobada el 2 de noviembre de 2026.

## 1. Problema y usuarios

Hoy los turnos entran por WhatsApp o la gente llega directamente al local. El dueño no tiene control de quién viene y no puede priorizar a quienes tienen turno y dejaron seña.

| Usuario | Qué hace |
|---|---|
| Cliente | Elige barbero y servicio, reserva, paga la seña y cancela según las reglas |
| Barbero | Gestiona su perfil, servicios, precios, horarios y bloqueos, y ve su propia agenda |
| Administrador (hasta 3) | Ve todas las agendas, confirma señas y cancela turnos |

El dueño puede ser administrador y barbero a la vez.

## 2. Funcionalidades del MVP

### Cliente

- Entrar con Google y cargar su teléfono en la primera reserva.
- Elegir barbero, uno o más servicios, y fecha y hora.
- Pagar la seña por Mercado Pago o elegir pagarla en efectivo en el local.
- Ver sus turnos y cancelarlos.
- Recibir la confirmación por email.

### Barbero

- Crear y editar sus servicios, precios y cantidad de bloques.
- Definir sus días y horarios, y bloquear horarios, días o feriados.
- Ver su agenda y cargar turnos manuales.
- Confirmar señas en efectivo.
- Cancelar y reprogramar turnos, marcar completados y ausencias.
- Decidir si se devuelve o se retiene la seña.
- Abrir WhatsApp con un mensaje listo para el cliente.

### Administrador

- Entrar con usuario y contraseña.
- Ver las agendas de todos los barberos.
- Confirmar señas y cancelar turnos.
- Configurar servicios y horarios.

### Sistema

- Mostrar solo horarios disponibles y evitar reservas duplicadas.
- Calcular la seña y liberar los turnos vencidos.
- Confirmar automáticamente los pagos de Mercado Pago.
- Enviar emails al cliente y al barbero al reservar.

## 3. Funcionalidades excluidas

- WhatsApp automático y recordatorios previos al turno.
- Devolución automática de señas, y saldo o crédito por cliente.
- Reprogramación hecha por el propio cliente.
- Registro con email y contraseña para clientes.
- Una cuenta de Mercado Pago por barbero.
- Facturación o comprobante fiscal.
- Varias sucursales, reseñas, programa de fidelidad y aplicación móvil.

## 4. Flujos

### Cliente: reserva con Mercado Pago

1. Entra con Google y, si es la primera vez, carga su teléfono.
2. Elige barbero, servicios, fecha y hora.
3. Ve el total y la seña, y elige Mercado Pago.
4. El horario queda retenido 30 minutos mientras paga.
5. Si paga, el turno se confirma solo. Si no, el horario se libera.

### Cliente: reserva en efectivo

1. Hace los mismos pasos, pero elige efectivo.
2. El horario queda retenido hasta 24 horas después de reservar, y como máximo hasta 2 horas antes del turno.
3. Lleva el 40% al local y el barbero o administrador confirma la seña.
4. Si no paga dentro del plazo, el horario se libera solo.

### Cliente: cancelación

1. Cancela desde sus turnos.
2. Con más de 24 horas de anticipación, el barbero o administrador decide si devuelve o retiene la seña.
3. Con menos de 24 horas, pierde la seña.

### Barbero y administrador: operación diaria

1. El barbero mantiene sus servicios, horarios y bloqueos.
2. Ven la agenda con cada turno y el estado de su seña.
3. Confirman las señas en efectivo.
4. Cargan a mano en horarios libres a quien reserva por WhatsApp o llega al local.
5. Al terminar, marcan el turno como completado o como ausencia, y al cobrar descuentan la seña del precio.
6. Si corresponde, reprograman el turno o gestionan la devolución en Mercado Pago, por fuera del sistema.

## 5. Reglas de negocio

### Agenda

- Zona horaria de Argentina y una sola sucursal.
- Horario inicial de lunes a domingo, de 10:00 a 22:00, con descanso de 12:00 a 13:00. Cada barbero puede cambiarlo.
- Los bloques duran 45 minutos: 40 de servicio más 5 de preparación.
- La grilla es la misma para todos los barberos, contada desde las 10:00. Si un horario empieza fuera de la grilla, el primer turno es el bloque siguiente: quien empieza a las 14:00 atiende desde las 14:30.
- Un turno debe terminar antes del descanso o del cierre.
- Con el horario inicial son 14 bloques por barbero: 10:00 y 10:45 a la mañana, y de 13:00 a 21:15 a la tarde.
- No se puede bloquear un horario con turno: primero hay que reprogramarlo o cancelarlo.

### Servicios y seña

| Servicio | Bloques | Precio inicial | Seña (40%) |
|---|---|---|---|
| Corte | 1 | $15.000 | $6.000 |
| Barba y perfilado de cejas | 1 | $15.000 | $6.000 |
| Corte + barba | 2 consecutivos | $30.000 | $12.000 |

- Cada barbero define sus servicios y precios, y elige bloques, no minutos libres.
- Un combo suma el precio y los bloques de cada servicio, y el servicio dura 80 minutos.
- La seña es siempre el 40% y se descuenta del precio final.
- Los turnos cargados a mano quedan confirmados sin seña obligatoria, y el barbero indica si dejó seña.

### Reservas

- Se puede reservar con al menos 2 horas de anticipación y hasta 7 días hacia adelante.
- La opción de efectivo solo está disponible para turnos a 3 horas o más.
- Cada cliente puede tener hasta 2 turnos activos. Los pendientes de seña cuentan; los manuales no.
- Dos personas no pueden reservar el mismo horario de un barbero, ni siquiera a la vez.
- Los turnos reservados tienen prioridad: quien llega sin turno solo ocupa horarios libres.

### Cancelación y ausencias

- Cancelar un turno pendiente de seña no tiene penalidad.
- Quien cancela con más de 24 horas puede recuperar la seña, según lo decida el barbero o administrador.
- Quien cancela tarde o no se presenta pierde la seña.
- Si cancela el barbero o no puede atender, la seña siempre se devuelve.
- El cliente no reprograma. Solo el barbero o administrador puede hacerlo, incluso después de una ausencia, y la seña se conserva.

### Acceso

- Los clientes entran solo con Google.
- Los barberos y administradores entran con email y contraseña. Hay un máximo de 3 administradores.
