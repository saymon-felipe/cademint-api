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
                        os_ambient.sponsor,
                        os_ambient.size,
                        os_ambient.group_id,
                        os_ambient.user_owner,
                        os_ambient.task_create_date,
                        sponsor.nome as sponsor_name,
                        owner.nome as user_owner_name
                    from os_ambient
                    inner join usuarios sponsor
                    on sponsor.id_usuario = os_ambient.sponsor
                    inner join usuarios owner 
                    on owner.id_usuario = os_ambient.user_owner
                    where os_ambient.group_id = ?;`,
                    [req.body.id],
                    (err2, results2) => {
                        conn.release();
                        if (err2) { return res.status(500).send({ error: err2 }) };
        
                        const response = {
                            length: results2.length,
                            os_list: results2.map(os => {
                                return {
                                    id: os.id_raw,
                                    desc_os: os.desc_os,
                                    status_os: os.status_os,
                                    priority: os.priority,
                                    sponsor: os.sponsor,
                                    sponsor_name: os.sponsor_name,
                                    user_owner_name: os.user_owner_name,
                                    user_owner: os.user_owner,
                                    size: os.size,
                                    group_id: os.group_id,
                                    task_create_date: os.task_create_date
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
            'select * from os_ambient where id_raw = ?;',
            [req.body.id],
            (error, resultado, fields) => {
                conn.release();
                
                const response = {
                    length: resultado.length,
                    current_task: resultado.map(os => {
                        return {
                            id: os.id_raw,
                            desc_os: os.desc_os,
                            status_os: os.status_os,
                            priority: os.priority,
                            sponsor: os.sponsor,
                            user_owner: os.user_owner,
                            size: os.size,
                            group_id: os.group_id,
                            type: "GET",
                            description: 'Retorno da OS ' + os.id_raw,
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
            'insert into os_ambient (desc_os, status_os, priority, sponsor, user_owner, size, group_id, task_create_date) values (?, ?, ?, ?, ?, ?, ?, ?)',
            [
                req.body.desc_os,
                req.body.status_os,
                req.body.priority,
                req.body.sponsor,
                req.body.user_owner,
                req.body.size,
                req.body.group_id,
                req.body.task_create_date
            ],
            (error, resultado, field) => {
                conn.release();
                
                if (error) { return res.status(500).send({ error: error }) }

                const response = {
                    message: "Cadastro de OS feito com sucesso",
                    os_criada: {
                        id: resultado.insertId,
                        desc_os: req.body.desc_os,
                        status_os: req.body.status_os,
                        priority: req.body.priority,
                        sponsor: req.body.sponsor,
                        user_owner: req.body.user_owner,
                        size: req.body.size,
                        group_id: req.body.group_id,
                        request: {
                            type: "POST",
                            description: "Cadastro de tarefa",
                            url: process.env.URL_API + "/os"
                        }
                    }
                }
                res.status(201).send(response)
            }
        );
    });
});

router.post('/task_comment', login, (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({ error: error }) };
        conn.query('insert into task_comments (desc_comentario, criador_comentario, data_criacao_comentario, id_task) values (?, ?, ?, ?)',
        [req.body.desc_comentario, req.usuario.id_usuario, req.body.data_criacao_comentario, req.body.id_task],
            (err, results) => {
                if (err) { return res.status(500).send({ error: err }) };
                conn.release();
                if (results.insertId > 0) {
                    const response = {
                        message: "Comentário feito na tarefa " + req.body.id_task,
                        comentario: {
                            desc_comentario: req.body.desc_comentario,
                            criador_comentario: req.usuario.id_usuario,
                            data_criacao_comentario: req.body.data_criacao_comentario
                        }
                    }
                    return res.status(201).send(response);
                } else {
                    return res.status(500).send({ error: "Erro ao criar o comentário" });
                }
            }
        )
    });
});

router.post('/get_task_comment', login, (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({ error: error }) };
        conn.query(`
                    select 
                        task_comments.id_comentario as id_comentario,
                        task_comments.desc_comentario,
                        task_comments.criador_comentario,
                        task_comments.data_criacao_comentario,
                        task_comments.id_task,
                        criador.nome as criador_nome,
                        criador.profile_photo as criador_imagem, 
                        count(id_like) as curtidas_comentario,
                        (
                            select count(id_like)
                            from task_comment_likes likes
                            where likes.task_comment_id = id_comentario and likes.user_id = ?
                        ) as user_has_liked
                    from task_comments
                    left join task_comment_likes likes
                    on likes.task_comment_id = task_comments.id_comentario
                    inner join usuarios criador
                    on criador.id_usuario = task_comments.criador_comentario
                    where task_comments.id_task = ?
                    group by task_comments.id_comentario;`,
        [req.usuario.id_usuario, req.body.id_task],
            (err, results) => {
                if (err) { return res.status(500).send({ error: err }) };
                conn.release();
                const response = {
                    message: "Retorno dos comentários feitos na tarefa " + req.body.id_task,
                    comentarios: results.map(comment => {
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
                }
                return res.status(200).send(response);
            }
        )
    });
});

router.post('/like_task_comment', login, (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({ error: error }) };
        conn.query(`
                    select id_like
                    from task_comment_likes 
                    where task_comment_likes.task_comment_id = ? and task_comment_likes.user_id = ?
                    `,
        [req.body.task_comment_id, req.usuario.id_usuario],
            (err, results) => {
                if (err) {return res.status(500).send({ error: err })};
                if (results.length > 0) {
                    conn.query('delete from task_comment_likes where id_like = ?',
                    [results[0].id_like],
                        (err2, results2) => {
                            if (err2) {return res.status(500).send({ error: err2 })};
                            conn.release();
                            const response = {
                                message: "Like removido do comentário " + results[0].id_task + "."
                            }
                            return res.status(200).send(response);
                        }
                    );
                } else {
                    conn.query('insert into task_comment_likes (user_id, task_comment_id) values (?, ?)',
                    [req.usuario.id_usuario, req.body.task_comment_id],
                        (err2, results2) => {
                            if (err2) {return res.status(500).send({ error: err2 })};
                            conn.release();
                            const response = {
                                message: "Comentário " + req.body.task_comment_id + " recebeu uma curtida",
                                like: {
                                    user_id: req.usuario.id_usuario,
                                    task_comment_id: req.body.task_comment_id,
                                    id_like: results2.insertId
                                }
                            }
                            return res.status(201).send(response);
                        }
                    );
                }
            }
        );
        
    });
});

router.patch('/', login, (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({ error: error }) }
        conn.query(
            'update os_ambient set desc_os = ?, status_os = ?, priority = ?, sponsor = ?, user_owner = ?, size = ? where id_raw = ?',
            [req.body.desc_os, req.body.status_os, req.body.priority, req.body.sponsor, req.body.user_owner, req.body.size, req.body.id],
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
            'select * from os_ambient where id_raw = ? and group_id = ?',
            [req.body.id, req.body.group_id],
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

router.patch('/id', login, (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({ error: error }) }
        conn.query(
            'update os_ambient set id_raw = ? where id_raw = ?',
            [
                req.body.id
            ],
            (error, resultado, field) => {
                conn.release();
                if (error) { return res.status(500).send({ error: error }) }

                const response = {
                    message: "Id extendido adicionado à OS com sucesso",
                    update: {
                        id: req.body.id,
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
            'update os_ambient set status_os = ? where id_raw = ?',
            [
                req.body.status_os,
                req.body.id
            ],
            (error, resultado, field) => {
                conn.release();
                if (error) { return res.status(500).send({ error: error }) }

                const response = {
                    message: "Status da OS alterado com sucesso",
                    update: {
                        id: req.body.id,
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
            'delete from os_ambient where id_raw = ?',
            [req.body.id],
            (error, resultado, fields) => {
                conn.release();

                if (error) { return res.status(500).send({ error: error }) }

                res.status(202).send({feedback: "OS removida com sucesso!"});
            }
        );
    });
});

module.exports = router;