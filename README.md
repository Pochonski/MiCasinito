<div align="center">
  <img src="https://via.placeholder.com/150x150.png?text=Casinito+Logo" alt="Mi Casinito Logo" width="150" height="150" />
  <h1>🎰 Mi Casinito</h1>
  <p><strong>Tu Lounge Privado de Blackjack Multijugador en Tiempo Real</strong></p>

  <p>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/Frontend-React_18-61DAFB.svg?logo=react&logoColor=black" alt="React" /></a>
    <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Build-Vite-646CFF.svg?logo=vite&logoColor=white" alt="Vite" /></a>
    <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/Backend-FastAPI-009688.svg?logo=fastapi&logoColor=white" alt="FastAPI" /></a>
    <a href="https://python.org/"><img src="https://img.shields.io/badge/Language-Python_3.11-3776AB.svg?logo=python&logoColor=white" alt="Python" /></a>
    <a href="https://docker.com/"><img src="https://img.shields.io/badge/Deploy-Docker-2496ED.svg?logo=docker&logoColor=white" alt="Docker" /></a>
    <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License MIT" />
  </p>
</div>

---

## 📖 Tabla de Contenidos

- [Acerca del Proyecto](#-acerca-del-proyecto)
- [Características Principales](#-características-principales)
- [Arquitectura del Sistema](#-arquitectura-del-sistema)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Tecnologías Utilizadas](#-tecnologías-utilizadas)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación y Ejecución Local](#-instalación-y-ejecución-local)
  - [Opción 1: Usando Docker (Recomendado)](#opción-1-usando-docker-recomendado)
  - [Opción 2: Instalación Manual](#opción-2-instalación-manual)
- [Despliegue a Producción](#-despliegue-a-producción)
- [Guía de Uso del Juego](#-guía-de-uso-del-juego)
- [Documentación de la API](#-documentación-de-la-api)
- [Contribución](#-contribución)
- [Licencia](#-licencia)

---

## 🃏 Acerca del Proyecto

**Mi Casinito** es una plataforma moderna e inmersiva para jugar al tradicional **Blackjack** directamente desde el navegador. Rompe con los típicos simuladores en solitario ofreciendo un potente motor **multijugador en tiempo real** impulsado por WebSockets. 

Ya sea que desees pulir tus habilidades contra el crupier automático en modo solitario, o crear salas privadas para invitar a tus amigos, **Mi Casinito** está diseñado para brindar una experiencia de usuario fluida, pagos justos (3:2) y un atractivo visual que simula un lounge boutique de alta gama.

---

## ✨ Características Principales

*   **🎲 Reglas Oficiales de Blackjack:** Cartas y mecánicas realistas, pagos 3:2 en Blackjack nativo, soporte completo para pedir ("Hit"), plantarse ("Stand") y doblar la apuesta ("Double Down").
*   **🌐 Salas Multijugador Instantáneas:** Crea mesas de juego públicas o privadas mediante códigos únicos.
*   **🔗 Fácil de Compartir:** Cada sala genera un enlace único de invitación. Si estás en móvil, puedes simplemente escanear el Código QR autogenerado en la interfaz.
*   **⚡ Sincronización en Tiempo Real:** Todos los jugadores conectados en la sala ven quién entra, quién apuesta y los resultados a través de WebSockets de ultra-baja latencia.
*   **💰 Sistema de Bankroll Inteligente:** Gestión del saldo virtual del jugador en la sesión local. Te indica si tienes suficiente dinero para tus apuestas.
*   **🗺️ Internacionalización (i18n):** Soporte total y dinámico para intercambiar entre Español e Inglés en toda la plataforma.
*   **📱 Diseño Totalmente Responsivo:** La interfaz optimizada se adapta a resoluciones de escritorio, tablets y dispositivos móviles sin perder la calidad de animaciones o usabilidad.

---

## 🏗 Arquitectura del Sistema

El proyecto sigue un paradigma de **Desacoplamiento Estricto** entre cliente y servidor.

### Flujo de Interacción:
1. El Cliente (Frontend) envía solicitudes HTTP REST al servidor FastAPI para acciones estáticas como **crear una sala** o **unirse a una sala**.
2. Una vez unidos, el Cliente establece una conexión **WebSocket** bidireccional continua con el Backend.
3. El estado global y en vivo de los jugadores en la mesa de Blackjack es manejado y emitido globalmente por el motor en Python hacia todos los clientes suscritos al canal WebSocket correspondiente a dicha sala.

---

## 📂 Estructura del Proyecto

```text
Casinito/
├── backend/                  # Código del Servidor API + WebSockets
│   ├── app.py                # Entrada principal de FastAPI y endpoints
│   ├── blackjack.py          # Lógica pura del juego (barajas, puntuación, reglas)
│   ├── requirements.txt      # Dependencias de Python
│   └── test.txt              # Utils/Tests internos
├── frontend/                 # Aplicación del Cliente UI (React)
│   ├── src/
│   │   ├── components/       # Componentes reusables de React (Botones, Inputs)
│   │   ├── pages/            # Vistas principales (JoinRoom, Room, Landing)
│   │   ├── App.jsx           # Enrutador principal y configuración de idiomas
│   │   ├── BlackjackTable.jsx# Tablero central del juego y lógica cliente
│   │   ├── main.css          # Estilos Vanilla altamente optimizados
│   │   └── index.jsx         # Punto de montaje de React
│   ├── index.html            # Plantilla HTML inyectada por Vite
│   ├── package.json          # Dependencias y scripts de Node.js
│   └── Caddyfile.static      # Configuración de servidor estático para Producción
├── docker-compose.dev.yml    # Orquestación de contenedores para Desarrollo
├── docker-compose.prod.yml   # Orquestación de contenedores para Producción
├── Dockerfile.backend        # Receta de construcción de contenedor Python
├── Dockerfile.frontend       # Receta de construcción de contenedor Node/Caddy
├── Caddyfile                 # Configuración de proxy inverso y TLS (Prod)
├── .env.example              # Variables de entorno modelo
└── README.md                 # Archivo actual de documentación
```

---

## 🛠 Tecnologías Utilizadas

| Categoría | Tecnología | Uso en el Proyecto |
| --- | --- | --- |
| **Frontend** | React.js (v18) | Componentización de UI y estado local |
| **Frontend** | Vite | Construcción de assets ultra-rápida y Hot-Reloading |
| **Frontend** | React Router | Enrutamiento de cliente (Lobby, Salas, Mesa Solitaria) |
| **Backend** | Python 3.11+ | Lenguaje principal del servidor |
| **Backend** | FastAPI | Framework web asíncrono para REST API y WebSockets |
| **Backend** | Uvicorn | Servidor ASGI para exponer la aplicación FastAPI |
| **Infraestructura**| Docker | Contenerización de entornos de Dev y Prod |
| **Redes / SSL** | Caddy | Servidor web inverso, provisión de HTTPS vía Let's Encrypt |

---

## 📋 Requisitos Previos

Si planeas compilar o probar localmente el proyecto:
- **Git** instalado en tu sistema.
- **Node.js** (v18 o superior) y **npm**.
- **Python** (v3.10 o superior).
- *(Opcional)* **Docker** y **Docker Compose** (altamente sugerido para desarrollo simplificado y despliegue a producción).

---

## � Instalación y Ejecución Local

### Opción 1: Usando Docker (Recomendado)

Esta es la mejor opción para levantar todo sin preocuparte de configurar entornos virtuales en Python o paquetes NPM globales.

1. Clona el repositorio:
   ```bash
   git clone https://github.com/tu-usuario/Casinito.git
   cd Casinito
   ```
2. Ejecuta *Docker Compose* en modo desarrollo:
   ```bash
   docker compose -f docker-compose.dev.yml up --build
   ```
3. ¡Listo! 
   - Abre **http://localhost:5173** en el navegador para ver la interfaz.
   - El Backend API está respondiendo en **http://localhost:8000**.

### Opción 2: Instalación Manual

Si no dispones de Docker y prefieres correr los servidores nativamente en la terminal:

**1. Levantar el Backend:**
```bash
cd backend
python -m venv .venv
# Activar entorno (Windows)
.venv\Scripts\activate
# Activar entorno (Linux/Mac)
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app:app --reload
```
*(El API ahora corre en http://localhost:8000)*

**2. Levantar el Frontend:**
Abre una nueva pestaña en tu terminal.
```bash
cd frontend
npm install
npm run dev
```
*(La aplicación de React está ahora en http://localhost:5173)*

---

## 🌍 Despliegue a Producción (HTTPS Automático)

El Casinito incluye una configuración robusta de contenedores lista para enviar a la nube (AWS EC2, DigitalOcean, Linode, etc). Viene de serie con `Caddy` en el frente para manejar tus certificados SSL gratis y de manera autómatica.

1. **Configurar el Entorno:**
   Dentro en tu servidor final de destino, haz una copia de `.env.example`:
   ```bash
   cp .env.example .env
   ```
2. **Edita el `.env`** para reflejar tu dominio público real:
   ```env
   DOMAIN=mi-casinito-cool.com
   VITE_API_BASE=https://mi-casinito-cool.com/api
   CORS_ALLOW_ORIGINS=https://mi-casinito-cool.com
   ```
3. **Redirección DNS:**
   Asegúrate de que el registro **A** de tu dominio (`mi-casinito-cool.com`) apunte a la IP estática del VPS donde alojarás esto.
4. **Desplegar Servicios:**
   Abre puertos `80` y `443` en el firewall e inicia:
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env up --build -d
   ```
5. ¡Visita `https://mi-casinito-cool.com` desde tu teléfono y disfruta jugando con conexión segura encriptada!

---

## 🎮 Guía de Uso del Juego

1. **Pantalla Principal:** Al entrar podrás decidir si jugar de inmediato contra la máquina ("Play Solo") o crear una sala propia ("Crear Sala").
2. **Crear y Compartir:** Al presionar crear sala, elige entre *Pública* o *Privada*, y digita tu apodo de Host.
3. **El Lobby de la Sala:** Una vez dentro del lobby, presiona *Copiar Enlace* o diles a tus amigos que lean el *Código QR*. Ellos abrirán el enlace en sus teléfonos, escribirán sus propios nombres y se sentarán virtualmente en tu mesa.
4. **Al Jugar (Jugabilidad Base):**
   - Arrastra fichas (1, 5, 25, 100) al aro central de apuesta.
   - Presiona **Repartir**.
   - Evalúa tu puntaje inicial versus la carta visible del Crupier.
   - Tus opciones: **Pedir** carta extra, **Plantarte** si la cuenta te favorece, o **Doblar** tu apuesta si tienes mano inicial muy fuerte.

---

## 📡 Documentación de la API

Aunque React negocia la comunicación, así es como se ve la API interna.

### Endpoints REST /HTTP
- `GET /state`: Trae el estado actual simple de una partida.
- `POST /start`: Inicializa un deck mezclado y reparte a la casa y jugador.
- `POST /hit`: Añade una carta a la mano del jugador. Si revienta (Bust) transfiere automáticamente turno al crupier.
- `POST /stand`: Finaliza el turno del jugador y resuelve la jugada del crupier.
- `POST /rooms`: Crea un struct interno en memoria en el servidor. Devuelve `{"room_code": "ABCD", "host_id": "uuid"}`.
- `POST /rooms/{roomCode}/join`: Autentifica e ingresa a un jugador y emite eventos en la sala correspondiente.

### WebSockets (Tiempo Real)
- `ws://HOST/ws/{roomCode}`
Envía y recibe objetos JSON continuos para actualizar el render de los Jugadores conectados (*Presence*) al momento real. 

---

## 🤝 Contribución

Cualquier contribución es lo que hace a la comunidad open source asombrosa. Apreciamos a las personas que descubren mejoras. ¡Contribuir es muy fácil!

1. Haz un Fork del proyecto (`Fork`).
2. Crea tu rama para la nueva característica (`git checkout -b feature/MejoraAsombrosa`).
3. Confirma los cambios (`git commit -m 'Añadiendo una Mejora Asombrosa'`).
4. Sube a tu rama remota (`git push origin feature/MejoraAsombrosa`).
5. Abre una solicitud de extracción (Pull Request).

---

## 📄 Licencia

Este proyecto se distribuye bajo la licencia **MIT**. Consulta el archivo `LICENSE` para conocer más detalles.

---

<div align="center">
Desarrollado con ❤️ para los amantes de las cartas y buen código.
</div>
