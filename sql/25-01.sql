alter table os_ambient add column task_index int;

insert into versaodb (versao) values ("25.01.01");

rename table usuarios to users;

insert into versaodb (versao) values ("25.01.02");