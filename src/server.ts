// if want to compile ts , i can use node-tsc (only in dev i use that). else i use build which activates tsc which compiles into js.


import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import https from 'https';
import fs from 'fs';
import { Client } from "whatsapp-web.js";
import {
  GetClientOrInitialize,
  QrPromise,
  readyPromise,
  remote_sessionPromise,
  MessagePromise,
} from "./WhatsApp";

dotenv.config();

const app: Express = express();
const port:number = process.env.PORT ? parseInt(process.env.PORT) : 3994;

// Load the SSL certificate and key
const privateKey = fs.readFileSync('keys/key.pem', 'utf8');
const certificate = fs.readFileSync('keys/cert.pem', 'utf8');
const credentials = { key: privateKey, cert: certificate };
const httpsServer = https.createServer(credentials, app);

// Middleware to parse JSON bodies
app.use(express.json());

// CORS middleware
app.use(cors());

app.get("/", (req: Request, res: Response) => {
  res.send("Response");
});
app.get('/Initialize', async (req: Request, res: Response) => {
   const client = await GetClientOrInitialize()
   const output = await Promise.race([readyPromise, QrPromise])
   return res.status(200).send(output)
})

app.get('/WaitQr', async (req: Request, res: Response) => {
   const client = await GetClientOrInitialize()
   const output = await Promise.race([readyPromise])
   return res.status(200).send('ready')
})

app.post('/SendMessage', async (req: Request, res: Response) => {
   const client:Client = await GetClientOrInitialize()
   const output = await Promise.race([readyPromise])
   const requestBody:{PhoneNumber:string, Message:string} = req.body;
   await client.sendMessage(requestBody.PhoneNumber,requestBody.Message).then((response)=>{
  
        res.status(200).send("Success")
    }).catch(err => {
        res.status(400).send("Error when sending message")
    });

})
 


httpsServer.listen(port, '0.0.0.0',() => {
  console.log(`[server]: Server is running at ${process.env.IP_ADDRESS}`);
});