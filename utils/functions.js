const mysql = require("../mysql").pool;

let functions = {
    executeSql: function (query, queryParams = []) {
        return new Promise((resolve, reject) => {
            mysql.getConnection((error, conn) => {
                if (error) {
                    reject(error);
                    return;
                };
                conn.query(query, queryParams, (err, results) => {
                    conn.release();
                    if (err) {
                        reject(err);
                        return;
                    };
                    resolve(results);
                })
            })
        })
    },
    createResponse: function (message, returnObj, request_type, request_status) {
        let response = {
            message: message,
            returnObj: returnObj,
            request: {
                type: request_type.toUpperCase(),
                status: request_status
            }
        }

        return response;
    },
    insertWhatsappQueue: function (message, target_tel) {
        return new Promise((resolve, reject) => {
            this.executeSql(
                `
                    INSERT INTO
                        whatsapp_fila
                        (destinatario, mensagem)
                    VALUES
                        (?, ?)
                `, [target_tel, message]
            ).then(() => {
                resolve();
            }).catch((error) => {
                reject(error);
            })
        })
    }
}

module.exports = functions;