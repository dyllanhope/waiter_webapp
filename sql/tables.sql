create table shifts(
	id serial not null primary key,
	weekday text not null,
    waiters_on_day int not null
);

create table waiter(
    id serial not null primary key,
    waiter_name text not null,
    days_working text,
    password text
);
