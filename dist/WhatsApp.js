"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagePromise = exports.remote_sessionPromise = exports.readyPromise = exports.QrPromise = exports.GetClientOrInitialize = void 0;
const whatsapp_web_js_1 = require("whatsapp-web.js");
// Singelton object, should only be instantized once.
const GlobalClient = global;
let readyPromise;
let QrPromise;
let MessagePromise;
let remote_sessionPromise;
let resolveReady = null;
let resolveQr = null;
let resolveMessage = null;
let resolve_remote_session = null;
const GetClientOrInitialize = () => __awaiter(void 0, void 0, void 0, function* () {
    if (GlobalClient.client) {
        return GlobalClient.client;
    }
    else {
        var client = new whatsapp_web_js_1.Client({
            authStrategy: new whatsapp_web_js_1.LocalAuth({
                dataPath: "WhatsAppData",
                clientId: "1",
            }),
            webVersion: "2.3000.1015910634-alpha",
            webVersionCache: {
                remotePath: "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1015910634-alpha.html",
                type: "remote",
            },
        });
        // How this works:
        // New Promise takes two functions: a resolver and a rejector. I only take the resolver.
        // After you use the resolver, the promise becomes fulfilled and returns.
        // I save the resolver functions inside variables to later use inside the listeners.
        // so for example, only when resolveReady is activated will the 'await readyPromsie' return, but the resolver only activates when
        // whatsapp is ready to be used, so i can return in the route the correct response according to the situation without having to return immediately to the client.
        exports.readyPromise = readyPromise = new Promise((resolve) => {
            resolveReady = resolve;
        });
        exports.QrPromise = QrPromise = new Promise((resolve) => {
            resolveQr = resolve;
        });
        exports.MessagePromise = MessagePromise = new Promise((resolve) => {
            resolveMessage = resolve;
        });
        exports.remote_sessionPromise = remote_sessionPromise = new Promise((resolve) => {
            resolve_remote_session = resolve;
        });
        client.on("ready", () => {
            console.log("Client is ready");
            if (resolveReady) {
                resolveReady({ result: "ready" }); // Resolve the promise when the client is ready
            }
        });
        client.on("message", (message) => {
            console.log("Message received:", message.body);
            if (resolveMessage) {
                resolveMessage({ message: message.body, status: "received" });
            }
        });
        client.on("qr", (qr) => {
            console.log("QR Code received:", qr);
            if (resolveQr) {
                resolveQr({ result: "QR Code received", data: qr });
            }
        });
        client.on("remote_session_saved", () => {
            console.log("Remote session saved");
            if (resolve_remote_session) {
                resolve_remote_session({
                    message: "Remote session saved",
                    status: "received",
                });
            }
        });
        yield client.initialize();
        GlobalClient.client = client;
        return client;
    }
});
exports.GetClientOrInitialize = GetClientOrInitialize;
