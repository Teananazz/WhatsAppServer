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
import path from "path";
import mime from "mime";
import chardet from 'chardet';
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




// Define the directory where uploaded files will be stored
const uploadDirectory = path.join(__dirname, 'uploads');

// Ensure that the directory exists
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory);
}

// Set up multer storage (optional customization of storage)
const memoryStorage = multer.memoryStorage(); // Or you can use diskStorage if saving files to disk

// Multer disk storage for saving files to the 'uploads' directory
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (req, file, cb) => {
     // patternID for the request
    const PatternID = req.params.id;
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + PatternID + path.extname(file.originalname));
  }
});





// Initialize multer
const MemoryWithNoStoring = multer({ storage:memoryStorage });

const MemoryWithStoring = multer({ storage:diskStorage });


const createMulterFileObject = (filePath:string) => {
  const stats = fs.statSync(filePath); // Get file stats
  const buffer = fs.readFileSync(filePath)
  return {
    fieldname: 'file',
    originalname: path.basename(filePath),
    encoding: chardet.detect(buffer),
    mimetype: mime.lookup(filePath), // You might want to set this based on the actual file type
    buffer: buffer, // Read the file as a buffer
    size: stats.size,
    destination: path.dirname(filePath),
    filename: path.basename(filePath),
    path: filePath,
    // Other properties can be set here if needed
  };
};


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
  MemoryWithNoStoring.single("file"),
  async (req: Request, res: Response) => {
    const client: Client = await GetClientOrInitialize();
    const output = await Promise.race([readyPromise]);
    const requestBody: {
      PhoneNumber: string;
      Message_1: string | undefined;
      Message_2: string | undefined;
      PatternID:string|undefined
    } = req.body;
    let promises = [];
     // check if file does not exist and you get a patternID
    if(requestBody.PatternID && !req.file) {
     const directoryPath = path.join(__dirname, 'uploads'); // Directory where the files are stored
         // Read all files in the directory
    const files = fs.readdirSync(directoryPath);
    const found_file = files.find((val)=>val.startsWith(`file-${requestBody.PatternID}`))
    if(found_file) {
          const filePath = path.join(directoryPath, found_file); // Full path to the file
           const multerFile = await createMulterFileObject(filePath);
            // Prepare the media data for WhatsApp
        const mimetype = multerFile.mimetype;
        const filename = multerFile.originalname;
        const filesize = multerFile.size; // Size in bytes
        const data = multerFile.buffer.toString("base64"); // Convert buffer to base64 string
        // Create an instance of MessageMedia
      const media = new MessageMedia(mimetype, data, filename, filesize);
      if (media) {
        let media_promise = client.sendMessage(requestBody.PhoneNumber, media);
        promises.push(media_promise);
      }

     }
   
  }

    // Access the uploaded file from req.file
    const uploadedFile = req.file;
    if (uploadedFile ) {
       
       let fileBuffer = undefined;
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
app.post("/SavePatternFile/:id",MemoryWithStoring.single("file"), async (req: Request, res: Response) => {
      const requestBody: {
      PatternID:string
    } = req.body;
     // Your logic to handle saving the file goes here
  // For example, you could send a success response:
  res.status(200).send({ message: `File saved successfully with ID: ${requestBody.PatternID}` });
 
});



httpsServer.listen(port, "0.0.0.0", () => {
  console.log(
    `[server]: Server is running at ${process.env.IP_ADDRESS}:${port}`
  );
});
