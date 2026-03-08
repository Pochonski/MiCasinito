# 🎰 Mi Casinito - Tu Lounge Privado de Blackjack

![Mi Casinito Banner](https://img.shields.io/badge/Status-Active-brightgreen.svg) ![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?logo=fastapi&logoColor=white) ![React](https://img.shields.io/badge/Frontend-React+Vite-61DAFB.svg?logo=react&logoColor=black) ![Docker](https://img.shields.io/badge/Deploy-Docker-2496ED.svg?logo=docker&logoColor=white)

**Mi Casinito** es una experiencia envolvente y completa de blackjack de estilo boutique. Ya sea que estés practicando en solitario contra el crupier automático, o retando a tus amigos en una sala multijugador privada, el juego ofrece pagos justos, diseño cinemático fluido y un bankroll inteligente para rastrear tus ganancias.

---

## ✨ Características Principales

- 🃏 **Blackjack Clásico**: Reglas familiares con pagos de 3:2, y acciones estándar (Pedir, Plantarse, Doblar).
- 🌐 **Modo Multijugador en Vivo**: Crea salas privadas o públicas. El host recibe un código QR de invitación o un enlace instantáneo para que otros se unan.
- 💬 **Sincronización en Tiempo Real**: Desarrollado con WebSockets para asegurar que verás a los jugadores unirse, apostar y jugar sin retrasos de actualización.
- 🎨 **Diseño Moderno y Responsivo**: Creado con React y Vite, la mesa de juego cuenta con animaciones fluidas y un diseño centrado en la usabilidad del jugador (arrastrar y soltar fichas, tracking de bankroll).
- 🌍 **Multilenguaje (Inglés / Español)**: Soporte completo de internacionalización (i18n) en todo el frontend. 

---

## 🏗️ Arquitectura y Tecnologías

El proyecto está dividido de forma limpia en dos capas:

- **Backend** (Python): Utiliza [FastAPI](https://fastapi.tiangolo.com) con [Uvicorn](https://www.uvicorn.org). Se encarga de la lógica de blackjack, el control de conexiones y transacciones usando WebSockets para la retransmisión a alta velocidad en las salas colaborativas.
- **Frontend** (JavaScript / React): Servido por [Vite](https://vitejs.dev), proporcionando un Hot-Module Replacement rápido en desarrollo y una generación estática ultra optimizada en producción.
- **Producción y Despliegue**: Uso extensivo de [Docker](https://www.docker.com/) y `docker-compose`. En producción incluye **Caddy** como servidor proxy reverso asegurando Certificados SSL (HTTPS) automáticos.

---

## 🚀 Despliegue en Producción (HTTPS Automático)

El entorno de producción incluye `Caddy` configurado para manejar tráfico seguro de inmediato.

1. Renombra `.env.example` a `.env` y ajusta los valores obligatorios:
   ```env
   DOMAIN=tu-dominio.com
   VITE_API_BASE=https://tu-dominio.com/api
   CORS_ALLOW_ORIGINS=https://tu-dominio.com,http://localhost:5173
   ```
2. Asegúrate de tener los puertos `80` y `443` abiertos hacia tu IP pública.
3. Inicia de fondo todos los servicios listos para usar:
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env up --build -d
   ```
4. Navega a `https://tu-dominio.com`.

### Servicios del Entorno (Producción)
- **Frontend**: Servidor encapsulado en un contenedor estático con Caddy escuchando a través de proxy.
- **Backend**: API Python ejecutada con 2 workers configurados por defecto mediante Uvicorn.
- **Caddy Público**: El "Reverse Proxy" intercepta todo: gestiona Let's Encrypt automáticamente para los certificados `wss://` y `https://`, enviando las solicitudes API / WebSockets al backend de Python y el tráfico de los visitantes estándar al frontend.

---

## 💻 Entorno de Desarrollo Local

Si deseas correr cambios localmente para aportar código y previsualizar en tiempo real:

1. **Vía Docker Compose**:
   ```bash
   docker compose -f docker-compose.dev.yml up --build
   ```
   > 📌 *El frontend estará disponible en `http://localhost:5173` y los WebSockets se conectarán con tu entorno seguro o entorno de desarrollo local por defecto.*

2. **Despliegue Manual (Backend Local)**:
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # (En Windows: .venv\Scripts\activate)
   pip install -r requirements.txt
   uvicorn app:app --reload
   ```

3. **Despliegue Manual (Frontend Local)**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

## 🤝 Cómo Jugar con Amigos (Flujo de Conexión)

1. Abre la aplicación y pulsa **"Crear sala"** desde el Lobby.
2. Ingresa tu Nombre de Host y define si la visibilidad será **Pública** o **Privada**.
3. Comparte tu **Código de Mesa** o el **Enlace Directo** generado (incluso por medio del QR facilitado en la UI) con tus amigos. 
4. Los jugadores simplemente añaden su propio nombre al entrar mediante tu invitación y disfrutarán de las apuestas en la misma sesión conectada por el WebSockets de tu servidor host.

---

### Mantenimiento y Licencias
Creado como un proyecto moderno full-stack para demostrar interacciones sólidas de servidor-cliente en tiempo real. ¡Disfruta el lounge Privado! ♠️❤️♣️♦️
