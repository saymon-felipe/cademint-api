const functions = require("../utils/functions");
const bcrypt = require('bcrypt');
const _projectsService = require("./projectsService");
const userLevel = require('../custom/userLevel');
const uploadConfig = require('../config/upload');
const sendEmails = require("../config/sendEmail");
const emailTemplates = require("../templates/emailTemplates");
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const { encrypt, decrypt } = require('../utils/crypto');

let userService = {
    sendResetPasswordEmail: function (token, userEmail) {
        return new Promise((resolve, reject) => {
            let html = emailTemplates.resetPasswordEmail(token);
            let title = "Redefinição de senha";
            let from = "Ana da Cademint <ana.cademint@gmail.com>";

            sendEmails.sendEmail(html, title, from, userEmail).then((results) => {
                resolve(true);
            }).catch((error) => {
                reject(error);
            })
        }) 
    },
    checkResetPasswordToken: function (token) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    SELECT
                        reset_password_token
                    FROM
                        users
                    WHERE
                        reset_password_token = ? AND reset_password_require_date >= DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 MINUTE)
                `, [token]
            ).then((results) => {
                if (results.length == 0) {
                    reject("Token para redefinição de senha inválido ou expirado");
                }
                resolve("Token para redefinição de senha válido");
            }).catch((error) => {
                reject(error);
            })
        })
    },
    resetPassword: function (token, password) {
        return new Promise((resolve, reject) => {
            this.checkResetPasswordToken(token).then((results) => {
                functions.executeSql(
                    `
                        SELECT
                            senha, id_usuario
                        FROM
                            users
                        WHERE
                            reset_password_token = ?
                    `, [token]
                ).then((results2) => {
                    bcrypt.compare(password, results2[0].senha, (errCompare, result) => {
                        if (!result) {
                            bcrypt.hash(password, 10, (errBcrypt, hash) => {
                                if (errBcrypt) {
                                    reject(errBcrypt);
                                }

                                functions.executeSql(
                                    `
                                        UPDATE
                                            users
                                        SET
                                            senha = ?, reset_password_token = ""
                                        WHERE
                                            id_usuario = ?
                                    `, [hash, results2[0].id_usuario]
                                ).then((results3) => {
                                    resolve("Senha alterada com sucesso!");
                                }).catch((error3) => {
                                    reject(error3);
                                })
                            });
                        } else {
                            reject("A senha não pode ser igual a anterior");
                        }
                    });
                }).catch((error2) => {
                    reject(error2);
                })
            }).catch((error) => {
                reject(error);
            })
        })
    },
    returnUsersById: function (users_id) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    SELECT
                        id_usuario,
                        email,
                        nome,
                        profile_photo,
                        user_level,
                        user_bio,
                        CONCAT("55", tel) AS tel
                    FROM
                        users
                    WHERE
                        id_usuario IN (?)
                `, [users_id.join(",")]
            ).then((results) => {
                resolve(results);
            }).catch((error) => {
                reject(error);
            })
        })
    },
    returnUserOccupations: function (userId) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    SELECT
                        *
                    FROM
                        user_occupations
                    WHERE
                        user_id = ?
                `, [userId]
            ).then((results) => {
                resolve(results);
            }).catch((error) => {
                reject(error);
            })
        })
    },
    addOccupation: function (userId, occupation) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    SELECT
                        count(id)
                    FROM
                        user_occupations
                    WHERE
                        user_id = ?
                `, [userId]
            ).then((results) => {
                if (results.length == 5) {
                    reject("Você já possui o numero máximo de cargos permitidos");
                } else {
                    functions.executeSql(
                        `
                            INSERT INTO
                                user_occupations
                                (user_id, occupation_name)
                            VALUES
                                (?, ?)
                        `, [userId, occupation]
                    ).then((results2) => {
                        resolve();
                    }).catch((error2) => {
                        reject(error2);
                    })
                }
            }).catch((error) => {
                reject(error);
            })
        })
    },
    changeBio: function (userBio, userId) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    UPDATE
                        users
                    SET
                        user_bio = ?
                    WHERE
                        id_usuario = ?
                `, [userBio, userId]
            ).then((results) => {
                resolve();
            }).catch((error) => {
                reject(error);
            })
        })
    },
    returnSingleUser: function (userId) {
        return new Promise((resolve, reject) => {
            let userAchievements;
            let userMedals = [];
            let userOccupations = [];

            let promises = [];

            promises.push(
                this.returnUserAchievements(userId).then((results) => {
                    userAchievements = results;
                }).catch((error) => {
                    reject(error);
                })
            )

            promises.push(
                this.returnUserMedals(userId).then((results) => {
                    userMedals = results;
                }).catch((error) => {
                    reject(error);
                })
            )

            promises.push(
                this.returnUserOccupations(userId).then((results) => {
                    userOccupations = results;
                }).catch((error) => {
                    reject(error);
                })
            )

            Promise.all(promises).then(() => {
                functions.executeSql(
                    `
                        SELECT
                            id_usuario,
                            email,
                            nome,
                            profile_photo,
                            user_level,
                            level_progress,
                            user_cover_image,
                            user_bio,
                            tel,
                            receive_notifications,
                            days_recurrency
                        FROM
                            users
                        WHERE
                            id_usuario = ?
                    `, [userId]
                ).then((results) => {
                    let user = {
                        id_usuario: results[0].id_usuario,
                        email: results[0].email,
                        nome: results[0].nome,
                        profile_photo: results[0].profile_photo,
                        user_level: results[0].user_level,
                        level_progress: results[0].level_progress,
                        user_cover_image: results[0].user_cover_image,
                        user_bio: results[0].user_bio,
                        notifications: {
                            enable: results[0].receive_notifications == 1,
                            days_recurrency: results[0].days_recurrency,
                            tel: results[0].tel
                        },
                        user_achievements: userAchievements,
                        user_medals: userMedals,
                        user_occupations: userOccupations
                    }
                    resolve(user);
                }).catch((error) => {
                    reject(error);
                })
            })
        })
    },
    returnGroupUsers: function (group_id) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    SELECT
                        id_usuario
                    FROM
                        users u
                    LEFT JOIN
                        group_members gm ON gm.user_id = u.id_usuario
                    WHERE
                        gm.group_id = ? AND u.id_usuario <> 1 AND u.id_usuario <> 2
                `, [group_id]
            ).then((results) => {
                let promises = [];
                let users = [];

                for (let i = 0; i < results.length; i++) {
                    let currentUserId = results[i].id_usuario;

                    promises.push(
                        this.returnSingleUser(currentUserId).then((results2) => {
                            users.push(results2);
                        })
                    )
                } 

                Promise.all(promises).then(() => {
                    resolve(users);
                })                
            }).catch((error) => {
                reject(error);
            })
        })
    },
    returnGroupPendingUsers: function (groupId) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    SELECT
                        pending_user_email
                    FROM
                        group_pending_users
                    WHERE
                        group_pending_users.group_id = ?
                `, [groupId]
            ).then((results) => {
                resolve(results);
            }).catch((error) => {
                reject(error);
            })
        })
    },
    returnUserGroups: function (userId) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    SELECT
                        *
                    FROM
                        os_groups
                    LEFT JOIN
                        group_members ug ON ug.group_id = os_groups.groups_id 
                    WHERE
                        ug.user_id = ?
                `, [userId]
            ).then((results) => {
                let groups = results;
                let promises = [];

                groups.sort((a, b) => {
                    if (a.group_name.toLowerCase() < b.group_name.toLowerCase()) return -1;
                    if (a.group_name.toLowerCase() > b.group_name.toLowerCase()) return 1;
                    return 0;
                });

                for (let i = 0; i < groups.length; i++) {
                    let currentGroup = groups[i];

                    promises.push(
                        this.returnGroupUsers(currentGroup.groups_id).then((results2) => {
                            currentGroup['group_members'] = results2;
                        }).catch((error) => {
                            reject(error);
                        })
                    )

                    promises.push(
                        this.returnGroupPendingUsers(currentGroup.groups_id).then((results2) => {
                            currentGroup['pending_users'] = results2;
                        }).catch((error) => {
                            reject(error);
                        })
                    )
                }

                Promise.all(promises).then(() => {
                    resolve(groups);
                })
            }).catch((error) => {
                reject(error);
            })
        })
    },
    returnUserMedals: function (userId) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    SELECT
                        *
                    FROM
                        medals m
                    LEFT JOIN
                        user_medals um ON um.medal_id = m.id
                    WHERE
                        um.user_id = ?
                `, [userId]
            ).then((results) => {
                resolve(results);
            }).catch((error) => {
                reject(error);
            })
        })
    },
    insertUserAchievement: function (userId, achievementName) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    INSERT INTO
                        user_achievements
                        (user_id, achievement_id)
                    VALUES
                        (?, (SELECT id FROM achievements WHERE achievements_name = "${achievementName}"))
                `, [userId]
            ).then(() => {
                resolve();
            }).catch((error) => {
                reject(error);
            })
        })
    },
    insertUserMedal: function (userId, medalName) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    INSERT INTO
                        user_medals
                        (user_id, medal_id)
                    VALUES
                        (?, (SELECT id FROM medals WHERE medal_name = "${medalName}"))
                `, [userId]
            ).then(() => {
                resolve();
            }).catch((error) => {
                reject(error);
            })
        })
    },
    returnUserAchievements: function (userId) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    SELECT
                        *
                    FROM
                        achievements a
                    LEFT JOIN
                        user_achievements ua ON ua.achievement_id = a.id
                    WHERE
                        ua.user_id = ?
                `, [userId]
            ).then((results) => {
                resolve(results);
            }).catch((error) => {
                reject(error);
            })
        })
    },
    returnUserByEmail: function (userEmail) {
        return new Promise((resolve, reject) => {
            let self = this;

            functions.executeSql(
                `
                    SELECT
                        id_usuario
                    FROM
                        users
                    WHERE 
                        email = ?
                `, [userEmail]
            ).then((results) => {
                let userId;
                let user;
                
                if (results.length == 0) {
                    resolve("Usuário não cadastrado");
                } else {
                    userId = results[0].id_usuario;
                    self.returnUser(userId).then((results2) => {
                        user = results2;
                        resolve(user);
                    }).catch((error2) => {
                        reject(error2);
                    })
                }
            }).catch((error) => {
                reject(error);
            })
        })
    },
    returnUser: function (userId) {
        return new Promise((resolve, reject) => {
            let userGroups;
            let singleUser;
            let self = this;

            self.returnUserGroups(userId).then((results) => {
                userGroups = results;

                self.returnSingleUser(userId).then((results) => {
                    singleUser = results;
                    singleUser["user_groups"] = userGroups;
                    resolve(singleUser);
                }).catch((error) => {
                    reject(error);
                })
            }).catch((error) => {
                reject(error);
            })
        })
    },
    registerUser: function (userName, userEmail, userPassword) {
        return new Promise((resolve, reject) => {     
            let self = this;

            functions.executeSql(
                `
                    SELECT
                        id_usuario
                    FROM
                        users
                    WHERE
                        email = ?
                `, [userEmail]
            ).then((results) => {
                if (results.length > 0) {
                    resolve("Usuário já cadastrado");
                } else {                    
                    bcrypt.hash(userPassword, 10, (errBcrypt, hash) => {
                        if (errBcrypt) {
                            reject(errBcrypt);
                        }

                        functions.executeSql(
                            `
                                INSERT INTO
                                    users
                                    (nome, email, senha, profile_photo, user_cover_image)
                                VALUES
                                    (?, ?, ?, ?, ?)
                            `, [
                                userName, 
                                userEmail, 
                                hash, 
                                process.env.URL_API + '/public/default-user-image.png', 
                                process.env.URL_API + "/public/default-banner-image.png"
                            ]
                        ).then((results2) => {
                            let createdUser = {
                                id_usuario: results2.insertId,
                                email: userEmail
                            }

                            let groupName = "Projeto de " + userName;
                            _projectsService.createGroup(groupName, results2.insertId).then(() => {
                                self.insertUserAchievement(results2.insertId, "Novo usuário").then(() => {
                                    self.insertUserMedal(results2.insertId, "Confiável").then(() => {
                                        resolve(createdUser);
                                    });
                                });
                            }).catch((error3) => {
                                reject(error3);
                            })
                        }).catch((error2) => {
                            reject(error2);
                        })
                    });
                }
            }).catch((error) => {
                reject(error);
            })
        })
    },
    excludeUser: function (userId) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    SELECT
                        groups_id
                    FROM
                        os_groups
                    WHERE
                        group_owner = ?
                `, [userId]
            ).then((results) => {
                let userGroups = results;
                let promises = [];

                for (let i = 0; i < userGroups.length; i++) {
                    promises.push(
                        _projectsService.transferGroupAdmin(userGroups[i].groups_id, userId).then().catch((error) => {
                            reject(error);
                        })
                    )
                } 

                Promise.all(promises).then(() => {
                    functions.executeSql(
                        `
                            DELETE FROM
                                users
                            WHERE
                                id_usuario = ?
                        `, [userId]
                    ).then((results) => {
                        resolve();
                    }).catch((error) => {
                        reject(error);
                    })
                })
            }).catch((error) => {
                reject(error);
            })
        })
    },
    findUsers: function (search, connectedUserId) {
        return new Promise((resolve, reject) => {
            let self = this;

            functions.executeSql(
                `
                    SELECT
                        id_usuario
                    FROM
                        users
                    WHERE
                        nome LIKE '%${search}%'
                        AND id_usuario NOT IN (1, 2, ${connectedUserId})
                `
            ).then((results) => {
                if (results.length == 0) {
                    resolve("empty");
                } else {
                    let users = [];
                    let promises = [];

                    for (let i = 0; i < results.length; i++) {
                        let currentUserId = results[i].id_usuario;

                        promises.push(
                            self.returnSingleUser(currentUserId).then((results2) => {
                                users.push(results2);
                            }).catch((error2) => {
                                reject(error2);
                            })
                        )
                    }
                    
                    Promise.all(promises).then(() => {
                        resolve(users);
                    })
                }
            }).catch((error) => {
                reject(error);
            })
        })
    },
    excludeOccupation: function (cargo, userId) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    DELETE FROM
                        user_occupations
                    WHERE
                        user_id = ?
                        AND occupation_name = ?
                `, [userId, cargo]
            ).then((results) => {
                resolve();
            }).catch((error) => {
                reject(error);
            })
        })
    },
    checkJwt: function (userId) {
        return new Promise((resolve, reject) => {
            userLevel.setUser(userId).then(() => {
                userLevel.add(0.0010);
            })

            functions.executeSql(
                `
                    SELECT
                        id_usuario
                    FROM
                        users
                    WHERE
                        id_usuario = ?
                `, [userId]
            ).then(() => {
                resolve();
            }).catch((error) => {
                reject(error);
            })
        })
    },
    excludePhoto: function (userId) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    SELECT
                        profile_photo
                    FROM
                        users
                    WHERE
                        id_usuario = ?
                `, [userId]
            ).then((results) => {
                let photo_url = results[0].profile_photo.split("/")[3];

                uploadConfig.deleteFromS3(photo_url);

                functions.executeSql(
                    `
                        UPDATE
                            users
                        SET
                            profile_photo = ?
                        WHERE
                            id_usuario = ?
                    `, [process.env.URL_API + "/public/default-user-image.png", userId]
                ).then((results2) => {
                    if (results2.changedRows != 0) {
                        resolve();
                    } else {
                        resolve("Nenhuma alteração feita");
                    }
                }).catch((error2) => {
                    reject(error2);
                })
            }).catch((error) => {
                reject(error);
            })
        })
    },
    excludeBanner: function (userId) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    SELECT
                        user_cover_image
                    FROM
                        users
                    WHERE
                        id_usuario = ?
                `, [userId]
            ).then((results) => {
                let photo_url = results[0].user_cover_image.split("/")[3];
                uploadConfig.deleteFromS3(photo_url);

                functions.executeSql(
                    `
                        UPDATE
                            users
                        SET
                            user_cover_image = ?
                        WHERE
                            id_usuario = ?
                    `, [process.env.URL_API + "/public/default-banner-image.png", userId]
                ).then((results2) => {
                    if (results2.changedRows != 0) {
                        resolve();
                    } else {
                        resolve("Nenhuma alteração feita");
                    }
                }).catch((error2) => {
                    reject(error2);
                })
            }).catch((error) => {
                reject(error);
            })
        })
    },
    uploadPhoto: function (image_url, userId) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    UPDATE
                        users
                    SET
                        profile_photo = ?
                    WHERE
                        id_usuario = ?
                `, [image_url, userId]
            ).then((results) => {
                resolve();
            }).catch((error) => {
                reject(error);
            })
        })
    },
    uploadBanner: function (fileUrl, userId) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    UPDATE
                        users
                    SET
                        user_cover_image = ?
                    WHERE
                        id_usuario = ?
                `, [fileUrl, userId]
            ).then((results) => {
                resolve();
            }).catch((error) => {
                reject(error);
            })
        })
    },
    forgotPassword: function (userEmail) {
        return new Promise((resolve, reject) => {
            let self = this;

            functions.executeSql(
                `
                    SELECT
                        id_usuario
                    FROM
                        users
                    WHERE
                        email = ?
                `, [userEmail]
            ).then((results) => {
                if (results.length > 0) {
                    let id_usuario = results[0].id_usuario;
                    const token = crypto.randomBytes(20).toString('hex');

                    functions.executeSql(
                        `
                            UPDATE
                                users
                            SET
                                reset_password_token = ?, reset_password_require_date = CURRENT_TIMESTAMP()
                            WHERE
                                id_usuario = ?
                        `, [token, id_usuario]
                    ).then((results2) => {
                        self.sendResetPasswordEmail(token, userEmail).then((results3) => {
                            resolve("Um email para redefinição de senha foi enviado com validade de 30 minutos");
                        }).catch((error3) => {
                            reject(error3);
                        })
                    }).catch((error2) => {
                        reject(error2);
                    })
                } else {
                    resolve("Usuário não encontrado");
                }
            }).catch((error) => {
                reject(error);
            })
        })
    },
    userLogin: function (email, password) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    SELECT
                        *
                    FROM
                        users
                    WHERE
                        email = ?
                `, [email]
            ).then((results) => {
                if (results.length < 1) {
                    reject("Falha na autenticação");
                } else {
                    functions.executeSql(
                        `
                            SELECT
                                *
                            FROM
                                beta_testers
                            WHERE
                                beta_hash = ?
                        `, [results[0].beta_hash]
                    ).then((results2) => {
                        if (results2.length > 0 || results2.length <= 0) { //Condição OU adicionada para permitir que usuarios sem acesso ao beta fechado possam se conectar, isso é temporário, pois no futuro essa funcionalidade do beta fechado será extinta
                            bcrypt.compare(password, results[0].senha, (error2, result) => {
                                if (error2) {
                                    reject("Falha na autenticação");
                                }

                                if (result) {
                                    let token = jwt.sign({
                                        id_usuario: results[0].id_usuario,
                                        email: results[0].email
                                    }, 
                                    process.env.JWT_KEY,
                                    {
                                        expiresIn: "8h"
                                    })

                                    resolve(token);
                                }

                                reject("Falha na autenticação");
                            });
                        } else {
                            reject("Você não tem acesso ao beta fechado!");
                        }
                    }).catch((error2) => {
                        reject(error2);
                    })
                }
            }).catch((error) => {
                reject(error);
            })
        })
    },
    updatePreferences: function (user_id, preferences) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    UPDATE
                        users
                    SET
                        receive_notifications = ?, days_recurrency = ?, tel = ?
                    WHERE
                        id_usuario = ?
                `, [preferences.enable ? 1 : 0, preferences.days_recurrency != "" ? preferences.days_recurrency : 0, preferences.tel, user_id]
            ).then((results) => {
                resolve();
            }).catch((error) => {
                reject(error);
            })
        })
    },
    returnAccounts: function (user_id) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    SELECT id, user, password, last_access, type, name, image, visible, created_at, updated_at
                    FROM accounts
                    WHERE user_id = ?
                    ORDER BY last_access DESC
                `, [user_id]
            ).then((results) => {
                const accounts = results.map(account => ({
                    ...account,
                    password: decrypt(account.password) // Descriptografa a senha antes de retornar
                }));
                resolve(accounts);
            }).catch((error) => {
                reject(error);
            });
        })
    },
    createAccount: function (user_id, image, name, password, type, user) {
        return new Promise((resolve, reject) => {
            const encryptedPassword = encrypt(password);
            
            functions.executeSql(
                `
                    INSERT INTO accounts (user, password, last_access, type, name, image, visible, created_at, updated_at, user_id)
                    VALUES (?, ?, NOW(), ?, ?, ?, FALSE, NOW(), NOW(), ?)
                `, [user, encryptedPassword, type, name, image, user_id]
            ).then(() => {
                resolve();
            }).catch((error) => {
                reject(error);
            });
        });
    },
    accessAccount: function (user_id, account_id) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    UPDATE
                        accounts
                    SET
                        last_access = NOW()
                    WHERE
                        id = ? 
                    AND
                        user_id = ?
                `, [account_id, user_id]
            ).then(() => {
                resolve();
            }).catch((error) => {
                reject(error);
            });
        })
    },
    updateAccount: function (user_id, account_id, image, name, password, type, user) {
        return new Promise((resolve, reject) => {
            let query = `
                UPDATE accounts
                SET 
                    user = ?, 
                    name = ?, 
                    image = ?, 
                    type = ?, 
                    password = ?,
                    updated_at = NOW()
                WHERE
                    id = ?
            `;
            
            // Se uma senha for fornecida, ela será criptografada e atualizada também
            if (password) {
                const encryptedPassword = encrypt(password);
                functions.executeSql(
                    query + ' AND user_id = ?', [user, name, image, type, encryptedPassword, account_id, user_id]
                ).then(() => {
                    resolve();
                }).catch((error) => {
                    reject(error);
                });
            }
        });
    },
    deleteAccount: function (user_id, account_id) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `DELETE FROM accounts WHERE user_id = ? AND id = ?`, [user_id, account_id]
            ).then(() => {
                resolve();
            }).catch((error) => {
                reject(error);
            });
        });
    }
    
}

module.exports = userService;