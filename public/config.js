const Config = {
    host: "https://webrtctest-2rt6.onrender.com",
    iceServers: [
        {
            urls: "stun:global.stun.twilio.com:3478"
        },
        {
            urls: "turn:global.turn.twilio.com:3478?transport=udp",
            username: "14515d817094261dda4d38e5ff4b6dada910ea5c9b40d37d0f59b9f924014374",
            credential: "quwWLRZva7hjMPjitdZJ/1w9OtMtKMXyP2XNDii9Ioo="
        },
        {
            urls: "turn:global.turn.twilio.com:3478?transport=tcp",
            username: "14515d817094261dda4d38e5ff4b6dada910ea5c9b40d37d0f59b9f924014374",
            credential: "quwWLRZva7hjMPjitdZJ/1w9OtMtKMXyP2XNDii9Ioo="
        },
        {
            urls: "turn:global.turn.twilio.com:443?transport=tcp",
            username: "14515d817094261dda4d38e5ff4b6dada910ea5c9b40d37d0f59b9f924014374",
            credential: "quwWLRZva7hjMPjitdZJ/1w9OtMtKMXyP2XNDii9Ioo="
        }
    ]
};
