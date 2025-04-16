const express = require('express');
const router = express.Router();
const login = require("../middleware/login");
const _taskService = require("../services/taskService");
const functions = require("../utils/functions");

router.post('/return_os_list', login, (req, res, next) => {
    let response = {
        message: "Retorno de todas as tarefas do grupo solicitado",
        returnObj: {},
        request: {
            type: "GET",
            status: 200
        }
    }
    _taskService.checkIfGroupIsAvailableToUser(req.body.id, req.usuario.id_usuario).then((havePermission) => {
        if (havePermission) {
            _taskService.returnTasks(req.body.id, req.usuario.id_usuario).then((tasksObj) => {
                response.returnObj.length = tasksObj.os_list.length;
                response.returnObj.os_list = tasksObj.os_list;
                return res.status(200).send(response);
            })
            .catch((error) => {
                return res.status(500).send(error);
            })
        } else {
            response.message = "Você não possui acesso a esse grupo";
            response.request.status = 401;
            return res.status(401).send(response);
        }
    })
    .catch((error) => {
        return res.status(500).send(error);
    })
});

router.post('/find', (req, res, next) => {
    let response = {
        message: "Retorno da tarefa " + req.body.id,
        returnObj: {
            current_task: []
        },
        request: {
            type: "POST",
            status: 200
        }
    }
    _taskService.returnTask(req.body.id).then((task) => {
        response.returnObj.current_task = task;
        return res.status(200).send(response);
    })
    .catch((error) => {
        return res.status(500).send(error);
    })
});

router.post('/', login, (req, res, next) => {
    let taskObj = {
        desc_os: req.body.desc_os,
        status_os: req.body.status_os,
        priority: req.body.priority,
        sponsor: req.body.sponsor,
        user_owner: req.body.user_owner,
        size: req.body.size,
        group_id: req.body.group_id,
        task_create_date: req.body.task_create_date
    }
    let response = {
        message: "Tarefa criada com sucesso",
        returnObj: {
            created_task: {}
        },
        request: {
            type: "POST",
            status: 200
        }
    }

    _taskService.createTask(taskObj).then((createdTask) => {
        if (createdTask != {}) {
            response.returnObj.created_task = createdTask;
            return res.status(200).send(response);
        }
    })
    .catch((error) => {
        return res.status(500).send(error);
    })
});

router.post("/edit_task_comment", login, (req, res, next) => {
    _taskService.editComment(req.body.comment, req.usuario.id_usuario).then(() => {
        let response = functions.createResponse("Comentário editado com sucesso", null, "POST", 200);
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(401).send(error);
    })
})

router.post('/task_comment', login, (req, res, next) => {
    let comment = {
        desc_comentario: req.body.desc_comentario,
        id_usuario: req.usuario.id_usuario,
        data_criacao_comentario: req.body.data_criacao_comentario,
        id_task: req.body.id_task
    }
    let response = {
        message: "Comentário feito na tarefa " + req.body.id_task,
        returnObj: {
            comentario: comment
        },
        request: {
            type: "POST",
            status: 200
        }
    }
    _taskService.insertComment(comment).then((created) => {
        if (created) {
            return res.status(200).send(response);
        } else {
            response.message = "Ocorreu um erro ao criar o comentário";
            response.returnObj.comentario = {};
            response.request.status = 500;
            return res.status(500).send(response);
        }
    })
    .catch((error) => {
        return res.status(500).send(error);
    })
});

router.delete('/delete_task_comment/:id_comment', login, (req, res, next) => {
    _taskService.removeTaskComment(req.usuario.id_usuario, req.params.id_comment).then(() => {
        let response = functions.createResponse("Comentário excluído com sucesso", null, "DELETE", 200);
        return res.status(200).send(response);
    })
    .catch((error) => {
        return res.status(500).send(error);
    })
});

router.post('/get_task_comment', login, (req, res, next) => {
    _taskService.getTaskComments(req.usuario.id_usuario, req.body.id_task).then((commentsList) => {
        let response = {
            message: "Retorno de todos os comentários da tarefa " + req.body.id_task,
            returnObj: {
                comentarios: commentsList
            },
            request: {
                type: "POST",
                status: 200
            }
        }
        return res.status(200).send(response);
    })
    .catch((error) => {
        return res.status(500).send(error);
    })
});

router.post('/like_task_comment', login, (req, res, next) => {
    let response = {
        message: "Like feito no comentário " + req.body.task_comment_id,
        returnObj: {},
        request: {
            type: "POST",
            status: 200
        }
    }
    _taskService.selectLike(req.body.task_comment_id, req.usuario.id_usuario).then((like) => {
        if (like != null) {
            _taskService.deleteLike(like.id_like).then((removedLike) => {
                if (removedLike) {
                    response.message = "Like removido do comentário " + req.body.task_comment_id;
                    return res.status(200).send(response);
                }
            })
            .catch((error) => {
                return res.status(500).send(error);
            })
        } else {
            _taskService.createLike(req.usuario.id_usuario, req.body.task_comment_id).then((createdLike) => {
                if (createdLike) {
                    return res.status(200).send(response);
                }
            })
            .catch((error) => {
                return res.status(500).send(error);
            })
        }
    })
    .catch((error) => {
        return res.status(500).send(error);
    })
});

router.patch('/', login, (req, res, next) => {
    let task = {
        desc_os: req.body.desc_os,
        status_os: req.body.status_os,
        priority: req.body.priority,
        sponsor: req.body.sponsor,
        user_owner: req.body.user_owner,
        size: req.body.size,
        id: req.body.id
    }
    _taskService.updateTask(task).then((changedTask) => {
        let response = {
            message: "Tarefa alterada com sucesso",
            returnObj: {
                changedTask: changedTask
            },
            request: {
                type: "PATCH",
                status: 200
            }
        }
        return res.status(200).send(response);
    })
    .catch((error) => {
        return res.status(500).send(error);
    })
});

router.post('/check_permission', login, (req, res, next) => {
    _taskService.checkPermission(req.body.id, req.body.group_id).then((havePermission) => {
        let response = {
            message: "Acesso permitido",
            returnObj: {},
            request: {
                type: "POST",
                status: 200
            }
        }
        if (havePermission) {
            return res.status(200).send(response);
        } else {
            response.message = "Acesso negado";
            response.request.status = 401;
            return res.status(401).send(response);
        }
    })
    .catch((error) => {
        return res.status(500).send(error);
    })
});

router.patch('/os_status', login, (req, res, next) => {
    _taskService.changeTaskStatus(req.body.status_os, req.body.reorderedColumn, req.body.id).then(() => {
        let response = {
            message: "Status da tarefa alterado com sucesso",
            returnObj: {},
            request: {
                type: "PATCH",
                status: 200
            }
        }
        return res.status(200).send(response);
    })
    .catch((error) => {
        return res.status(500).send(error);
    })
});

router.delete('/delete_os', login, (req, res, next) => {
    _taskService.deleteTask(req.body.id).then(() => {
        let response = {
            message: "Tarefa removida com sucesso",
            returnObj: {},
            request: {
                type: "DELETE",
                status: 200
            }
        }
        return res.status(200).send(response);
    })
    .catch((error) => {
        return res.status(500).send(error);
    })
});

module.exports = router;