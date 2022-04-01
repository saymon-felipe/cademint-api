const express = require('express');
const router = express.Router();
const mysql = require("../mysql").pool;
const login = require("../middleware/login")

router.post('/return_os_list', login, (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({ error: error }) };
        conn.query('select user_groups from usuarios where id_usuario = ?',
        [req.usuario.id_usuario],
            (err, results) => {
                if (err) { return res.status(500).send({ error: err }) };
                if (results[0].user_groups.indexOf(req.body.id) == -1) {
                    conn.release();
                    return res.status(401).send({ message: "Você não faz parte desse grupo!" });
                }
                conn.query(
                    `select 
                        os_ambient.id_raw,
                        os_ambient.desc_os,
                        os_ambient.status_os,
                        os_ambient.priority,
                        os_ambient.id_complete,
                        os_ambient.sponsor,
                        os_ambient.size,
                        os_ambient.group_id,
                        os_ambient.user_owner,
                        sponsor.nome as sponsor_name,
                        owner.nome as user_owner_name
                    from os_ambient
                    inner join usuarios sponsor
                    on sponsor.id_usuario = os_ambient.sponsor
                    inner join usuarios owner 
                    on owner.id_usuario = os_ambient.user_owner
                    where os_ambient.group_id = ?`,
                    [req.body.id],
                    (err2, results2) => {
                        conn.release();
                        if (err2) { return res.status(500).send({ error: err2 }) };
        
                        const response = {
                            length: results2.length,
                            os_list: results2.map(os => {
                                return {
                                    id_os: os.id_raw,
                                    desc_os: os.desc_os,
                                    status_os: os.status_os,
                                    priority: os.priority,
                                    id_complete: os.id_complete,
                                    sponsor: os.sponsor,
                                    sponsor_name: os.sponsor_name,
                                    user_owner_name: os.user_owner_name,
                                    user_owner: os.user_owner,
                                    size: os.size,
                                    group_id: os.group_id
                                }
                            }),
                            type: "GET"
                        }
        
                        return res.status(200).send({response});
                    }
                )
            }
        )
    });
});

router.post('/find', (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({ error: error }) }
        conn.query(
            'select * from os_ambient where id_complete = ?;',
            [req.body.id_os],
            (error, resultado, fields) => {
                conn.release();
                
                const response = {
                    length: resultado.length,
                    current_task: resultado.map(os => {
                        return {
                            id_os: os.id_raw,
                            desc_os: os.desc_os,
                            status_os: os.status_os,
                            priority: os.priority,
                            id_complete: os.id_complete,
                            sponsor: os.sponsor,
                            user_owner: os.user_owner,
                            size: os.size,
                            group_id: os.group_id,
                            type: "GET",
                            description: 'Retorno da OS ' + os.id_complete,
                            link_to_view: process.env.URL_API + "os/"
                        }
                    })
                }

                if (error) { return res.status(500).send({ error: error }) }

                res.status(200).send({response});
            }
        );
    });
});

router.post('/', login, (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({ error: error }) }
        
        conn.query(
            'insert into os_ambient (desc_os, status_os, priority, sponsor, user_owner, size, group_id) values (?, ?, ?, ?, ?, ?, ?)',
            [
                req.body.desc_os,
                req.body.status_os,
                req.body.priority,
                req.body.sponsor,
                req.body.user_owner,
                req.body.size,
                req.body.group_id
            ],
            (error, resultado, field) => {
                conn.release();
                
                if (error) { return res.status(500).send({ error: error }) }

                const response = {
                    message: "Cadastro de OS feito com sucesso",
                    os_criada: {
                        id_os: resultado.insertId,
                        desc_os: req.body.desc_os,
                        status_os: req.body.status_os,
                        priority: req.body.priority,
                        sponsor: req.body.sponsor,
                        user_owner: req.body.user_owner,
                        size: req.body.size,
                        group_id: req.body.group_id,
                        request: {
                            type: "POST",
                            description: "Cadastro de OS",
                            url: process.env.URL_API + "os"
                        }
                    }
                }
                res.status(201).send(response)
            }
        );
    });
});

router.patch('/', login, (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({ error: error }) }
        conn.query(
            'update os_ambient set desc_os = ?, status_os = ?, priority = ?, sponsor = ?, user_owner = ?, size = ? where id_complete = ?',
            [req.body.desc_os, req.body.status_os, req.body.priority, req.body.sponsor, req.body.user_owner, req.body.size, req.body.id_complete],
            (error, resultado, fields) => {
                conn.release();

                if (error) { return res.status(500).send({ error: error }) }

                res.status(202).send({feedback: "OS alterada com sucesso!"});
            }
        );
    });
});

router.post('/check_permission', login, (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({ error: error }) }
        conn.query(
            'select * from os_ambient where id_complete = ? and group_id = ?',
            [req.body.id_complete, req.body.group_id],
            (err, results) => {
                if (err) { return res.status(500).send({ error: err }) };
                conn.release();

                if (results.length > 0) {
                    return res.status(200).send({ feedback: "Acesso permitido!" });
                }

                return res.status(401).send({ feedback: "Acesso restrito!" });
            }
        );
    });
});

router.patch('/id_complete', login, (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({ error: error }) }
        conn.query(
            'update os_ambient set id_complete = ? where id_raw = ?',
            [
                req.body.id_complete,
                req.body.id_raw
            ],
            (error, resultado, field) => {
                conn.release();
                if (error) { return res.status(500).send({ error: error }) }

                const response = {
                    message: "Id extendido adicionado à OS com sucesso",
                    update: {
                        id_complete: req.body.id_complete,
                        request: {
                            type: "PATCH",
                            description: "Update de OS"
                        }
                    }
                }
                res.status(202).send(response);
            }  
        );
    });
});

router.patch('/os_status', login, (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({ error: error }) }
        conn.query(
            'update os_ambient set status_os = ? where id_complete = ?',
            [
                req.body.status_os,
                req.body.id_complete
            ],
            (error, resultado, field) => {
                conn.release();
                if (error) { return res.status(500).send({ error: error }) }

                const response = {
                    message: "Status da OS alterado com sucesso",
                    update: {
                        id_complete: req.params.id_complete,
                        request: {
                            type: "PATCH",
                            description: "Update de status da OS"
                        }
                    }
                }
                res.status(202).send(response);
            }  
        );
    });
});



router.delete('/delete_os', login, (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({ error: error }) }
        conn.query(
            'delete from os_ambient where id_complete = ?',
            [req.body.id_os],
            (error, resultado, fields) => {
                conn.release();

                if (error) { return res.status(500).send({ error: error }) }

                res.status(202).send({feedback: "OS removida com sucesso!"});
            }
        );
    });
});

module.exports = router;