'use client'
import { io } from "socket.io-client";
import { useEffect, useRef, useState } from "react";

const socket = io("http://localhost:8000");

export default function Home() {
  const [message, setMessage] = useState(' ');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [hasMedia, setHasMedia] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [rooms, setRooms] = useState('');
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const roomRef = useRef<string>('');
  const isCallerRef = useRef<boolean>(false);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => { 
    roomRef.current = room; 
  }, [room]);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  async function enableCamera(facing: 'user' | 'environment' = 'user') {
    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode: { ideal: facing } },
        audio: true
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      localStreamRef.current = stream;
      setHasMedia(true);
      if (videoRef.current) videoRef.current.srcObject = stream;
      setMessage('All good');
    } catch (error: any) {
      setMessage(error?.name === 'NotAllowedError' ? 'Permission denied' : 'Error fetching media');
    }
  }

  useEffect(() => {
    const onOffer = async ({ sdp, senderID }: { sdp: RTCSessionDescriptionInit; senderID: string }) => {
      console.log('Received offer from:', senderID);
      if (senderID === socket.id) return;
      
      if (!peerConnection.current && localStreamRef.current) {
        console.log('Creating peer connection as receiver');
        createPeerConnection(false, roomRef.current, localStreamRef.current);
      }
      
      if (!peerConnection.current) {
        console.error('No peer connection available');
        return;
      }
      
      try {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(sdp));
        console.log('Remote description set');
        
        for (const c of pendingCandidatesRef.current) {
          try { 
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(c)); 
            console.log('Added pending ICE candidate');
          } catch (e) {
            console.error('Error adding pending ICE candidate:', e);
          }
        }
        pendingCandidatesRef.current = [];
        
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        console.log('Sending answer to room:', roomRef.current);
        socket.emit('answer', { sdp: peerConnection.current.localDescription, roomID: roomRef.current, senderID: socket.id });
      } catch (e) { 
        console.error('Error handling offer:', e); 
      }
    };

    const onAnswer = async ({ sdp, senderID }: { sdp: RTCSessionDescriptionInit; senderID: string }) => {
      console.log('Received answer from:', senderID);
      if (senderID === socket.id) return;
      if (!peerConnection.current) return;
      try {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(sdp));
        console.log('Remote description set from answer');
        
        for (const c of pendingCandidatesRef.current) {
          try { 
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(c)); 
            console.log('Added pending ICE candidate');
          } catch (e) {
            console.error('Error adding pending ICE candidate:', e);
          }
        }
        pendingCandidatesRef.current = [];
      } catch (e) { 
        console.error('Error handling answer:', e); 
      }
    };

    const onIce = async ({ candidate, senderID }: { candidate: RTCIceCandidateInit; senderID: string }) => {
      console.log('Received ICE candidate from:', senderID);
      if (senderID === socket.id) return;
      if (!peerConnection.current) return;
      try {
        if (peerConnection.current.remoteDescription) {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('Added ICE candidate');
        } else {
          pendingCandidatesRef.current.push(candidate);
          console.log('Queued ICE candidate');
        }
      } catch (e) { 
        console.error('Error handling ICE candidate:', e); 
      }
    };

    const onUserJoined = ({ senderID }: { senderID: string }) => {
      console.log('User joined room:', senderID);
      if (isCallerRef.current && peerConnection.current && senderID !== socket.id) {
        console.log('Someone joined, sending offer');
        createOffer(roomRef.current);
      }
    };

    socket.on("offer", onOffer);
    socket.on("answer", onAnswer);
    socket.on("ice-candidate", onIce);
    socket.on("user-joined", onUserJoined);
    
    return () => {
      socket.off("offer", onOffer);
      socket.off("answer", onAnswer);
      socket.off("ice-candidate", onIce);
      socket.off("user-joined", onUserJoined);
    };
  }, []);

  function createPeerConnection(isCaller: boolean, roomID: string, currentStream: MediaStream) {
    if (peerConnection.current) {
      try { 
        peerConnection.current.ontrack = null; 
        peerConnection.current.onicecandidate = null; 
        peerConnection.current.close(); 
      } catch (e) {
        console.error('Error closing peer connection:', e);
      }
    }
    
    const configuration: RTCConfiguration = { 
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] 
    };
    const pc = new RTCPeerConnection(configuration);
    peerConnection.current = pc;
    
    currentStream.getTracks().forEach((track) => {
      pc.addTrack(track, currentStream);
      console.log('Added track:', track.kind);
    });
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate');
        socket.emit('ice-candidate', { candidate: event.candidate.toJSON(), roomID, senderID: socket.id });
      }
    };
    
    pc.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind);
      if (remoteVideoRef.current && event.streams[0]) {
        const remoteVideo = remoteVideoRef.current;
        if (remoteVideo.srcObject !== event.streams[0]) {
          remoteVideo.srcObject = event.streams[0];
          remoteVideo.muted = false;
          setTimeout(() => {
            remoteVideo.play().catch((e) => {
              console.log('Autoplay prevented, user interaction needed:', e.name);
            });
          }, 100);
        }
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
    };
  }

  async function createOffer(roomID: string) {
    if (!peerConnection.current) {
      console.error('No peer connection to create offer');
      return;
    }
    try {
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      console.log('Sending offer to room:', roomID);
      socket.emit('offer', { sdp: peerConnection.current.localDescription, roomID, senderID: socket.id });
    } catch (e) { 
      console.error('Error creating offer:', e); 
    }
  }

  async function handleGenerateCall() {
    if (!hasMedia) { 
      await enableCamera('user'); 
      if (!localStreamRef.current) return; 
    }
    
    const btn1 = document.getElementById('generate-call');
    const btn2 = document.getElementById('disconnect');
    if (btn1) btn1.style.display = 'none';
    if (btn2) btn2.style.display = 'block';
    
    if (name.trim().length <= 1) { 
      alert('Please enter your name'); 
      return; 
    }
    
    try {
      const API_BASE = "http://localhost:8000";
      const response = await fetch(`${API_BASE}/api/user/${encodeURIComponent(name)}`, { method: 'GET' });
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      
      if (data && data.room && data.room.roomID) {
        const newRoomID = data.room.roomID;
        setRoom(newRoomID);
        isCallerRef.current = true;
        initiateCall(true, newRoomID);
      }
      setMessage('All good');
    } catch (error) { 
      console.log(error); 
      setMessage('Error fetching data'); 
    }
  }

  function joinRoom(roomDetails: string) {
    if (!roomDetails || roomDetails.trim().length === 0) return;
    
    if (!hasMedia) { 
      enableCamera('user').then(() => { 
        if (!localStreamRef.current) return; 
        setRoom(roomDetails);
        isCallerRef.current = false;
        initiateCall(false, roomDetails); 
      }); 
      return; 
    }
    
    setRoom(roomDetails);
    isCallerRef.current = false;
    initiateCall(false, roomDetails);
  }

  function initiateCall(isCaller: boolean, roomID: string) {
    const stream = localStreamRef.current;
    if (!stream) { 
      alert("Microphone/Camera access failed. Please tap Enable Camera."); 
      return; 
    }
    
    console.log('Initiating call, isCaller:', isCaller, 'roomID:', roomID);
    createPeerConnection(isCaller, roomID, stream);
    socket.emit("join-room", { roomID, senderID: socket.id });
  }

  async function handleDisconnect() {
    try {
      socket.disconnect();
      if (localStream) localStream.getTracks().forEach(track => track.stop());
      if (peerConnection.current) { 
        try { peerConnection.current.close(); } catch {} 
        peerConnection.current = null; 
      }
    } catch (error) { 
      console.log(error); 
    }
    setRoom('');
    setLocalStream(null);
    localStreamRef.current = null;
    setHasMedia(false);
  }

  return !room ? (
    <div>
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-3xl font-bold mb-8">WebRTC Video Call</h1>
        <div className="flex flex-row gap-4 mb-4">
          <div className="flex flex-col items-center">
            <p className="mb-2 text-sm font-semibold">Your Camera</p>
            <video ref={videoRef} autoPlay playsInline muted className="w-80 h-60 rounded-lg shadow-lg bg-gray-900" />
          </div>
          <div className="flex flex-col items-center">
            <p className="mb-2 text-sm font-semibold">Remote Camera</p>
            <video ref={remoteVideoRef} autoPlay playsInline className="w-80 h-60 rounded-lg shadow-lg bg-gray-900" />
          </div>
        </div>
        <div className="flex gap-2 my-3">
          <button className="px-4 py-2 border rounded-md hover:bg-gray-100" onClick={() => enableCamera('user')}>Enable Front Camera</button>
          <button className="px-4 py-2 border rounded-md hover:bg-gray-100" onClick={() => enableCamera('environment')}>Enable Back Camera</button>
        </div>
        <div className="flex flex-col items-center gap-4 mt-6">
          <div className="flex flex-row items-center gap-2">
            <input type="text" placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-md" />
            <button id="generate-call" className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800" onClick={handleGenerateCall}>Start a call</button>
          </div>
          <div className="text-center">
            <h2 className="text-lg font-semibold mb-2">Or join an existing room</h2>
            <div className="flex flex-row items-center gap-2">
              <input type="text" placeholder="Enter the room id" value={rooms} onChange={(e) => setRooms(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-md" />
              <button className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800" onClick={() => joinRoom(rooms)}>Join</button>
            </div>
          </div>
        </div>
        <p className="text-sm mt-3 text-gray-600">{message}</p>
      </div>
    </div>
  ) : (
    <div>
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">In Call</h1>
        <div className="flex flex-row gap-4 mb-4">
          <div className="flex flex-col items-center">
            <p className="mb-2 text-sm font-semibold">Your Camera</p>
            <video ref={videoRef} autoPlay playsInline muted className="w-80 h-60 rounded-lg shadow-lg bg-gray-900" />
          </div>
          <div className="flex flex-col items-center">
            <p className="mb-2 text-sm font-semibold">Remote Camera</p>
            <video ref={remoteVideoRef} autoPlay playsInline className="w-80 h-60 rounded-lg shadow-lg bg-gray-900" />
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-center">
          <p className="font-semibold text-lg">Room ID: <span className="font-mono bg-white px-2 py-1 rounded">{room}</span></p>
          <p className="text-sm text-gray-600 mt-1">Share this ID with others to join the call</p>
        </div>
        <div className="flex gap-4 items-center">
          <button onClick={() => { if (remoteVideoRef.current) remoteVideoRef.current.muted = !remoteVideoRef.current.muted; }} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Toggle Remote Audio</button>
          <button id="disconnect" className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700" onClick={handleDisconnect}>Disconnect</button>
        </div>
      </div>
    </div>
  );
}