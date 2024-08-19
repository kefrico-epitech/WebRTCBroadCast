const configurationPeerConnection = {
    iceServers: Config.iceServers
};

const offerSdpConstraints = {
    "mandatory": {
        "OfferToReceiveAudio": true,
        "OfferToReceiveVideo": true,
    },
    "optional": [],
}

const addTransceiverConstraints = { direction: "recvonly" };

window.onload = () => {
    showList();
}

var peer;
var broadcast_id = "";
var consumer_id = "";
var localCandidates = [];
var remoteCandidates = [];

async function watch(e) {
    broadcast_id = e.getAttribute("data");
    await createPeer();
    document.getElementById("text-container").innerHTML = "Diffusion en cours sur l'ID : " + broadcast_id;
}

async function showList() {
    const data = await axios.get("/list-broadcast");
    var html = `<ul style="list-style-type: none;">`;
    data.data.forEach((e) => {
        console.log(e);
        html += `<li style="margin-top:4px;">
        <button data='` + e + `' id='view-` + e + `'
        onClick="watch(this)"
        >Regarder ` + e + `</button>
        </li>`;
    });
    html += "</ul>";
    document.getElementById('list-container').innerHTML += html;
}

async function createPeer() {
    localCandidates = [];
    remoteCandidates = [];
    if (peer != null && peer != undefined) {
        return handleNegotiationNeededEvent(peer);
    }

    peer = new RTCPeerConnection(configurationPeerConnection, offerSdpConstraints);

    peer.addTransceiver("video", addTransceiverConstraints);
    peer.addTransceiver("audio", addTransceiverConstraints);

    peer.ontrack = handleTrackEvent;
    iceCandidate();

    peer.onnegotiationneeded = async () => await handleNegotiationNeededEvent(peer);

    return peer;
}

async function handleNegotiationNeededEvent(peer) {
    const offer = await peer.createOffer({ 'offerToReceiveVideo': 1 });
    await peer.setLocalDescription(offer);
    const payload = {
        sdp: peer.localDescription,
        broadcast_id: broadcast_id,
        socket_id: socket_id
    };

    try {
        const { data } = await axios.post('/consumer', payload);
        console.log(data.message);
        consumer_id = data.data.id;

        const desc = new RTCSessionDescription(data.data.sdp);
        await peer.setRemoteDescription(desc);

        // Envoyer les candidats locaux au serveur
        localCandidates.forEach((e) => {
            socket.emit("add-candidate-consumer", {
                id: consumer_id,
                candidate: e
            });
        });

        // Ajouter les candidats distants en local
        remoteCandidates.forEach((e) => {
            peer.addIceCandidate(new RTCIceCandidate(e));
        });
    } catch (error) {
        console.error("Erreur lors de la négociation de la connexion :", error);
    }
}

function handleTrackEvent(e) {
    console.log("Stream reçu :", e.streams[0]);
    document.getElementById("video").srcObject = e.streams[0];
}

function iceCandidate() {
    peer.onicecandidate = (e) => {
        if (!e || !e.candidate) return;
        var candidate = {
            'candidate': String(e.candidate.candidate),
            'sdpMid': String(e.candidate.sdpMid),
            'sdpMLineIndex': e.candidate.sdpMLineIndex,
        };
        localCandidates.push(candidate);
    }

    peer.onconnectionstatechange = (e) => {
        console.log("Changement de l'état de connexion");
        console.log(e);
    }

    peer.onicecandidateerror = (e) => {
        console.error("Erreur lors de la génération d'un candidat ICE :", e);
        if (e.errorCode === 701) {
            console.error("Le serveur STUN/TURN n'est pas accessible. Vérifiez les paramètres du serveur ou la connectivité réseau.");
        } else if (e.errorCode === 300) {
            console.error("Le port UDP est bloqué ou inaccessible. Assurez-vous que les ports nécessaires sont ouverts.");
        } else {
            console.error("Erreur ICE inattendue :", e);
        }
    }

    peer.oniceconnectionstatechange = (e) => {
        try {
            const connectionStatus = peer.connectionState;
            if (["disconnected", "failed", "closed"].includes(connectionStatus)) {
                console.warn("La connexion a été perdue ou a échoué.");
            } else if (connectionStatus === "connected") {
                console.log("Connexion réussie.");
            } else if (connectionStatus === "connecting") {
                console.log("Tentative de connexion en cours...");
            } else if (connectionStatus === "new") {
                console.log("Nouvelle connexion initiée.");
            } else if (connectionStatus === "checking") {
                console.log("Vérification des candidats ICE en cours...");
            } else {
                console.log("État de connexion inconnu :", connectionStatus);
            }
        } catch (e) {
            console.error("Erreur lors du changement d'état de connexion :", e);
        }
    }
}

// -----------------------------------------------------------------------------
// Configuration de Socket.io avec WebSocket uniquement
var socket = io(Config.host, {
    transports: ['websocket']
});
var socket_id;

socket.on('from-server', function (_socket_id) {
    socket_id = _socket_id;
    console.log("Connecté avec l'ID socket : " + socket_id);
});

socket.on("candidate-from-server", (data) => {
    remoteCandidates.push(data);
});
