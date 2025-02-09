require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const functions = require("../utils/functions");
const sendEmails = require("../config/sendEmail");
const emailTemplates = require("../templates/emailTemplates");

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

async function processarFila() {
    if (isProcessing) return;
    isProcessing = true;

    try {
        if (client.info && client.info.pushname) {
            const mensagens = await buscarMensagensPendentes();
            for (let msg of mensagens) {
                await functions.executeSql(`UPDATE whatsapp_fila SET status = "enviando" WHERE id = ?`, [msg.id]);

                const resultado = await enviarMensagem(msg.destinatario, msg.mensagem);

                const novoStatus = resultado.sucesso ? "enviado" : (msg.tentativas + 1 >= 3 ? "falha" : "pendente");
                await functions.executeSql(`UPDATE whatsapp_fila SET status = ?, tentativas = ? WHERE id = ?`, [novoStatus, msg.tentativas + 1, msg.id]);

                console.log(`WHATSAPP FILA: ${resultado.sucesso ? '✅' : '❌'} ${msg.destinatario}`);
            }
        } else {
            console.log("WhatsApp desconectado. Tentando reconectar...");
            client.emit('qr', 'novo_qr_code_gerado');
        }
    } catch (error) {
        console.error("Erro ao processar fila:", error);
    } finally {
        isProcessing = false;
        
        if (global.gc) {
            global.gc(); // Força a coleta de lixo
            console.log("🧹 Garbage Collection executado!");
        } else {
            console.warn("⚠️ Garbage Collection não está exposto! Use node --expose-gc.");
        }

        setTimeout(processarFila, 10000); // Aguarda 1 minuto antes de rodar novamente
    }
}

async function restartWhatsApp(client) {
    console.log('🚨 WhatsApp desconectado. Reiniciando o cliente...');
    await client.destroy();
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
                    "--disable-background-networking"
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
            
            processarFila();
        });

        client.on('disconnected', async () => {
            restartWhatsApp(client);
        });

        client.initialize();

        setTimeout(async () => {
            console.log("♻️ Reiniciando WhatsApp para liberar memória...");
            await client.destroy();
            startClient();
        },  30 * 60 * 1000);
    } catch (error) {
        console.error("Erro ao iniciar o cliente:", error);
    }
}


let whatsappSender = {
    init: () => startClient()
}

module.exports = whatsappSender;
