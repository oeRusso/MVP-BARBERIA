# Chachi's Barber

Web para gestionar los turnos de una barbería: el cliente elige barbero, reserva y deja una seña del 40%, y cada barbero administra su perfil, servicios, horarios y agenda.

Hecha con Next.js, TypeScript, MySQL y Prisma. Usa Better Auth para el acceso y Mercado Pago para las señas.

## Desarrollo

Necesita Node 24 y Podman.

```bash
npm install
cp .env.example .env     # completar BETTER_AUTH_SECRET y SEED_STAFF_PASSWORD
npm run db:up            # MySQL local en el puerto 3307
npx prisma migrate deploy
npm run db:generate
npx prisma db seed       # 2 barberos de prueba
npm run dev
```

## Comprobaciones

```bash
npm run typecheck
npm run lint
npm test                 # necesita la base local en marcha
npm run build
```

## Documentación

- [Brief](docs/brief.md): pedido original del MVP.
- [Spec](docs/spec.md): producto y reglas de negocio aprobadas.
- [Despliegue](docs/despliegue.md): publicar en Contabo y Cloudflare.

## Ramas

- `development`: todo el trabajo se sube aquí.
- `main`: resultado final. Se actualiza solo por pull request desde `development`, y cada fusión despliega.
