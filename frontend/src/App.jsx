import { useMemo, useState } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import BlackjackTable from './BlackjackTable.jsx';
import RoomActions from './components/RoomActions.jsx';
import JoinRoom from './pages/JoinRoom.jsx';
import Room from './pages/Room.jsx';
import './main.css';

const TRANSLATIONS = {
  es: {
    global: {
      brand: 'Mi Casinito',
      tagline: 'Tu lounge privado de blackjack',
    },
    landing: {
      headline: 'Bienvenido a Mi Casinito',
      subheading: 'Relajate, arma tus fichas favoritas y disfruta partidas rapidas con estilo boutique.',
      enter: 'Jugar ahora',
      features: [
        {
          title: 'Blackjack clasico',
          description: 'Reglas familiares, pagos justos y ritmo agil.',
        },
        {
          title: 'Bankroll inteligente',
          description: 'Seguimiento instantaneo de ganancias y apuestas.',
        },
        {
          title: 'Mesa cinematica',
          description: 'Visuales suaves con fichas que se sienten reales.',
        },
      ],
    },
    game: {
      locale: 'es-ES',
      labels: {
        bankroll: 'Bankroll',
        currentBet: 'Apuesta en juego',
        preparedBet: 'Apuesta preparada',
        dealer: 'Crupier',
        player: 'Jugador',
      },
      prompts: {
        dealerEmpty: 'Sin cartas',
        playerEmpty: 'Haz tu apuesta para jugar',
        place: 'Arrastra fichas aqui',
      },
      actions: {
        deal: 'Repartir',
        hit: 'Pedir',
        stand: 'Plantarse',
        double: 'Doblar',
        remove: 'Retirar ultima',
        clear: 'Limpiar apuesta',
        back: 'Volver al lobby',
      },
      messages: {
        loadError: 'No se pudo cargar el estado inicial del juego.',
        balanceShort: 'No tienes saldo suficiente para esa apuesta.',
        dropOutside: 'Suelta la ficha sobre el circulo central para apostar.',
        startError: 'No se pudo iniciar la ronda.',
        startException: 'Ocurrio un error al iniciar la ronda.',
        actionError: 'Accion no disponible.',
        actionException: 'Ocurrio un error de comunicacion con el servidor.',
      },
      outcomes: {
        blackjack: 'Blackjack! Pago 3:2',
        win: 'Ganaste la mano!',
        push: 'Empate, apuesta devuelta.',
        lose: 'La casa gana esta vez.',
      },
      formatMinBet: (amount) => 'La apuesta minima es ' + amount + '.',
      describeChip: (value) => 'Ficha de ' + value,
    },
    rooms: {
      lobby: {
        title: 'Invita a tus amigos',
        subtitle: 'Crea una sala privada o publica y comparte el enlace al instante.',
        actions: {
          create: 'Crear sala',
          solo: 'Jugar solo vs computadora',
        },
        messages: {
          createError: 'No se pudo crear la sala.',
          createdSuccess: 'Sala lista para compartir.',
        },
        createModal: {
          title: 'Crear nueva sala',
          fields: {
            hostLabel: 'Tu nombre',
            hostPlaceholder: 'Ej. Camila',
            visibilityLabel: 'Visibilidad',
            visibilityOptions: {
              public: 'Publica',
              private: 'Privada',
            },
            visibilityDescriptions: {
              public: 'Cualquiera con el enlace puede entrar.',
              private: 'Solo quienes tengan el enlace.',
            },
          },
          defaults: {
            visibility: 'private',
          },
          actions: {
            cancel: 'Cancelar',
            confirm: 'Crear sala',
            creating: 'Creando...',
            close: 'Cerrar',
          },
          errors: {
            generic: 'No se pudo crear la sala.',
            nameRequired: 'Ingresa tu nombre.',
          },
        },
        inviteModal: {
          title: 'Comparte tu sala',
          description: 'Comparte este enlace con tus amigos, {hostName} ya esta listo.',
          codeLabel: 'Codigo',
          actions: {
            copy: 'Copiar enlace',
            copied: 'Copiado!',
            dismiss: 'Cerrar',
            openRoom: 'Abrir sala',
            close: 'Cerrar',
          },
          copyError: 'No se pudo copiar el enlace.',
        },
      },
      join: {
        title: (code) => 'Unirse a sala ' + code,
        subtitle: 'Ingresa tu nombre para sentarte en la mesa.',
        hostLabel: 'Anfitrion',
        visibility: {
          public: 'Sala publica',
          private: 'Sala privada',
        },
        nameLabel: 'Tu nombre',
        namePlaceholder: 'Ej. Carla',
        actions: {
          confirm: 'Entrar a la sala',
          joining: 'Uniendo...',
          back: 'Volver al lobby',
        },
        errors: {
          notFound: 'La sala no existe o expiro.',
          joinFailed: 'No fue posible entrar a la sala.',
          nameRequired: 'Por favor ingresa tu nombre.',
        },
      },
      room: {
        title: (code) => 'Sala ' + code,
        hostLabel: 'Anfitrion',
        playersTitle: 'Jugadores en sala',
        tableTitle: 'Mesa blackjack en vivo',
        empty: 'Aun no hay jugadores conectados.',
        actions: {
          leave: 'Volver al lobby',
        },
        badges: {
          you: 'Tu',
          host: 'Host',
        },
        presence: {
          online: 'En linea',
          offline: 'Desconectado',
        },
        connectionLabel: 'Estado',
        connection: {
          connecting: 'Conectando...',
          connected: 'Conectado',
          disconnected: 'Desconectado',
        },
        errors: {
          loadFailed: 'No se pudo cargar la sala.',
          sessionExpired: 'La conexion con la sala expiro. Vuelve a unirte.',
        },
      },
    },
  },
  en: {
    global: {
      brand: 'Mi Casinito',
      tagline: 'Your private blackjack lounge',
    },
    landing: {
      headline: 'Welcome to Mi Casinito',
      subheading: 'Settle in, stack your favorite chips and enjoy boutique fast sessions.',
      enter: 'Play now',
      features: [
        {
          title: 'Classic blackjack',
          description: 'Familiar rules, fair payouts and a quick rhythm.',
        },
        {
          title: 'Smart bankroll',
          description: 'Instant feedback on wagers and winnings.',
        },
        {
          title: 'Cinematic table',
          description: 'Smooth visuals with chips that feel tangible.',
        },
      ],
    },
    game: {
      locale: 'en-US',
      labels: {
        bankroll: 'Bankroll',
        currentBet: 'Current bet',
        preparedBet: 'Ready to bet',
        dealer: 'Dealer',
        player: 'Player',
      },
      prompts: {
        dealerEmpty: 'No cards yet',
        playerEmpty: 'Build your bet to play',
        place: 'Drag chips here',
      },
      actions: {
        deal: 'Deal',
        hit: 'Hit',
        stand: 'Stand',
        double: 'Double',
        remove: 'Remove last',
        clear: 'Clear bet',
        back: 'Back to lobby',
      },
      messages: {
        loadError: 'Unable to load the initial game state.',
        balanceShort: 'Not enough bankroll for that wager.',
        dropOutside: 'Drop the chip on the central circle to place it.',
        startError: 'The round could not be started.',
        startException: 'Something went wrong while starting the round.',
        actionError: 'Action not available.',
        actionException: 'A network error interrupted the action.',
      },
      outcomes: {
        blackjack: 'Blackjack! Paid 3:2',
        win: 'You won the hand!',
        push: 'Push, bet returned.',
        lose: 'House takes this round.',
      },
      formatMinBet: (amount) => 'Minimum bet is ' + amount + '.',
      describeChip: (value) => 'Chip worth ' + value,
    },
    rooms: {
      lobby: {
        title: 'Invite your crew',
        subtitle: 'Spin up a public or private room and share the link instantly.',
        actions: {
          create: 'Create room',
          solo: 'Play solo vs computer',
        },
        messages: {
          createError: 'We could not create the room.',
          createdSuccess: 'Room ready to share.',
        },
        createModal: {
          title: 'Create a new room',
          fields: {
            hostLabel: 'Your name',
            hostPlaceholder: 'Ex. Jamie',
            visibilityLabel: 'Visibility',
            visibilityOptions: {
              public: 'Public',
              private: 'Private',
            },
            visibilityDescriptions: {
              public: 'Anyone with the link can join.',
              private: 'Only friends with the link can join.',
            },
          },
          defaults: {
            visibility: 'private',
          },
          actions: {
            cancel: 'Cancel',
            confirm: 'Create room',
            creating: 'Creating...',
            close: 'Close',
          },
          errors: {
            generic: 'Unable to create the room.',
            nameRequired: 'Please add your name.',
          },
        },
        inviteModal: {
          title: 'Share your room',
          description: '{hostName}, send this link to your friends.',
          codeLabel: 'Room code',
          actions: {
            copy: 'Copy link',
            copied: 'Copied!',
            dismiss: 'Close',
            openRoom: 'Open room',
            close: 'Close',
          },
          copyError: 'Could not copy the link.',
        },
      },
      join: {
        title: (code) => 'Join room ' + code,
        subtitle: 'Enter your name to sit at the table.',
        hostLabel: 'Host',
        visibility: {
          public: 'Public room',
          private: 'Private room',
        },
        nameLabel: 'Your name',
        namePlaceholder: 'Ex. Chris',
        actions: {
          confirm: 'Join room',
          joining: 'Joining...',
          back: 'Back to lobby',
        },
        errors: {
          notFound: 'The room does not exist or expired.',
          joinFailed: 'Unable to join the room.',
          nameRequired: 'Please provide your name.',
        },
      },
      room: {
        title: (code) => 'Room ' + code,
        hostLabel: 'Host',
        playersTitle: 'Players in room',
        tableTitle: 'Live blackjack table',
        empty: 'No players connected yet.',
        actions: {
          leave: 'Back to lobby',
        },
        badges: {
          you: 'You',
          host: 'Host',
        },
        presence: {
          online: 'Online',
          offline: 'Away',
        },
        connectionLabel: 'Status',
        connection: {
          connecting: 'Connecting...',
          connected: 'Connected',
          disconnected: 'Disconnected',
        },
        errors: {
          loadFailed: 'Unable to load the room.',
          sessionExpired: 'Session expired in this room. Please rejoin.',
        },
      },
    },
  },
};

