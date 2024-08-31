import { Client, LocalAuth, NoAuth } from "whatsapp-web.js";

// Singelton object, should only be instantized once.
const GlobalClient = global as unknown as { client: Client };


let readyPromise:Promise<any>
let QrPromise:Promise<any> ;
let MessagePromise:Promise<any>
let remote_sessionPromise:Promise<any>

let resolveReady: ((arg0: string) => void) | null = null;
let resolveQr: ((arg0: { message: string; data: string; }) => void) | null = null;
let resolveMessage: ((arg0: string) => void) | null = null;
let resolve_remote_session: ((arg0: string) => void) | null = null;

const GetClientOrInitialize = async () => {
  if (GlobalClient.client) {
    return GlobalClient.client;
  } else {
    var client = new Client({
      authStrategy: new LocalAuth({
        dataPath: 'WhatsAppData',
        clientId:'1'
    }),
      webVersion: "2.3000.1015910634-alpha", 
      webVersionCache: {
        // the html is inside the github. The reason i use this instead of meta directory - making sure that it will not stop working later on.
       // TODO: Remember to update this each time.
        remotePath:
          "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1015910634-alpha.html",
        type: "remote",
      },
       // this will only on the platform (since the platform is using linux). In windows this won't work.
    //  mode:'serverless'
    });


        // How this works:
    // New Promise takes two functions: a resolver and a rejector. I only take the resolver.
    // After you use the resolver, the promise becomes fulfilled and returns.
    // I save the resolver functions inside variables to later use inside the listeners.
    // so for example, only when resolveReady is activated will the 'await readyPromsie' return, but the resolver only activates when
    // whatsapp is ready to be used, so i can return in the route the correct response according to the situation without having to return immediately to the client.
    readyPromise = new Promise((resolve) => {
      resolveReady = resolve;
    });
    QrPromise = new Promise((resolve) => {
      resolveQr = resolve;
    });
    MessagePromise = new Promise((resolve) => {
      resolveMessage = resolve;
    });
    remote_sessionPromise = new Promise((resolve) => {
      resolve_remote_session = resolve;
    });

    client.on("ready", () => {
      console.log("Client is ready");
      if (resolveReady) {
        resolveReady("ready"); // Resolve the promise when the client is ready
      }
    });

    client.on("message", (message) => {
      console.log("Message received:", message.body);
      if (resolveMessage) {
        resolveMessage(`Message received: ${message.body}`);
      }
    });

    client.on("qr", (qr) => {
      console.log("QR Code received:", qr);
      if (resolveQr) {
        resolveQr({ message: "QR Code received", data: qr });
      }
    });

    client.on("remote_session_saved", () => {
      console.log("Remote session saved");
      if (resolve_remote_session) {
        resolve_remote_session("remote_session_saved");
      }
    });

    await client.initialize();
    GlobalClient.client = client
    return client;

  }
}

export {
  GetClientOrInitialize,
  QrPromise,
  readyPromise,
  remote_sessionPromise,
  MessagePromise,
};