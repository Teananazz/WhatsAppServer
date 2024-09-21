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
const WhatsApp_1 = require("./WhatsApp");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT ? parseInt(process.env.PORT) : 3994;
// Load the SSL certificate and key
const privateKey = fs_1.default.readFileSync('keys/key.pem', 'utf8');
const certificate = fs_1.default.readFileSync('keys/cert.pem', 'utf8');
const credentials = { key: privateKey, cert: certificate };
const httpsServer = https_1.default.createServer(credentials, app);
// Middleware to parse JSON bodies
app.use(express_1.default.json());
// CORS middleware
app.use((0, cors_1.default)());
app.get("/", (req, res) => {
    res.send("Response");
});
app.get('/Initialize', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const client = yield (0, WhatsApp_1.GetClientOrInitialize)();
    const output = yield Promise.race([WhatsApp_1.readyPromise, WhatsApp_1.QrPromise]);
    return res.status(200).send(output);
}));
app.get('/WaitQr', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const client = yield (0, WhatsApp_1.GetClientOrInitialize)();
    const output = yield Promise.race([WhatsApp_1.readyPromise]);
    return res.status(200).send('ready');
}));
app.post('/SendMessage', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const client = yield (0, WhatsApp_1.GetClientOrInitialize)();
    const output = yield Promise.race([WhatsApp_1.readyPromise]);
    const requestBody = req.body;
    yield client.sendMessage(requestBody.PhoneNumber, requestBody.Message).then((response) => {
        res.status(200).send("Success");
    }).catch(err => {
        res.status(400).send("Error when sending message");
    });
}));
httpsServer.listen(port, '0.0.0.0', () => {
    console.log(`[server]: Server is running at ${process.env.IP_ADDRESS}:${port}`);
});
