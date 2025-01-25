const express = require('express');
const router = express.Router();
const login = require("../middleware/login");
const uploadConfig = require('../config/upload');
const _userService = require("../services/userService");

router.post("/validate_reset_password_token", (req, res, next) => {
    _userService.checkResetPasswordToken(req.body.token).then((results) => {
        let response = {
            message: results,
            returnObj: {},
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

router.patch("/change_password", (req, res, next) => {
    _userService.resetPassword(req.body.token, req.body.senha).then((results) => {
        let response = {
            message: results,
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

router.get("/", (req, res, next) => {
    _userService.returnUsers().then((results) => {
        let response = {
            message: "Retorno de todos os usuários",
            returnObj: results,
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

router.get("/return_users_occupations", login, (req, res, next) => {
    _userService.returnUserOccupations(req.usuario.id_usuario).then((results) => {
        let response = {
            message: "Retorno dos cargos do usuario",
            returnObj: results,
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

router.get("/return_user", login, (req, res, next) => {
    _userService.returnUser(req.usuario.id_usuario).then((results) => {
        let response = {
            message: "Retorno do usuário " + req.usuario.id_usuario,
            returnObj: results,
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

router.post("/return_user_by_email", (req, res, next) => {
    let response = {
        message: "Retorno de usuário",
        returnObj: {},
        request: {
            type: "POST",
            status: 200
        }
    }

    if (req.body.email == "") {
        response.message = "Erro na busca de usuário, email vazio!";
        response.request.status = 404;
        return res.status(404).send(response);
    } else {
        _userService.returnUserByEmail(req.body.email).then((results) => {
            if (results == "Email não cadastrado") {
                response.message = error;
                response.request.status = 404;
                return res.status(404).send(response);
            } else {
                response.returnObj = results;
                return res.status(200).send(response);
            }
        }).catch((error) => {
            return res.status(500).send(error);
        })
    }
});

router.get("/checkJWT", login, (req, res, next) => {
    _userService.checkJwt(req.usuario.id_usuario).then(() => {
        let response = {
            message: "Usuário autenticado",
            returnObj: {},
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

router.post("/find_users", login, (req, res, next) => {
    _userService.findUsers(req.body.search, req.usuario.id_usuario).then((results) => {
        let response = {
            message: "Retorno de todos os usuários pelo critério informado",
            returnObj: {},
            request: {
                type: "POST",
                status: 200
            }
        }

        if (results == "empty") {
            response.message = "Nenhum usuário encontrado";
            return res.status(404).send(response);
        }

        response.returnObj = results;
        return res.status(200).send(response);
    })
});

router.patch("/change_bio", login, (req, res, next) => {
    if (req.body.user_bio.length < 3 || req.body.user_bio == "") {
        return res.status(401).send("Texto muito curto ou vazio");
    }

    _userService.changeBio(req.body.user_bio, req.usuario.id_usuario).then((results) => {
        let response = {
            message: "Biografia alterada com sucesso",
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

router.patch("/exclude_occupation", login, (req, res, next) => {
    _userService.excludeOccupation(req.body.user_occupation, req.usuario.id_usuario).then(() => {
        let response = {
            message: "Cargo excluído com sucesso",
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

router.patch("/add_occupation", login, (req, res, next) => {
    if (req.body.user_occupation == "" || req.body.user_occupation < 3) {
        return res.status(401).send({ error: "Cargo inválido!" });
    }

    _userService.addOccupation(req.usuario.id_usuario, req.body.user_occupation).then((results) => {
        let response = {
            message: "Cargo adicionado com sucesso",
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

router.patch("/exclude_photo", login, (req, res, next) => {
    let response = {
        message: "Imagem excluída com sucesso",
        returnObj: {},
        request: {
            type: "PATCH",
            status: 200
        }
    }

    _userService.excludePhoto(req.usuario.id_usuario).then((results) => {
        if (results == "Nenhuma alteração feita") {
            response.message = results;
            response.request.status = 304;  
        }

        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
});

router.patch("/exclude_banner", login, (req, res, next) => {
    let response = {
        message: "Imagem excluída com sucesso",
        returnObj: {},
        request: {
            type: "PATCH",
            status: 200
        }
    }

    _userService.excludeBanner(req.usuario.id_usuario).then((results) => {
        if (results == "Nenhuma alteração feita") {
            response.message = results;
            response.request.status = 304;  
        }

        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
});

router.patch("/upload_photo", login, uploadConfig.upload.single('user_imagem'), (req, res, next) => {
    if (req.file == undefined) {
        return res.status(500).send("Tipo de arquivo não suportado");
    } else {
        let response = {
            message: "Imagem enviada com sucesso",
            returnObj: {},
            request: {
                type: "PATCH",
                status: 200
            }
        }

        _userService.uploadPhoto(req.file.transforms[0].location, req.usuario.id_usuario).then((results) => {
            return res.status(200).send(response);
        }).catch((error) => {
            return res.status(500).send(error);
        })
    }
});

router.patch("/upload_banner", login, uploadConfig.upload.single('user_imagem'), (req, res, next) => {
    if (req.file == undefined) {
        return res.status(500).send("Tipo de arquivo não suportado")
    } else {
        let response = {
            message: "Imagem enviada com sucesso",
            returnObj: {},
            request: {
                type: "PATCH",
                status: 200
            }
        }

        _userService.uploadBanner(req.file.transforms[0].location, req.usuario.id_usuario).then((results) => {
            return res.status(200).send(response);
        }).catch((error) => {
            return res.status(500).send(error);
        })
    }
});

router.post("/forgot_password", (req, res, next) => {
    _userService.forgotPassword(req.body.email).then((results) => {
        let response = {
            message: results,
            returnObj: {},
            request: {
                type: "PATCH",
                status: 200
            }
        }

        if (results == "Usuário não encontrado") {
            response.request.status = 404;
            return res.status(404).send(response);
        }

        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
});

router.post("/register", (req, res, next) => {
    let response = {
        message: "Cadastro efetuado com sucesso",
        returnObj: {},
        request: {
            type: "POST",
            status: 200
        }
    }

    if (req.body.nome.length > 9) {
        response.message = "Número de caracteres para o nome maior que o permitido!";
        response.request.status = 401;
        return res.status(401).send(response);
    };

    _userService.registerUser(req.body.nome, req.body.email, req.body.senha).then((results) => {
        if (results == "Usuário já cadastrado") {
            response.message = "Usuário já cadastrado";
            response.request.status = 409;
            return res.status(409).send(response);
        }

        response.returnObj = results;
        return res.status(200).send(response);
    }).catch((error) => {
        return res.status(500).send(error);
    })
});

router.post("/login", (req, res, next) => {
    _userService.userLogin(req.body.email, req.body.senha).then((results) => {
        let response = {
            message: "Autenticado com sucesso",
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

router.post("/exclude_user", login, (req, res, next) => {
    _userService.excludeUser(req.usuario.id_usuario).then((results) => {
        let response = {
            message: "Usuário excluido com sucesso",
            returnObj: {},
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

module.exports = router;