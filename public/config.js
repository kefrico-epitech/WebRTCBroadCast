const Config = {
    host: "https://webrtctest-2rt6.onrender.com",
    port: 3000, // Définissez directement le port que vous souhaitez utiliser
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:global.stun.twilio.com:3478" }
    ]
};
