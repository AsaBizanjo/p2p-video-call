import express from "express";
import { uuidv7 } from "uuidv7";
import { newUser, newRoom } from "./crud.mjs";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import {nanoid} from 'nanoid'

const app = express();
const PORT = 8000;


app.use(cors({ origin: "http://localhost:3000", credentials: false }));


const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
    console.log(`User Connected, Server: ${socket.id}`);

    socket.on("disconnect", () => {
        console.log("User Disconnected, Server");
        console.log(socket.id)
    })
    
   socket.on("join-room", (data) => {
    const { roomID, senderID } = data;
    socket.join(roomID);
    console.log(`User with SocketID: ${senderID} joined room: ${roomID}`);
    socket.to(roomID).emit('user-joined', { senderID: socket.id });
});
    
    socket.on("connect", () => {
        console.log("User Connected, Server: " + socket.id);
    })

    socket.on('offer', (data) => {
        const { sdp, roomID } = data;
        socket.to(roomID).emit('offer', { sdp: sdp, senderID: socket.id });
        console.log(`Offer from ${socket.id} relayed to room ${roomID}`);
    });

    socket.on('answer', (data) => {
        const { sdp, roomID } = data;
        socket.to(roomID).emit('answer', { sdp: sdp, senderID: socket.id });
        console.log(`Answer from ${socket.id} relayed to room ${roomID}`);
    });

    socket.on('ice-candidate', (data) => {
        const { candidate, roomID } = data;
        socket.to(roomID).emit('ice-candidate', { candidate: candidate, senderID: socket.id });
        console.log(`ICE Candidate from ${socket.id} relayed to room ${roomID}`);
    });
});

app.get("/api/user/:name", async (req, res) => {
  const { name } = req.params;
  const uuid = uuidv7();
  const roomID = nanoid(10);

  try {
    const room = await newRoom(roomID);
    const user = await newUser(name, uuid);
    return res.status(201).json({ user, room });
  } catch (err) {
    const message = err?.message || "Internal Server Error";
    const status = err?.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
    return res.status(status).json({ error: message });
  }
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});


httpServer.listen(PORT, () => {
  console.log(`Server (HTTP + Socket.IO) listening on port ${PORT}`);
});
