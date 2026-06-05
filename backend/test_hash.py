from passlib.context import CryptContext
pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
hash = '$2b$12$IqeA5eDNa9B1hP15PgnkMuW/9/gBNThkpXVSnvF17tqRcjJc/NFkS'
print(pwd_context.verify('admin', hash))
print(pwd_context.verify('', hash))