const LandingView = ({ strings, roomStrings, onPlaySolo, onOpenRoom }) => (
  <div className="landing-surface">
    <div className="landing-hero">
      <h1>{strings.headline}</h1>
      <p>{strings.subheading}</p>
      <button type="button" className="cta-button" onClick={onPlaySolo}>
        {strings.enter}
      </button>
    </div>
    <div className="landing-features">
      {strings.features.map((feature) => (
        <div key={feature.title} className="feature-card">
          <h3>{feature.title}</h3>
          <p>{feature.description}</p>
        </div>
      ))}
    </div>
    <RoomActions strings={roomStrings} onPlaySolo={onPlaySolo} onOpenRoom={onOpenRoom} />
  </div>
);

const App = () => {
  const [language, setLanguage] = useState('es');
  const navigate = useNavigate();
  const location = useLocation();

  const strings = useMemo(() => TRANSLATIONS[language], [language]);
  const showBackButton = location.pathname !== '/';

  const handleLanguageChange = (value) => {
    setLanguage(value);
  };

  const handleBackToLobby = () => {
    navigate('/');
  };

  const handleOpenRoom = (code) => {
    navigate('/room/' + code);
  };

  const handlePlaySolo = () => {
    navigate('/solo');
  };

  return (
    <div className="app-frame">
      <header className="app-header">
        <div className="brand-badge">
          <span className="brand-title">{strings.global.brand}</span>
          <span className="brand-tagline">{strings.global.tagline}</span>
        </div>
        <div className="header-actions">
          {showBackButton && (
            <button type="button" className="ghost-button" onClick={handleBackToLobby}>
              {strings.game.actions.back}
            </button>
          )}
          <div className="language-selector">
            <button
              type="button"
              className={`language-button ${language === 'es' ? 'active' : ''}`}
              onClick={() => handleLanguageChange('es')}
              aria-pressed={language === 'es'}
            >
              ES
            </button>
            <button
              type="button"
              className={`language-button ${language === 'en' ? 'active' : ''}`}
              onClick={() => handleLanguageChange('en')}
              aria-pressed={language === 'en'}
            >
              EN
            </button>
          </div>
        </div>
      </header>
      <main className="main-stage">
        <Routes>
          <Route
            path="/"
            element={(
              <LandingView
                strings={strings.landing}
                roomStrings={strings.rooms.lobby}
                onPlaySolo={handlePlaySolo}
                onOpenRoom={handleOpenRoom}
              />
            )}
          />
          <Route
            path="/solo"
            element={(
              <div className="solo-stage">
                <BlackjackTable texts={strings.game} />
              </div>
            )}
          />
          <Route path="/join/:roomCode" element={<JoinRoom strings={strings.rooms.join} />} />
          <Route
            path="/room/:roomCode"
            element={<Room strings={strings.rooms.room} tableTexts={strings.game} />}
          />
        </Routes>
      </main>
    </div>
  );
};

export default App;
