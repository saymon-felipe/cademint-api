const { promises } = require("nodemailer/lib/xoauth2");
const functions = require("../utils/functions");

let taskService = {
    checkIfGroupIsAvailableToUser: function (groupId, userId) {
        return new Promise((resolve, reject) => {
            functions.executeSql(`
                SELECT
                    *
                FROM
                    group_members
                WHERE
                    user_id = ? AND group_id = ?
            `, [userId, groupId])
            .then((results) => {
                if (results.length > 0) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            })
            .catch((error) => {
                reject(error);
            })
        })
    },
    returnTasks: function (groupId) {
        return new Promise((resolve, reject) => {
            functions.executeSql(`
                SELECT 
                    os_ambient.id,
                    os_ambient.desc_os,
                    os_ambient.status_os,
                    os_ambient.priority,
                    os_ambient.sponsor,
                    os_ambient.size,
                    os_ambient.group_id,
                    os_ambient.user_owner,
                    os_ambient.task_create_date,
                    os_ambient.task_index,
                    sponsor.nome AS sponsor_name,
                    owner.nome AS user_owner_name
                FROM
                    os_ambient
                INNER JOIN 
                    users sponsor
                ON
                    sponsor.id_usuario = os_ambient.sponsor
                INNER JOIN
                    users owner 
                ON
                    owner.id_usuario = os_ambient.user_owner
                WHERE
                    os_ambient.group_id = ?;
            `, [groupId])
            .then((results2) => {
                let tasksObj = {
                    os_list: results2.map(os => {
                        return {
                            id: os.id,
                            desc_os: os.desc_os,
                            status_os: os.status_os,
                            priority: os.priority,
                            sponsor: os.sponsor,
                            sponsor_name: os.sponsor_name,
                            user_owner_name: os.user_owner_name,
                            user_owner: os.user_owner,
                            size: os.size,
                            group_id: os.group_id,
                            task_create_date: os.task_create_date,
                            task_index: os.task_index
                        }
                    })
                }
                resolve(tasksObj);
            })
            .catch((error) => {
                reject(error);
            })
        })
    },
    returnTask: function (taskId) {
        return new Promise((resolve, reject) => {
            functions.executeSql(`
                SELECT
                    *
                FROM
                    os_ambient
                WHERE 
                    id = ?
            `, [taskId])
            .then((results) => {
                let task = results.map(task => {
                    return {
                        id: task.id,
                        desc_os: task.desc_os,
                        status_os: task.status_os,
                        priority: task.priority,
                        sponsor: task.sponsor,
                        user_owner: task.user_owner,
                        size: task.size,
                        group_id: task.group_id
                    }
                })
                resolve(task);
            })
            .catch((error) => {
                reject(error);
            })
        })
    },
    createTask: function (task) {
        return new Promise((resolve, reject) => {
            functions.executeSql(`
                INSERT INTO
                    os_ambient
                    (desc_os, status_os, priority, sponsor, user_owner, size, group_id, task_create_date)
                VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                task.desc_os,
                task.status_os,
                task.priority,
                task.sponsor,
                task.user_owner,
                task.size,
                task.group_id,
                task.task_create_date
            ])
            .then((results) => {
                let createdTask = {
                    id: results.insertId,
                    desc_os: task.desc_os,
                    status_os: task.status_os,
                    priority: task.priority,
                    sponsor: task.sponsor,
                    user_owner: task.user_owner,
                    size: task.size,
                    group_id: task.group_id,
                }
                resolve(createdTask);
            })
            .catch((error) => {
                reject(error);
            })
        })
    },
    editComment: function (comment, id_usuario) {
        return new Promise ((resolve, reject) => {
            functions.executeSql(
                `
                    UPDATE
                        task_comments
                    SET
                        desc_comentario = ?, data_ultima_alteracao = CURRENT_TIMESTAMP()
                    WHERE
                        id_comentario = ? AND criador_comentario = ?
                `, [comment.desc_comentario, comment.id_comentario, id_usuario]
            ).then(() => {
                resolve();
            }).catch((error) => {
                reject(error);
            })
        })
    },
    insertComment: function (comment) {
        return new Promise((resolve, reject) => {
            functions.executeSql(`
                INSERT INTO
                    task_comments
                    (desc_comentario, criador_comentario, data_criacao_comentario, id_task)
                VALUES
                    (?, ?, ?, ?)
            `, [
                comment.desc_comentario,
                comment.id_usuario,
                comment.data_criacao_comentario,
                comment.id_task
            ])
            .then((results) => {
                if (results.insertId > 0) {
                    resolve(true);
                } else {
                    resulve(false);
                }
            })
            .catch((error) => {
                reject(error);
            })
        })
    },
    getTaskComments: function (userId, taskId) {
        return new Promise((resolve, reject) => {
            functions.executeSql(`
                SELECT 
                    task_comments.id_comentario,
                    task_comments.desc_comentario,
                    task_comments.criador_comentario,
                    task_comments.data_criacao_comentario,
                    task_comments.id_task,
                    criador.nome AS criador_nome,
                    criador.profile_photo AS criador_imagem, 
                    COUNT(id_like) AS curtidas_comentario,
                    (
                        SELECT COUNT(id_like)
                        FROM task_comment_likes likes
                        WHERE likes.task_comment_id = id_comentario and likes.user_id = ?
                    ) AS user_has_liked
                FROM
                    task_comments
                LEFT JOIN
                    task_comment_likes likes
                ON
                    likes.task_comment_id = task_comments.id_comentario
                INNER JOIN
                    users criador
                ON
                    criador.id_usuario = task_comments.criador_comentario
                WHERE
                    task_comments.id_task = ?
                GROUP BY
                    task_comments.id_comentario
            `, [userId, taskId])
            .then((results) => {
                let comentarios = results.map(comment => {
                    return {
                        id_comentario: comment.id_comentario,
                        desc_comentario: comment.desc_comentario,
                        criador_comentario: comment.criador_comentario,
                        criador_imagem: comment.criador_imagem,
                        criador_nome: comment.criador_nome,
                        data_criacao_comentario: comment.data_criacao_comentario,
                        curtidas_comentario: comment.curtidas_comentario,
                        user_has_liked: comment.user_has_liked
                    }
                })
                resolve(comentarios);
            })
            .catch((error) => {
                reject(error);
            })
        })
    },
    removeTaskComment: function (userId, taskId) {
        return new Promise((resolve, reject) => {
            functions.executeSql(`
                DELETE FROM 
                    task_comments
                WHERE
                    id_comentario = ?
                AND
                    criador_comentario = ?
            `, [taskId, userId])
            .then((results) => {
                if (results.affectedRows > 0) {
                    resolve();
                } else {
                    reject("Você não tem permissão para excluir esse comentário")
                }
            })
            .catch((error) => {
                reject(error);
            })
        })
    },
    selectLike: function (taskCommentId, userId) {
        return new Promise((resolve, reject) => {
            functions.executeSql(`
                SELECT
                    id_like
                FROM
                    task_comment_likes 
                WHERE
                    task_comment_likes.task_comment_id = ? and task_comment_likes.user_id = ?
            `, [taskCommentId, userId])
            .then((results) => {
                if (results.length > 0) {
                    resolve(results[0])
                } else {
                    resolve(null);
                }
            })
            .catch((error) => {
                reject(error);
            })
        })
    },
    deleteLike: function (idLike) {
        return new Promise((resolve, reject) => {
            functions.executeSql(`
                DELETE FROM
                    task_comment_likes
                WHERE
                    id_like = ?
            `, [idLike])
            .then((results) => {
                resolve(true);
            })
            .catch((error) => {
                reject(error);
            })
        })
    },
    createLike: function (userId, commentId) {
        return new Promise((resolve, reject) => {
            functions.executeSql(`
                INSERT INTO
                    task_comment_likes
                    (user_id, task_comment_id)
                VALUES
                    (?, ?)
            `, [userId, commentId])
            .then((results) => {
                resolve(true);
            })
            .catch((error) => {
                reject(error);
            })
        })
    },
    updateTask: function (task) {
        return new Promise((resolve, reject) => {
            functions.executeSql(`
                UPDATE
                    os_ambient
                SET
                    desc_os = ?, status_os = ?, priority = ?, sponsor = ?, user_owner = ?, size = ?
                WHERE
                    id = ?
            `, [
                task.desc_os,
                task.status_os,
                task.priority,
                task.sponsor,
                task.user_owner,
                task.size,
                task.id
            ])
            .then((results) => {
                let changedTask = {
                    desc_os: task.desc_os,
                    status_os: task.status_os,
                    priority: task.priority,
                    sponsor: task.sponsor,
                    user_owner: task.user_owner,
                    size: task.size,
                    id: task.id
                }
                resolve(changedTask);
            })
            .catch((error) => {
                reject(error);
            })
        })
    },
    checkPermission: function (taskId, groupId) {
        return new Promise((resolve, reject) => {
            functions.executeSql(`
                SELECT
                    *
                FROM
                    os_ambient
                WHERE
                    id = ?
                AND
                    group_id = ?
            `, [taskId, groupId])
            .then((results) => {
                if (results.length > 0) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            })
            .catch((error) => {
                reject(error);
            })
        })
    },
    changeTaskStatus: function (status, reorderedColumn, taskId) {
        return new Promise((resolve, reject) => {
            functions.executeSql(`
                UPDATE
                    os_ambient
                SET
                    status_os = ?
                WHERE
                    id = ?
            `, [status, taskId])
            .then((results) => {
                let promises = [];
                let orderedTasks = [];

                orderedTasks = reorderedColumn.map((item, index) => {
                    return {
                        id: item.id,
                        index: index
                    }
                })

                for (let i = 0; i < orderedTasks.length; i++) {
                    let currentTask = orderedTasks[i];

                    promises.push(functions.executeSql(" UPDATE os_ambient SET task_index = ? WHERE id = ? ", [currentTask.index, currentTask.id]))
                }

                Promise.all(promises).then(() => {
                    resolve();
                })
            })
            .catch((error) => {
                reject(error);
            })
        })
    },
    deleteTask: function (taskId) {
        return new Promise((resolve, reject) => {
            functions.executeSql(`
                DELETE FROM
                    os_ambient
                WHERE
                    id = ?
            `, [taskId])
            .then(() => {
                resolve();
            })
            .catch((error) => {
                reject(error);
            })
        })
    }
}

module.exports = taskService;