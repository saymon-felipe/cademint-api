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
}

module.exports = functions;