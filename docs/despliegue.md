# Despliegue en Contabo y Cloudflare

Guía para publicar la aplicación. Asume un VPS Linux con Docker y acceso SSH. Los secretos van solo en `/opt/barberia/.env` y en GitHub Actions Secrets, nunca en el repositorio.

## 1. Preparar el VPS

```bash
# Como root, en Ubuntu o Debian
curl -fsSL https://get.docker.com | sh
adduser deploy
usermod -aG docker deploy
mkdir -p /opt/barberia/backups
chown -R deploy:deploy /opt/barberia

# Firewall: solo SSH. El túnel sale hacia Cloudflare, no necesita puertos web.
apt-get install -y ufw
ufw allow OpenSSH
ufw --force enable
```

Copiá una clave pública a `/home/deploy/.ssh/authorized_keys`.

## 2. Crear el túnel de Cloudflare

1. En Cloudflare Zero Trust, abrí **Networks > Tunnels** y creá un túnel de tipo `cloudflared`.
2. Copiá el token: es el valor de `TUNNEL_TOKEN`.
3. En **Public Hostname**, apuntá el dominio a `http://app:3000`.
4. En el dominio, dejá SSL en **Full (strict)** y revisá que las reglas de seguridad no bloqueen `POST /api/webhooks/mercadopago`.

## 3. Configurar Google

1. En Google Cloud Console, creá un cliente OAuth de tipo aplicación web.
2. Origen autorizado: `https://tudominio.com`.
3. URI de redirección: `https://tudominio.com/api/auth/callback/google`.
4. Para probar en local, agregá también `http://localhost:3000` y `http://localhost:3000/api/auth/callback/google`.
5. En la pantalla de consentimiento, usá `https://tudominio.com/privacidad` como política de privacidad y publicá la app.

## 4. Configurar Mercado Pago

1. En **Tus integraciones**, creá una aplicación de Checkout Pro con la cuenta de la barbería.
2. Copiá el Access Token a `MP_ACCESS_TOKEN`: el de prueba para ensayar, y el de producción para salir.
3. En **Webhooks**, configurá `https://tudominio.com/api/webhooks/mercadopago`, con el evento **Pagos**.
4. Copiá la clave secreta de esa pantalla a `MP_WEBHOOK_SECRET`.

## 5. Configurar los emails

1. En Resend, verificá el dominio agregando en Cloudflare los registros DNS que indica.
2. Copiá la API key a `RESEND_API_KEY`.
3. Definí `EMAIL_FROM` con una dirección de ese dominio.

## 6. Primera puesta en marcha

Copiá `deploy/compose.yaml`, `deploy/backup.sh` y `deploy/restore-test.sh` a `/opt/barberia/`. Creá `/opt/barberia/.env` a partir de `deploy/.env.example`, con permisos `600`.

Si los paquetes de GitHub quedan privados, iniciá sesión en el VPS con `docker login ghcr.io`.

```bash
cd /opt/barberia
chmod 600 .env
chmod +x backup.sh restore-test.sh
docker compose up -d

# Crear el primer administrador (solo una vez)
docker compose run --rm \
  -e ADMIN_NAME="Nombre" \
  -e ADMIN_EMAIL="email@ejemplo.com" \
  -e ADMIN_PASSWORD="una-clave-larga" \
  migrate npx tsx scripts/create-admin.ts
```

Después entrá a `/panel`, activá tu perfil de barbero y creá las demás cuentas en **Equipo**.

## 7. Backups

```bash
# Instalar rclone y configurar el remoto de Cloudflare R2
curl https://rclone.org/install.sh | sudo bash
rclone config

# Programar el backup diario (07:30 UTC, 04:30 en Argentina)
crontab -e
# 30 7 * * * /opt/barberia/backup.sh >> /opt/barberia/backups/backup.log 2>&1

# Probar uno y restaurarlo en una base aparte
./backup.sh
./restore-test.sh backups/<archivo>.sql.gz
```

## 8. Despliegue automático

En GitHub, en **Settings > Secrets and variables > Actions**, cargá:

| Tipo | Nombre | Valor |
|---|---|---|
| Secret | `VPS_HOST` | IP del VPS |
| Secret | `VPS_USER` | `deploy` |
| Secret | `VPS_SSH_KEY` | Clave privada creada solo para el despliegue |
| Secret | `VPS_KNOWN_HOSTS` | Salida de `ssh-keyscan <ip>` |
| Variable | `DEPLOY_ENABLED` | `true` |

Desde entonces, cada fusión en `main` prueba el código, publica las imágenes y actualiza el servidor.

## 9. Comprobar la salida a producción

- El dominio abre con HTTPS y el login con Google funciona.
- Un pago de prueba confirma el turno y aparece en la agenda.
- Un turno sin pagar se libera después de 30 minutos.
- Llegan los emails al cliente y al barbero.
- `restore-test.sh` restaura el último backup.
