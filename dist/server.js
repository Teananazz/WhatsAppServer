"use strict";
// if want to compile ts , i can use node-tsc (only in dev i use that). else i use build which activates tsc which compiles into js.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const https_1 = __importDefault(require("https"));
const fs_1 = __importDefault(require("fs"));
const whatsapp_web_js_1 = require("whatsapp-web.js");
const WhatsApp_1 = require("./WhatsApp");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const mime_1 = __importDefault(require("mime"));
const chardet_1 = __importDefault(require("chardet"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT ? parseInt(process.env.PORT) : 3994;
// Load the SSL certificate and key
const privateKey = fs_1.default.readFileSync("keys/key.pem", "utf8");
const certificate = fs_1.default.readFileSync("keys/cert.pem", "utf8");
const credentials = { key: privateKey, cert: certificate };
const httpsServer = https_1.default.createServer(credentials, app);
// Middleware to parse JSON bodies
app.use(express_1.default.json());
// CORS middleware
app.use((0, cors_1.default)());
// Define the directory where uploaded files will be stored
const uploadDirectory = path_1.default.join(__dirname, 'uploads');
// Ensure that the directory exists
if (!fs_1.default.existsSync(uploadDirectory)) {
    fs_1.default.mkdirSync(uploadDirectory);
}
// Set up multer storage (optional customization of storage)
const memoryStorage = multer_1.default.memoryStorage(); // Or you can use diskStorage if saving files to disk
// Multer disk storage for saving files to the 'uploads' directory
const diskStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDirectory);
    },
    filename: (req, file, cb) => {
        // patternID for the request
        const PatternID = req.params.id;
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + PatternID + path_1.default.extname(file.originalname));
    }
});
// Initialize multer
const MemoryWithNoStoring = (0, multer_1.default)({ storage: memoryStorage });
const MemoryWithStoring = (0, multer_1.default)({ storage: diskStorage });
const createMulterFileObject = (filePath) => {
    const stats = fs_1.default.statSync(filePath); // Get file stats
    const buffer = fs_1.default.readFileSync(filePath);
    return {
        fieldname: 'file',
        originalname: path_1.default.basename(filePath),
        encoding: chardet_1.default.detect(buffer),
        mimetype: mime_1.default.lookup(filePath),
        buffer: buffer, // Read the file as a buffer
        size: stats.size,
        destination: path_1.default.dirname(filePath),
        filename: path_1.default.basename(filePath),
        path: filePath,
    };
};
app.get("/", (req, res) => {
    res.send("Response");
});
app.get("/Initialize", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const client = yield (0, WhatsApp_1.GetClientOrInitialize)();
    const output = yield Promise.race([WhatsApp_1.readyPromise, WhatsApp_1.QrPromise]);
    return res.status(200).send(output);
}));
app.get("/WaitQr", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const client = yield (0, WhatsApp_1.GetClientOrInitialize)();
    const output = yield Promise.race([WhatsApp_1.readyPromise]);
    return res.status(200).send(output);
}));
app.post("/SendMessage", MemoryWithNoStoring.single("file"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const client = yield (0, WhatsApp_1.GetClientOrInitialize)();
    const output = yield Promise.race([WhatsApp_1.readyPromise]);
    const requestBody = req.body;
    let promises = [];
    // check if file does not exist and you get a patternID
    if (requestBody.PatternID && !req.file) {
        const directoryPath = path_1.default.join(__dirname, 'uploads'); // Directory where the files are stored
        // Read all files in the directory
        const files = fs_1.default.readdirSync(directoryPath);
        const found_file = files.find((val) => val.startsWith(`file-${requestBody.PatternID}`));
        if (found_file) {
            const filePath = path_1.default.join(directoryPath, found_file); // Full path to the file
            const multerFile = yield createMulterFileObject(filePath);
            // Prepare the media data for WhatsApp
            const mimetype = multerFile.mimetype;
            const filename = multerFile.originalname;
            const filesize = multerFile.size; // Size in bytes
            const data = multerFile.buffer.toString("base64"); // Convert buffer to base64 string
            // Create an instance of MessageMedia
            const media = new whatsapp_web_js_1.MessageMedia(mimetype, data, filename, filesize);
            if (media) {
                let media_promise = client.sendMessage(requestBody.PhoneNumber, media);
                promises.push(media_promise);
            }
        }
    }
    // Access the uploaded file from req.file
    const uploadedFile = req.file;
    if (uploadedFile) {
        let fileBuffer = undefined;
        // Create a buffer from the uploaded file
        fileBuffer = Buffer.from(uploadedFile.buffer);
        // Prepare the media data for WhatsApp
        const mimetype = uploadedFile.mimetype;
        const filename = uploadedFile.originalname;
        const filesize = uploadedFile.size; // Size in bytes
        const data = uploadedFile.buffer.toString("base64"); // Convert buffer to base64 string
        // Create an instance of MessageMedia
        const media = new whatsapp_web_js_1.MessageMedia(mimetype, data, filename, filesize);
        if (media) {
            let media_promise = client.sendMessage(requestBody.PhoneNumber, media);
            promises.push(media_promise);
        }
    }
    if (requestBody.Message_1) {
        const textMessageBody = requestBody.Message_1;
        let message_promise = client.sendMessage(requestBody.PhoneNumber, textMessageBody);
        promises.push(message_promise);
    }
    if (requestBody.Message_2) {
        const textMessageBody = requestBody.Message_2;
        let message_promise = client.sendMessage(requestBody.PhoneNumber, textMessageBody);
        promises.push(message_promise);
    }
    Promise.all([...promises]).then((responses) => {
        res.status(200).send({ body: responses, status: "Success" });
    }).catch((err) => {
        res.status(400).send({ status: "Error" });
    });
}));
app.post("/SavePatternFile/:id", MemoryWithStoring.single("file"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const requestBody = req.body;
    res.status(200).send({ message: `File saved successfully with ID: ${requestBody.PatternID}` });
}));
app.delete('/DeletePatternFile/:PatternID', (req, res) => {
    const { PatternID } = req.params; // Step 1: Extract PatternID from the request parameters
    // Directory where the files are stored
    const directoryPath = path_1.default.join(__dirname, 'uploads');
    // Read all files in the directory
    const files = fs_1.default.readdirSync(directoryPath);
    const found_file = files.find((val) => val.startsWith(`file-${PatternID}`));
    if (found_file) {
        const filePath = path_1.default.join(directoryPath, found_file); // Full path to the file
        // Step 3: Check if the file exists
        fs_1.default.access(filePath, fs_1.default.constants.F_OK, (err) => {
            if (err) {
                // File doesn't exist
                return res.status(200).send('File not found');
            }
            // Step 4: Delete the file
            fs_1.default.unlink(filePath, (err) => {
                if (err) {
                    return res.status(500).send('Error deleting file');
                }
                // Step 5: Send success response
                res.status(200).send('File deleted successfully');
            });
        });
    }
});
httpsServer.listen(port, "0.0.0.0", () => {
    console.log(`[server]: Server is running at ${process.env.IP_ADDRESS}:${port}`);
});
