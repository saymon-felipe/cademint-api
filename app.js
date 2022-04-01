
const express = require('express');
const app = express();
const morgan = require('morgan');
const bodyParser = require("body-parser");
const cors = require('cors');

const rotaOs = require('./routes/os');
const rotaUsuarios = require('./routes/usuarios');
const rotaSystem = require('./routes/system');
const rotaProjetos = require('./routes/projects');
const rotaSite = require('./routes/site');

app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
require('dotenv').config();

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', "*"); //process.env.URL_SITE
    res.header(
        'Access-Control-Allow-Headers',
        'Content-Type',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );

    if (req.method == 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
        return res.status(200).send({});
    }

    next();
});

app.use('/os', rotaOs);
app.use('/usuarios', rotaUsuarios);
app.use('/system', rotaSystem);
app.use('/projects', rotaProjetos);
app.use('/site', rotaSite);
app.use('/public', express.static('public'));

app.use((req, res, next) => {
    const erro = new Error("Não encontrado");
    erro.status = 404;
    next(erro);
});

app.use((error, req, res, next) => {
    res.status(error.status || 500);
    return res.send({
       mensagem: error.message
    });
});



module.exports = app;

// Variáveis de ambiente (nodemon.json)
//
// PRODUÇÃO
/*

{
    "env": {
        "MYSQL_USER" : "b1w1c8lo2lh1jqff",
        "MYSQL_PASSWORD" : "wwnc9tpqqjg8vlg1",
        "MYSQL_DATABASE" : "v1cub3yhyxzfr7p0",
        "MYSQL_HOST" : "ckshdphy86qnz0bj.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
        "MYSQL_PORT" : 3306,
        "JWT_KEY": "SCRUM_CADEMINT_JWT_SECRET_CODE",
        "URL_API": "https://scrum-cademint-api.herokuapp.com/"
    }
}

*/
//
// TESTE
/*

{
    "env": {
        "MYSQL_USER" : "root",
        "MYSQL_PASSWORD" : "root",
        "MYSQL_DATABASE" : "scrum_db",
        "MYSQL_HOST" : "localhost",
        "MYSQL_PORT" : 3306,
        "JWT_KEY": "SCRUM_CADEMINT_JWT_SECRET_CODE",
        "URL_API": "https://scrum-cademint-api.herokuapp.com/"
    }
}

*/