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

const client = new Client({
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
            "--disable-software-rasterizer",  // Reduz uso de GPU em software
            "--disable-background-networking", // Evita tráfego desnecessário
            "--disable-breakpad",              // Desativa sistema de crash reports
            "--disable-extensions",            // Desativa extensões para consumir menos
            "--disable-sync",                  // Desativa sincronização de contas
        ],
        headless: "new"
    }
});

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

client.on('qr', (qr) => {
    console.log('⚡ Gerando QR Code...');
    processarQRCode(qr);
});

client.on('ready', () => {
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
    console.log('WhatsApp desconectado. Reiniciando o cliente...');
    await client.destroy();
    startClient(); // Reinicia o processo do WhatsApp para evitar vazamento de memória
});

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
        setTimeout(processarFila, 60 * 1000); // Aguarda 1 minuto antes de rodar novamente
    }
}


module.exports = client;
