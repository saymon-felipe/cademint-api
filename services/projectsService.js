const functions = require("../utils/functions");
const crypto = require('crypto');
const sendEmails = require("../config/sendEmail");
const emailTemplates = require("../templates/emailTemplates");
const uploadConfig = require('../config/upload');
require('dotenv').config();

let taskService = {
    returnAllGroups: function () {
        return new Promise((resolve, reject) => {
            functions.executeSql(
            `
                SELECT
                    *
                FROM
                    os_groups
            `).then((results) => {
                let group_list = [];

                if (results.length > 0) {
                    group_list = results.map(groups => {
                        return {
                            group_id: groups.groups_id,
                            group_members: groups.group_members,
                            group_name: groups.group_name,
                            group_owner: groups.group_owner,
                            pending_users: groups.pending_users
                        }
                    })
                } 
                resolve(group_list);
            }).catch((error) => {
                reject(error);
            })
        })
    },
    createGroup: function (group_name, group_members, id_usuario, pending_users) {
        return new Promise((resolve, reject) => {
            let self = this;
            functions.executeSql(
                `
                    INSERT INTO
                        os_groups
                        (group_name, group_members, group_owner, image)
                    VALUES
                        (?, ?, ?, ?)
                `, [group_name, group_members, id_usuario, process.env.URL_API + '/public/cademint-group.png']
            ).then((results) => {
                let grupo_criado = {
                    groups_id: results.insertId,
                    group_name: group_name,
                    group_members: id_usuario,
                    group_owner: id_usuario,
                    pending_users: pending_users
                }  
                self.addGroupToMember(id_usuario, results.insertId, pending_users, group_name, false).then((results2) => {
                    self.addGroupToDefaultMembers(results.insertId, pending_users, group_name).then((results3) => {
                        resolve(grupo_criado);
                    }).catch((error3) => {
                        console.log(error3)
                        reject(error3);
                    })
                }).catch((error2) => {
                    console.log(error2)
                    reject(error2);
                })
            }).catch((error) => {
                console.log(error)
                reject(error);
            })
        })
    },
    addGroupToDefaultMembers: function (group_id, pending_users, group_name) {
        return new Promise((resolve, reject) => {
            this.addGroupToMember(1, group_id, pending_users, group_name, true).then(() => {
                this.addGroupToMember(2, group_id, pending_users, group_name, true).then(() => {
                    resolve(true);
                }).catch((error2) => {
                    reject(error2);
                })
            }).catch((error) => {
                reject(error);
            })
        })
    },
    addGroupToMember: function (user_id, group_id, pending_users, group_name, from_default) {
        let self = this;
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    SELECT 
                        user_groups
                    FROM
                        usuarios
                    WHERE 
                        id_usuario = ?
                `, [user_id]
            ).then((results) => {
                let user_groups = [];
                let new_user_groups;
                if (results[0].user_groups.indexOf(",") != -1) {
                    user_groups = results[0].user_groups.split(",");
                    user_groups.push(group_id);
                    new_user_groups = user_groups.join(",");
                } else {
                    new_user_groups = results[0].user_groups + "," + group_id;
                    if (results[0].user_groups.length == 0) {
                        new_user_groups = group_id;
                    }
                }

                functions.executeSql(
                    `
                        UPDATE
                            usuarios
                        SET
                            user_groups = ?
                        WHERE
                            id_usuario = ?
                    `, [new_user_groups, user_id]
                ).then((results2) => {
                    if (from_default || pending_users == "") {
                        resolve();
                    }

                    if (pending_users != "") {
                        functions.executeSql(
                            `
                                UPDATE
                                    os_groups
                                SET
                                    pending_users = ?
                                WHERE
                                    groups_id = ?
                            `, [group_id, pending_users]
                        ).then((results3) => {
                            const token = crypto.randomBytes(20).toString('hex');
                            
                            functions.executeSql(
                                `
                                    INSERT INTO
                                        group_tokens
                                        (token, group_id, email_requested, create_date)
                                    VALUES
                                        (?, ?, ?, CURRENT_TIMESTAMP())
                                `, [token, group_id, pending_users]
                            ).then((results4) => {
                                if (!from_default) {
                                    if (self.sendGroupEmail(pending_users, group_name, group_id, token)) {
                                        resolve();
                                    }
                                    console.log("Erro no envio do email durante a criação do grupo");
                                }
                            }).catch((error4) => {
                                reject(error4);
                            })
                        }).catch((error3) => {
                            reject(error3);
                        }) 
                    } 
                }).catch((error2) => {
                    reject(error2);
                })
            }).catch((error) => {
                reject(error);
            })
        })
    },
    generateGroupLink: function (group_id, group_name, token, user_email) {
        let temporaryLink = `gid=${group_id}&gname=${group_name}&tk=${token}&email=${user_email}`
        return temporaryLink;
    },
    sendGroupEmail(user_email, group_name, group_id, token) {
        let self = this;
        return new Promise((resolve, reject) => {
            let temporaryLink = self.generateGroupLink(group_id, group_name, token, user_email);
            let html = emailTemplates.emailInviteToGroup(group_name, temporaryLink);
            let title = `Você foi convidado para entrar em ${group_name} na plataforma Cademint!`;
            let from = "Ana da Cademint <ana.cademint@gmail.com>";

            sendEmails.sendEmail(html, title, from, user_email).then((results) => {
                resolve(true);
            }).catch((error) => {
                reject(error);
            })
        }) 
    },
    checkIfGroupOwner: function (user_id, group_id) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    SELECT
                        group_owner
                    FROM
                        os_groups
                    WHERE
                        groups_id = ?
                `, [group_id]
            ).then((results) => {
                if (user_id != results[0].group_owner) {
                    reject();
                }
                resolve();
            }).catch((error) => {
                reject(error);
            })
        })
        
    },
    editGroupInformations: function (newGroupInformations) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    UPDATE
                        os_groups
                    SET
                        group_name = ?,
                        group_description = ?
                    WHERE
                        groups_id = ?
                `, [newGroupInformations.group_name, newGroupInformations.group_description, newGroupInformations.group_id]
            ).then((results) => {
                resolve(true);
            }).catch((error) => {
                reject(error);
            })
        })
    },
    changeGroupImage: function (fileLocation, group_id) {
        return new Promise((resolve, reject) => {
            this.excludeGroupImage(group_id).then((results) => {
                functions.executeSql(
                    `
                        UPDATE 
                            os_groups
                        SET
                            image = ?
                        WHERE
                            groups_id = ?
                    `, [fileLocation, group_id]
                ).then((results2) => {
                    resolve();
                }).catch((error2) => {
                    reject(error2);
                })
            }).catch((error) => {
                reject(error);
            })
        })
        
    },
    excludeGroupImage: function (group_id) {
        return new Promise((resolve, reject) => {
            functions.executeSql(
                `
                    SELECT 
                        image
                    FROM
                        os_groups
                    WHERE
                        groups_id = ?
                `, [group_id]
            ).then((results) => {
                let photo_url = results[0].image.split("/")[3];
                if (photo_url != "public") {
                    uploadConfig.deleteFromS3(photo_url);
                    functions.executeSql(
                        `
                            UPDATE
                                os_groups
                            SET
                                image = ?
                            WHERE
                                groups_id = ?
                        `, [process.env.URL_API + "/public/cademint-group.png", group_id]
                    ).then((results2) => {
                        resolve();
                    }).catch((error2) => {
                        reject(error2);
                    })
                } else {
                    resolve();
                }
            }).catch((error) => {
                reject(error);
            })
        })
    },
    returnGroup: function (group_id) {
        return new Promise((resolve, reject) => {
            let self = this;
            functions.executeSql(
                `
                    SELECT
                        *
                    FROM
                        os_groups
                    WHERE   
                        groups_id = ?
                `, [group_id]
            ).then((results) => {
                if (results.length == 0) {
                    reject("Nenhum grupo com esse id");
                }
                let group_members_object = [];
                self.returnGroupMembers(results[0].group_members).then((results2) => {
                    group_members_object = results2;

                    let pending_users = results[0].pending_users;
                    let pending_users_object = "";

                    if (pending_users.indexOf(",") != -1) {
                        pending_users_object = pending_users.split(",");
                    } else if (pending_users.length > 0) {
                        pending_users_object = [pending_users];
                    }

                    let group = {
                        nome: results[0].group_name,
                        group_id: group_id,
                        group_members: results[0].group_members,
                        group_members_objects: group_members_object,
                        group_owner: results[0].group_owner,
                        pending_users: pending_users_object,
                        image: results[0].image,
                        group_description: results[0].group_description
                    }
                    resolve(group);
                }).catch((error2) => {
                    reject(error2);
                })
            }).catch((error) => {
                reject(error);
            })
        })
    },
    returnGroupMembers: function (group_members) {
        return new Promise((resolve, reject) => {
            let group_members_array = group_members.split(",");
            let group_members_object = [];
            for (let i = 0; i < group_members_array.length; i++) {
                functions.executeSql(
                    `
                        SELECT
                            *
                        FROM
                            usuarios
                        WHERE
                            id_usuario = ?
                    `, [group_members_array[i]]
                ).then((results) => {
                    let user = {
                        email: results[0].email,
                        nome: results[0].nome,
                        id_usuario: results[0].id_usuario,
                        profile_photo: results[0].profile_photo,
                        user_groups: results[0].user_groups
                    }
                    group_members_object.push(user);
                    if (i == group_members_array.length - 1) {
                        resolve(group_members_object);
                    }
                }).catch((error) => {
                    reject(error);
                })
            }
        })
    }
}

module.exports = taskService;