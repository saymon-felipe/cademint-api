create table versaodb (
	id int not null primary key auto_increment,
    versao varchar(8) not null
);

insert into versaodb (versao) values ("24.10.01");

alter table task_comments add column data_ultima_alteracao varchar(30);