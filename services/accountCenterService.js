const functions = require("../utils/functions");
const crypto = require('crypto');

const { encrypt, decrypt } = require('../utils/crypto');

const rsaPrivateKeys = new Map();

let accountCenterService = {
    startPasswordRevealSession: function () {
        return new Promise((resolve) => {
            const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
                modulusLength: 2048,
                publicKeyEncoding: { type: 'spki', format: 'pem' },
                privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
            });

            const sessionId = crypto.randomBytes(16).toString('hex');
            rsaPrivateKeys.set(sessionId, privateKey);

            setTimeout(() => {
                rsaPrivateKeys.delete(sessionId);
            }, 60 * 1000); 

            resolve({ publicKey: publicKey, sessionId: sessionId });
        })
    },
    revealPassword(userId, accountId, encryptedAesKeyFromFrontend, sessionId) {
        return new Promise((resolve, reject) => {
            const privateKeyPem = rsaPrivateKeys.get(sessionId);

            if (!privateKeyPem) {
                reject('Sessão de chave inválida ou expirada.');
            }

            functions.executeSql(
                `
                    SELECT
                        password
                    FROM
                        accounts
                    WHERE
                        id = ?
                    AND
                        user_id = ?
                `, [accountId, userId]
            ).then((results) => {
                const decryptedAesKey = crypto.privateDecrypt(
                    {
                        key: privateKeyPem,
                        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                        oaepHash: 'sha256'
                    },
                    Buffer.from(encryptedAesKeyFromFrontend, 'base64') 
                );

                const encryptedPasswordFromDb = results[0].password;
                const actualPassword = decrypt(encryptedPasswordFromDb); 

                if (!actualPassword) {
                    reject('Erro ao descriptografar senha do banco de dados.');
                }

                const ivForPassword = crypto.randomBytes(16); 
                const cipher = crypto.createCipheriv('aes-256-cbc', decryptedAesKey, ivForPassword);
                let encryptedPasswordForFrontend = cipher.update(actualPassword, 'utf8', 'hex');
                encryptedPasswordForFrontend += cipher.final('hex');

                rsaPrivateKeys.delete(sessionId);

                resolve({
                    encryptedPassword: Buffer.from(encryptedPasswordForFrontend, 'hex').toString('base64'),
                    iv: ivForPassword.toString('base64')
                })
            })
        })
    }
}

module.exports = accountCenterService;