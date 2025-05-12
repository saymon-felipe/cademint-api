CREATE DATABASE  IF NOT EXISTS `cademint_db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;
USE `cademint_db`;
-- MySQL dump 10.13  Distrib 5.7.41, for Win32 (AMD64)
--
-- Host: iu51mf0q32fkhfpl.cbetxkdyhwsb.us-east-1.rds.amazonaws.com    Database: eh629qa8l4285zp4
-- ------------------------------------------------------
-- Server version	5.5.5-10.11.10-MariaDB-log

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `accounts`
--

DROP TABLE IF EXISTS `accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `accounts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `last_access` datetime NOT NULL,
  `type` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `image` varchar(500) NOT NULL,
  `visible` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `user_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user`),
  KEY `idx_type` (`type`),
  KEY `idx_name` (`name`),
  KEY `FK_accounts_user_id` (`user_id`),
  CONSTRAINT `FK_accounts_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id_usuario`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `achievements`
--

DROP TABLE IF EXISTS `achievements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `achievements` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `achievements_name` varchar(25) NOT NULL,
  `achievements_description` varchar(70) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `achievements`
--

LOCK TABLES `achievements` WRITE;
/*!40000 ALTER TABLE `achievements` DISABLE KEYS */;
INSERT INTO `achievements` VALUES (1,'Novo usuário','Conta foi criada na Cademint'),(2,'Verificado','Passou por todas as etapas de verificação de conta'),(3,'Perfil completo','Preencheu todas as informações do perfil'),(4,'Início de carreira','É participante de pelo menos dois grupos'),(5,'Atarefado','Possui pelo menos 25 tarefas em seu nome'),(6,'Muito atarefado','Possui pelo menos 50 tarefas em seu nome'),(7,'Chefinho','É dono de pelo menos 3 grupos ativos'),(8,'Manda chuva','Possui o melhor plano da Cademint'),(9,'Usuário frequente','Fez login na plataforma todos os dias durante um mês seguido'),(10,'Antisocial','Quase não interage com outras pessoas'),(11,'Sociável','Interage frequentemente com outras pessoas'),(12,'Viciado','Possui pelo menos 8 conquistas'),(13,'Sem vida social','Não fica mais de 8 horas fora da Cademint'),(14,'Hacker','Conseguiu acesso ao código secreto dentro da Cademint'),(15,'Soberano','Possui todas as conquistas e medalhas, além de ser nível máximo'),(16,'Dono da Cademint','Você é o dono da Cademint, parabéns!'),(17,'Magnata','Possui o level máximo da Cademint');
/*!40000 ALTER TABLE `achievements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `beta_queue`
--

DROP TABLE IF EXISTS `beta_queue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `beta_queue` (
  `nome` varchar(50) NOT NULL,
  `email` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `beta_queue`
--

LOCK TABLES `beta_queue` WRITE;
/*!40000 ALTER TABLE `beta_queue` DISABLE KEYS */;
/*!40000 ALTER TABLE `beta_queue` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `beta_testers`
--

DROP TABLE IF EXISTS `beta_testers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `beta_testers` (
  `beta_hash` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `beta_testers`
--

LOCK TABLES `beta_testers` WRITE;
/*!40000 ALTER TABLE `beta_testers` DISABLE KEYS */;
/*!40000 ALTER TABLE `beta_testers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `group_members`
--

DROP TABLE IF EXISTS `group_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `group_members` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=121 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `group_pending_users`
--

DROP TABLE IF EXISTS `group_pending_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `group_pending_users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` int(11) NOT NULL,
  `pending_user_email` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `group_tokens`
--

DROP TABLE IF EXISTS `group_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `group_tokens` (
  `token_id` int(11) NOT NULL AUTO_INCREMENT,
  `token` varchar(50) NOT NULL,
  `create_date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `group_id` int(11) NOT NULL,
  `email_requested` varchar(50) NOT NULL,
  PRIMARY KEY (`token_id`)
) ENGINE=InnoDB AUTO_INCREMENT=281 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `jobs`
--

DROP TABLE IF EXISTS `jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `jobs` (
  `id` varchar(50) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `script_sql` text NOT NULL,
  `function_name` varchar(50) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jobs`
--

LOCK TABLES `jobs` WRITE;
/*!40000 ALTER TABLE `jobs` DISABLE KEYS */;
INSERT INTO `jobs` VALUES ('envio_notificacoes','Envio de notificações automáticas','SELECT id_usuario AS id\nFROM users\nWHERE receive_notifications = 1 \nAND (last_notification_received IS NULL OR STR_TO_DATE(last_notification_received, \"%Y-%m-%d %H:%i:%s\") < NOW() - INTERVAL days_recurrency DAY);\n\nUPDATE users \nSET last_notification_received = NOW()\nWHERE receive_notifications = 1 \nAND (last_notification_received IS NULL OR STR_TO_DATE(last_notification_received, \"%Y-%m-%d %H:%i:%s\") < NOW() - INTERVAL days_recurrency DAY);','sendNotifications','2025-01-29 17:03:01');
/*!40000 ALTER TABLE `jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kanban_columns`
--

DROP TABLE IF EXISTS `kanban_columns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `kanban_columns` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(30) NOT NULL,
  `group_id` int(11) NOT NULL,
  `order` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=143 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `medals`
--

DROP TABLE IF EXISTS `medals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `medals` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `medal_name` varchar(25) NOT NULL,
  `medal_description` varchar(90) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `medals`
--

LOCK TABLES `medals` WRITE;
/*!40000 ALTER TABLE `medals` DISABLE KEYS */;
INSERT INTO `medals` VALUES (1,'Confiável','Essa pessoa fez todas as verificações de conta e possui um grupo ativo'),(2,'Bom perfil','Essa pessoa interage e contribui frequentemente para o crescimento de seus projetos'),(3,'Usuário ativo','Essa pessoa fica online frequentemente na Cademint');
/*!40000 ALTER TABLE `medals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `os_ambient`
--

DROP TABLE IF EXISTS `os_ambient`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `os_ambient` (
  `desc_os` varchar(5000) NOT NULL,
  `status_os` int(11) DEFAULT NULL,
  `priority` int(11) NOT NULL,
  `size` varchar(1) NOT NULL,
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` int(11) NOT NULL,
  `sponsor` int(11) NOT NULL,
  `user_owner` int(11) NOT NULL,
  `task_create_date` varchar(30) NOT NULL,
  `task_index` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id_raw` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=701 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `os_groups`
--

DROP TABLE IF EXISTS `os_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `os_groups` (
  `groups_id` int(11) NOT NULL AUTO_INCREMENT,
  `group_name` varchar(50) NOT NULL,
  `group_owner` int(11) NOT NULL,
  `image` varchar(200) DEFAULT NULL,
  `group_description` varchar(500) DEFAULT '',
  `status` int(11) NOT NULL DEFAULT 1,
  UNIQUE KEY `groups_id` (`groups_id`)
) ENGINE=InnoDB AUTO_INCREMENT=552 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `task_comment_likes`
--

DROP TABLE IF EXISTS `task_comment_likes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `task_comment_likes` (
  `id_like` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `task_comment_id` int(11) NOT NULL,
  PRIMARY KEY (`id_like`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `task_comments`
--

DROP TABLE IF EXISTS `task_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `task_comments` (
  `id_comentario` int(11) NOT NULL AUTO_INCREMENT,
  `desc_comentario` varchar(1000) NOT NULL,
  `criador_comentario` int(11) NOT NULL,
  `data_criacao_comentario` varchar(30) NOT NULL,
  `id_task` int(11) NOT NULL,
  `data_ultima_alteracao` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id_comentario`)
) ENGINE=InnoDB AUTO_INCREMENT=119 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_achievements`
--

DROP TABLE IF EXISTS `user_achievements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_achievements` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `achievement_id` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_achievements`
--

LOCK TABLES `user_achievements` WRITE;
/*!40000 ALTER TABLE `user_achievements` DISABLE KEYS */;
INSERT INTO `user_achievements` VALUES (1,1,1),(2,2,1),(3,3,1);
/*!40000 ALTER TABLE `user_achievements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_medals`
--

DROP TABLE IF EXISTS `user_medals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_medals` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `medal_id` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `user_occupations`
--

DROP TABLE IF EXISTS `user_occupations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_occupations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `occupation_name` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `email` varchar(50) NOT NULL,
  `senha` varchar(100) NOT NULL,
  `nome` varchar(50) NOT NULL,
  `id_usuario` int(11) NOT NULL AUTO_INCREMENT,
  `profile_photo` varchar(200) NOT NULL,
  `beta_hash` varchar(50) DEFAULT NULL,
  `user_level` int(11) NOT NULL DEFAULT 1,
  `level_progress` varchar(8) NOT NULL DEFAULT '0.0000',
  `user_cover_image` varchar(200) DEFAULT NULL,
  `user_bio` varchar(500) DEFAULT NULL,
  `reset_password_token` varchar(80) NOT NULL DEFAULT '',
  `reset_password_require_date` varchar(30) DEFAULT NULL,
  `tel` varchar(11) DEFAULT NULL,
  `receive_notifications` int(11) NOT NULL DEFAULT 0,
  `days_recurrency` int(11) DEFAULT NULL,
  `last_notification_received` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=329 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('todos.cademint@cademint.com','$2b$10$.avk1NCuIhqZRrWVbCktnebjrGlqk5THlyRMAkVK6Yzk/fmxnLvIC','Todos',1,'https://core-cademint-a6ee13eafc1a.herokuapp.com/public/default-user-image.png','',1,'1.0000','https://core-cademint-a6ee13eafc1a.herokuapp.com/public/default-banner-image.png','','','',NULL,0,NULL,NULL),('qualquer.cademint@cademint.com','$2b$10$3rN0rzU2fnyCVedmhG25buYP.nfkjTtBcS7njHqaSyIS0p3AINpnO','Qualquer',2,'https://core-cademint-a6ee13eafc1a.herokuapp.com/public/default-user-image.png','',1,'1.0000','https://core-cademint-a6ee13eafc1a.herokuapp.com/public/default-banner-image.png','','','',NULL,0,NULL,NULL),('scrumcademint@gmail.com','$2b$10$h4nWn1fT19yKi0NaNF0rW.SnAGU1wZ7DM8a7ngMQ5.BDnKWpFDhhW','Cademint',3,'https://scrum-cademint-storage.s3.us-west-1.amazonaws.com/2022-03-31T14_22_26.168Zcandidato-ana-2.PNG','',1,'1.0210','https://core-cademint-a6ee13eafc1a.herokuapp.com/public/default-banner-image.png','','','',NULL,0,NULL,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `versaodb`
--

DROP TABLE IF EXISTS `versaodb`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `versaodb` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `versao` varchar(8) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `versaodb`
--

LOCK TABLES `versaodb` WRITE;
/*!40000 ALTER TABLE `versaodb` DISABLE KEYS */;
INSERT INTO `versaodb` VALUES (10,'25.04.01');
/*!40000 ALTER TABLE `versaodb` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `whatsapp_fila`
--

DROP TABLE IF EXISTS `whatsapp_fila`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `whatsapp_fila` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `destinatario` varchar(20) NOT NULL,
  `mensagem` text NOT NULL,
  `status` enum('pendente','enviando','enviado','falha') DEFAULT 'pendente',
  `tentativas` int(11) DEFAULT 0,
  `resposta` text DEFAULT NULL,
  `criado_em` timestamp NOT NULL DEFAULT current_timestamp(),
  `atualizado_em` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping events for database 'eh629qa8l4285zp4'
--

--
-- Dumping routines for database 'eh629qa8l4285zp4'
--
/*!50003 DROP PROCEDURE IF EXISTS `delete_expired_token` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE PROCEDURE `delete_expired_token`()
BEGIN
	DELETE FROM group_tokens WHERE create_date < date_sub(current_timestamp(), interval 7 day);
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-04-18 20:38:23
