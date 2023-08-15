const express = require('express');
const router = express.Router();
const login = require("../middleware/login");
const crypto = require('crypto');
const uploadConfig = require('../config/upload');
const _projectsService = require("../services/projectsService");

router.get("/", (req, res, next) => {
    let response = {
        message: "Retorno de todos os grupos cadastrados",
        returnObj: {},
        request: {
            type: "GET",
            status: 200
        }
    }

    _projectsService.returnAllGroups().then((results) => {
        if (results.length == 0) {
            response.message = "Nenhum grupo cadastrado";
        }

        response.returnObj = results;
    }).catch((error) => {
        return res.status(500).send(error);
    })
});

router.post("/", (req, res, next) => {
    let group_members = "1,2," + req.body.id_usuario;
    _projectsService.createGroup(req.body.group_name, group_members, req.body.id_usuario, req.body.pending_users).then((results) => {
        let response = {
            message: "Grupo criado com sucesso",
            returnObj: results,
            request: {
                type: "POST",
                status: 200
            }
        }
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
});

router.patch("/edit_group", login, (req, res, next) => {
    _projectsService.checkIfGroupOwner(req.usuario.id_usuario, req.body.group_id).then().catch(() => {
        return res.status(401).send({ error: "Você não é administrador desse grupo" });
    })

    let newGroupInformations = {
        group_id: req.body.group_id,
        group_name: req.body.group_name,
        group_description: req.body.group_description
    }

    _projectsService.editGroupInformations(newGroupInformations).then((results) => {
        let response = {
            message: "Grupo alterado com sucesso",
            returnObj: {},
            request: {
                type: "PATCH",
                status: 200
            }
        }
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
})

router.patch("/group_image/:group_id", login, uploadConfig.upload.single('user_imagem'), (req, res, next) => {
    if (req.file == undefined) {
        return res.status(500).send({ error: "Tipo de arquivo não suportado" });
    }

    _projectsService.checkIfGroupOwner(req.usuario.id_usuario, req.params.group_id).then().catch(() => {
        return res.status(401).send({ error: "Você não é administrador desse grupo" });
    })

    _projectsService.changeGroupImage(req.file.transforms[0].location, req.params.group_id).then((results) => {
        let response = {
            message: "Imagem do grupo alterada com sucesso",
            returnObj: {},
            request: {
                type: "PATCH",
                status: 200
            }
        }
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
});

router.patch("/exclude_group_image", login, (req, res, next) => {
    _projectsService.checkIfGroupOwner(req.usuario.id_usuario, req.body.group_id).then().catch(() => {
        return res.status(401).send({ error: "Você não é administrador desse grupo" });
    })

    _projectsService.excludeGroupImage(req.body.group_id).then((results) => {
        let response = {
            message: "Imagem do grupo excluída com sucesso",
            returnObj: {},
            request: {
                type: "PATCH",
                status: 200
            }
        }
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
});

router.post("/check_permission", login, (req, res, next) => {
    let response = {
        message: "Permissão concedida",
        returnObj: {},
        request: {
            type: "POST",
            status: 200
        }
    }

    _projectsService.checkIfGroupOwner(req.usuario.id_usuario, req.body.group_id).then(() => {
        return res.status(200).send(response);
    }).catch((error) => {
        response.message = error || "Permissão negada";
        response.request.status = 401;
        return res.status(401).send(response);
    })
});

router.post("/return_group", (req, res, next) => {
    _projectsService.returnGroup(req.body.group_id).then((results) => {
        let response = {
            message: "Retorno do grupo " + req.body.group_id,
            returnObj: results,
            request: {
                type: "POST",
                status: 200
            }
        }
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
});

router.post("/remove_invitation", login, (req, res, next) => {
    let response = {
        message: "Convite removido com sucesso",
        returnObj: {},
        request: {
            type: "POST",
            status: 200
        }
    }
    
    _projectsService.checkIfGroupOwner(req.usuario.id_usuario, req.body.group_id).then().catch((error) => {
        response.message = error || "Permissão negada";
        response.request.status = 401;
        return res.status(401).send(response);
    })
    
    _projectsService.removeGroupPendingUser(req.body.group_id, req.body.email).then((results) => {
        if (!results) {
            response.message = "Convite não encontrado";
            return res.status(200).send(response);
        }
        return res.status(200).send(response);
    }).catch((error) => {
        console.log(error)
        return res.status(500).send(error);
    })
});

router.post("/return_group_by_name", (req, res, next) => {
    let response = {
        message: "Retorno do grupo '" + req.body.group_name + "'",
        returnObj: {},
        request: {
            type: "POST",
            status: 200
        }
    }

    _projectsService.checkIfGroupOwner(req.usuario.id_usuario, req.body.group_id).then().catch((error) => {
        response.message = error || "Permissão negada";
        response.request.status = 401;
        return res.status(401).send(response);
    })
    
    _projectsService.returnGroup("", req.body.group_name).then((results) => {
        let response = {
            message: "Retorno do grupo " + req.body.group_name,
            returnObj: results,
            request: {
                type: "POST",
                status: 200
            }
        }
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
});

router.post("/request_user_to_group", login, (req, res, next) => {
    const token = crypto.randomBytes(20).toString('hex');

    let response = {
        message: "Email de solicitação enviado",
        returnObj: {},
        request: {
            type: "POST",
            status: 200
        }
    }

    _projectsService.checkIfGroupOwner(req.usuario.id_usuario, req.body.group_id).then().catch((error) => {
        response.message = error || "Permissão negada";
        response.request.status = 401;
        return res.status(401).send(response);
    })

    _projectsService.requestUserToGroup(token, req.body.group_id, req.body.user_email, req.body.group_name).then((results) => {
        response.message = results;
        return res.status(200).send(response);
    }).catch((error) => {
        console.log(error)
        return res.status(500).send(error);
    }) 
});

router.post("/exclude_user", login, (req, res, next) => {
    let response = {
        message: "Usuário excluido do grupo com sucesso",
        returnObj: {},
        request: {
            type: "POST",
            status: 200
        }
    }

    let group_id = req.body.group_id;
    let user_id = req.body.user_id == null ? req.usuario.id_usuario : req.body.user_id;
    _projectsService.excludeUser(group_id, user_id).then((results) => {
        response.message = results;
        return res.status(200).send(response);
    }).catch((error) => {
        console.log(error)
        return res.status(500).send(error);
    })
});

router.post("/enter_group_with_token", (req, res, next) => {
    let user_id = req.body.user_id;
    let group_id = req.body.group_id;
    let email_requested = req.body.email_requested;
    let token = req.body.token;

    let response = {
        message: "",
        returnObj: {},
        request: {
            type: "POST",
            status: 200
        }
    }

    _projectsService.enterGroupWithToken(token, group_id, email_requested, user_id).then((results) => {
        response.message = results;
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
});

router.post('/delete_group', login, (req, res, next) => {
    let response = {
        message: "",
        returnObj: {},
        request: {
            type: "POST",
            status: 200
        }
    }

    _projectsService.checkIfGroupOwner(req.usuario.id_usuario, req.body.groups_id).then().catch((error) => {
        console.log(error);
        response.message = error || "Permissão negada";
        response.request.status = 401;
        return res.status(401).send(response);
    })

    _projectsService.excludeGroup(req.body.groups_id).then((results) => {
        response.message = results;
        return res.status(200).send(response);

    }).catch((error) => {
        return res.status(500).send(error);
    })
});

module.exports = router;
