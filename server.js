const host = "0.0.0.0";
const port = process.env.PORT || 3000;

const express = require('express');
const app = express();

const bodyParser = require('body-parser');

const http = require('http');
const server = http.Server(app);

const socketIO = require('socket.io');
const io = socketIO(server);

const mediasoup = require('mediasoup');
const axios = require('axios');

// Variables pour Mediasoup
let worker;
let router;
let producerTransports = [];
let consumerTransports = [];
let producers = [];
let consumers = [];
let publicIp = '127.0.0.1'; // Default to localhost if public IP fetch fails

// Configuration des serveurs STUN/TURN
const iceServers = [
  {
    urls: "turn:numb.viagenie.ca",
    username: "webrtc@live.com",
    credential: "muazkh"
  }
];

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Fonction pour récupérer l'IP publique
async function fetchPublicIp() {
  try {
    const response = await axios.get('https://ifconfig.me');
    publicIp = response.data.trim();
    console.log('IP publique récupérée : ', publicIp);
  } catch (error) {
    console.error('Échec de la récupération de l\'IP publique :', error);
  }
}

// Initialisation de Mediasoup
(async () => {
  await fetchPublicIp(); // Récupérer l'IP publique avant de démarrer le serveur

  try {
    worker = await mediasoup.createWorker();
  
    worker.on('died', () => {
      console.error('Le worker Mediasoup est mort');
      process.exit(1);
    });

    router = await worker.createRouter({
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
        },
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
          parameters: {
            'x-google-start-bitrate': 1000,
          },
        },
      ],
    });

    io.on('connection', async (socket) => {
      console.log('Un utilisateur est connecté');

      socket.emit('iceServers', iceServers);

      socket.on('createProducerTransport', async (_, callback) => {
        try {
          const transport = await createWebRtcTransport();
          producerTransports.push(transport);

          callback({
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
          });

          transport.observer.on('close', () => {
            console.log('Le transport du producteur a été fermé');
            producerTransports = producerTransports.filter((t) => t.id !== transport.id);
          });
        } catch (error) {
          console.error('Erreur lors de la création du transport producteur :', error);
          socket.emit('erreur', 'Erreur lors de la création du transport producteur.');
        }
      });

      socket.on('connectProducerTransport', async ({ dtlsParameters }) => {
        try {
          const transport = producerTransports.find(t => t.socketId === socket.id);
          if (transport) {
            await transport.connect({ dtlsParameters });
          }
        } catch (error) {
          console.error('Erreur lors de la connexion du transport producteur :', error);
          socket.emit('erreur', 'Erreur lors de la connexion du transport producteur.');
        }
      });

      socket.on('produce', async ({ kind, rtpParameters }, callback) => {
        try {
          const transport = producerTransports.find(t => t.socketId === socket.id);
          if (transport) {
            const producer = await transport.produce({ kind, rtpParameters });
            producers.push(producer);
            callback({ id: producer.id });
          }
        } catch (error) {
          console.error('Erreur lors de la production du flux :', error);
          socket.emit('erreur', 'Erreur lors de la production du flux.');
        }
      });

      socket.on('createConsumerTransport', async (_, callback) => {
        try {
          const transport = await createWebRtcTransport();
          consumerTransports.push(transport);

          callback({
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
          });

          transport.observer.on('close', () => {
            console.log('Le transport du consommateur a été fermé');
            consumerTransports = consumerTransports.filter((t) => t.id !== transport.id);
          });
        } catch (error) {
          console.error('Erreur lors de la création du transport consommateur :', error);
          socket.emit('erreur', 'Erreur lors de la création du transport consommateur.');
        }
      });

      socket.on('connectConsumerTransport', async ({ dtlsParameters }) => {
        try {
          const transport = consumerTransports.find(t => t.socketId === socket.id);
          if (transport) {
            await transport.connect({ dtlsParameters });
          }
        } catch (error) {
          console.error('Erreur lors de la connexion du transport consommateur :', error);
          socket.emit('erreur', 'Erreur lors de la connexion du transport consommateur.');
        }
      });

      socket.on('consume', async ({ producerId, rtpCapabilities }, callback) => {
        try {
          const consumerTransport = consumerTransports.find(t => t.socketId === socket.id);
          if (consumerTransport && router.canConsume({ producerId, rtpCapabilities })) {
            const consumer = await consumerTransport.consume({ producerId, rtpCapabilities });
            consumers.push(consumer);

            consumer.observer.on('close', () => {
              console.log('Le consommateur a été fermé');
              consumers = consumers.filter(c => c.id !== consumer.id);
            });

            callback({
              id: consumer.id,
              producerId,
              kind: consumer.kind,
              rtpParameters: consumer.rtpParameters,
            });
          }
        } catch (error) {
          console.error('Erreur lors de la consommation du flux :', error);
          socket.emit('erreur', 'Erreur lors de la consommation du flux.');
        }
      });
    });

  } catch (error) {
    console.error('Erreur lors de l\'initialisation de Mediasoup :', error);
    process.exit(1);
  }

})();

async function createWebRtcTransport() {
  try {
    const transport = await router.createWebRtcTransport({
      listenIps: [{ ip: '0.0.0.0', announcedIp: publicIp }], // Utilisation de l'IP publique
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    });

    return transport;
  } catch (error) {
    console.error('Erreur lors de la création du transport WebRTC :', error);
    throw new Error('Erreur lors de la création du transport WebRTC.');
  }
}

app.get("/stream", (req, res) => {
  res.sendFile('public/index.html', { root: __dirname });
});

server.listen(port, host, () => console.log('Serveur démarré : ' + host + ":" + port));

require("./src/Route/route")(app);
require("./src/Socket/socketEvent")(io);
require("./src/Socket/socketFunction").init(io);
