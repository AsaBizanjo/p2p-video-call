# WebRTC P2P Video Call Application

A peer-to-peer video calling application built with Next.js, Socket.IO, and WebRTC.

## Features

- Real-time video and audio calling
- Room-based connections
- Front and back camera support
- Simple and intuitive UI
- Peer-to-peer communication using WebRTC

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, Socket.IO
- **Real-time Communication**: WebRTC, Socket.IO
- **Database**: (Your database solution)

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A modern web browser with WebRTC support

## Installation

### 1. Clone the repository

```bash
git clone <repo-url>
cd <project-directory>
```

### 2. Install dependencies

For the frontend (Next.js):
```bash
npm install
```

For the backend (Express server):
```bash
cd server
npm install
```

### 3. Install required packages

Frontend packages:
```bash
npm install socket.io-client
```

Backend packages:
```bash
npm install express socket.io cors uuidv7 nanoid
```

## Running the Application

### 1. Start the backend server

```bash
cd backend
npm start
```

The server will start on `http://localhost:8000`

### 2. Start the frontend

In a new terminal:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## How to Use

### Starting a Call

1. Click "Enable Front Camera" or "Enable Back Camera" to grant camera/microphone permissions
2. Enter your name in the input field
3. Click "Start a call"
4. A room ID will be generated - share this with the person you want to call

### Joining a Call

1. Enable your camera
2. Enter the room ID shared with you
3. Click "Join"
4. The connection will be established automatically

### During a Call

- **Toggle Remote Audio**: Mute/unmute the remote participant's audio
- **Disconnect**: End the call and leave the room

## Testing on a Single Device

Since only one camera can be accessed at a time, you have several options:

### Option 1: Virtual Camera (Recommended)
- Install OBS Studio
- Enable the virtual camera feature
- Use your real camera in one browser window and the OBS virtual camera in another

### Option 2: Two Different Devices
- Use 2 laptops
- Connect both to the same network
- Access the web using your laptop's local IP address (e.g., `http://192.168.1.5:3000`)

### Option 3: Test Signaling Only
- Open two browser windows
- The signaling will work, but you'll see the same camera feed in both windows


## Architecture

### WebRTC Flow

1. **Caller** creates a room and waits for someone to join
2. **Joiner** enters the room ID and joins
3. Server notifies the caller that someone joined
4. **Caller** sends an offer (SDP)
5. **Joiner** receives the offer and sends back an answer
6. Both peers exchange ICE candidates for NAT traversal
7. Direct peer-to-peer connection is established
8. Video and audio streams are exchanged

### Socket.IO Events

- `join-room`: User joins a specific room
- `user-joined`: Notification when a user joins the room
- `offer`: WebRTC offer (SDP) exchange
- `answer`: WebRTC answer (SDP) exchange
- `ice-candidate`: ICE candidate exchange for connection establishment

## Troubleshooting

### Camera Access Issues
- Ensure you're using HTTPS or localhost
- Check browser permissions for camera/microphone access
- Only one application can access the camera at a time

### Connection Issues
- Check that both the frontend and backend servers are running
- Verify firewall settings
- Ensure both peers are using compatible browsers
- Check the browser console for error messages

### No Video/Audio
- Verify ICE connection state in the console (should show "connected")
- Check that tracks are being added to the peer connection
- Ensure the remote video element is receiving the stream
- Try clicking "Toggle Remote Audio" to trigger autoplay

## Browser Console Debugging

The application logs important events to the console:
- Connection states
- ICE connection states
- Track additions
- Offer/Answer exchanges
- ICE candidate exchanges

Open the browser console (F12) to monitor the connection process.

## Security Considerations

- This is a development setup using HTTP
- For production, use HTTPS for both frontend and backend
- Implement proper authentication and authorization
- Add room access controls and user validation
- Consider implementing TURN servers for better connectivity

## Future Enhancements

- Screen sharing
- Chat functionality
- Recording capabilities
- Multiple participants (group calls)
- Better error handling and user feedback
- Bandwidth optimization
- Connection quality indicators