require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const functions = require("../utils/functions");
const sendEmails = require("../config/sendEmail");
const emailTemplates = require("../templates/emailTemplates");

const user_email = "linnubr@gmail.com";

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--single-process",
            "--disable-gpu"
        ],
        headless: true
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
    
    setInterval(processarFila, 60 * 1000); // 1 minuto de intervalo para o processa fila
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
    if (isProcessing) return; // Se já estiver processando, evita duplicação

    isProcessing = true;

    if (client.info && client.info.pushname) {
        const mensagens = await buscarMensagensPendentes();
        
        for (let msg of mensagens) {
            // Marca a mensagem como "enviando" antes de enviar
            await functions.executeSql(
                `
                UPDATE whatsapp_fila
                SET status = "enviando"
                WHERE id = ?
                `, [msg.id]
            );

            const resultado = await enviarMensagem(msg.destinatario, msg.mensagem);

            if (resultado.sucesso) {
                await functions.executeSql(
                    `
                    UPDATE whatsapp_fila
                    SET status = "enviado"
                    WHERE id = ?
                    `, [msg.id]
                );
                console.log(`WHATSAPP FILA: ✅ Mensagem enviada para ${msg.destinatario}`);
            } else {
                let novasTentativas = msg.tentativas + 1;
                let novoStatus = novasTentativas >= 3 ? 'falha' : 'pendente';

                await functions.executeSql(
                    `
                    UPDATE whatsapp_fila
                    SET status = ?, tentativas = ?
                    WHERE id = ?
                    `, [novoStatus, novasTentativas, msg.id]
                );
                console.log(`WHATSAPP FILA: ❌ Erro ao enviar para ${msg.destinatario}:`, resultado.erro);
            }
        }
    } else {
        console.log("WhatsApp desconectado. Gerando novo QR Code...");
        client.emit('qr', 'novo_qr_code_gerado');
    }

    isProcessing = false;
}

module.exports = client;
