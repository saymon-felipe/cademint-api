const express = require('express');
const router = express.Router();

// Versão do sistema
const system_version = "v " + "1.2.24";
// Nome da plataforma
const system_name = "Cademint";
// Criador da plataforma
const system_owner = "Rabsystems";

//Sistema em manutenção? true ou false
const in_maintenance = false;

router.get("/", (req, res, next) => {
    const response = {
        system_version: system_version,
        system_name: system_name,
        system_owner: system_owner,
        in_maintenance: in_maintenance
    }
    return res.status(200).send({ response });
});

module.exports = router;