// if want to compile ts , i can use node-tsc (only in dev i use that). else i use build which activates tsc which compiles into js.

import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import https from "https";
import fs from "fs";
import { Client, MessageMedia } from "whatsapp-web.js";
import {
  GetClientOrInitialize,
  QrPromise,
  readyPromise,
  remote_sessionPromise,
  MessagePromise,
} from "./WhatsApp";
import multer from "multer";
dotenv.config();

const app: Express = express();
const port: number = process.env.PORT ? parseInt(process.env.PORT) : 3994;

// Load the SSL certificate and key
const privateKey = fs.readFileSync("keys/key.pem", "utf8");
const certificate = fs.readFileSync("keys/cert.pem", "utf8");
const credentials = { key: privateKey, cert: certificate };
const httpsServer = https.createServer(credentials, app);

// Middleware to parse JSON bodies
app.use(express.json());

// CORS middleware
app.use(cors());

// Set up multer storage (optional customization of storage)
const storage = multer.memoryStorage(); // Or you can use diskStorage if saving files to disk

// Initialize multer
const upload = multer({ storage });

app.get("/", (req: Request, res: Response) => {
  res.send("Response");
});
app.get("/Initialize", async (req: Request, res: Response) => {
  const client = await GetClientOrInitialize();
  const output = await Promise.race([readyPromise, QrPromise]);
  return res.status(200).send(output);
});

app.get("/WaitQr", async (req: Request, res: Response) => {
  const client = await GetClientOrInitialize();
  const output = await Promise.race([readyPromise]);
  return res.status(200).send(output);
});

app.post(
  "/SendMessage",
  upload.single("file"),
  async (req: Request, res: Response) => {
    const client: Client = await GetClientOrInitialize();
    const output = await Promise.race([readyPromise]);
    const requestBody: {
      PhoneNumber: string;
      Message_1: string | undefined;
      Message_2: string | undefined;
      file: FormData | undefined;
    } = req.body;
    // Access the uploaded file from req.file
    const uploadedFile = req.file;
    let fileBuffer = undefined;
    let media = undefined;
    let promises = [];
    if (uploadedFile) {
      // Create a buffer from the uploaded file
      fileBuffer = Buffer.from(uploadedFile.buffer);

      // Prepare the media data for WhatsApp
      const mimetype = uploadedFile.mimetype;
      const filename = uploadedFile.originalname;
      const filesize = uploadedFile.size; // Size in bytes
      const data = uploadedFile.buffer.toString("base64"); // Convert buffer to base64 string

      // Create an instance of MessageMedia
      const media = new MessageMedia(mimetype, data, filename, filesize);
      if (media) {
        let media_promise = client.sendMessage(requestBody.PhoneNumber, media);
        promises.push(media_promise);
      }
    }

    if (requestBody.Message_1) {
      const textMessageBody = requestBody.Message_1;
      let message_promise = client.sendMessage(
        requestBody.PhoneNumber,
        textMessageBody
      );
      promises.push(message_promise);
    }
    if (requestBody.Message_2) {
      const textMessageBody = requestBody.Message_2;
      let message_promise = client.sendMessage(
        requestBody.PhoneNumber,
        textMessageBody
      );
      promises.push(message_promise);
    }
    Promise.all([...promises]).then((responses)=> {
          res.status(200).send({body:responses,status:"Success"})
 
     }).catch((err)=> {
                res.status(400).send({status:"Error"})

           })
  }
);

httpsServer.listen(port, "0.0.0.0", () => {
  console.log(
    `[server]: Server is running at ${process.env.IP_ADDRESS}:${port}`
  );
});
