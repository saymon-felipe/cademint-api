CREATE TABLE jobs (
    id varchar(50) unique,
    name VARCHAR(255) NOT NULL,
    script_sql TEXT NOT NULL,
    function_name varchar(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

insert into jobs (id, name, function_name, script_sql) values ("envio_notificacoes", "Envio de notificações automáticas", "sendNotifications", 'SELECT id_usuario AS id
FROM users
WHERE receive_notifications = 1 
AND (last_notification_received IS NULL OR STR_TO_DATE(last_notification_received, "%Y-%m-%d %H:%i:%s") < NOW() - INTERVAL days_recurrency DAY);

UPDATE users 
SET last_notification_received = NOW()
WHERE receive_notifications = 1 
AND (last_notification_received IS NULL OR STR_TO_DATE(last_notification_received, "%Y-%m-%d %H:%i:%s") < NOW() - INTERVAL days_recurrency DAY);');

alter table users add column last_notification_received varchar(50);

insert into versaodb (versao) values ("25.01.01");