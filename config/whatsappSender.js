require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const functions = require("../utils/functions");
const sendEmails = require("../config/sendEmail");
const emailTemplates = require("../templates/emailTemplates");
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

const user_email = "linnubr@gmail.com";

let puppeteerPath = "/app/node_modules/puppeteer-core/.local-chromium/linux-1045629/chrome-linux/chrome"; // Produção

if (process.env.URL_API.indexOf("https://") == -1) { // Está no ambiente de desenvolvimento
    puppeteerPath = process.cwd() + "/node_modules/puppeteer-core/.local-chromium/win64-1045629/chrome-win/chrome.exe";
}

let client;
let sended_qrCode_email = false;

const processarQRCode = async (qr) => {
    try {
        if (!sended_qrCode_email) {
            qrCodeBase64 = await qrcode.toDataURL(qr); // Converte o QR Code para Base64
            console.log('✅ QR Code gerado com sucesso!');

            let html = emailTemplates.adminConnectWhatsapp();
            let title = `ADMIN CADEMINT: Conexão com Whatsapp Sender necessária! `;
            let from = "Ana da Cademint <ana.cademint@gmail.com>";

            sendEmails.sendEmail(html, title, from, user_email, [{ filename: 'qrcode.png', content: qrCodeBase64.split("base64,")[1], encoding: 'base64' }]);
            sended_qrCode_email = true;
        }
    } catch (err) {
        console.error('❌ Erro ao converter QR Code para base64:', err);
    }
};

function buscarMensagensPendentes() {
    return new Promise((resolve, reject) => {
        functions.executeSql(
            `
                SELECT
                    *
                FROM
                    whatsapp_fila
                WHERE
                    status = "pendente" LIMIT 10
            `, []
        ).then((results) => {
            resolve(results);
        }).catch(((error) => {
            reject(error);
        }))
    })
}

async function enviarMensagem(destinatario, mensagem) {
    try {
        const number_details = await client.getNumberId(destinatario);

        await client.sendMessage(number_details._serialized, mensagem);
        return { sucesso: true };
    } catch (error) {
        return { sucesso: false, erro: error.message };
    }
}

let isProcessing = false; // Variável de controle para evitar execuções simultâneas

// Função para processar a fila de mensagens usando worker_threads
function processarFilaComWorker() {
    if (isProcessing) return;
    isProcessing = true;

    const worker = new Worker(__filename, { workerData: 'processFila' });

    worker.on('message', (msg) => {
        console.log(msg);
    });

    worker.on('exit', (code) => {
        if (code !== 0) {
            console.error(`O worker finalizou com erro, código de saída: ${code}`);
        } else {
            console.log('Worker finalizado com sucesso');
        }
        isProcessing = false;
    });
}

// Função que será executada pelo worker para processar a fila
if (!isMainThread && workerData === 'processFila') {
    (async () => {
        try {
            const mensagens = await buscarMensagensPendentes();
            for (let msg of mensagens) {
                await functions.executeSql(`UPDATE whatsapp_fila SET status = "enviando" WHERE id = ?`, [msg.id]);

                const resultado = await enviarMensagem(msg.destinatario, msg.mensagem);

                const novoStatus = resultado.sucesso ? "enviado" : (msg.tentativas + 1 >= 3 ? "falha" : "pendente");
                await functions.executeSql(`UPDATE whatsapp_fila SET status = ?, tentativas = ? WHERE id = ?`, [novoStatus, msg.tentativas + 1, msg.id]);

                console.log(`WHATSAPP FILA: ${resultado.sucesso ? '✅' : '❌'} ${msg.destinatario}`);
            }
        } catch (error) {
            console.error("Erro ao processar fila:", error);
        } finally {
            parentPort.postMessage('Fila processada!');
        }
    })();
} else {
    // Lógica de reinício do WhatsApp
    async function restartWhatsApp(client) {
        console.log('🚨 WhatsApp desconectado. Reiniciando o cliente...');
        
        try {
            await client.destroy();
            console.log("Cliente do WhatsApp destruído.");
        } catch (error) {
            console.error("Erro ao destruir cliente do WhatsApp:", error);
        }

        // Se Puppeteer ainda estiver rodando, feche-o
        if (client.pupBrowser) {
            try {
                await client.pupBrowser.close();
                console.log("Puppeteer fechado.");
            } catch (error) {
                console.error("Erro ao fechar Puppeteer:", error);
            }
        }

        startClient(); // Reinicia automaticamente
    }

    async function startClient() {
        try {
            if (client) {
                console.log("Fechando instância antiga antes de iniciar nova...");
                try {
                    await client.destroy();
                } catch (error) {
                    console.error("Erro ao destruir cliente antigo:", error);
                }
            }

            client = new Client({
                authStrategy: new LocalAuth(),
                puppeteer: {
                    executablePath: puppeteerPath,
                    args: [
                        "--no-sandbox",
                        "--disable-setuid-sandbox",
                        "--disable-dev-shm-usage",
                        "--disable-gpu",
                        "--single-process",
                        "--no-zygote",
                        "--disable-background-timer-throttling",
                        "--disable-breakpad",
                        "--disable-software-rasterizer",
                        "--disable-accelerated-2d-canvas",
                        "--disable-background-networking",
                        "--renderer-process-limit=1"
                    ],
                    headless: true
                }
            });

            client.on('qr', (qr) => {
                console.log('⚡ Gerando QR Code...');
                processarQRCode(qr);
            });

            client.on('ready', () => {
                console.log("✅ WhatsApp Client is ready!");
                let html = emailTemplates.adminWhatsappConected();
                let title = `ADMIN CADEMINT: Conexão realizada! A conexão com o Whatsapp Sender foi realizada.`;
                let from = "Ana da Cademint <ana.cademint@gmail.com>";

                sended_qrCode_email = false;

                if (process.env.URL_API.indexOf("https://") != -1) { // Só manda o email de conectado com sucesso quando não estiver no ambiente de desenvolvimento
                    sendEmails.sendEmail(html, title, from, user_email);
                }
                
                processarFilaComWorker(); // Usa Worker para processar a fila
            });

            client.on('disconnected', async () => {
                restartWhatsApp(client);
            });

            client.initialize();
        } catch (error) {
            console.error("Erro ao iniciar o cliente:", error);
        }
    }

    process.on("SIGTERM", async () => {
        console.log("🛑 Recebido SIGTERM. Encerrando processos...");

        if (client) {
            try {
                await client.destroy();
                console.log("✅ Cliente do WhatsApp destruído.");
            } catch (error) {
                console.error("Erro ao destruir cliente do WhatsApp:", error);
            }
        }

        if (client?.pupBrowser) {
            try {
                await client.pupBrowser.close();
                console.log("✅ Puppeteer fechado.");
            } catch (error) {
                console.error("Erro ao fechar Puppeteer:", error);
            }
        }

        console.log("🚪 Finalizando aplicação...");
        process.exit(0);
    });

    let whatsappSender = {
        init: () => startClient()
    }

    module.exports = whatsappSender;
}
