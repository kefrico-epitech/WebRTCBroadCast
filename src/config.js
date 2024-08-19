const configurationPeerConnection = {
    iceServers: [
        // Serveurs STUN de Google
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:3478" },

        // Serveurs TURN avec TCP en fallback
        {
            urls: "turn:relay1.expressturn.com:3478?transport=tcp",  // Forcer l'utilisation de TCP
            username: "efFSHAE9TNJIXKJ5WA",
            credential: "NHkOYjuZroODhKrX",
        },
        {
            urls: 'turn:openrelay.metered.ca:80?transport=tcp',  // Forcer l'utilisation de TCP
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
    ]
};


const offerSdpConstraints = {
    "mandatory": {
        "OfferToReceiveAudio": true,
        "OfferToReceiveVideo": true,
    },
    "optional": [],
}

module.exports = {
    configurationPeerConnection,
    offerSdpConstraints
}